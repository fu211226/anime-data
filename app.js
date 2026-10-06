const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const API='https://api.jikan.moe/v4';
let ANIME_DATA=[];
const seasonJP={winter:'冬',spring:'春',summer:'夏',fall:'秋'};
const seasonName=(year,season)=>`${year}年${seasonJP[season]||season}アニメ`;
const currentSeason=()=>{const m=new Date().getMonth()+1;return m<=3?'winter':m<=6?'spring':m<=9?'summer':'fall'};
const currentYear=()=>new Date().getFullYear();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function api(path){const r=await fetch(API+path,{headers:{Accept:'application/json'}});if(!r.ok)throw new Error(`Jikan API HTTP ${r.status}`);const j=await r.json();return j.data||[];}
function normalize(a){const aired=a.aired?.from||'';const studios=(a.studios||[]).map(x=>x.name).filter(Boolean);return {id:String(a.mal_id),title:a.title_japanese||a.title||a.title_english||'名称不明',kana:a.title||a.title_english||'',season:seasonName(a.year||currentYear(),a.season||currentSeason()),date:aired?aired.slice(0,10):'未定',weekday:a.broadcast?.day||'',time:a.broadcast?.time||'',genre:(a.genres||[]).map(x=>x.name),studio:studios.join(' / ')||'未定',source:a.source||'不明',description:(a.synopsis||'').replace(/\s+/g,' ').trim(),image:a.images?.jpg?.large_image_url||a.images?.jpg?.image_url||'',official:a.url||'',streaming:[],cast:[],staff:[],score:a.score||0,popularity:a.popularity||0,rank:a.rank||0,status:a.status||'',episodes:a.episodes||null,type:a.type||''};}
const card=a=>`<article class="card"><a href="anime.html?id=${encodeURIComponent(a.id)}"><div class="cover">${a.image?`<img loading="lazy" src="${esc(a.image)}" alt="${esc(a.title)}">`:'ANIME DATA'}${a.score?`<b class="score">★ ${esc(a.score.toFixed(2))}</b>`:''}</div><div class="body"><span class="tag">${esc(a.season)}</span><h3>${esc(a.title)}</h3><p>${esc(a.genre.slice(0,3).join(' / '))}</p><small>${esc(a.date)}　${esc(a.studio)}</small></div></a></article>`;
function fillSeasons(){const s=document.querySelector('#season');const names=[...new Set(ANIME_DATA.map(a=>a.season))];names.sort().reverse();s.innerHTML='<option value="">すべてのクール</option>'+names.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');document.querySelector('#seasonButtons').innerHTML=names.map(x=>`<button data-s="${esc(x)}">${esc(x)}</button>`).join('');}
function renderHome(){const q=document.querySelector('#q'),s=document.querySelector('#season'),g=document.querySelector('#grid');const render=()=>{const t=q.value.trim().toLowerCase(),v=s.value;const list=ANIME_DATA.filter(a=>(!v||a.season===v)&&(!t||[a.title,a.kana,a.studio,a.source,...a.genre].join(' ').toLowerCase().includes(t)));g.innerHTML=list.map(card).join('');document.querySelector('#count').textContent=list.length+'作品';document.querySelector('#heading').textContent=t||v?'検索結果':seasonName(currentYear(),currentSeason());document.querySelector('#empty').hidden=!!list.length;};q.oninput=render;s.onchange=render;document.querySelector('#clear').onclick=()=>{q.value='';s.value='';render()};document.querySelector('#seasonButtons').onclick=e=>{if(e.target.dataset.s){s.value=e.target.dataset.s;render();scrollTo({top:300,behavior:'smooth'})}};render();document.querySelector('#popularGrid').innerHTML=[...ANIME_DATA].sort((a,b)=>(b.popularity||0)-(a.popularity||0)).slice(0,6).map(card).join('');}
async function getDetail(id){return api(`/anime/${encodeURIComponent(id)}/full`);}
function detail(a){const d=document.querySelector('#detail');if(!a){d.innerHTML='<div class="empty"><h1>作品が見つかりません</h1><a href="./">一覧へ戻る</a></div>';return}document.title=a.title+'｜ANIME DATA';const cast=(a.characters||[]).filter(x=>x.character?.name).slice(0,30);const staff=a.staff||[];const streaming=(a.streaming||[]).filter(x=>x.name);d.innerHTML=`<div class="detailtop"><div class="detailcover">${a.image?`<img src="${esc(a.image)}" alt="${esc(a.title)}">`:'ANIME DATA'}</div><div><span class="tag">${esc(a.season)}</span><h1>${esc(a.title)}</h1><p class="kana">${esc(a.kana)}</p><p class="desc">${esc(a.description||'作品情報を準備中です。')}</p><div class="facts"><div><b>放送開始</b>${esc(a.date)}</div><div><b>放送</b>${esc([a.weekday,a.time].filter(Boolean).join(' '))||'未定'}</div><div><b>ジャンル</b>${esc(a.genre.join(' / '))}</div><div><b>制作会社</b>${esc(a.studio)}</div><div><b>原作</b>${esc(a.source)}</div><div><b>評価</b>${a.score?esc(a.score.toFixed(2)):'-'}</div><div><b>話数</b>${a.episodes||'未定'}</div></div>${a.official?`<a class="btn" href="${esc(a.official)}" target="_blank" rel="noopener">MyAnimeList作品ページ</a>`:''}</div></div><div class="cols"><section><h2>キャスト</h2>${cast.length?cast.map(x=>`<p class="row"><b>${esc(x.character.name)}</b><span>${esc(x.voice_actors?.[0]?.person?.name||'')}</span></p>`).join(''):'<p>情報なし</p>'}</section><section><h2>スタッフ</h2>${staff.length?staff.slice(0,25).map(x=>`<p class="row"><b>${esc(x.positions?.join(' / ')||'スタッフ')}</b><span>${esc(x.person?.name||'')}</span></p>`).join(''):'<p>情報なし</p>'}</section></div><section><h2>配信情報</h2><div class="chips">${streaming.length?streaming.map(x=>`<a href="${esc(x.url||'#')}" target="_blank" rel="noopener">${esc(x.name)}</a>`).join(''):'<span>Jikanから取得できる配信情報はありません</span>'}</div></section>`;}
async function loadSeason(){const y=currentYear(),s=currentSeason();let all=[];for(let page=1;page<=2;page++){if(page>1)await sleep(350);const part=await api(`/seasons/${y}/${s}?page=${page}&limit=25`);all.push(...part);if(part.length<25)break;}return all.map(normalize);}
async function start(){
  const isDetail=location.pathname.endsWith('anime.html');
  if(isDetail){
    const id=new URLSearchParams(location.search).get('id');
    try{
      const a=normalize(await getDetail(id));
      detail({...a,characters:(await api(`/anime/${id}/characters`)).slice(0,30),staff:(await api(`/anime/${id}/staff`)).slice(0,25),streaming:await api(`/anime/${id}/streaming`)});
    }catch(e){
      const a=FALLBACK_ANIME.find(x=>x.id===id);
      detail(a||null);
    }
    return;
  }
  // 最初から実在作品の静的データを表示。APIが使えれば最新情報に差し替えます。
  ANIME_DATA=[...FALLBACK_ANIME];
  fillSeasons();
  renderHome();
  const status=document.querySelector('#liveStatus');
  if(status) status.textContent=`公開データ・${ANIME_DATA.length}作品`;
  try{
    const latest=await loadSeason();
    if(latest.length>=5){
      ANIME_DATA=latest;
      localStorage.setItem('animeDataCache',JSON.stringify({at:Date.now(),data:ANIME_DATA}));
      fillSeasons(); renderHome();
      if(status) status.textContent=`Jikan連携・${ANIME_DATA.length}作品`;
      const n=document.querySelector('#notice'); if(n) n.hidden=true;
    }
  }catch(e){
    console.warn('Jikan API unavailable; using built-in public data.',e);
    const n=document.querySelector('#notice');
    if(n){n.hidden=false;n.textContent='最新APIを取得できないため、収録済みの2026年秋アニメ公開データを表示しています。';}
  }
}

start();
