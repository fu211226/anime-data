const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const API='https://graphql.anilist.co';
const JIKAN='https://api.jikan.moe/v4';
let ANIME_DATA=[];
let LANG=localStorage.getItem('animeLang')||'ja';

const I18N={
  ja:{
    langButton:'English', navList:'作品一覧', navSeasons:'クール', navPopular:'注目作品',
    eyebrow:'ANIME DATABASE', heroTitle:'アニメデータ', heroTitle2:'まとめ',
    heroDesc:'放送情報・配信情報・キャスト・スタッフを、ひとつに。',
    status:'データ準備中', source:'AniList + 公開データ',
    search:'作品名・かな・ジャンル・制作会社で検索', allSeasons:'すべてのクール',
    clear:'クリア', results:'検索結果', works:'作品', noResults:'該当する作品がありません。',
    featured:'注目作品', browse:'クールから探す', info:'作品情報を準備中です。',
    aired:'放送開始', next:'次回放送', genre:'ジャンル', studio:'制作会社',
    sourceLabel:'原作', score:'評価', episodes:'話数', cast:'キャスト', staff:'スタッフ',
    streaming:'配信情報', noInfo:'情報なし', noStreaming:'配信情報なし',
    links:'関連リンク', anilist:'AniList作品ページ', back:'← 作品一覧へ戻る',
    notFound:'作品が見つかりません', latestFail:'最新データの取得に失敗したため、前回取得したデータを表示しています。',
    savedData:'最新データを取得できないため、保存済みデータを表示しています。', saved:'保存済みデータ'
  },
  en:{
    langButton:'日本語', navList:'Anime List', navSeasons:'Seasons', navPopular:'Featured',
    eyebrow:'ANIME DATABASE', heroTitle:'Anime Data', heroTitle2:'Collection',
    heroDesc:'Broadcasts, streaming, cast and staff — all in one place.',
    status:'Preparing data', source:'AniList + Public Data',
    search:'Search by title, romanized title, genre or studio', allSeasons:'All seasons',
    clear:'Clear', results:'Search Results', works:'works', noResults:'No matching anime found.',
    featured:'Featured Anime', browse:'Browse by Season', info:'Anime information is being prepared.',
    aired:'Start Date', next:'Next Airing', genre:'Genres', studio:'Studio',
    sourceLabel:'Source', score:'Score', episodes:'Episodes', cast:'Cast', staff:'Staff',
    streaming:'Streaming', noInfo:'No information', noStreaming:'No streaming information',
    links:'Related Links', anilist:'AniList Page', back:'← Back to Anime List',
    notFound:'Anime not found', latestFail:'Could not fetch the latest data, so the previously saved data is being displayed.',
    savedData:'Could not fetch the latest data, so saved data is being displayed.', saved:'Saved data'
  }
};
const T=()=>I18N[LANG];

const seasonJP={WINTER:'冬',SPRING:'春',SUMMER:'夏',FALL:'秋'};
const seasonEN={WINTER:'Winter',SPRING:'Spring',SUMMER:'Summer',FALL:'Fall'};
const currentSeason=()=>{const m=new Date().getMonth()+1;return m<=3?'WINTER':m<=6?'SPRING':m<=9?'SUMMER':'FALL'};
const currentYear=()=>new Date().getFullYear();
const seasonLabel=(year,season)=>{
  const y=year||currentYear(), s=String(season||currentSeason()).toUpperCase();
  return LANG==='ja'?`${y}年${seasonJP[s]||s}アニメ`:`${seasonEN[s]||s} ${y} Anime`;
};
const seasonKey=(year,season)=>`${year||currentYear()}-${String(season||currentSeason()).toUpperCase()}`;
const seasonFromKey=k=>{const m=String(k||'').match(/^(\d{4})-(WINTER|SPRING|SUMMER|FALL)$/);return m?{year:Number(m[1]),season:m[2]}:null};

async function gql(query,variables={}){
  const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({query,variables})});
  if(!r.ok) throw new Error(`AniList API HTTP ${r.status}`);
  const j=await r.json();
  if(j.errors?.length) throw new Error(j.errors.map(x=>x.message).join('; '));
  return j.data;
}

