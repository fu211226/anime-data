const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const API='https://graphql.anilist.co';
let ANIME_DATA=[];
const seasonJP={WINTER:'冬',SPRING:'春',SUMMER:'夏',FALL:'秋'};
const seasonName=(year,season)=>`${year}年${seasonJP[String(season).toUpperCase()]||season}アニメ`;
const currentSeason=()=>{const m=new Date().getMonth()+1;return m<=3?'WINTER':m<=6?'SPRING':m<=9?'SUMMER':'FALL'};
const currentYear=()=>new Date().getFullYear();

async function gql(query,variables={}){
  const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({query,variables})});
  if(!r.ok) throw new Error(`AniList API HTTP ${r.status}`);
  const j=await r.json();
  if(j.errors?.length) throw new Error(j.errors.map(x=>x.message).join('; '));
  return j.data;
}

function normalize(a){
  const d=a.startDate||{};
  const studio=(a.studios?.nodes||[]).map(x=>x.name).filter(Boolean).join(' / ');
  const next=a.nextAiringEpisode;
  let weekday='',time='';
  if(next?.airingAt){
    const dt=new Date(next.airingAt*1000);
    weekday=['日','月','火','水','木','金','土'][dt.getDay()]+'曜日';
    time=dt.toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Tokyo'});
  }
  return {
    id:String(a.id),
    malId:a.idMal?String(a.idMal):'',
    title:a.title?.native||a.title?.romaji||a.title?.english||'名称不明',
    kana:a.title?.romaji||a.title?.english||'',
    season:seasonName(a.seasonYear||currentYear(),a.season||currentSeason()),
    date:d.year?`${d.year}-${String(d.month||1).padStart(2,'0')}-${String(d.day||1).padStart(2,'0')}`:'未定',
    weekday,time,
    genre:a.genres||[],
    studio:studio||'未定',
    source:a.source||'不明',
    description:(a.description||'').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim(),
    image:a.coverImage?.extraLarge||a.coverImage?.large||'',
    official:a.siteUrl||'',
    streaming:(a.streamingEpisodes||[]).filter(x=>x.site).map(x=>({name:x.site,url:x.url,title:x.title||''})),
    cast:(a.characters?.edges||[]).map(e=>({character:e.node?.name?.full||'',person:e.voiceActors?.[0]?.name?.full||''})),
    staff:(a.staff?.edges||[]).map(e=>({role:e.role||'スタッフ',person:e.node?.name?.full||''})),
    externalLinks:a.externalLinks||[],
    score:a.averageScore?Number(a.averageScore)/10:0,
    popularity:a.popularity||0,
    rank:0,
    status:a.status||'',
    episodes:a.episodes||null,
    type:a.format||''
  };
}

const card=a=>`<article class="card"><a href="anime.html?id=${encodeURIComponent(a.id)}"><div class="cover">${a.image?`<img loading="lazy" src="${esc(a.image)}" alt="${esc(a.title)}" onerror="this.style.display='none';this.parentElement.classList.add('image-failed')">`:'ANIME DATA'}${a.score?`<b class="score">★ ${esc(a.score.toFixed(1))}</b>`:''}</div><div class="body"><span class="tag">${esc(a.season)}</span><h3>${esc(a.title)}</h3><p>${esc((a.genre||[]).slice(0,3).join(' / '))}</p><small>${esc(a.date)}　${esc(a.studio)}</small></div></a></article>`;

function fillSeasons(){
  const s=document.querySelector('#season');
  const names=[...new Set(ANIME_DATA.map(a=>a.season))].sort().reverse();
  s.innerHTML='<option value="">すべてのクール</option>'+names.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
  document.querySelector('#seasonButtons').innerHTML=names.map(x=>`<button data-s="${esc(x)}">${esc(x)}</button>`).join('');
}

function renderHome(){
  const q=document.querySelector('#q'),s=document.querySelector('#season'),g=document.querySelector('#grid');
  const render=()=>{
    const t=q.value.trim().toLowerCase(),v=s.value;
    const list=ANIME_DATA.filter(a=>(!v||a.season===v)&&(!t||[a.title,a.kana,a.studio,a.source,...(a.genre||[])].join(' ').toLowerCase().includes(t)));
    g.innerHTML=list.map(card).join('');
    document.querySelector('#count').textContent=list.length+'作品';
    document.querySelector('#heading').textContent=t||v?'検索結果':seasonName(currentYear(),currentSeason());
    document.querySelector('#empty').hidden=!!list.length;
  };
  q.oninput=render;s.onchange=render;
  document.querySelector('#clear').onclick=()=>{q.value='';s.value='';render()};
  document.querySelector('#seasonButtons').onclick=e=>{if(e.target.dataset.s){s.value=e.target.dataset.s;render();scrollTo({top:300,behavior:'smooth'})}};
  render();
  document.querySelector('#popularGrid').innerHTML=[...ANIME_DATA].sort((a,b)=>(b.popularity||0)-(a.popularity||0)).slice(0,6).map(card).join('');
  return render;
}

const DETAIL_QUERY=`query($id:Int){Media(id:$id,type:ANIME){
 id idMal title{romaji english native} siteUrl description episodes duration status season seasonYear startDate{year month day}
 genres source averageScore popularity coverImage{large extraLarge}
 studios(isMain:true){nodes{name}}
 nextAiringEpisode{airingAt episode}
 characters(perPage:30,sort:ROLE){edges{node{name{full}}voiceActors(language:JAPANESE){name{full}}}}
 staff(perPage:25,sort:RELEVANCE){edges{role node{name{full}}}}
 externalLinks{site url type}
 streamingEpisodes{title thumbnail url site}
}}`;

