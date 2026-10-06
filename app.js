# ANIME DATA 画像取得強化パッチ
$path = Join-Path $PSScriptRoot "app.js"
if (!(Test-Path $path)) {
  Write-Host "app.js が見つかりません。" -ForegroundColor Red
  exit 1
}
$src = Get-Content $path -Raw
Copy-Item $path ($path + ".before-image-fix.bak") -Force

if ($src -notmatch "IMAGE_SEASON_QUERY") {
  $needle = "const EN_SEASON_QUERY="
  $idx = $src.IndexOf($needle)
  if ($idx -lt 0) { throw "EN_SEASON_QUERY が見つかりません。" }
  $insert = @'
const IMAGE_SEASON_QUERY=`query($season:MediaSeason!,$year:Int){Page(page:1,perPage:50){media(season:$season,seasonYear:$year,type:ANIME){id idMal title{romaji english native} coverImage{large extraLarge}}}}`;
async function loadSeasonImages(){
  try{
    const data=await gql(IMAGE_SEASON_QUERY,{season:currentSeason(),year:currentYear()});
    const rows=data?.Page?.media||[];
    const byMal=new Map(),byTitle=new Map();
    for(const x of rows){
      const img=x.coverImage?.extraLarge||x.coverImage?.large||'';
      if(!img) continue;
      if(x.idMal) byMal.set(String(x.idMal),img);
      for(const t of [x.title?.native,x.title?.romaji,x.title?.english].filter(Boolean)){
        byTitle.set(t.trim().toLowerCase(),img);
      }
    }
    return {byMal,byTitle};
  }catch(e){
    console.warn('AniList画像取得失敗',e);
    return {byMal:new Map(),byTitle:new Map()};
  }
}
function mergeSeasonImages(rows,images){
  return rows.map(a=>{
    if(a.image) return a;
    const mal=images.byMal.get(String(a.malId||a.id||''));
    if(mal) return {...a,image:mal};
    const keys=[a.titleNative,a.titleRomaji,a.titleEnglish,a.title,a.kana]
      .filter(Boolean).map(x=>x.trim().toLowerCase());
    const img=keys.map(k=>images.byTitle.get(k)).find(Boolean)||'';
    return img?{...a,image:img}:a;
  });
}
'@
  $src = $src.Insert($idx, $insert + "`r`n")
}

$old = 'async function loadJapaneseSeason(){const y=currentYear(),s=currentSeason();try{const data=await jikanGet(`/seasons/${y}/${String(s).toLowerCase()}`);if(!data?.length)throw new Error('empty');return data.map(normalizeJikan)}catch(e){if(typeof FALLBACK_ANIME!=='undefined'&&Array.isArray(FALLBACK_ANIME))return FALLBACK_ANIME.map(normalizeStored);throw e}}'
$new = 'async function loadJapaneseSeason(){const y=currentYear(),s=currentSeason();try{const [data,images]=await Promise.all([jikanGet(`/seasons/${y}/${String(s).toLowerCase()}`),loadSeasonImages()]);if(!data?.length)throw new Error('empty');return mergeSeasonImages(data.map(normalizeJikan),images)}catch(e){if(typeof FALLBACK_ANIME!=='undefined'&&Array.isArray(FALLBACK_ANIME)){const rows=FALLBACK_ANIME.map(normalizeStored);const images=await loadSeasonImages();return mergeSeasonImages(rows,images)}throw e}}'
if ($src.Contains($old)) {
  $src = $src.Replace($old,$new)
} elseif ($src -notmatch "mergeSeasonImages\(data\.map\(normalizeJikan\)") {
  throw "loadJapaneseSeason の現在の形が想定と違います。"
}

Set-Content $path $src -Encoding UTF8
Write-Host "画像補完パッチを適用しました。" -ForegroundColor Green