async function jikanGet(path){
  const r=await fetch(JIKAN+path,{headers:{'Accept':'application/json'}});
  if(!r.ok) throw new Error(`Jikan API HTTP ${r.status}`);
  const j=await r.json();
  return j.data;
}
const GENRE_JP={Action:'アクション',Adventure:'冒険',Comedy:'コメディ',Drama:'ドラマ',Ecchi:'エッチ',Fantasy:'ファンタジー',Horror:'ホラー',Mystery:'ミステリー','Mahou Shoujo':'魔法少女',Mecha:'メカ',Music:'音楽',Psychological:'心理',Romance:'恋愛','Sci-Fi':'SF','Slice of Life':'日常',Sports:'スポーツ',Supernatural:'超自然',Thriller:'スリラー',Suspense:'サスペンス',Award:'受賞','Boys Love':'BL','Girls Love':'GL',Hentai:'成人向け'};
const SOURCE_JP={Manga:'漫画','Light novel':'ライトノベル',Novel:'小説','Visual novel':'ビジュアルノベル','Video game':'ゲーム',Original:'オリジナル','Web manga':'Web漫画','Web novel':'Web小説','4-koma manga':'4コマ漫画',Music:'音楽',Book:'書籍','Card game':'カードゲーム','Picture book':'絵本',Other:'その他'};
const TYPE_JP={TV:'TV',Movie:'劇場版',OVA:'OVA',ONA:'Webアニメ',Special:'スペシャル',Music:'音楽',CM:'CM',PV:'PV'};
const ROLE_JP={'Original Story':'原作','Original Creator':'原作者','Director':'監督','Assistant Director':'副監督','Series Composition':'シリーズ構成','Script':'脚本','Character Design':'キャラクターデザイン','Original Character Design':'キャラクター原案','Art Director':'美術監督','Color Design':'色彩設計','Director of Photography':'撮影監督','Editing':'編集','CG Director':'CGディレクター','Sound Director':'音響監督','Music':'音楽','Mechanical Design':'メカニックデザイン','Producer':'プロデューサー','Production':'制作','Animation Director':'作画監督','Chief Animation Director':'総作画監督','Key Animation':'原画','Storyboard':'絵コンテ','Episode Director':'演出','Layout Design':'レイアウト','Background Art':'背景美術','Prop Design':'プロップデザイン','Costume Design':'衣装デザイン','Creature Design':'クリーチャーデザイン'};
const genreText=xs=>(xs||[]).map(x=>LANG==='ja'?(GENRE_JP[x]||x):x);
const sourceText=x=>LANG==='ja'?(SOURCE_JP[x]||x||T().noInfo):(x||T().noInfo);
const typeText=x=>LANG==='ja'?(TYPE_JP[x]||x||'—'):(x||'—');
const roleText=x=>LANG==='ja'?(ROLE_JP[x]||x||'スタッフ'):(x||'Staff');

function normalizeJikan(a){
  const aired=a.aired||{};
  const from=aired.from||'';
  const b=a.broadcast||{};
  const studios=(a.studios||[]).map(x=>x.name).filter(Boolean).join(' / ');
  const seasonMap={winter:'WINTER',spring:'SPRING',summer:'SUMMER',fall:'FALL'};
  const season=seasonMap[String(a.season||'').toLowerCase()]||currentSeason();
  const year=Number(a.year||a.premiered?.match?.(/\d{4}/)?.[0]||from.slice(0,4)||currentYear());
  const jpg=(a.images||{}).jpg||{};
  const webp=(a.images||{}).webp||{};
  const image=webp.large_image_url||jpg.large_image_url||webp.image_url||jpg.image_url||'';
  return {
    id:String(a.mal_id||a.id||''), malId:String(a.mal_id||a.id||''),
    title:a.title_japanese||a.title||'名称不明', titleNative:a.title_japanese||a.title||'',
    titleEnglish:a.title_english||a.title||'', titleRomaji:a.title||'', kana:a.title||'',
    seasonKey:seasonKey(year,season), season:seasonLabel(year,season),
    date:from?from.slice(0,10):'未定', weekday:b.day||'', time:b.time||'',
    genre:(a.genres||[]).map(x=>x.name).filter(Boolean), studio:studios||'未定', source:a.source||'不明',
    description:String(a.synopsis||'').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim(), image,
    imageAlt:jpg.large_image_url||jpg.image_url||'',
    official:a.url||'', streaming:(a.streaming||[]).filter(x=>x.name).map(x=>({name:x.name,url:x.url,title:''})),
    cast:[], staff:[], externalLinks:[], score:Number(a.score||0), popularity:Number(a.popularity||0),
    rank:Number(a.rank||0), status:a.status||'', episodes:a.episodes??null, type:a.type||''
  };
}