function detail(a){
  const d=document.querySelector('#detail');
  if(!a){d.innerHTML='<div class="empty"><h1>作品が見つかりません</h1><a href="./">一覧へ戻る</a></div>';return}
  document.title=a.title+'｜ANIME DATA';
  const cast=(a.cast||[]).filter(x=>x.character).slice(0,30);
  const staff=a.staff||[];
  const streaming=(a.streaming||[]).filter(x=>x.name);
  const links=(a.externalLinks||[]).filter(x=>x.site&&x.url);
  d.innerHTML=`<div class="detailtop"><div class="detailcover">${a.image?`<img src="${esc(a.image)}" alt="${esc(a.title)}" onerror="this.style.display='none';this.parentElement.classList.add('image-failed')">`:'ANIME DATA'}</div><div><span class="tag">${esc(a.season)}</span><h1>${esc(a.title)}</h1><p class="kana">${esc(a.kana)}</p><p class="desc">${esc(a.description||'作品情報を準備中です。')}</p><div class="facts"><div><b>放送開始</b>${esc(a.date)}</div><div><b>次回放送</b>${esc([a.weekday,a.time].filter(Boolean).join(' '))||'未定'}</div><div><b>ジャンル</b>${esc((a.genre||[]).join(' / '))}</div><div><b>制作会社</b>${esc(a.studio)}</div><div><b>原作</b>${esc(a.source)}</div><div><b>評価</b>${a.score?esc(a.score.toFixed(1)):'-'}</div><div><b>話数</b>${a.episodes||'未定'}</div></div>${a.official?`<a class="btn" href="${esc(a.official)}" target="_blank" rel="noopener">AniList作品ページ</a>`:''}</div></div><div class="cols"><section><h2>キャスト</h2>${cast.length?cast.map(x=>`<p class="row"><b>${esc(x.character)}</b><span>${esc(x.person||'')}</span></p>`).join(''):'<p>情報なし</p>'}</section><section><h2>スタッフ</h2>${staff.length?staff.map(x=>`<p class="row"><b>${esc(x.role)}</b><span>${esc(x.person||'')}</span></p>`).join(''):'<p>情報なし</p>'}</section></div><section><h2>配信情報</h2><div class="chips">${streaming.length?streaming.map(x=>`<a href="${esc(x.url||'#')}" target="_blank" rel="noopener">${esc(x.name)}</a>`).join(''):links.length?links.map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.site)}</a>`).join(''):'<span>配信情報なし</span>'}</div></section>`;
}

async function loadSeason(){
  const y=currentYear(),s=currentSeason();
  const query=`query($season:MediaSeason!,$year:Int!,$page:Int!){Page(page:$page,perPage:50){pageInfo{hasNextPage}media(season:$season,seasonYear:$year,type:ANIME,isAdult:false,sort:POPULARITY_DESC){id idMal title{romaji english native} siteUrl description episodes status season seasonYear startDate{year month day} genres source averageScore popularity coverImage{large extraLarge} studios(isMain:true){nodes{name}} nextAiringEpisode{airingAt episode}}}}`;
  let all=[];
  for(let page=1;page<=2;page++){
    const d=await gql(query,{season:s,year:y,page});
    all.push(...(d?.Page?.media||[]));
    if(!d?.Page?.pageInfo?.hasNextPage)break;
  }
  return all.map(normalize);
}

async function start(){
  const isDetail=location.pathname.endsWith('anime.html');
  try{
    if(isDetail){
      const id=Number(new URLSearchParams(location.search).get('id'));
      if(!id)throw new Error('作品IDがありません');
      const data=await gql(DETAIL_QUERY,{id});
      detail(normalize(data.Media));
      return;
    }
    ANIME_DATA=await loadSeason();
    if(!ANIME_DATA.length)throw new Error('今クールの作品データが空です');
    localStorage.setItem('animeDataCache',JSON.stringify({at:Date.now(),data:ANIME_DATA}));
    document.querySelector('#liveStatus').textContent=`AniList連携・${ANIME_DATA.length}作品`;
    document.querySelector('#notice').hidden=true;
  }catch(e){
    console.error(e);
    try{
      const c=JSON.parse(localStorage.getItem('animeDataCache')||'null');
      if(c?.data?.length){
        ANIME_DATA=c.data;
        const n=document.querySelector('#notice');
        if(n){n.hidden=false;n.textContent='最新データの取得に失敗したため、前回取得したデータを表示しています。';}
      }else throw e;
    }catch{
      ANIME_DATA=[...FALLBACK_ANIME];
      const n=document.querySelector('#notice');
      if(n){n.hidden=false;n.textContent='最新データを取得できないため、保存済みデータを表示しています。';}
      if(document.querySelector('#liveStatus'))document.querySelector('#liveStatus').textContent='保存済みデータ';
    }
  }
  if(isDetail){
    const id=new URLSearchParams(location.search).get('id');
    const a=ANIME_DATA.find(x=>x.id===id);
    if(a)detail(a);else detail(null);
  }else{
    fillSeasons();
    renderHome();
  }
}
start();
