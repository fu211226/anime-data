const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const API='https://graphql.anilist.co';
let ANIME_DATA=[];
let LANG=localStorage.getItem('animeLang')||'ja';

const I18N={
 ja:{switch:'English',list:'作品一覧',season:'クール',search:'検索',all:'すべてのクール',results:'検索結果',works:'作品',synopsis:'あらすじ',airDate:'放送開始',nextAir:'次回放送',genre:'ジャンル',studio:'制作会社',source:'原作',score:'評価',episodes:'話数',format:'形式',cast:'キャスト',staff:'スタッフ',links:'関連リンク',streaming:'配信情報',official:'公式サイト',back:'← 作品一覧へ戻る',notFound:'作品が見つかりません',noInfo:'情報なし',loading:'読み込み中…',noStreaming:'配信情報は次のステップで強化します',detail:'作品詳細'},
 en:{switch:'日本語',list:'Anime List',season:'Season',search:'Search',all:'All Seasons',results:'Search Results',works:'works',synopsis:'Synopsis',airDate:'Start Date',nextAir:'Next Airing',genre:'Genres',studio:'Studio',source:'Source',score:'Score',episodes:'Episodes',format:'Format',cast:'Cast',staff:'Staff',links:'Related Links',streaming:'Streaming',official:'Official Site',back:'← Back to anime list',notFound:'Anime not found',noInfo:'No information',loading:'Loading…',noStreaming:'Streaming services will be expanded in a later step',detail:'Anime Details'}
};
const T=k=>I18N[LANG][k]||I18N.ja[k]||k;

async function gql(query,variables={}){
 const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({query,variables})});
 if(!r.ok)throw Error(`AniList API HTTP ${r.status}`);
 const j=await r.json();
 if(j.errors?.length)throw Error(j.errors.map(x=>x.message).join('; '));
 return j.data;
}
const seasonJP={WINTER:'冬',SPRING:'春',SUMMER:'夏',FALL:'秋'};
const currentSeason=()=>{const m=new Date().getMonth()+1;return m<=3?'WINTER':m<=6?'SPRING':m<=9?'SUMMER':'FALL'};
const currentYear=()=>new Date().getFullYear();
const seasonName=(y,s)=>`${y}年${seasonJP[String(s).toUpperCase()]||s}アニメ`;

