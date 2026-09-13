"use strict";
/* Domain data, asset normalization helpers and shared calculations. */
const TODAY=new Date().toISOString().slice(0,10);
function isoOffset(days){const d=new Date();d.setDate(d.getDate()+days);return d.toISOString().slice(0,10);}

const ICON={
  home:'<path d="M4 11.4 12 4.5l8 6.9"/><path d="M6 10v9h12v-9"/><path d="M10 19v-5h4v5"/>',
  grid:'<rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/>',
  plus:'<path d="M12 5v14"/><path d="M5 12h14"/>',
  bell:'<path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5 1.5 5h-15S6 13 6 9z"/><path d="M10 19a2 2 0 0 0 4 0"/>',
  user:'<circle cx="12" cy="8.5" r="4"/><path d="M5 20a7 7 0 0 1 14 0"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/>',
  back:'<path d="M15 5l-7 7 7 7"/>',
  chevR:'<path d="M9 6l6 6-6 6"/>',
  swap:'<path d="M7 4 3 8l4 4"/><path d="M3 8h13a4 4 0 0 1 0 8h-1"/><path d="M17 20l4-4-4-4"/><path d="M21 16H9"/>',
  refresh:'<path d="M20 11a8 8 0 1 0-2 5.3"/><path d="M20 20v-5h-5"/>',
  toggle:'<rect x="3" y="8" width="18" height="8" rx="4"/><circle cx="16" cy="12" r="2.6" fill="currentColor" stroke="none"/>',
  bank:'<path d="M4 10 12 5l8 5"/><path d="M5 10v8M9 10v8M15 10v8M19 10v8"/><path d="M3.5 20h17"/>',
  invest:'<path d="M4 16l4.5-5 3.5 2.6L19 6"/><path d="M14.5 6H19v4.4"/>',
  box:'<path d="M12 3 4 7v10l8 4 8-4V7z"/><path d="M4 7l8 4 8-4M12 11v10"/>',
  ticket:'<path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H6a2 2 0 0 1-2-2 2 2 0 0 0 0-4z"/><path d="M14.5 6.5v11" stroke-dasharray="2 2.2"/>',
  laptop:'<rect x="3.5" y="5" width="17" height="11" rx="1.6"/><path d="M2 19.5h20M10 16.5h4"/>',
  phone:'<rect x="7" y="3" width="10" height="18" rx="2.4"/><path d="M10.5 18h3"/>',
  camera:'<path d="M4 8.5h3L8.4 6.5h7.2L17 8.5h3a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.1"/>',
  tablet:'<rect x="6" y="3" width="12" height="18" rx="2.2"/><path d="M10.5 18.2h3"/>',
  watch:'<rect x="8" y="8" width="8" height="8" rx="2.6"/><path d="M9.6 8 9 4.8h6L14.4 8M9.6 16 9 19.2h6L14.4 16"/><path d="M12 11.3v1.2l1 .8"/>',
  car:'<path d="M5 13l1.6-4.4A2 2 0 0 1 8.5 7.2h7a2 2 0 0 1 1.9 1.4L19 13"/><path d="M4 13h16v4.5a.5.5 0 0 1-.5.5H18a.5.5 0 0 1-.5-.5V17h-11v.5a.5.5 0 0 1-.5.5H4.5a.5.5 0 0 1-.5-.5z"/><circle cx="7.5" cy="13.6" r="1.1"/><circle cx="16.5" cy="13.6" r="1.1"/>',
  table:'<path d="M3 8h18M5 8v9M19 8v9M7 8V6.2h10V8"/>',
  plane:'<path d="M11 3.2c.6-.9 1.4-.9 2 0l.3 6.1 6.4 3.6c.6.4.9.9.6 1.4-.2.4-.7.5-1.3.3l-5.6-1.7-.3 4.2 1.7 1.4c.3.3.4.6.2.9-.2.2-.5.3-.9.2L12 19l-2.4.7c-.4.1-.7 0-.9-.2-.2-.3-.1-.6.2-.9l1.7-1.4-.3-4.2L4.7 14.7c-.6.2-1.1.1-1.3-.3-.3-.5 0-1 .6-1.4l6.4-3.6z"/>',
  card:'<rect x="3" y="6" width="18" height="12" rx="2.2"/><path d="M3 10h18"/><path d="M6.5 14.5h4"/>',
  member:'<path d="M5 9v6M8 7v10M16 7v10M19 9v6"/><path d="M8 12h8"/>',
  alipay:'<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M7 13c4 .5 7-1 8.5-3M9 8.5h6M12 7v3"/>',
  wechat:'<circle cx="9.5" cy="10.5" r="5.2"/><circle cx="15.5" cy="14.5" r="4"/>',
  cash:'<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/>',
  shield:'<path d="M12 3.2 5.5 6v6.2c0 3.7 2.7 6.4 6.5 7.6 3.8-1.2 6.5-3.9 6.5-7.6V6L12 3.2z"/><path d="m9.2 12 2 2 3.6-3.8"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2.6v3M12 18.4v3M21.4 12h-3M5.6 12h-3M18 6 16 8M8 16l-2 2M18 18l-2-2M8 8 6 6"/>',
  download:'<path d="M12 4v11M8 11l4 4 4-4M5 19h14"/>',
  tag:'<path d="M4 12.5V5a1 1 0 0 1 1-1h7.5a1 1 0 0 1 .7.3l6.5 6.5a1 1 0 0 1 0 1.4l-7 7a1 1 0 0 1-1.4 0l-6.5-6.5a1 1 0 0 1-.3-.7z"/><circle cx="8.5" cy="8.5" r="1.2"/>',
  edit:'<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
  check:'<path d="M5 12.5 10 17l9-10"/>',
  store:'<path d="M5 8h14l-1 11H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  list:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  grid2:'<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/>',
};
function svg(n){return '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+(ICON[n]||'')+'</svg>';}

/* groups */
const GROUPS=[
  {id:'financial',name:'金融资产',icon:'bank',sub:'现金 · 存款 · 投资理财',placeholder:true,placeholderText:'暂未开发'},
  {id:'physical',name:'实物资产',icon:'box',sub:'数码 · 家居 · 交通'},
  {id:'entitle',name:'权益票券',icon:'ticket',sub:'里程 · 礼品卡 · 票券'},
  {id:'member',name:'会员订阅',icon:'member',sub:'会员 · 订阅 · 到期提醒'},
];

/* lifecycle status meta */
const STATUS={
  active:{label:'服役中',color:'#2E7D5B'},
  idle:{label:'闲置',color:'#A08C3C'},
  retired:{label:'已退役',color:'#9AA39A'},
  sold:{label:'已卖出',color:'#5E7C9A'},
};

/* assets — 仓库只保留合成示例；真实资产仅写入本机 IndexedDB */
let ASSETS=[];
let LAST_DELETED=null;
const DEFAULT_ASSETS=[
  {id:'demo-laptop',group:'physical',cat:'数码',name:'演示笔记本',icon:'laptop',tint:'#E2E8EC',status:'active',countable:true,price:6999,bought:isoOffset(-180),value:5200,
   meta:[['购入价','¥6,999'],['当前估值','¥5,200'],['状态','演示数据']],
   events:[{date:isoOffset(-180),title:'录入资产',delta:'−¥6,999',sub:'合成示例',kind:'buy'}]},
  {id:'demo-camera',group:'physical',cat:'数码',name:'旅行相机',icon:'camera',tint:'#E1E6EC',status:'active',countable:true,price:4599,bought:isoOffset(-365),value:3200,
   meta:[['购入价','¥4,599'],['当前估值','¥3,200'],['状态','演示数据']],
   events:[{date:isoOffset(-365),title:'录入资产',delta:'−¥4,599',sub:'合成示例',kind:'buy'}]},
  {id:'demo-bike',group:'physical',cat:'交通',name:'通勤自行车',icon:'car',tint:'#D7E0E6',status:'active',countable:true,price:2800,bought:isoOffset(-120),value:1800,
   due:[{label:'保养提醒',date:isoOffset(45)}],
   meta:[['购入价','¥2,800'],['当前估值','¥1,800'],['状态','演示数据'],['保养提醒',isoOffset(45)]],
   events:[{date:isoOffset(-120),title:'录入资产',delta:'−¥2,800',sub:'合成示例',kind:'buy'}]},
  {id:'demo-gift',group:'entitle',cat:'权益',name:'演示礼品卡',icon:'card',tint:'#EAE1E7',status:'active',countable:true,value:120,validUntil:isoOffset(14),unitName:'元',
   meter:{type:'cont',total:500,remaining:120},
   meta:[['有效期至',isoOffset(14)],['面值','¥500.00'],['当前余额','¥120.00']],
   events:[{date:isoOffset(-30),title:'消费记录',delta:'−¥380',sub:'合成示例',kind:'spend'}]},
  {id:'demo-member',group:'member',cat:'会员',name:'演示年度会员',icon:'member',tint:'#E3E8DE',status:'active',countable:false,value:0,validUntil:isoOffset(25),
   meta:[['有效期至',isoOffset(25)],['状态','演示数据']],
   events:[{date:isoOffset(-340),title:'开通会员',delta:'−¥299',sub:'合成示例',kind:'buy'}]},
];

/* ---------- helpers ---------- */
function money(n,o){o=o||{};const neg=n<0;let v=Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:o.cents===false?0:2,maximumFractionDigits:o.cents===false?0:2});let s=(o.sym!==false?'¥':'')+v;if(o.sign)s=(neg?'−':'+')+s;else if(neg)s='−'+s;return s;}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function parseDate(d){const[y,m,da]=d.split('-').map(Number);return new Date(y,m-1,da);}
function daysBetween(a,b){return Math.round((parseDate(b)-parseDate(a))/86400000);}
function addYears(d,n){const[y,m,da]=d.split('-').map(Number);return (y+n)+'-'+String(m).padStart(2,'0')+'-'+String(da).padStart(2,'0');}
function mdLabel(d){const[,m,da]=d.split('-');return parseInt(m)+'月'+parseInt(da)+'日';}
function daysHeld(a){return a.bought?Math.max(1,daysBetween(a.bought,TODAY)):0;}
function dailyCost(a){return (a.price&&a.bought)?a.price/daysHeld(a):0;}
function heldText(a){const d=daysHeld(a);if(d>=365){return (d/365).toFixed(1)+' 年';}return d+' 天';}
function cloneAssets(assets){return assets.map(a=>JSON.parse(JSON.stringify(a)));}
function exportableAssets(){return cloneAssets(ASSETS).map(a=>{if(a.photoSource==='generated_placeholder')delete a.photo;return a;});}
async function prepareBackup(){
  await Promise.all([...pendingEdits]);
  const assets=exportableAssets();
  const missing=[];
  for(const a of assets){
    if(!a.photo||/^data:image\//i.test(a.photo))continue;
    a.photo=await makeThumb(a.photo);
    if(!/^data:image\//i.test(a.photo))missing.push(a.name);
  }
  if(missing.length)throw new Error('以下资产的图片无法读取：'+missing.join('、')+'。请先在资产详情中重新添加照片，再导出完整备份。');
  return {schema:'held-ledger-export',version:1,exportedAt:new Date().toISOString(),assets};
}
function validateImportAssets(input){
  if(!input||input.schema!=='held-ledger-export'||input.version!==1)throw new Error('请选择 version 1 的持有 JSON 备份');
  const payload=input.assets;
  if(!Array.isArray(payload))throw new Error('JSON 中没有可导入的 assets 数组');
  const ids=new Set();
  return payload.map((raw,i)=>{
    const a=raw&&typeof raw==='object'?JSON.parse(JSON.stringify(raw)):null;
    if(!a||!a.id||!a.name)throw new Error('第 '+(i+1)+' 项缺少 id 或 name');
    if(ids.has(a.id))throw new Error('资产 id 重复：'+a.id);
    ids.add(a.id);
    a.group=a.group||'physical';
    a.cat=a.cat||'其他';
    a.status=a.status||'active';
    a.countable=a.countable!==false;
    a.value=Number(a.value)||0;
    a.meta=Array.isArray(a.meta)?a.meta:[];
    a.events=Array.isArray(a.events)?a.events:[{date:TODAY,title:'导入资产',delta:'',sub:'JSON',kind:'in'}];
    if(a.photo&&!a.photoSource)a.photoSource=/^data:image\//.test(a.photo)?'user_upload':'bundled_demo';
    return a;
  });
}
function photoSourceLabel(src){
  const map={
    bundled_demo:'内置演示图',
    user_upload:'用户上传',
    ai_input_upload:'AI 识别输入图',
    generated_placeholder:'生成占位图',
  };
  return map[src]||'未标注';
}

/* ---------- 缩略图流程：上传 → 居中裁切缩放 → 存储 → 展示 ---------- */
// 把任意图片 dataURL 压成方形缩略图（默认 360px、JPEG），减小 IndexedDB 体积。
function makeThumb(src,size){
  size=size||360;
  return new Promise(resolve=>{
    const img=new Image();
    img.onload=()=>{
      try{
        const s=Math.min(img.width,img.height);
        const sx=(img.width-s)/2, sy=(img.height-s)/2;
        const cv=document.createElement('canvas');cv.width=size;cv.height=size;
        const ctx=cv.getContext('2d');
        ctx.drawImage(img,sx,sy,s,s,0,0,size,size);
        resolve(cv.toDataURL('image/jpeg',0.82));
      }catch(e){resolve(src);} // 跨域/解码失败时回退原图
    };
    img.onerror=()=>resolve(src);
    img.src=src;
  });
}
// 调亮/调暗一个 #rrggbb 颜色
function shade(hex,amt){const n=parseInt(hex.replace('#',''),16);let r=(n>>16)+amt,g=((n>>8)&255)+amt,b=(n&255)+amt;const cl=x=>Math.max(0,Math.min(255,x));return '#'+(0x1000000+(cl(r)<<16)+(cl(g)<<8)+cl(b)).toString(16).slice(1);}
// 没有真实照片时，按资产色调 + 图标生成一张占位缩略图（data-URI SVG）
function svgThumb(a){
  const base=a.tint||'#DDE6DD', mid=shade(base,-48), deep=shade(base,-88), glyph=ICON[a.icon]||'';
  const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 90">'+
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="'+mid+'"/><stop offset="1" stop-color="'+deep+'"/></linearGradient>'+
    '<radialGradient id="h" cx="0.3" cy="0.24" r="0.95"><stop offset="0" stop-color="#fff" stop-opacity="0.3"/><stop offset="0.6" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>'+
    '<rect width="120" height="90" fill="url(#g)"/><rect width="120" height="90" fill="url(#h)"/>'+
    '<g transform="translate(60 45) scale(2.1) translate(-12 -12)" fill="none" stroke="#fff" stroke-opacity="0.9" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+glyph+'</g></svg>';
  // encodeURIComponent leaves ()  raw — they break the unquoted CSS url(...) token, so encode them too
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg).replace(/\(/g,'%28').replace(/\)/g,'%29');
}
// 启动后：给没有真实照片的实物/权益资产补一张生成缩略图（仅内存，不写库）
function ensureThumbs(){ASSETS.forEach(a=>{if(a.group!=='cash'&&!a.photo){a.photo=svgThumb(a);a.photoSource='generated_placeholder';}});}