function normalizeStored(a){
  const r={...a};
  r.id=String(r.id||r.malId||''); r.malId=String(r.malId||r.id||'');
  r.titleNative=r.titleNative||r.title||''; r.titleEnglish=r.titleEnglish||r.title||''; r.titleRomaji=r.titleRomaji||r.kana||r.titleEnglish||'';
  r.genre=Array.isArray(r.genre)?r.genre:[]; r.streaming=r.streaming||[]; r.cast=r.cast||[]; r.staff=r.staff||[]; r.externalLinks=r.externalLinks||[];
  if(!r.seasonKey){
    const m=String(r.season||'').match(/^(\d{4})年(冬|春|夏|秋)/);
    const map={冬:'WINTER',春:'SPRING',夏:'SUMMER',秋:'FALL'};
    if(m)r.seasonKey=`${m[1]}-${map[m[2]]}`;
  }
  return r;
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
  const year=a.seasonYear||d.year||currentYear();
  const season=a.season||currentSeason();
  return {
    id:String(a.id),
    malId:a.idMal?String(a.idMal):'',
    title:a.title?.native||a.title?.romaji||a.title?.english||'名称不明',
    titleNative:a.title?.native||'',
    titleEnglish:a.title?.english||'',
    titleRomaji:a.title?.romaji||'',
    kana:a.title?.romaji||a.title?.english||'',
    seasonKey:seasonKey(year,season),
    season:seasonLabel(year,season),
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

function titleOf(a){
  if(LANG==='en') return a.titleEnglish||a.titleNative||a.titleRomaji||a.title||'Unknown Title';
  return a.titleNative||a.title||a.titleRomaji||a.titleEnglish||'名称不明';
}
function seasonOf(a){
  if(a.seasonKey){const p=seasonFromKey(a.seasonKey); if(p)return seasonLabel(p.year,p.season);}
  const m=String(a.season||'').match(/^(\d{4})年(冬|春|夏|秋)アニメ$/);
  if(m && LANG==='en'){
    const jpToEn={冬:'Winter',春:'Spring',夏:'Summer',秋:'Fall'};
    return `${jpToEn[m[2]]} ${m[1]} Anime`;
  }
  return a.season||'';
}
function detailDate(a){
  if(!a.date||a.date==='未定')return T().notFound==='作品が見つかりません'?'未定':'Unknown';
  return a.date;
}
function weekdayText(a){
  if(!a.weekday&&!a.time)return LANG==='ja'?'未定':'Unknown';
  if(LANG==='ja')return [a.weekday,a.time].filter(Boolean).join(' ');
  const map={'日曜日':'Sunday','月曜日':'Monday','火曜日':'Tuesday','水曜日':'Wednesday','木曜日':'Thursday','金曜日':'Friday','土曜日':'Saturday'};
  return [map[a.weekday]||a.weekday,a.time].filter(Boolean).join(' ');
}

const card=a=>`<article class="card"><a href="anime.html?id=${encodeURIComponent(a.id)}"><div class="cover">${a.image?`<img loading="lazy" src="${esc(a.image)}" alt="${esc(titleOf(a))}" onerror="if(this.dataset.retry!=='1'&&this.dataset.alt){this.dataset.retry='1';this.src=this.dataset.alt}else{this.style.display='none';this.parentElement.classList.add('image-failed')}" data-alt="${esc(a.imageAlt||'')}">`:'ANIME DATA'}${a.score?`<b class="score">★ ${esc(a.score.toFixed(1))}</b>`:''}</div><div class="body"><span class="tag">${esc(seasonOf(a))}</span><h3>${esc(titleOf(a))}</h3><p>${esc(genreText((a.genre||[]).slice(0,3)).join(' / '))}</p><small>${esc(a.date)}　${esc(a.studio)}</small></div></a></article>`;

function applyStaticLanguage(){
  const t=T();
  document.documentElement.lang=LANG;
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const key=el.dataset.i18n;
    if(t[key]!==undefined)el.textContent=t[key];
  });
  const q=document.querySelector('#q'); if(q)q.placeholder=t.search;
  const clear=document.querySelector('#clear'); if(clear)clear.textContent=t.clear;
  const sw=document.querySelector('#languageSwitcher'); if(sw)sw.textContent=t.langButton;
  const navList=document.querySelector('[data-i18n="navList"]'); if(navList)navList.textContent=t.navList;
  const navSeasons=document.querySelector('[data-i18n="navSeasons"]'); if(navSeasons)navSeasons.textContent=t.navSeasons;
  const navPopular=document.querySelector('[data-i18n="navPopular"]'); if(navPopular)navPopular.textContent=t.navPopular;
}

