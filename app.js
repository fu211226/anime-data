const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let ANIME_DATA=[];
const seasonJP={winter:'冬',spring:'春',summer:'夏',fall:'秋'};
const seasonName=(year,season)=>`${year}年${seasonJP[season]||season}アニメ`;
const currentSeason=()=>{const m=new Date().getMonth()+1;return m<=3?'winter':m<=6?'spring':m<=9?'summer':'fall'};
const currentYear=()=>new Date().getFullYear();
const card=a=>`<article class="card"><a href="anime.html?id=${encodeURIComponent(a.id)}"><div class="cover">${a.image?`<img loading="lazy" src="${esc(a.image)}" alt="${esc(a.title)}">`:'ANIME DATA'}${a.score?`<b class="score">★ ${esc(Number(a.score).toFixed(2))}</b>`:''}</div><div class="body"><span class="tag">${esc(a.season)}</span><h3>${esc(a.title)}</h3><p>${esc((a.genre||[]).slice(0,3).join(' / '))}</p><small>${esc(a.date)}　${esc(a.studio||'')}</small></div></a></article>`;
function fillSeasons(){const s=document.querySelector('#season');const names=[...new Set(ANIME_DATA.map(a=>a.season))];names.sort().reverse();s.innerHTML='<option value="">すべてのクール</option>'+names.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');document.querySelector('#seasonButtons').innerHTML=names.map(x=>`<button data-s="${esc(x)}">${esc(x)}</button>`).join('');}
function renderHome(){const q=document.querySelector('#q'),s=document.querySelector('#season'),g=document.querySelector('#grid');const render=()=>{const t=q.value.trim().toLowerCase(),v=s.value;const list=ANIME_DATA.filter(a=>(!v||a.season===v)&&(!t||[a.title,a.kana,a.studio,a.source,...(a.genre||[])].join(' ').toLowerCase().includes(t)));g.innerHTML=list.map(card).join('');document.querySelector('#count').textContent=list.length+'作品';document.querySelector('#heading').textContent=t||v?'検索結果':seasonName(currentYear(),currentSeason());document.querySelector('#empty').hidden=!!list.length;};q.oninput=render;s.onchange=render;document.querySelector('#clear').onclick=()=>{q.value='';s.value='';render()};document.querySelector('#seasonButtons').onclick=e=>{if(e.target.dataset.s){s.value=e.target.dataset.s;render();scrollTo({top:300,behavior:'smooth'})}};render();document.querySelector('#popularGrid').innerHTML=[...ANIME_DATA].sort((a,b)=>(b.popularity||0)-(a.popularity||0)).slice(0,6).map(card).join('');}
async function start(){
  const isDetail=location.pathname.endsWith('anime.html');
  ANIME_DATA=[...FALLBACK_ANIME];
  if(isDetail){
    const id=new URLSearchParams(location.search).get('id');
    const a=ANIME_DATA.find(x=>String(x.id)===String(id));
    document.title=(a?.title||'作品詳細')+'｜ANIME DATA';
    const d=document.querySelector('#detail');
    if(!a){d.innerHTML='<div class="empty"><h1>作品が見つかりません</h1><a href="./">一覧へ戻る</a></div>';return;}
    d.innerHTML=`<div class="detailtop"><div class="detailcover">${a.image?`<img src="${esc(a.image)}" alt="${esc(a.title)}">`:'ANIME DATA'}</div><div><span class="tag">${esc(a.season)}</span><h1>${esc(a.title)}</h1><p class="kana">${esc(a.kana)}</p><p class="desc">${esc(a.description||'作品情報を準備中です。')}</p><div class="facts"><div><b>放送開始</b>${esc(a.date||'未定')}</div><div><b>放送</b>${esc([a.weekday,a.time].filter(Boolean).join(' ')||'未定')}</div><div><b>ジャンル</b>${esc((a.genre||[]).join(' / '))}</div><div><b>制作会社</b>${esc(a.studio||'未定')}</div><div><b>原作</b>${esc(a.source||'不明')}</div><div><b>評価</b>${a.score?esc(Number(a.score).toFixed(2)):'-'}</div><div><b>話数</b>${a.episodes||'未定'}</div></div>${a.official?`<a class="btn" href="${esc(a.official)}" target="_blank" rel="noopener">作品ページ</a>`:''}</div></div><section><h2>キャスト・スタッフ</h2><p>公開データ版では主要作品情報を掲載しています。詳細情報は順次追加予定です。</p></section>`;
    return;
  }
  fillSeasons(); renderHome();
  const status=document.querySelector('#liveStatus');
  if(status) status.textContent=`公開データ・${ANIME_DATA.length}作品`;
  const n=document.querySelector('#notice');
  if(n){n.hidden=false;n.textContent='GitHub Pages公開版：アニメデータはサイト内の公開データを表示しています。データ更新はGitHub側で自動更新できます。';}
}
start();