function titleOf(a){
 const t=a.title||{};
 if(LANG==='en')return t.english||t.romaji||t.native||a.title||'Untitled';
 return t.native||t.romaji||t.english||a.title||'名称不明';
}
function normalize(a){
 const d=a.startDate||{};
 return {
  id:String(a.id),malId:a.idMal?String(a.idMal):'',
  title:a.title?.native||a.title?.romaji||a.title?.english||'名称不明',
  titleJa:a.title?.native||a.title?.romaji||a.title?.english||'名称不明',
  titleEn:a.title?.english||a.title?.romaji||a.title?.native||'Untitled',
  kana:a.title?.romaji||a.title?.english||'',
  season:seasonName(a.seasonYear||currentYear(),a.season||currentSeason()),
  date:d.year?`${d.year}-${String(d.month||1).padStart(2,'0')}-${String(d.day||1).padStart(2,'0')}`:'未定',
  weekday:'',time:'',
  genre:a.genres||[],
  studio:(a.studios?.nodes||[]).map(x=>x.name).filter(Boolean).join(' / ')||'未定',
  source:a.source||'不明',
  description:(a.description||'').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim(),
  image:a.coverImage?.extraLarge||a.coverImage?.large||'',
  official:a.siteUrl||'',
  streaming:(a.streamingEpisodes||[]).filter(x=>x.site).map(x=>({name:x.site,url:x.url,title:x.title||''})),
  cast:(a.characters?.edges||[]).map(e=>({character:e.node?.name?.full||'',person:e.voiceActors?.[0]?.name?.full||''})),
  staff:(a.staff?.edges||[]).map(e=>({role:e.role||'Staff',person:e.node?.name?.full||''})),
  externalLinks:a.externalLinks||[],
  score:a.averageScore?Number(a.averageScore)/10:0,
  popularity:a.popularity||0,rank:0,status:a.status||'',episodes:a.episodes||null,type:a.format||''
 };
}
function injectLanguageUI(){
 if(document.querySelector('#languageSwitcher'))return;
 const b=document.createElement('button');
 b.id='languageSwitcher';b.type='button';b.textContent=T('switch');b.title='日本語 / English';
 b.onclick=()=>{LANG=LANG==='ja'?'en':'ja';localStorage.setItem('animeLang',LANG);location.reload()};
 document.body.appendChild(b);
 const st=document.createElement('style');
 st.textContent='#languageSwitcher{position:fixed;right:24px;bottom:22px;z-index:9999;border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:9px 15px;background:#151b2b;color:#fff;cursor:pointer;font-weight:700;box-shadow:0 6px 24px rgba(0,0,0,.35)}#languageSwitcher:hover{transform:translateY(-1px);background:#202942}@media(max-width:600px){#languageSwitcher{right:14px;bottom:14px}}';
 document.head.appendChild(st);
}
function card(a){
 const title=LANG==='en'?a.titleEn:a.titleJa;
 return `<article class="card"><a href="anime.html?id=${encodeURIComponent(a.id)}"><div class="cover">${a.image?`<img loading="lazy" src="${esc(a.image)}" alt="${esc(title)}" onerror="this.style.display='none';this.parentElement.classList.add('image-failed')">`:'ANIME DATA'}${a.score?`<b class="score">★ ${esc(a.score.toFixed(1))}</b>`:''}</div><div class="body"><span class="tag">${esc(a.season)}</span><h3>${esc(title)}</h3><p>${esc((a.genre||[]).slice(0,3).join(' / '))}</p><small>${esc(a.date)}　${esc(a.studio)}</small></div></a></article>`;
}
function fillSeasons(){
 const s=document.querySelector('#season');if(!s)return;
 const names=[...new Set(ANIME_DATA.map(a=>a.season))].sort().reverse();
 s.innerHTML=`<option value="">${T('all')}</option>`+names.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
 const b=document.querySelector('#seasonButtons');if(b)b.innerHTML=names.map(x=>`<button data-s="${esc(x)}">${esc(x)}</button>`).join('');
}
function renderHome(){
 const q=document.querySelector('#q'),s=document.querySelector('#season'),g=document.querySelector('#grid');if(!q||!s||!g)return;
 const render=()=>{
  const t=q.value.trim().toLowerCase(),v=s.value;
  const list=ANIME_DATA.filter(a=>(!v||a.season===v)&&(!t||[a.titleJa,a.titleEn,a.kana,a.studio,a.source,...(a.genre||[])].join(' ').toLowerCase().includes(t)));
  g.innerHTML=list.map(card).join('');
  const c=document.querySelector('#count');if(c)c.textContent=`${list.length}${T('works')}`;
  const h=document.querySelector('#heading');if(h)h.textContent=t||v?T('results'):seasonName(currentYear(),currentSeason());
  const e=document.querySelector('#empty');if(e)e.hidden=!!list.length;
 };
 q.oninput=render;s.onchange=render;
 const clear=document.querySelector('#clear');if(clear)clear.onclick=()=>{q.value='';s.value='';render()};
 const b=document.querySelector('#seasonButtons');if(b)b.onclick=e=>{if(e.target.dataset.s){s.value=e.target.dataset.s;render();scrollTo({top:300,behavior:'smooth'})}};
 render();
 const p=document.querySelector('#popularGrid');if(p)p.innerHTML=[...ANIME_DATA].sort((a,b)=>(b.popularity||0)-(a.popularity||0)).slice(0,6).map(card).join('');
}
const DETAIL_QUERY=`query($id:Int){Media(id:$id,type:ANIME){id idMal title{romaji english native} siteUrl description episodes duration status season seasonYear startDate{year month day} genres source averageScore popularity coverImage{large extraLarge} studios(isMain:true){nodes{name}} nextAiringEpisode{airingAt episode} characters(perPage:30,sort:ROLE){edges{node{name{full}}voiceActors(language:JAPANESE){name{full}}}} staff(perPage:30,sort:RELEVANCE){edges{role node{name{full}}}} externalLinks{site url type} streamingEpisodes{title thumbnail url site}}}`;
function detail(a){
 const d=document.querySelector('#detail');if(!d)return;
 if(!a){d.innerHTML=`<div class="empty"><h1>${T('notFound')}</h1><a href="./">${T('back')}</a></div>`;return}
 const n=normalize(a),title=LANG==='en'?n.titleEn:n.titleJa;
 const cast=(a.characters?.edges||[]).filter(x=>x.node?.name?.full).slice(0,30);
 const staff=a.staff?.edges||[];
 const streaming=(a.streamingEpisodes||[]).filter(x=>x.site);
 const links=(a.externalLinks||[]).filter(x=>x.site&&x.url);
 const next=a.nextAiringEpisode?.airingAt?new Date(a.nextAiringEpisode.airingAt*1000):null;
 const nextText=next?next.toLocaleString('ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric',weekday:'short',hour:'2-digit',minute:'2-digit'}):'未定';
 document.title=title+'｜ANIME DATA';
 d.innerHTML=`<div class="detailtop"><div class="detailcover">${n.image?`<img src="${esc(n.image)}" alt="${esc(title)}" onerror="this.style.display='none';this.parentElement.classList.add('image-failed')">`:'ANIME DATA'}</div><div><span class="tag">${esc(n.season)}</span><h1>${esc(title)}</h1><p class="kana">${esc(n.kana)}</p><p class="desc"><strong>${T('synopsis')}</strong><br>${esc(n.description||T('noInfo'))}</p><div class="facts"><div><b>${T('airDate')}</b>${esc(n.date)}</div><div><b>${T('nextAir')}</b>${esc(nextText)}</div><div><b>${T('genre')}</b>${esc(n.genre.join(' / ')||T('noInfo'))}</div><div><b>${T('studio')}</b>${esc(n.studio)}</div><div><b>${T('source')}</b>${esc(n.source)}</div><div><b>${T('score')}</b>${n.score?esc(n.score.toFixed(1)):'-'}</div><div><b>${T('episodes')}</b>${n.episodes||'—'}</div><div><b>${T('format')}</b>${esc(n.type||'—')}</div></div>${n.official?`<a class="btn" href="${esc(n.official)}" target="_blank" rel="noopener">${T('official')}</a>`:''}</div></div><div class="cols"><section><h2>${T('cast')}</h2>${cast.length?cast.map(x=>`<p class="row"><b>${esc(x.node.name.full)}</b><span>${esc(x.voiceActors?.[0]?.name?.full||'')}</span></p>`).join(''):`<p>${T('noInfo')}</p>`}</section><section><h2>${T('staff')}</h2>${staff.length?staff.map(x=>`<p class="row"><b>${esc(x.role||'Staff')}</b><span>${esc(x.node.name.full)}</span></p>`).join(''):`<p>${T('noInfo')}</p>`}</section></div><section><h2>${T('links')}</h2><div class="chips">${links.length?links.map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.site)}</a>`).join(''):`<span>${T('noInfo')}</span>`}</div></section><section style="margin-top:30px"><h2>${T('streaming')}</h2><div class="chips">${streaming.length?streaming.map(x=>`<a href="${esc(x.url||'#')}" target="_blank" rel="noopener">${esc(x.site)}</a>`).join(''):`<span>${T('noStreaming')}</span>`}</div></section><p style="margin-top:35px"><a href="./">${T('back')}</a></p>`;
}
async function loadSeason(){
 const s=currentSeason(),y=currentYear();
 const q=`query($season:MediaSeason!,$year:Int!,$page:Int!){Page(page:$page,perPage:50){pageInfo{hasNextPage}media(season:$season,seasonYear:$year,type:ANIME,isAdult:false,sort:POPULARITY_DESC){id idMal title{romaji english native} siteUrl description episodes status season seasonYear startDate{year month day} genres source averageScore popularity coverImage{large extraLarge} studios(isMain:true){nodes{name}} nextAiringEpisode{airingAt episode}}}}`;
 let all=[];for(let page=1;page<=2;page++){const d=await gql(q,{season:s,year:y,page});all.push(...(d?.Page?.media||[]));if(!d?.Page?.pageInfo?.hasNextPage)break}return all.map(normalize);
}
async function start(){
 injectLanguageUI();
 const isDetail=location.pathname.endsWith('anime.html');
 if(isDetail){
  try{const id=Number(new URLSearchParams(location.search).get('id'));if(!id)throw Error('作品IDがありません');const data=await gql(DETAIL_QUERY,{id});detail(normalize(data.Media));return}
  catch(e){console.error(e);const c=JSON.parse(localStorage.getItem('animeDataCache')||'null');ANIME_DATA=c?.data||[...(typeof FALLBACK_ANIME!=='undefined'?FALLBACK_ANIME:[])];const id=new URLSearchParams(location.search).get('id');const a=ANIME_DATA.find(x=>String(x.id)===String(id));if(a)detail(a);else detail(null);return}
 }
 try{ANIME_DATA=await loadSeason();localStorage.setItem('animeDataCache',JSON.stringify({at:Date.now(),data:ANIME_DATA}));if(document.querySelector('#liveStatus'))document.querySelector('#liveStatus').textContent=`AniList・${ANIME_DATA.length}`;if(document.querySelector('#notice'))document.querySelector('#notice').hidden=true}
 catch(e){console.error(e);const c=JSON.parse(localStorage.getItem('animeDataCache')||'null');ANIME_DATA=c?.data?.length?c.data:[...(typeof FALLBACK_ANIME!=='undefined'?FALLBACK_ANIME:[])];}
 fillSeasons();renderHome();
}
start();