function fillSeasons(){
  const s=document.querySelector('#season'); if(!s)return;
  const keys=[...new Set(ANIME_DATA.map(a=>a.seasonKey||''))].filter(Boolean).sort().reverse();
  s.innerHTML=`<option value="">${esc(T().allSeasons)}</option>`+keys.map(k=>{
    const p=seasonFromKey(k); return `<option value="${esc(k)}">${esc(p?seasonLabel(p.year,p.season):k)}</option>`;
  }).join('');
  document.querySelector('#seasonButtons').innerHTML=keys.map(k=>{
    const p=seasonFromKey(k); return `<button data-s="${esc(k)}">${esc(p?seasonLabel(p.year,p.season):k)}</button>`;
  }).join('');
}

function renderHome(){
  const q=document.querySelector('#q'),s=document.querySelector('#season'),g=document.querySelector('#grid');
  const render=()=>{
    const t=q.value.trim().toLowerCase(),v=s.value;
    const list=ANIME_DATA.filter(a=>{
      const titles=[a.title,a.titleNative,a.titleEnglish,a.titleRomaji,a.kana,a.studio,a.source,...(a.genre||[])].filter(Boolean).join(' ').toLowerCase();
      return (!v||(a.seasonKey||a.season)===v)&&(!t||titles.includes(t));
    });
    g.innerHTML=list.map(card).join('');
    document.querySelector('#count').textContent=`${list.length} ${T().works}`;
    document.querySelector('#heading').textContent=t||v?T().results:seasonLabel(currentYear(),currentSeason());
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
  if(!a){d.innerHTML=`<div class="empty"><h1>${esc(T().notFound)}</h1><a href="./">${esc(T().back)}</a></div>`;return}
  const displayTitle=titleOf(a); document.title=displayTitle+'｜ANIME DATA';
  const cast=(a.cast||[]).filter(x=>x.character).slice(0,30), staff=a.staff||[];
  const streaming=(a.streaming||[]).filter(x=>x.name), links=(a.externalLinks||[]).filter(x=>x.site&&x.url);
  const synopsis=a.description||T().info;
  d.innerHTML=`<div class="detailtop"><div class="detailcover">${a.image?`<img src="${esc(a.image)}" alt="${esc(displayTitle)}" onerror="if(this.dataset.retry!=='1'&&this.dataset.alt){this.dataset.retry='1';this.src=this.dataset.alt}else{this.style.display='none';this.parentElement.classList.add('image-failed')}" data-alt="${esc(a.imageAlt||'')}">`:'ANIME DATA'}</div><div><span class="tag">${esc(seasonOf(a))}</span><h1>${esc(displayTitle)}</h1><p class="kana">${esc(LANG==='en'?(a.titleRomaji||a.titleNative||''):(a.titleRomaji||''))}</p><h3 class="section-label">${esc(LANG==='ja'?'あらすじ':'Synopsis')}</h3><p class="desc">${esc(synopsis)}</p><div class="facts"><div><b>${T().aired}</b>${esc(a.date||'Unknown')}</div><div><b>${T().next}</b>${esc(weekdayText(a))}</div><div><b>${T().genre}</b>${esc(genreText(a.genre).join(' / ')||T().noInfo)}</div><div><b>${T().studio}</b>${esc(a.studio||T().noInfo)}</div><div><b>${T().sourceLabel}</b>${esc(sourceText(a.source))}</div><div><b>${T().score}</b>${a.score?esc(Number(a.score).toFixed(1)):'-'}</div><div><b>${T().episodes}</b>${a.episodes??'Unknown'}</div><div><b>${LANG==='ja'?'形式':'Format'}</b>${esc(typeText(a.type))}</div></div>${a.official?`<a class="btn" href="${esc(a.official)}" target="_blank" rel="noopener">${esc(T().anilist)}</a>`:''}</div></div><div class="cols"><section><h2>${T().cast}</h2>${cast.length?cast.map(x=>`<p class="row"><b>${esc(x.character)}</b><span>${esc(x.person||'')}</span></p>`).join(''):`<p>${T().noInfo}</p>`}</section><section><h2>${T().staff}</h2>${staff.length?staff.map(x=>`<p class="row"><b>${esc(roleText(x.role))}</b><span>${esc(x.person||'')}</span></p>`).join(''):`<p>${T().noInfo}</p>`}</section></div><section><h2>${T().links}</h2><div class="chips">${links.length?links.map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.site)}</a>`).join(''):`<span>${T().noInfo}</span>`}</div></section><section><h2>${T().streaming}</h2><div class="chips">${streaming.length?streaming.map(x=>`<a href="${esc(x.url||'#')}" target="_blank" rel="noopener">${esc(x.name)}</a>`).join(''):`<span>${T().noStreaming}</span>`}</div></section><p class="back"><a href="./">${esc(T().back)}</a></p>`;
}

async function loadJikanDetail(malId,fallback={}){
  let a;
  try{
    a=await jikanGet(`/anime/${malId}`);
  }catch(e){
    return normalizeStored(fallback);
  }

  const r=normalizeJikan(a);
  if(!r.image && fallback.image) r.image=fallback.image;

  try{
    const cs=await jikanGet(`/anime/${malId}/characters`);
    r.cast=(cs?.characters||[]).slice(0,30).map(x=>({
      character:x.character?.name||'',
      person:(x.voice_actors||[]).find(v=>v.language==='Japanese')?.person?.name||
             (x.voice_actors||[])[0]?.person?.name||''
    }));
    r.staff=(cs?.staff||[]).slice(0,25).flatMap(x=>
      (x.positions||[]).map(role=>({role,person:x.name||''}))
    );
  }catch(e){
    r.cast=fallback.cast||[];
    r.staff=fallback.staff||[];
  }

  r.externalLinks=(a.external||[]).map(x=>({site:x.name,url:x.url}));
  return r;
}


async function loadSeason(){
  const y=currentYear(),s=currentSeason();
  try{
    // まずJikanの最新データを取得する。data.jsの古い保存データを
    // 先に使うと、画像のない旧データが優先されてしまうため。
    const data=await jikanGet(`/seasons/${y}/${String(s).toLowerCase()}`);
    const rows=data||[];
    if(!rows.length)throw new Error('Jikanの今クールデータが空です');
    return rows.map(normalizeJikan);
  }catch(e){
    // Jikanが一時的に利用できない場合だけ、保存済みデータへフォールバック。
    if(typeof FALLBACK_ANIME!=='undefined' && Array.isArray(FALLBACK_ANIME) && FALLBACK_ANIME.length>=5){
      return FALLBACK_ANIME.map(normalizeStored);
    }
    throw e;
  }
}

async function loadEnglishDetail(id){
  const data=await gql(DETAIL_QUERY,{id:Number(id)});
  return normalize(data.Media);
}


function setupLanguageSwitcher(){
  const btn=document.querySelector('#languageSwitcher');
  if(!btn)return;
  btn.onclick=()=>{
    LANG=LANG==='ja'?'en':'ja';
    localStorage.setItem('animeLang',LANG);
    location.reload();
  };
}

async function start(){
  applyStaticLanguage();
  setupLanguageSwitcher();
  const isDetail=location.pathname.endsWith('anime.html');
  try{
    if(isDetail){
      const rawId=new URLSearchParams(location.search).get('id');
      if(!rawId)throw new Error('作品IDがありません');
      if(LANG==='ja') {
        let cached={};
        try{
          const c=JSON.parse(localStorage.getItem('animeDataCache')||'null');
          cached=(c?.data||[]).find(x=>String(x.id)===String(rawId)||String(x.malId)===String(rawId))||{};
        }catch{}
        const a=await loadJikanDetail(rawId,cached);
        detail(a);
      } else {
        const a=await loadEnglishDetail(rawId);
        detail(a);
      }
      return;
    }
    ANIME_DATA=await loadSeason();
    if(!ANIME_DATA.length)throw new Error('今クールの作品データが空です');
    localStorage.setItem('animeDataCache',JSON.stringify({at:Date.now(),data:ANIME_DATA}));
    document.querySelector('#liveStatus').textContent=`Jikan · ${ANIME_DATA.length} ${T().works}`;
    document.querySelector('#notice').hidden=true;
  }catch(e){
    console.error(e);
    try{
      const c=JSON.parse(localStorage.getItem('animeDataCache')||'null');
      if(c?.data?.length){
        ANIME_DATA=c.data;
        const n=document.querySelector('#notice');
        if(n){n.hidden=false;n.textContent=T().latestFail;}
      }else throw e;
    }catch{
      ANIME_DATA=typeof FALLBACK_ANIME!=='undefined'?[...FALLBACK_ANIME]:[];
      const n=document.querySelector('#notice');
      if(n){n.hidden=false;n.textContent=T().savedData;}
      if(document.querySelector('#liveStatus'))document.querySelector('#liveStatus').textContent=T().saved;
    }
  }
  if(isDetail){
    const id=new URLSearchParams(location.search).get('id');
    const a=ANIME_DATA.find(x=>String(x.id)===String(id));
    if(a)detail(a);else detail(null);
  }else{
    fillSeasons();
    renderHome();
  }
}
start();
