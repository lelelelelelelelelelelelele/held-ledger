"use strict";
/* View rendering, route state and user interaction orchestration. */
const S={screen:'overview',currentAsset:null,cat:'全部',status:'全部',sort:'default',valueMode:'all',edit:null,nl:null,viewMode:'card',ovMode:'list',searchOpen:false,query:''};
let nlSeq=1;
let editorRouteTimer=null;

function liveAssets(){return ASSETS.filter(a=>a.status!=='sold'&&a.status!=='retired');}
function isMemberAsset(a){return a.group==='member'||a.cat==='会员';}
function groupAssets(gid){
  if(gid==='financial')return ASSETS.filter(a=>(a.group==='cash'||a.group==='financial'||a.group==='invest')&&a.countable);
  if(gid==='member')return ASSETS.filter(a=>isMemberAsset(a)&&a.countable);
  if(gid==='entitle')return ASSETS.filter(a=>a.group==='entitle'&&!isMemberAsset(a)&&a.countable);
  return ASSETS.filter(a=>a.group===gid&&a.countable);
}
function groupValue(gid){return groupAssets(gid).reduce((s,a)=>s+a.value,0);}
function cashValue(){return ASSETS.filter(a=>a.group==='cash'&&a.countable).reduce((s,a)=>s+a.value,0);}
function netWorth(){if(S.valueMode==='cashOnly')return cashValue();return ASSETS.filter(a=>a.countable).reduce((s,a)=>s+a.value,0);}
function pctOf(v,total){return total>0?Math.round(v/total*100):0;}
function nonCashValue(){return netWorth()-cashValue()+ (S.valueMode==='cashOnly'? (ASSETS.filter(a=>a.countable&&a.group!=='cash').reduce((s,a)=>s+a.value,0)) :0);}
function totalDaily(){return ASSETS.filter(a=>(a.status==='active'||a.status==='idle')&&a.price).reduce((s,a)=>s+dailyCost(a),0);}
function physItems(){return ASSETS.filter(a=>a.group==='physical');}
function statusCounts(){const c={active:0,idle:0,retired:0,sold:0};physItems().forEach(a=>{c[a.status]=(c[a.status]||0)+1;});return c;}
function deadlineDays(a){
  const ds=[];
  if(a.validUntil)ds.push(daysBetween(TODAY,a.validUntil));
  if(a.due)a.due.forEach(d=>ds.push(daysBetween(TODAY,d.date)));
  return ds.length?Math.min(...ds):Number.POSITIVE_INFINITY;
}
function isExpiring(a){const n=deadlineDays(a);return Number.isFinite(n)&&n<=30;}
function isOverdue(a){const n=deadlineDays(a);return Number.isFinite(n)&&n<0;}
function todos(){
  const list=[];
  ASSETS.forEach(a=>{
    if(a.validUntil){const n=daysBetween(TODAY,a.validUntil);if(n<=60)list.push({a,label:'有效期',date:a.validUntil,days:n});}
    if(a.due)a.due.forEach(d=>{const n=daysBetween(TODAY,d.date);if(n<=60)list.push({a,label:d.label,date:d.date,days:n});});
  });
  return list.sort((x,y)=>x.days-y.days);
}

/* depletion ruler */
function rulerHTML(a,full){
  const m=a.meter;if(!m)return '';
  if(m.type==='discrete'){let t='';for(let i=0;i<m.total;i++)t+='<div class="tick '+(i<m.remaining?'left':'used')+'"></div>';
    const lg=full?'<div class="legend"><span>已用 '+(m.total-m.remaining)+' · 共 '+m.total+' '+a.unitName+'</span><span class="hi'+(isExpiring(a)?' warn':'')+'">剩余 '+m.remaining+' '+a.unitName+'</span></div>':'';
    return '<div class="ruler discrete"><div class="scale">'+t+'</div>'+lg+'</div>';}
  if(m.type==='cont'){const p=Math.max(2,Math.round(m.remaining/m.total*100));
    const lg=full?'<div class="legend"><span>面值 '+money(m.total)+'</span><span class="hi'+(isExpiring(a)?' warn':'')+'">剩余 '+money(m.remaining)+'</span></div>':'';
    return '<div class="ruler cont"><div class="scale"><i style="width:'+p+'%"></i></div>'+lg+'</div>';}
  if(m.type==='time'){const tot=daysBetween(m.start,m.end),pa=daysBetween(m.start,TODAY),p=Math.max(2,Math.min(100,Math.round(pa/tot*100))),left=daysBetween(TODAY,m.end),w=left<=30;
    const lg=full?'<div class="legend"><span>'+m.label+' '+m.end+'</span><span class="hi'+(w?' warn':'')+'">'+(left<0?'已过期':'剩余 '+left+' 天')+'</span></div>':'';
    return '<div class="ruler time"><div class="scale"><i class="'+(w?'warn':'')+'" style="width:'+p+'%"></i><span class="pin" style="left:'+p+'%"></span></div>'+lg+'</div>';}
  return '';
}
function statusPill(a){
  const st=isOverdue(a)&&(a.status==='active')?{label:'已过期',cls:'overdue'}:(isExpiring(a)&&(a.status==='active')?{label:'临期',cls:'expiring'}:{label:STATUS[a.status].label,cls:a.status});
  return '<span class="pill '+st.cls+'"><span class="dot"></span>'+st.label+'</span>';
}
function entitleTotal(a){
  if(a.mileage&&a.mileage.total)return Number(a.mileage.total).toLocaleString('en-US');
  if(a.meter&&a.meter.type==='discrete')return Number(a.meter.remaining||0).toLocaleString('en-US');
  return '';
}
function isEntitleLike(a){return a.group==='entitle'||isMemberAsset(a);}
function entitleUnit(a){return (a.mileage&&'里程')||a.unitName||'权益';}
function entitleSub(a){
  if(a.mileage){
    if(a.mileage.rollingMonths)return '滚动 '+a.mileage.rollingMonths+' 个月';
    if(a.mileage.expiringSoonDate)return '首批到期 '+a.mileage.expiringSoonDate;
  }
  if(a.unitName==='会员'||/会员/.test(a.name))return a.validUntil?'到期 '+a.validUntil:'会员权益';
  if(a.validUntil)return '有效期 '+a.validUntil;
  return a.cat||'权益';
}
function entitleFoot(a){
  if(a.mileage){
    if(a.value>0)return '估值 '+money(a.value);
    if(a.mileage.remainingExpiry)return '余量至 '+a.mileage.remainingExpiry;
    if(a.mileage.lastUpdate)return '上次更新 '+a.mileage.lastUpdate;
  }
  if(a.unitName==='会员'||/会员/.test(a.name))return '会员';
  return '折算价值 '+money(a.value);
}
function entitleMilesTotal(){
  return ASSETS.filter(a=>a.group==='entitle'&&a.mileage).reduce((s,a)=>s+Number(a.mileage.total||0),0);
}
function groupSubText(gid,cnt,pct){
  if(gid==='entitle'){
    const miles=entitleMilesTotal();
    return cnt+' 项 · '+(miles?miles.toLocaleString('en-US')+' 里程':'权益记录');
  }
  if(gid==='member')return cnt+' 项 · 到期提醒';
  if(gid==='financial')return cnt+' 项 · 占 '+pct+'%';
  return cnt+' 项 · 占 '+pct+'%';
}
function groupValueText(gid,v){
  if(gid==='member')return groupAssets('member').length+' 项';
  if(gid==='entitle'){
    const miles=entitleMilesTotal();
    return v>0?money(v):(miles?miles.toLocaleString('en-US')+' 里程':money(v));
  }
  return money(v);
}
function groupPctText(gid,pct,v){
  if(gid==='entitle')return v>0?'估值':'权益';
  if(gid==='member')return '会员';
  return '占 '+pct+'%';
}

/* ---------- shell ---------- */
const TABS=[
  {id:'overview',icon:'home',label:'总览'},
  {id:'assets',icon:'grid',label:'资产'},
  {id:'action',icon:'plus',label:'',add:true},
  {id:'todos',icon:'bell',label:'待办'},
  {id:'me',icon:'user',label:'我的'},
];
function renderTabs(){
  const cur=({'asset-detail':'assets','invest':'assets','byok':'me'})[S.screen]||S.screen;
  document.getElementById('tabbar').innerHTML=TABS.map(t=>{
    if(t.add)return '<button class="tab add" data-act="nav" data-arg="action" aria-label="记一次变动"><span class="plus">'+svg('plus')+'</span></button>';
    const on=cur===t.id?' on':'';
    return '<button class="tab'+on+'" data-act="nav" data-arg="'+t.id+'"'+(on?' aria-current="page"':'')+'><span>'+svg(t.icon)+'</span><span class="tl">'+t.label+'</span></button>';
  }).join('');
}
function appbar(title,o){o=o||{};let left='';
  if(o.back)left='<button class="back" data-act="nav" data-arg="'+o.back+'" aria-label="返回">'+svg('back')+'</button>';
  const right=o.sub?'<span class="sub">'+o.sub+'</span>':(o.search?'<button class="iconbtn" data-act="search" aria-label="搜索">'+svg('search')+'</button>':'');
  const safeTitle=o.brand?'<span class="brand">持有</span>':esc(title);
  document.getElementById('appbar').innerHTML=left+'<h1>'+safeTitle+'</h1>'+right;
}
function setScreen(html){const s=document.getElementById('screen');s.className='screen';s.innerHTML=html;document.getElementById('main').scrollTop=0;}

/* ---------- Overview ---------- */
function viewOverview(){
  appbar('持有',{brand:true,sub:'资产台账 · '+parseInt(TODAY.slice(5,7))+'月'+parseInt(TODAY.slice(8,10))+'日'});
  const sc=statusCounts(),total=physItems().length||1;
  const segColor={active:STATUS.active.color,idle:STATUS.idle.color,retired:STATUS.retired.color,sold:STATUS.sold.color};
  const segs=['active','idle','retired','sold'].filter(k=>sc[k]).map(k=>'<i style="flex:'+sc[k]+';background:'+segColor[k]+'"></i>').join('');
  const legend=['active','idle','retired','sold'].map(k=>'<span class="it"><span class="d" style="background:'+segColor[k]+'"></span>'+STATUS[k].label+' <span class="n">'+sc[k]+'</span></span>').join('');
  const nw=netWorth();
  const groups=GROUPS.map(g=>{
    if(g.placeholder){const p=g.placeholderText||'即将上线';return '<div class="group-row ph" data-act="nav" data-arg="invest" role="button" tabindex="0" aria-label="'+g.name+'，'+p+'"><div class="ic">'+svg(g.icon)+'</div><div class="body"><div class="nm">'+g.name+'</div><div class="sub">'+g.sub+'</div></div><div class="right"><div class="val">'+p+'</div></div><div class="chev">'+svg('chevR')+'</div></div>';}
    const v=groupValue(g.id),cnt=groupAssets(g.id).length,pct=pctOf(v,nw);
    return '<div class="group-row" data-act="group" data-arg="'+g.id+'" role="button" tabindex="0" aria-label="'+g.name+'，'+groupValueText(g.id,v)+'"><div class="ic">'+svg(g.icon)+'</div><div class="body"><div class="nm">'+g.name+'</div><div class="sub">'+groupSubText(g.id,cnt,pct)+'</div><div class="sharebar"><i style="width:'+pct+'%"></i></div></div><div class="right"><div class="val">'+groupValueText(g.id,v)+'</div></div><div class="chev">'+svg('chevR')+'</div></div>';
  }).join('');
  const groupCards=GROUPS.map(g=>{
    if(g.placeholder){const p=g.placeholderText||'即将上线';return '<div class="gcard ph" data-act="nav" data-arg="invest" role="button" tabindex="0" aria-label="'+g.name+'，'+p+'"><div class="top"><div class="ic">'+svg(g.icon)+'</div><div class="pct">'+p+'</div></div><div class="nm">'+g.name+'</div><div class="cnt">'+g.sub+'</div><div class="val">— —</div><div class="sharebar"><i style="width:0%"></i></div></div>';}
    const v=groupValue(g.id),cnt=groupAssets(g.id).length,pct=pctOf(v,nw);
    return '<div class="gcard" data-act="group" data-arg="'+g.id+'" role="button" tabindex="0" aria-label="'+g.name+'，'+groupValueText(g.id,v)+'"><div class="top"><div class="ic">'+svg(g.icon)+'</div><div class="pct">'+groupPctText(g.id,pct,v)+'</div></div><div class="nm">'+g.name+'</div><div class="cnt">'+groupSubText(g.id,cnt,pct)+'</div><div class="val num">'+groupValueText(g.id,v)+'</div><div class="sharebar"><i style="width:'+pct+'%"></i></div></div>';
  }).join('');
  const ovToggle='<span class="view-toggle"><button class="'+(S.ovMode==='list'?'on':'')+'" data-act="ovmode" data-arg="list" aria-label="列表视图">'+svg('list')+'</button><button class="'+(S.ovMode==='card'?'on':'')+'" data-act="ovmode" data-arg="card" aria-label="卡片视图">'+svg('grid2')+'</button></span>';
  const groupsSection=S.ovMode==='card'?('<div class="group-grid">'+groupCards+'</div>'):('<div class="block">'+groups+'</div>');
  const td=todos().slice(0,2).map(t=>remindCard(t)).join('');
  const recent=ASSETS.flatMap(a=>a.events.map(e=>({a,e}))).filter(x=>x.e.date.startsWith('2026')).sort((x,y)=>y.e.date.localeCompare(x.e.date)).slice(0,3).map(x=>{
    const down=/^[−-]/.test(x.e.delta);
    return '<div class="metarow" style="border-color:var(--hair-2)"><span class="mk" style="color:var(--ink);font-weight:500">'+x.e.title+' · '+x.a.name+'</span><span class="mv'+(x.e.delta?'':' cn')+'" style="color:'+(down?'var(--ink)':(x.e.delta?'var(--green)':'var(--slate)'))+'">'+(x.e.delta||'—')+'</span></div>';
  }).join('');
  const firstRun=!ASSETS.length?'<div class="empty-big"><div class="ic">'+svg('plus')+'</div><div class="t">从第一项资产开始</div><div class="d">可以用一句话录入，比如「上个月 3999 买了一台相机」。</div><a class="cta" data-act="nav" data-arg="action" role="button" tabindex="0">添加第一项资产</a></div>':'';
  setScreen(
    '<div class="nethero"><div class="toprow"><div class="k">'+svg('bank')+'总资产净值</div>'+
      '<button class="valtoggle" data-act="valmode" aria-label="切换估值口径">'+svg('toggle')+(S.valueMode==='all'?'含非现金':'仅现金')+'</button></div>'+
      '<div class="metrics"><div class="net"><div class="v num"><span class="sym">¥</span>'+money(nw,{sym:false})+'</div></div>'+
        '<div class="daily"><div class="dk">日均成本</div><div class="dv num">¥'+totalDaily().toFixed(0)+'<span class="u">/天</span></div></div></div>'+
      '<div class="note">'+(S.valueMode==='all'?'含非现金估值 · 非现金 '+money(nw-cashValue()):'仅现金 · 非现金 '+money(ASSETS.filter(a=>a.countable&&a.group!=='cash').reduce((s,a)=>s+a.value,0))+' 未计入')+'</div>'+
      '<div class="statusbar"><div class="bar">'+segs+'</div><div class="legend">'+legend+'</div></div>'+
    '</div>'+firstRun+
    '<div class="section-label">资产分组<span class="sec-right">'+ovToggle+'<span class="more" data-act="nav" data-arg="assets">查看全部</span></span></div>'+
    groupsSection+
    '<div class="section-label">待办<span class="more" data-act="nav" data-arg="todos">全部 '+todos().length+' 项</span></div>'+
    '<div class="block">'+(td||'<div class="empty">暂无临期或待维护的资产</div>')+'</div>'+
    '<div class="section-label">最近变动</div>'+
    '<div class="block">'+(recent||'<div class="empty">暂无变动</div>')+'</div>'+
    '<div style="height:8px"></div>'
  );
}
function remindCard(t){
  const a=t.a;
  const dueText=t.days<0?'已过期 '+Math.abs(t.days)+' 天':(t.days===0?'今天到期':t.days+'天');
  return '<div class="remind" data-act="asset" data-arg="'+a.id+'" role="button" tabindex="0" aria-label="'+a.name+' '+t.label+'，'+dueText+'">'+
    '<div class="head"><div class="ic">'+svg(a.icon)+'</div><div style="flex:1"><div class="nm">'+a.name+'</div><div class="meta">'+t.label+' · '+t.date+'</div></div>'+
    '<span class="pill '+(t.days<0?'overdue':'expiring')+'">'+dueText+'</span></div>'+rulerHTML(a,true)+'</div>';
}

/* ---------- Assets list ---------- */
function viewAssets(){
  appbar('资产',{search:true});
  const cats=['全部','现金','数码','家居','交通','权益','会员'];
  const states=['全部','服役中','闲置','临期','已退役','已卖出'];
  const sorts=[['default','默认排序'],['valueDesc','价值最高'],['recentBought','最近购入'],['dailyDesc','日均最高'],['dueSoon','到期最近']];
  const catTabs=cats.map(c=>'<button class="cat-tab'+(S.cat===c?' on':'')+'" data-act="cat" data-arg="'+c+'">'+c+'</button>').join('');
  const chips=states.map(s=>'<button class="chip'+(S.status===s?' on':'')+'" data-act="status" data-arg="'+s+'">'+s+'</button>').join('');
  const sortSelect='<div class="sortbar"><select class="sort-select" id="assetSort" aria-label="资产排序">'+sorts.map(s=>'<option value="'+s[0]+'"'+(S.sort===s[0]?' selected':'')+'>'+s[1]+'</option>').join('')+'</select></div>';
  const toggle='<div class="view-toggle"><button class="'+(S.viewMode==='table'?'on':'')+'" data-act="viewmode" data-arg="table" aria-label="表格视图">'+svg('table')+'</button><button class="'+(S.viewMode==='list'?'on':'')+'" data-act="viewmode" data-arg="list" aria-label="列表视图">'+svg('list')+'</button><button class="'+(S.viewMode==='card'?'on':'')+'" data-act="viewmode" data-arg="card" aria-label="卡片视图">'+svg('grid2')+'</button></div>';
  const search=S.searchOpen?'<div class="asset-search"><input id="assetSearch" value="'+esc(S.query)+'" placeholder="搜索名称、分类或单位" aria-label="搜索资产"/><button data-act="close-search">关闭</button></div>':'';
  setScreen(search+'<div class="cat-tabs">'+catTabs+toggle+'</div><div class="chips">'+chips+'</div>'+sortSelect+'<div id="itemList">'+itemsHTML()+'</div><div style="height:8px"></div>');
  if(S.searchOpen){const input=document.getElementById('assetSearch');if(input){input.focus();input.setSelectionRange(input.value.length,input.value.length);}}
}
function itemsHTML(){
  let list=ASSETS.slice();
  if(!list.length)return '<div class="empty-big"><div class="ic">'+svg('box')+'</div><div class="t">还没有资产</div><div class="d">先添加一件实物、一个账户或一张权益卡券。</div><a class="cta" data-act="nav" data-arg="action" role="button" tabindex="0">去添加</a></div>';
  const query=(S.query||'').trim().toLocaleLowerCase();
  if(query)list=list.filter(a=>[a.name,a.cat,a.unitName].some(v=>String(v||'').toLocaleLowerCase().includes(query)));
  if(S.cat!=='全部')list=list.filter(a=>a.cat===S.cat);
  if(S.status!=='全部'){const map={'服役中':'active','闲置':'idle','已退役':'retired','已卖出':'sold'};
    if(S.status==='临期')list=list.filter(a=>isExpiring(a));else list=list.filter(a=>a.status===map[S.status]);}
  list.sort(assetComparator(S.sort));
  if(!list.length)return '<div class="empty">没有符合条件的资产</div>';
  if(S.viewMode==='card')return '<div class="card-grid">'+list.map(gridCard).join('')+'</div>';
  if(S.viewMode==='table')return assetTable(list);
  return '<div class="items">'+list.map(itemCard).join('')+'</div>';
}
function assetComparator(mode){
  const rank={active:0,idle:1,retired:3,sold:4};
  const defaultCmp=(a,b)=>(rank[a.status]||9)-(rank[b.status]||9);
  const boughtTs=a=>a.bought?parseDate(a.bought).getTime():0;
  return (a,b)=>{
    if(mode==='valueDesc')return (b.value||0)-(a.value||0)||defaultCmp(a,b)||a.name.localeCompare(b.name,'zh-CN');
    if(mode==='recentBought')return boughtTs(b)-boughtTs(a)||defaultCmp(a,b)||a.name.localeCompare(b.name,'zh-CN');
    if(mode==='dailyDesc')return dailyCost(b)-dailyCost(a)||defaultCmp(a,b)||a.name.localeCompare(b.name,'zh-CN');
    if(mode==='dueSoon')return deadlineDays(a)-deadlineDays(b)||defaultCmp(a,b)||a.name.localeCompare(b.name,'zh-CN');
    return defaultCmp(a,b)||a.name.localeCompare(b.name,'zh-CN');
  };
}
/* 表格视图：每一项资产一行，资产 / 数值 / 日均 三列对齐 */
function assetTable(list){
  const head='<div class="thead"><span>资产</span><span class="r">数值</span><span class="r">日均</span></div>';
  const rows=list.map(a=>{
    const faded=(a.status==='retired'||a.status==='sold')?' faded':'';
    const net=isEntitleLike(a)&&entitleTotal(a)?entitleTotal(a)+' '+entitleUnit(a):money(a.status==='sold'?(a.soldPrice||0):a.value,{cents:false});
    const hasDaily=a.group==='physical'&&(a.status==='active'||a.status==='idle');
    const daily=hasDaily?('¥'+dailyCost(a).toFixed(2)):'—';
    return '<div class="trow'+faded+'" data-act="asset" data-arg="'+a.id+'" role="button" tabindex="0" aria-label="'+a.name+'，'+STATUS[a.status].label+'">'+
      '<div class="nm"><span class="dot" style="background:'+STATUS[a.status].color+'"></span><span class="t">'+a.name+'</span></div>'+
      '<div class="cell">'+net+'</div>'+
      '<div class="cell'+(hasDaily?'':' muted')+'">'+daily+'</div></div>';
  }).join('');
  return '<div class="asset-table">'+head+rows+'</div>';
}
function itemCard(a){
  const faded=(a.status==='retired'||a.status==='sold')?' faded':'';
  let right='';
  if(a.group==='cash'){right='<div class="big num">'+money(a.value)+'</div>'+statusPill(a);}
  else if(isEntitleLike(a)){right=statusPill(a);}
  else{ // physical durable
    if(a.status==='sold')right='<div class="big num" style="color:var(--sold)">'+money(a.soldPrice)+'</div>'+statusPill(a);
    else if(a.status==='retired')right=statusPill(a);
    else right='<div class="dcap">¥'+dailyCost(a).toFixed(2)+'<span class="u">/天</span></div>'+statusPill(a);
  }
  let sub='';
  if(a.group==='cash')sub=a.meta&&a.meta[0]?a.meta[0][1]:'账户';
  else if(isEntitleLike(a))sub=entitleSub(a);
  else sub='总价 '+money(a.price,{cents:false})+' · 已持有 '+heldText(a);
  const ruler=isEntitleLike(a)?rulerHTML(a,false):'';
  return '<div class="icard'+faded+'" data-act="asset" data-arg="'+a.id+'" role="button" tabindex="0" aria-label="'+a.name+'，'+STATUS[a.status].label+'">'+
    '<div class="thumb'+(a.photo?' photo':'')+'" style="'+(a.photo?'background-image:url('+a.photo+');background-size:cover;background-position:center':'background:'+a.tint)+'">'+(a.photo?'':svg(a.icon))+'</div>'+
    '<div class="body"><div class="nm">'+a.name+'</div><div class="sub">'+sub+'</div>'+ruler+'</div>'+
    '<div class="right">'+right+'</div></div>';
}
/* 预计服役年限（按类别），用于卡片「剩余 N 天」 */
const LIFE_YEARS={数码:8,家居:15,交通:15};
function serviceLeft(a){const ly=LIFE_YEARS[a.cat]||10;return Math.max(0,Math.round(ly*365-daysHeld(a)));}
/* 卡片视图：两列照片卡网格
   照片 + 状态角标 + 名称 + 原价·已用天数 + 醒目日均成本 + 衰减曲线 + 剩余天数 */
function gridCard(a){
  const faded=(a.status==='retired'||a.status==='sold')?' faded':'';
  const ph='<div class="ph'+(a.photo?' photo':'')+'" style="'+(a.photo?'background-image:url('+a.photo+')':'background:'+(a.tint||'var(--card-2)'))+'">'+(a.photo?'':svg(a.icon))+
    '<span class="gpill"><i style="background:'+STATUS[a.status].color+'"></i>'+STATUS[a.status].label+'</span></div>';
  let sub='',hero='',heroCls='',foot='';
  if(a.group==='cash'){
    sub=a.meta&&a.meta[0]?a.meta[0][1]:'账户';
    hero='¥<b>'+money(a.value,{cents:false,sym:false})+'</b>';heroCls=' cash';foot='当前余额';
  }else if(isEntitleLike(a)){
    sub=entitleSub(a);
    if(a.mileage){
      hero='<b>'+entitleTotal(a)+'</b><span class="u">'+entitleUnit(a)+'</span>';
      heroCls=' cash';foot=entitleFoot(a);
    }else if(a.unitName==='会员'||/会员/.test(a.name)){
      hero='<b>会员</b>';
      heroCls=' cash';foot=entitleFoot(a);
    }else{
      hero='¥<b>'+money(a.value,{cents:false,sym:false})+'</b>';
      heroCls=' cash';foot='折算价值 '+money(a.value);
    }
  }else if(a.status==='sold'){
    sub='持有 '+heldText(a);
    hero='¥<b>'+money(a.soldPrice||0,{cents:false,sym:false})+'</b>';heroCls=' sold';
    foot='折旧 '+money((a.soldPrice||0)-(a.price||0),{sign:true,cents:false});
  }else if(a.status==='retired'){
    sub='原价 '+money(a.price||0,{cents:false});
    hero='<b>已退役</b>';heroCls=' retired';foot='持有 '+heldText(a);
  }else{
    sub=money(a.price,{cents:false})+' · 已用 '+daysHeld(a)+' 天';
    hero='¥<b>'+dailyCost(a).toFixed(2)+'</b><span class="u">/天</span>';
    foot='剩余 '+serviceLeft(a).toLocaleString('en-US')+' 天';
  }
  const spark=(a.group==='physical'&&(a.status==='active'||a.status==='idle'))
    ?'<svg class="spark" viewBox="0 0 100 26" preserveAspectRatio="none"><path d="M2 5 C 22 7 26 20 50 22 S 84 24 98 24"/></svg>':'';
  return '<div class="gcell'+faded+'" data-act="asset" data-arg="'+a.id+'" role="button" tabindex="0" aria-label="'+a.name+'，'+STATUS[a.status].label+'">'+
    ph+
    '<div class="ginfo"><div class="gnm">'+a.name+'</div><div class="gsub">'+sub+'</div>'+
      '<div class="gcost'+heroCls+'">'+hero+'</div>'+spark+
      '<div class="gfoot">'+foot+'</div></div></div>';
}

/* ---------- Asset detail ---------- */
function viewAssetDetail(){
  const a=ASSETS.find(x=>x.id===S.currentAsset)||ASSETS[0];
  if(!a){
    appbar('资产详情',{back:'assets'});
    setScreen('<div class="empty-big"><div class="ic">'+svg('box')+'</div><div class="t">还没有可查看的资产</div><div class="d">添加第一项资产后，可以在这里查看估值、照片和变动记录。</div><a class="cta" data-act="nav" data-arg="action" role="button" tabindex="0">添加资产</a></div>');
    return;
  }
  appbar(a.name,{back:'assets'});
  // 有真实/占位照片 → 顶部整宽照片横幅；现金账户等无照片 → 小图标块
  const heroVisual=a.photo
    ?'<div class="dhero-photo" style="background-image:url('+a.photo+')"></div>'
    :'<div class="thumb" style="background:'+(a.tint||'var(--card-2)')+'">'+svg(a.icon)+'</div>';
  let hero='';
  if(a.group==='cash'){
    hero='<div class="dhero'+(a.photo?' has-photo':'')+'">'+heroVisual+'<div class="nm">'+a.name+'</div>'+
      '<div class="bal num"><span class="sym">¥</span>'+money(a.value,{sym:false})+'</div><div class="line">当前余额</div></div>';
  }else if(isEntitleLike(a)){
    let big='',line='';const m=a.meter;
    if(a.mileage){big=entitleTotal(a)+' <span class="u">'+entitleUnit(a)+'</span>';line=entitleSub(a)+' · '+entitleFoot(a);}
    else if(m&&m.type==='discrete'){big=m.remaining+' <span class="u">/ 共 '+m.total+' '+a.unitName+'</span>';line='折算价值 '+money(a.value);}
    else if(m&&m.type==='cont'){big=money(m.remaining);line='面值 '+money(m.total);}
    else if(m&&m.type==='time'){const left=daysBetween(TODAY,m.end);big=Math.max(0,left)+' <span class="u">天后到期</span>';line=entitleSub(a);}
    else{big=entitleUnit(a);line=entitleSub(a);}
    hero='<div class="dhero'+(a.photo?' has-photo':'')+'">'+heroVisual+'<div class="nm">'+a.name+'</div>'+
      '<div class="dailybig num">'+big+'</div><div class="line">'+line+'</div>'+rulerHTML(a,true)+'</div>';
  }else{ // physical
    if(a.status==='sold'){
      hero='<div class="dhero'+(a.photo?' has-photo':'')+'">'+heroVisual+'<div class="nm">'+a.name+' '+statusPill(a)+'</div>'+
        '<div class="bal num" style="color:var(--sold)">'+money(a.soldPrice)+'</div><div class="line">出售价 · 持有 '+heldText(a)+' · 折旧 '+money(a.soldPrice-a.price,{sign:true})+'</div></div>';
    }else{
      hero='<div class="dhero'+(a.photo?' has-photo':'')+'">'+heroVisual+'<div class="nm">'+a.name+' '+statusPill(a)+'</div>'+
        (a.status==='retired'?'<div class="bal num">'+money(a.price,{cents:false})+'</div><div class="line">原价 · 已退役 · 持有 '+heldText(a)+'</div>':
        '<div class="dailybig num">¥'+dailyCost(a).toFixed(2)+'<span class="u">/天</span></div><div class="line">总价 '+money(a.price,{cents:false})+' · 已持有 '+heldText(a)+'</div>')+'</div>';
    }
  }
  // actions
  let acts='';
  if(S.edit){
    const editType=S.edit.field==='bought'?'date':'text';
    const inputMode=S.edit.field==='bought'?'':' inputmode="decimal"';
    acts='<div class="editbar"><input id="editInput" type="'+editType+'"'+inputMode+' value="'+S.edit.value+'" aria-label="'+S.edit.label+'"/><button class="ok" data-act="edit-ok">确认</button><button class="cancel" data-act="edit-cancel">取消</button></div>';
  }else if(a.group==='cash'){
    acts='<div class="detail-actions"><button class="primary" data-act="edit" data-arg="balance">改余额</button><button data-act="edit-asset">编辑信息</button><button data-act="noop">转账记录</button><button class="danger" data-act="delete-asset" data-arg="'+a.id+'">删除</button></div>';
  }else if(isEntitleLike(a)){
    const m=a.meter;
    if(a.mileage)acts='<div class="detail-actions"><button class="primary" data-act="edit" data-arg="mileage">更新里程</button><button data-act="edit-asset">编辑信息</button><button class="danger" data-act="delete-asset" data-arg="'+a.id+'">删除</button></div>';
    else if(m&&m.type==='discrete')acts='<div class="detail-actions"><button class="primary" data-act="use" data-arg="'+a.id+'"'+(m.remaining<=0?' disabled':'')+'>'+(m.remaining<=0?'已用完':'用掉一'+a.unitName)+'</button><button data-act="edit-asset">编辑信息</button><button data-act="renew" data-arg="'+a.id+'">续期</button><button class="danger" data-act="delete-asset" data-arg="'+a.id+'">删除</button></div>';
    else if(m&&m.type==='cont')acts='<div class="detail-actions"><button class="primary" data-act="edit" data-arg="cont">改余额</button><button data-act="edit-asset">编辑信息</button><button data-act="renew" data-arg="'+a.id+'">续期</button><button class="danger" data-act="delete-asset" data-arg="'+a.id+'">删除</button></div>';
    else acts='<div class="detail-actions"><button class="primary" data-act="renew" data-arg="'+a.id+'">续期一年</button><button data-act="edit-asset">编辑信息</button><button data-act="noop">核对会籍</button><button class="danger" data-act="delete-asset" data-arg="'+a.id+'">删除</button></div>';
  }else if(a.status==='retired'){
    acts='<div class="detail-actions"><button class="primary" data-act="sell" data-arg="'+a.id+'">标记已售</button><button data-act="edit-asset">编辑信息</button><button data-act="setstatus" data-arg="active">恢复服役</button><button class="danger" data-act="delete-asset" data-arg="'+a.id+'">删除</button></div>';
  }else if(a.status==='sold'){
    acts='<div class="detail-actions"><button data-act="edit-asset">编辑信息</button><button data-act="noop">查看变现记录</button><button class="danger" data-act="delete-asset" data-arg="'+a.id+'">删除</button></div>';
  }else{
    acts='<div class="detail-actions"><button class="primary" data-act="edit" data-arg="value">更新估值</button><button data-act="edit-asset">编辑信息</button>'+
      (a.status==='idle'?'<button data-act="setstatus" data-arg="active">恢复服役</button>':'<button data-act="setstatus" data-arg="idle">标记闲置</button>')+
      '<button data-act="edit" data-arg="bought">改购入日</button><button data-act="sell" data-arg="'+a.id+'">标记已售</button><button data-act="setstatus" data-arg="retired">标记退役</button><button class="danger" data-act="delete-asset" data-arg="'+a.id+'">删除</button></div>';
  }
  const metaRows=a.meta.slice();
  if(a.photoSource)metaRows.push(['图片来源',photoSourceLabel(a.photoSource)]);
  const meta=metaRows.map(r=>'<div class="metarow"><span class="mk">'+r[0]+'</span><span class="mv'+(/[¥0-9]/.test(r[1])?'':' cn')+'">'+r[1]+'</span></div>').join('');
  const evs=a.events.map(e=>{const down=/^[−-]/.test(e.delta),up=/^[+]/.test(e.delta);
    return '<div class="tlrow"><div class="rail"><span class="dot'+(e.kind==='spend'||e.kind==='retire'||e.kind==='sell'?' spent':'')+'"></span><span class="line"></span></div><div class="c"><div class="t1"><span>'+e.title+'</span><span class="delta'+(down?' down':(up?' up':''))+'">'+(e.delta||'')+'</span></div><div class="t2">'+mdLabel(e.date)+(e.sub?' · '+e.sub:'')+'</div></div></div>';}).join('');
  const hasRealPhoto=a.photo&&a.photo.indexOf('data:image/svg')!==0; // 生成占位图(svg) 视为「未设照片」
  const photoRow=(!S.edit&&a.group!=='cash')?
    '<div class="photo-row"><button class="photo-btn" data-act="pickphoto">'+svg('camera')+(hasRealPhoto?'更换照片':'添加照片')+'</button>'+
    '<input type="file" id="assetPhoto" accept="image/*" style="display:none"/></div>':'';
  setScreen(hero+acts+photoRow+
    '<div class="section-label">资产信息</div><div class="block">'+meta+'</div>'+
    '<div class="section-label">变动记录<span class="muted">'+a.events.length+' 条</span></div><div class="block"><div class="timeline">'+evs+'</div></div>'+
    '<div style="height:8px"></div>');
  if(S.edit){const inp=document.getElementById('editInput');if(inp){inp.focus();inp.select();}}
  const pin=document.getElementById('assetPhoto');
  if(pin)pin.addEventListener('change',ev=>{
    const f=ev.target.files&&ev.target.files[0];if(!f)return;
    persistEdit(async()=>{a.photo=await makeThumb(await readImage(f));a.photoSource='user_upload';a.photoUpdated=TODAY;await saveAssets();showStamp('已更新照片');viewAssetDetail();});
  });
}

/* ---------- Todos ---------- */
function viewTodos(){
  appbar('待办',{sub:'资产不遗忘'});
  const all=todos();
  if(!all.length){setScreen('<div class="empty-big"><div class="ic">'+svg('check')+'</div><div class="t">都处理好了</div><div class="d">没有临期、待续期或需维护的资产。</div></div>');return;}
  const overdue=all.filter(t=>t.days<0),urgent=all.filter(t=>t.days>=0&&t.days<=30),later=all.filter(t=>t.days>30);
  let html='';
  if(overdue.length){html+='<div class="section-label">已过期 · '+overdue.length+' 项</div><div class="block">'+overdue.map(remindCard).join('')+'</div>';}
  if(urgent.length){html+='<div class="section-label">30 天内 · '+urgent.length+' 项</div><div class="block">'+urgent.map(remindCard).join('')+'</div>';}
  if(later.length){html+='<div class="section-label">60 天内 · '+later.length+' 项</div><div class="block">'+later.map(remindCard).join('')+'</div>';}
  setScreen(html+'<div style="height:8px"></div>');
}

/* ---------- Action ---------- */
function viewAction(){
  appbar('记一次变动',{back:'overview'});
  const tmpls=[['plane','里程'],['plane','航段'],['card','礼品卡'],['car','车辆'],['laptop','数码'],['member','会员'],['ticket','票券'],['bank','现金账户']];
  const tg=tmpls.map(t=>'<button class="tmpl" data-act="addtmpl" data-arg="'+t[1]+'"><div class="ic">'+svg(t[0])+'</div><div class="l">'+t[1]+'</div></button>').join('');
  const quick=liveAssets().filter(a=>a.group!=='cash').slice(0,6).map(itemCard).join('')||'<div class="empty">添加资产后，快捷变动会出现在这里。</div>';
  setScreen(
    smartAddCard()+
    '<div class="action-hero"><button data-act="addtmpl" data-arg="资产"><div class="ic">'+svg('plus')+'</div><div class="t">添加资产</div><div class="d">登记一件新资产或账户</div></button>'+
      '<button class="alt" data-act="nav" data-arg="assets"><div class="ic">'+svg('swap')+'</div><div class="t">记一次变动</div><div class="d">改余额 · 用掉 · 续期 · 估值</div></button></div>'+
    '<div class="section-label">添加资产 · 选模板</div><div class="tmpl-grid">'+tg+'</div>'+
    '<div class="section-label">快捷变动 · 选一项资产</div><div class="items">'+quick+'</div>'+
    '<div style="height:8px"></div>'
  );
  const _im=document.getElementById('nlImg');
  if(_im) _im.addEventListener('change',ev=>{const f=ev.target.files&&ev.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{const ta=document.getElementById('nlInput');const text=ta?ta.value.trim():'';S.nl={text,image:rd.result,loading:true,result:null,error:null};viewAction();runNL(text,rd.result);};rd.readAsDataURL(f);});
}

/* ---------- Generic asset editor ---------- */
const EDITOR_KINDS=[['physical','实物资产'],['cash','现金账户'],['mileage','里程'],['entitle','权益余额'],['member','会员权益'],['custom','其他资产']];
const EDITOR_PRESETS={
  '资产':{kind:'custom',cat:'其他',name:'',unit:'',value:'',price:'',bought:'',validUntil:'',rate:'700',faceValue:'',note:''},
  '里程':{kind:'mileage',cat:'权益',name:'',unit:'里程',value:'',price:'',bought:'',validUntil:'',rate:'700',faceValue:'',note:''},
  '航段':{kind:'entitle',cat:'权益',name:'',unit:'航段',value:'',price:'',bought:'',validUntil:'',rate:'700',faceValue:'',note:''},
  '礼品卡':{kind:'entitle',cat:'权益',name:'',unit:'元',value:'',price:'',bought:'',validUntil:'',rate:'700',faceValue:'',note:''},
  '车辆':{kind:'physical',cat:'交通',name:'',unit:'',value:'',price:'',bought:'',validUntil:'',rate:'700',faceValue:'',note:''},
  '数码':{kind:'physical',cat:'数码',name:'',unit:'',value:'',price:'',bought:'',validUntil:'',rate:'700',faceValue:'',note:''},
  '会员':{kind:'member',cat:'会员',name:'',unit:'会员',value:'0',price:'',bought:'',validUntil:'',rate:'700',faceValue:'',note:''},
  '票券':{kind:'entitle',cat:'权益',name:'',unit:'张',value:'',price:'',bought:'',validUntil:'',rate:'700',faceValue:'',note:''},
  '现金账户':{kind:'cash',cat:'现金',name:'',unit:'元',value:'',price:'',bought:'',validUntil:'',rate:'700',faceValue:'',note:''},
};
function editorMetaValue(a,label){const row=(a.meta||[]).find(r=>r&&r[0]===label);return row?String(row[1]||''):'';}
function editorKindFor(a){return a.mileage?'mileage':a.group==='cash'?'cash':a.group==='member'?'member':a.group==='entitle'?'entitle':'physical';}
function editorDraftForAsset(a){
  const kind=editorKindFor(a), meter=a.meter&&a.meter.type==='cont'?a.meter:null;
  return {kind,cat:a.cat||({cash:'现金',member:'会员',mileage:'权益'}[kind]||'其他'),name:a.name||'',unit:a.unitName||'',
    value:kind==='mileage'?(a.mileage&&a.mileage.total||0):(meter?meter.remaining:(a.value||0)),
    price:a.price==null?'':a.price,bought:a.bought||'',validUntil:a.validUntil||(a.meter&&a.meter.type==='time'?a.meter.end:'')||'',
    rate:a.mileage&&a.mileage.valueRatePer10k||700,faceValue:meter?meter.total:'',note:editorMetaValue(a,'备注')};
}
function editorDraftForTemplate(template){return {...(EDITOR_PRESETS[template]||EDITOR_PRESETS['资产'])};}
function nextAssetId(){let n=1;while(ASSETS.some(a=>a.id==='asset-'+n))n++;return 'asset-'+n;}
function editorNumber(raw,label,allowBlank){
  const s=String(raw==null?'':raw).trim().replace(/,/g,'');
  if(!s&&allowBlank)return null;
  const n=Number(s);
  if(!s||!Number.isFinite(n)||n<0)throw new Error(label+'必须是非负数字');
  return n;
}
function editorDate(raw,label,allowBlank){const s=String(raw||'').trim();if(!s&&allowBlank)return '';if(!/^\d{4}-\d{2}-\d{2}$/.test(s))throw new Error(label+'格式不对');return s;}
function readAssetEditor(){
  const get=id=>document.getElementById(id), kind=get('editorKind').value, name=(get('editorName').value||'').trim();
  if(!name)throw new Error('名称不能为空');
  const value=editorNumber(get('editorValue').value,'当前数值',false);
  const draft={kind,name,cat:get('editorCat').value||'其他',unit:(get('editorUnit').value||'').trim(),value,
    price:editorNumber(get('editorPrice').value,'购入价',true),bought:editorDate(get('editorBought').value,'取得日',true),
    validUntil:editorDate(get('editorValidUntil').value,'有效期',true),rate:editorNumber(get('editorRate').value,'估值口径',true),
    faceValue:editorNumber(get('editorFaceValue').value,'总额/面值',true),note:(get('editorNote').value||'').trim()};
  if(kind==='mileage'&&!Number.isSafeInteger(value))throw new Error('里程必须是非负整数');
  if(kind==='mileage'&&(!draft.rate||draft.rate<=0))throw new Error('里程估值口径必须大于 0');
  if(draft.faceValue!=null&&draft.faceValue<value)throw new Error('总额/面值不能小于当前余额');
  return draft;
}
function editorGroupFor(kind){return kind==='cash'?'cash':kind==='mileage'||kind==='entitle'?'entitle':kind==='member'?'member':'physical';}
function editorIconFor(cat,kind){if(kind==='cash')return 'cash';if(kind==='member')return 'member';if(kind==='mileage')return 'plane';return ({交通:'car',数码:'laptop',家居:'box',权益:'ticket',现金:'cash'}[cat]||'box');}
function editorTintFor(cat){return ({交通:'#DBE8DF',数码:'#E1E6EC',家居:'#E9E4DA',权益:'#DBE8DF',会员:'#E4E8DC',现金:'#DDE7EC'}[cat]||'#E7E9E4');}
function editorMetaFor(a,draft){
  const meta=[];
  if(draft.kind==='mileage')meta.push(['总里程',draft.value.toLocaleString('en-US')],['当前估值',money(a.value)],['估值口径','每万里程 '+money(draft.rate)]);
  else if(draft.kind==='physical')meta.push(['购入价',draft.price==null?'—':money(draft.price)],['购入日',draft.bought||'—'],['当前估值',money(a.value)]);
  else if(draft.kind==='cash')meta.push(['账户',draft.name],['当前余额',money(a.value)]);
  else if(draft.kind==='entitle')meta.push(['当前余额',draft.unit?String(draft.value)+' '+draft.unit:String(money(a.value))]);
  else meta.push(['有效期至',draft.validUntil||'—']);
  if(draft.validUntil&&draft.kind!=='member')meta.push(['有效期至',draft.validUntil]);
  if(draft.note)meta.push(['备注',draft.note]);
  return meta;
}
function buildAssetFromEditor(existing,draft,source){
  const group=editorGroupFor(draft.kind), a=existing||{id:nextAssetId(),status:'active',events:[]};
  const oldValue=Number(a.value)||0;
  const oldSoldPrice=a.soldPrice;
  ['price','bought','validUntil','meter','mileage','soldPrice'].forEach(k=>delete a[k]);
  a.group=group;a.cat=draft.cat;a.name=draft.name;a.icon=editorIconFor(draft.cat,draft.kind);a.tint=editorTintFor(draft.cat);a.countable=group!=='member';a.unitName=draft.unit||({mileage:'里程',cash:'元',member:'会员'}[draft.kind]||'权益');a.status=existing&&existing.status||'active';
  if(draft.kind==='mileage'){
    a.mileage={total:draft.value,lastUpdate:existing&&existing.mileage&&existing.mileage.lastUpdate||TODAY,nextRefresh:draft.validUntil||'',rollingMonths:existing&&existing.mileage&&existing.mileage.rollingMonths||18,valueRatePer10k:draft.rate};
    a.value=Math.round(draft.value*draft.rate/10000*100)/100;
    if(draft.validUntil){a.validUntil=draft.validUntil;a.meter={type:'time',label:'滚动有效期',start:existing&&existing.meter&&existing.meter.start||TODAY,end:draft.validUntil};a.mileage.nextRefresh=draft.validUntil;}
  }else if(draft.kind==='physical'){
    a.value=draft.value;if(draft.price!=null)a.price=draft.price;if(draft.bought)a.bought=draft.bought;
  }else if(draft.kind==='cash'){a.value=draft.value;}
  else if(draft.kind==='entitle'){
    a.value=draft.value;if(draft.faceValue!=null)a.meter={type:'cont',total:draft.faceValue,remaining:draft.value};if(draft.validUntil)a.validUntil=draft.validUntil;
  }else{a.value=0;if(draft.validUntil)a.validUntil=draft.validUntil;}
  if(existing&&a.status==='sold'&&oldSoldPrice!=null)a.soldPrice=oldSoldPrice;
  a.meta=editorMetaFor(a,draft);a.events=Array.isArray(a.events)?a.events:[];
  if(existing){const delta=a.value-oldValue; a.events.unshift({date:TODAY,title:'编辑资产信息',delta:delta?money(delta,{sign:true}):'',sub:'通过通用编辑器',kind:'val'});}
  else a.events.unshift({date:draft.bought||TODAY,title:'录入资产',delta:draft.price?'−'+money(draft.price):'',sub:source||'手动录入',kind:'buy'});
  return a;
}
function updateEditorKind(){
  const kind=document.getElementById('editorKind')&&document.getElementById('editorKind').value;if(!kind)return;
  const label=document.getElementById('editorValueLabel');if(label)label.textContent=kind==='mileage'?'当前里程':kind==='cash'?'当前余额':kind==='entitle'?'当前余额':kind==='member'?'权益价值':'当前估值';
  document.querySelectorAll('[data-editor-only]').forEach(el=>{const allow=el.dataset.editorOnly.split(',').includes(kind);el.style.display=allow?'grid':'none';});
}
function viewAssetEditor(){
  const state=S.editor||{mode:'new',template:'资产'}, editing=state.mode==='edit', existing=editing?ASSETS.find(a=>a.id===state.id):null;
  if(editing&&!existing){S.editor=null;route('assets');return;}
  const d=existing?editorDraftForAsset(existing):editorDraftForTemplate(state.template||'资产');
  appbar(editing?'编辑资产':'添加资产',{back:editing?'asset-detail':'action'});
  const kinds=EDITOR_KINDS.map(k=>'<option value="'+k[0]+'"'+(d.kind===k[0]?' selected':'')+'>'+k[1]+'</option>').join('');
  const cats=['其他','现金','数码','家居','交通','权益','会员'];
  const catOpts=cats.map(c=>'<option value="'+c+'"'+(d.cat===c?' selected':'')+'>'+c+'</option>').join('');
  setScreen('<div class="asset-editor"><div class="section-label" style="margin-left:0;margin-right:0">'+(editing?'修改这项资产':'登记一项资产')+'</div><div class="block">'+
    '<div class="field"><label for="editorKind">资产类型</label><select id="editorKind">'+kinds+'</select></div>'+
    '<div class="field"><label for="editorName">名称</label><input id="editorName" value="'+esc(d.name)+'" placeholder="例如：国泰里程"/></div>'+
    '<div class="field"><label for="editorCat">分类</label><select id="editorCat">'+catOpts+'</select></div>'+
    '<div class="field"><label id="editorValueLabel" for="editorValue">当前数值</label><input id="editorValue" class="num" inputmode="decimal" value="'+esc(d.value)+'" placeholder="0"/></div>'+
    '<div class="field" data-editor-only="mileage,entitle"><label for="editorUnit">单位</label><input id="editorUnit" value="'+esc(d.unit)+'" placeholder="例如：里程、元、张"/></div>'+
    '<div class="field" data-editor-only="physical"><label for="editorPrice">购入价</label><input id="editorPrice" class="num" inputmode="decimal" value="'+esc(d.price)+'" placeholder="可选"/></div>'+
    '<div class="field" data-editor-only="physical"><label for="editorBought">取得日</label><input id="editorBought" type="date" value="'+esc(d.bought)+'"/></div>'+
    '<div class="field" data-editor-only="mileage"><label for="editorRate">每万里程估值</label><input id="editorRate" class="num" inputmode="decimal" value="'+esc(d.rate)+'"/></div>'+
    '<div class="field" data-editor-only="entitle"><label for="editorFaceValue">总额/面值</label><input id="editorFaceValue" class="num" inputmode="decimal" value="'+esc(d.faceValue)+'" placeholder="可选"/></div>'+
    '<div class="field" data-editor-only="mileage,entitle,member"><label for="editorValidUntil">有效期至</label><input id="editorValidUntil" type="date" value="'+esc(d.validUntil)+'"/></div>'+
    '<div class="field"><label for="editorNote">备注</label><input id="editorNote" value="'+esc(d.note)+'" placeholder="可选"/></div>'+
    '<div class="hint">资产名称只是这条记录的名字；操作按资产类型提供。以后新增其他品牌或名称，不需要改应用。</div>'+
    '<div class="actions"><button class="save" data-act="editor-save">保存资产</button><button class="cancel" data-act="editor-cancel">取消</button></div></div></div>');
  updateEditorKind();
}
function openNewAsset(template){S.editor={mode:'new',template:template||'资产'};route('asset-editor');}
function openEditAsset(id){S.editor={mode:'edit',id:id||S.currentAsset};route('asset-editor');}
async function saveAssetEditor(){
  try{
    const draft=readAssetEditor(), editing=S.editor&&S.editor.mode==='edit', existing=editing?ASSETS.find(a=>a.id===S.editor.id):null;
    if(editing&&!existing)throw new Error('资产不存在，请返回资产列表重试');
    const asset=buildAssetFromEditor(existing,draft);
    if(!editing)ASSETS.unshift(asset);
    await saveAssets();
    S.editor=null;S.currentAsset=asset.id;showStamp(editing?'已保存资产':'已添加资产');
    if(editorRouteTimer)clearTimeout(editorRouteTimer);
    editorRouteTimer=setTimeout(()=>{editorRouteTimer=null;route('asset-detail');},280);
  }catch(e){showStamp(e.message||'保存失败');}
}

/* ---------- Invest placeholder ---------- */
function viewInvest(){
  appbar('金融资产',{back:'overview'});
  setScreen('<div class="empty-big"><div class="ic">'+svg('bank')+'</div><div class="t">金融资产 · 暂未开发</div><div class="d">现金、存款、基金和持仓需要单独的账户与收益口径，<br/>暂不混入当前资产生命周期视图。</div></div>');
}

/* ---------- Me ---------- */
function viewMe(){
  appbar('我的');
  setScreen(
    '<div class="me-id"><div class="av">持</div><div><div class="nm">资产台账</div><div class="em">'+ASSETS.filter(a=>a.countable).length+' 项资产 · 净值 '+money(netWorth())+'</div></div></div>'+
    '<div class="section-label">偏好</div><div class="block">'+
      '<div class="me-row" data-act="nav" data-arg="byok" role="button" tabindex="0"><div class="ic">'+svg('plus')+'</div><div class="t">智能添加 · 接入 API</div><div class="v">'+(byokReady()?'已接入':'本地解析')+'</div></div>'+
      '<div class="me-row"><div class="ic">'+svg('toggle')+'</div><div class="t">总资产口径</div><div class="seg2"><button class="'+(S.valueMode==='all'?'on':'')+'" data-act="valset" data-arg="all">含非现金</button><button class="'+(S.valueMode==='cashOnly'?'on':'')+'" data-act="valset" data-arg="cashOnly">仅现金</button></div></div>'+
      '<div class="me-row" data-act="noop"><div class="ic">'+svg('grid')+'</div><div class="t">分类与标签</div><div class="v">数码 · 家居 · 交通 …</div></div>'+
      '<div class="me-row" data-act="export-data" role="button" tabindex="0"><div class="ic">'+svg('download')+'</div><div class="t">导出 JSON 备份</div><div class="v">'+ASSETS.length+' 项</div></div>'+
      '<div class="me-row" data-act="import-data" role="button" tabindex="0"><div class="ic">'+svg('store')+'</div><div class="t">导入 JSON 恢复</div><div class="v">覆盖本机</div></div>'+
    '</div>'+
    '<div class="section-label">关于</div><div class="block">'+
      '<div class="me-row" data-act="noop"><div class="ic">'+svg('shield')+'</div><div class="t">本地存储 · 不上传</div></div>'+
      '<div class="me-row" data-act="noop"><div class="ic">'+svg('gear')+'</div><div class="t">设置</div></div>'+
      '<div class="me-row" data-act="reset-data" role="button" tabindex="0"><div class="ic" style="background:#FBF1E2;color:#C77A12;border-color:#F0DEC0">'+svg('refresh')+'</div><div class="t">恢复初始化数据</div><div class="v" style="color:var(--amber-ink)">覆盖本机</div></div>'+
    '</div><input type="file" id="importJson" accept="application/json,.json" style="display:none"/><div class="empty" style="padding:20px">持有 · 个人资产台账</div>'
  );
  const importInput=document.getElementById('importJson');
  if(importInput)importInput.addEventListener('change',handleImportFile);
}

/* ---------- Router ---------- */
const VIEWS={overview:viewOverview,assets:viewAssets,action:viewAction,todos:viewTodos,me:viewMe,'asset-detail':viewAssetDetail,'asset-editor':viewAssetEditor,invest:viewInvest,byok:viewByok};
function route(name){if(editorRouteTimer){clearTimeout(editorRouteTimer);editorRouteTimer=null;}S.screen=name;if(name!=='asset-detail')S.edit=null;if(name!=='asset-editor')S.editor=null;(VIEWS[name]||viewOverview)();renderTabs();if(history.replaceState)history.replaceState(null,'','#'+name);}
window.gotoScreen=function(name){if(name==='asset-detail')S.currentAsset='mac';route(name);};
window.gotoAsset=function(id){S.currentAsset=id;S.edit=null;route('asset-detail');};
window.fillAdd=function(){route('action');};

/* ---------- interactions ---------- */
function showStamp(text){const reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;const host=document.createElement('div');host.className='stamp-host';const st=document.createElement('div');st.className='stamp';st.textContent=text;if(reduce){st.style.opacity='1';st.style.transform='rotate(-8deg)';}host.appendChild(st);document.getElementById('app').appendChild(host);if(!reduce){requestAnimationFrame(()=>st.classList.add('go'));setTimeout(()=>st.classList.add('out'),700);}setTimeout(()=>host.remove(),reduce?1200:1300);}
function showUndoToast(text,onUndo){
  const old=document.querySelector('.undo-toast');if(old)old.remove();
  const el=document.createElement('div');el.className='undo-toast';el.innerHTML='<div class="msg">'+text+'</div><button type="button" data-act="undo-delete">撤销</button>';
  document.getElementById('app').appendChild(el);
  const timer=setTimeout(()=>{if(el.isConnected)el.remove();},7000);
  el.querySelector('button').addEventListener('click',()=>{clearTimeout(timer);el.remove();onUndo();});
}
function useAsset(id){const a=ASSETS.find(x=>x.id===id);if(!a||!a.meter||a.meter.type!=='discrete'||a.meter.remaining<=0)return;a.meter.remaining-=1;a.value=Math.max(0,a.value-(a.perUnit||0));a.events.unshift({date:TODAY,title:'用掉 1 '+a.unitName,delta:'−1',sub:'剩 '+a.meter.remaining+' '+a.unitName,kind:'use'});saveAssets();showStamp('已核销');setTimeout(()=>{viewAssetDetail();renderTabs();},460);}
function renew(id){const a=ASSETS.find(x=>x.id===id);if(!a)return;if(a.validUntil)a.validUntil=addYears(a.validUntil,1);if(a.meter&&a.meter.type==='time'){a.meter.start=a.meter.end;a.meter.end=addYears(a.meter.end,1);}if(a.meta){a.meta=a.meta.map(r=>/到期|有效期/.test(r[0])?[r[0],a.validUntil||r[1]]:r);}a.events.unshift({date:TODAY,title:'续期一年',delta:'',sub:'有效期延至 '+(a.validUntil||a.meter.end),kind:'in'});saveAssets();showStamp('已续期');setTimeout(()=>{viewAssetDetail();renderTabs();},460);}
function setStatus(st){const a=ASSETS.find(x=>x.id===S.currentAsset);if(!a)return;a.status=st;a.events.unshift({date:TODAY,title:'状态改为「'+STATUS[st].label+'」',delta:'',sub:'',kind:st==='active'?'in':'idle'});saveAssets();showStamp(STATUS[st].label);setTimeout(()=>{viewAssetDetail();renderTabs();},420);}
function sell(id){const a=ASSETS.find(x=>x.id===id);if(!a)return;const guess=Math.round(a.value*0.6);S.edit={field:'sell',label:'出售价',value:String(guess||0)};viewAssetDetail();}
async function deleteAsset(id){
  const idx=ASSETS.findIndex(x=>x.id===id);if(idx<0)return;
  const a=ASSETS[idx];
  if(!confirm('确定删除「'+a.name+'」吗？删除后可立即撤销一次。'))return;
  LAST_DELETED={asset:JSON.parse(JSON.stringify(a)),index:idx};
  ASSETS.splice(idx,1);
  await dbPutAll(ASSETS);
  S.currentAsset=null;S.edit=null;
  route('assets');
  showUndoToast('已删除「'+a.name+'」',async()=>{
    if(!LAST_DELETED)return;
    const insertAt=Math.min(LAST_DELETED.index,ASSETS.length);
    ASSETS.splice(insertAt,0,LAST_DELETED.asset);
    S.currentAsset=LAST_DELETED.asset.id;
    LAST_DELETED=null;
    await dbPutAll(ASSETS);
    showStamp('已撤销');
    route('asset-detail');
  });
}
function applyEdit(){const a=ASSETS.find(x=>x.id===S.currentAsset);const inp=document.getElementById('editInput');if(!a||!inp){S.edit=null;viewAssetDetail();return;}const v=parseFloat(inp.value)||0;const f=S.edit.field;
  if(f==='mileage'){
    const raw=inp.value.trim();
    const total=Number(raw.replace(/,/g,''));
    if(!/^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(raw)||!Number.isSafeInteger(total)||total<0){showStamp('请输入非负整数里程');return;}
    const old=a.mileage.total;
    if(total===old){S.edit=null;viewAssetDetail();return;}
    a.mileage.total=total;
    if(Number.isFinite(a.mileage.valueRatePer10k))a.value=Math.round(total*a.mileage.valueRatePer10k/10000*100)/100;
    if(a.meta)a.meta=a.meta.map(r=>r[0]==='总里程'?[r[0],total.toLocaleString('en-US')]:r[0]==='当前估值'?[r[0],money(a.value)]:r);
    a.events.unshift({date:TODAY,title:'核对里程余额',delta:(total-old>0?'+':'')+(total-old).toLocaleString('en-US')+' 里程',sub:old.toLocaleString('en-US')+' → '+total.toLocaleString('en-US')+' 里程（余额核对）',kind:'val'});
  }
  else if(f==='balance'){a.value=v;if(a.meta)a.meta=a.meta.map(r=>/余额/.test(r[0])?[r[0],money(v)]:r);a.events.unshift({date:TODAY,title:'改余额',delta:money(v),sub:'手动核对',kind:'val'});}
  else if(f==='cont'){a.meter.remaining=Math.min(v,a.meter.total);a.value=a.meter.remaining;a.events.unshift({date:TODAY,title:'改余额',delta:money(a.meter.remaining),sub:'',kind:'val'});}
  else if(f==='value'){a.value=v;if(a.meta)a.meta=a.meta.map(r=>/估值/.test(r[0])?[r[0],money(v)]:r);a.events.unshift({date:TODAY,title:'更新估值',delta:money(v),sub:'按行情评估',kind:'val'});}
  else if(f==='bought'){
    const next=(inp.value||'').trim();
    if(!/^\d{4}-\d{2}-\d{2}$/.test(next)){showStamp('日期格式不对');return;}
    const old=a.bought;
    a.bought=next;
    if(a.meta)a.meta=a.meta.map(r=>r[0]==='购入日'?[r[0],next]:r);
    if(next!==old){
      if(a.events)a.events=a.events.map(e=>(e.kind==='buy'&&(!old||e.date===old))?{...e,date:next}:e);
      a.events.unshift({date:TODAY,title:'修改购入日',delta:'',sub:next,kind:'val'});
    }
  }
  else if(f==='sell'){a.soldPrice=v;a.status='sold';a.value=0;a.events.unshift({date:TODAY,title:'已出售',delta:money(v,{sign:true}),sub:'折旧 '+money(v-(a.price||0),{sign:true}),kind:'sell'});}
  S.edit=null;saveAssets();showStamp('已更新');setTimeout(()=>{viewAssetDetail();renderTabs();},300);}

/* ---------- BYOK + 自然语言添加（OpenAI 兼容：小米 MiMo / 自定义接口） ---------- */
let BYOK_CACHE=null;
function loadByok(){return BYOK_CACHE||{};}
function saveByok(o){BYOK_CACHE=o||{};return dbPutConfig('byok_v1',BYOK_CACHE);}
async function hydrateByok(){BYOK_CACHE=await dbGetConfig('byok_v1')||{};}
function byokReady(){const b=loadByok();return !!(b.key&&b.base);}
const BYOK_PRESETS={
  xiaomi:{label:'小米 MiMo',base:'https://token-plan-cn.xiaomimimo.com/v1',model:'mimo-v2.5'},
  custom:{label:'自定义',base:'',model:''},
};
function byokTemperature(b){
  return /api\.kimi\.com\/coding/i.test(b.base||'') ? 1 : 0.2;
}
async function llmExtract(text, image){
  const b=loadByok();
  const url=(b.base||'').replace(/\/+$/,'')+'/chat/completions';
  const sys='今天是'+TODAY+'。你是资产录入助手。从用户的一句话或一张图片里抽取"一件资产"，只输出一个 JSON 对象：'+
    '{"name":"物品名（简洁）","category":"数码|家居|交通|权益|会员|现金|其他 之一","asset_type":"physical|cash|mileage|entitle|member|custom 之一","unit":"单位","quantity":数量数字,"price":购入价数字,"est_value":当前估值数字,"value_rate_per_10k":每万里程估值数字,"face_value":面值数字,"valid_until":"YYYY-MM-DD","bought_date":"YYYY-MM-DD","note":""}。'+
    '把相对日期（上个月/上月/去年X月/前年/今年X月/X月X日）按今天解析为 YYYY-MM-DD。若文字或图片中出现购买/下单日期，务必用它作为 bought_date，否则才用今天。缺失字段给合理默认或空字符串/0。只返回 JSON，不要解释。';
  const userContent = image ? [{type:'text',text:text||'识别图片里的这件资产'},{type:'image_url',image_url:{url:image}}] : text;
  await pendingWrite;
  const data=await invoke('chat',{body:{model:b.model||BYOK_PRESETS.xiaomi.model,temperature:byokTemperature(b),response_format:{type:'json_object'},
    messages:[{role:'system',content:sys},{role:'user',content:userContent}]}});
  let c=(data.choices&&data.choices[0]&&data.choices[0].message&&data.choices[0].message.content)||'';
  let obj=null;try{obj=JSON.parse(c);}catch(e){const m=c.match(/\{[\s\S]*\}/);if(m)try{obj=JSON.parse(m[0]);}catch(_){}}
  if(!obj)throw new Error('未返回有效 JSON');
  return {name:obj.name,category:obj.category,asset_type:obj.asset_type,unit:obj.unit,quantity:+obj.quantity||0,price:+obj.price||0,est_value:+obj.est_value||0,value_rate_per_10k:+obj.value_rate_per_10k||0,face_value:+obj.face_value||0,valid_until:obj.valid_until,bought_date:obj.bought_date,note:obj.note,_src:image?'AI · 图片':'AI'};
}
function localExtract(text){
  let price=0;const pm=text.match(/¥\s*([\d,]+(?:\.\d+)?)/)||text.match(/([\d,]+(?:\.\d+)?)\s*(?:块|元|rmb|RMB)/)||text.match(/([\d,]{3,}(?:\.\d+)?)/);
  if(pm)price=parseFloat(pm[1].replace(/,/g,''))||0;
  const [Y,M]=TODAY.split('-').map(Number);let d=TODAY;let m;
  if(/前年/.test(text))d=(Y-2)+'-01-01';
  else if((m=text.match(/去年\s*(\d{1,2})\s*月/)))d=(Y-1)+'-'+String(+m[1]).padStart(2,'0')+'-01';
  else if(/去年/.test(text))d=(Y-1)+'-06-01';
  else if((m=text.match(/今年\s*(\d{1,2})\s*月/)))d=Y+'-'+String(+m[1]).padStart(2,'0')+'-01';
  else if(/上(?:个)?月/.test(text)){let mm=M-1,yy=Y;if(mm<1){mm=12;yy--;}d=yy+'-'+String(mm).padStart(2,'0')+'-15';}
  else if((m=text.match(/(\d{4})\s*[-./年]\s*(\d{1,2})/)))d=m[1]+'-'+String(+m[2]).padStart(2,'0')+'-01';
  else if((m=text.match(/(\d{1,2})\s*月/)))d=Y+'-'+String(+m[1]).padStart(2,'0')+'-01';
  const kw=[['交通',/汽车|电动车|自行车|摩托|思域|特斯拉|比亚迪|byd|小米su7|车\b/i],['数码',/手机|iphone|安卓|电脑|笔记本|mac|平板|ipad|相机|镜头|耳机|switch|显示器|键盘|路由|手环|手表|腕表|耳麦|gpu|显卡/i],['家居',/沙发|餐桌|椅|床|冰箱|空调|洗衣机|吸尘器|戴森|家具|厨|扫地机|按摩椅/],['会员',/会员|订阅|年卡|月卡|plus|vip/i],['权益',/航段|机票|礼品卡|票|券|储值|积分|里程/],['现金',/银行卡|储蓄|余额宝?|现金|存款|账户|钱包/]];
  let category='其他';for(const [c,re] of kw){if(re.test(text)){category=c;break;}}
  let name=text.replace(/¥\s*[\d,]+(?:\.\d+)?/g,'').replace(/[\d,]+(?:\.\d+)?\s*(?:块|元|rmb|RMB)/g,'')
    .replace(/前年|去年|今年|上(?:个)?月|\d{4}\s*[-./年]\s*\d{1,2}(?:\s*[-./月]\s*\d{1,2})?|\d{1,2}\s*月(?:\s*\d{1,2}\s*日?)?/g,'')
    .replace(/(?:^|\s)[\d,]{3,}(?:\.\d+)?(?=\s|$)/g,' ')
    .replace(/买的?了?|花了?|入手|购入|大概|差不多|我|的|一[台个块只支]/g,'').replace(/\s+/g,' ').trim();
  if(!name)name='新资产';if([...name].length>16)name=[...name].slice(0,16).join('');
  const mileageMatch=text.match(/([\d,]+)\s*(?:里程|miles?)/i), mileageLike=category==='权益'&&(mileageMatch||/里程|miles?/i.test(name));
  if(mileageLike){const quantity=Number(String(mileageMatch&&mileageMatch[1]||price).replace(/,/g,''))||0;return {name,category,asset_type:'mileage',unit:'里程',quantity,price:0,est_value:Math.round(quantity*700/10000*100)/100,value_rate_per_10k:700,bought_date:d,_src:'本地'};}
  return {name,category,price,est_value:price?Math.round(price*0.75):0,bought_date:d,_src:'本地'};
}
async function runNL(text, image){
  let r;
  try{
    if(image){ if(!byokReady())throw new Error('传图识别需先接入 AI'); r=await llmExtract(text, image); }
    else { r=byokReady()?await llmExtract(text):localExtract(text); }
    S.nl={text,image,loading:false,result:r,error:null};
  }catch(e){
    if(image){ S.nl={text,image,loading:false,result:null,error:'图片识别失败：'+(e.message||e)}; }
    else { r=localExtract(text); S.nl={text,image,loading:false,result:r,error:'AI 解析失败（'+(e.message||e)+'），已用本地解析兜底'}; }
  }
  if(S.screen==='action')viewAction();
}
function nlPreview(r,hasError){
  const cats=['数码','家居','交通','权益','会员','现金','其他'];
  const cat=r.category&&cats.includes(r.category)?r.category:'其他';
  const catOpts=cats.map(c=>'<option value="'+c+'"'+(cat===c?' selected':'')+'>'+c+'</option>').join('');
  const sourceLabel=/图片/.test(r._src||'')?'AI · 图片识别':(/AI/.test(r._src||'')?'AI 智能解析':'本地规则解析');
  const confirmText=hasError&&!/AI/.test(r._src||'')?'使用本地结果添加':'确认添加';
  return '<div class="nl-preview">'+
    '<div class="nl-edit"><label for="nlName">名称</label><input id="nlName" value="'+esc(r.name||'')+'" placeholder="资产名称"/></div>'+
    '<div class="nl-edit"><label for="nlCategory">分类</label><select id="nlCategory">'+catOpts+'</select></div>'+
    '<div class="nl-edit"><label for="nlPrice">购入价</label><input id="nlPrice" class="num" inputmode="decimal" value="'+esc(r.price||'')+'" placeholder="0"/></div>'+
    '<div class="nl-edit"><label for="nlBought">购入日</label><input id="nlBought" class="num" type="date" value="'+esc(r.bought_date||TODAY)+'"/></div>'+
    '<div class="nl-edit"><label for="nlValue">当前估值</label><input id="nlValue" class="num" inputmode="decimal" value="'+esc(r.est_value||r.price||0)+'" placeholder="0"/></div>'+
    '<div class="nl-edit"><label for="nlNote">备注</label><input id="nlNote" value="'+esc(r.note||'')+'" placeholder="可选"/></div>'+
    '<div class="nl-row src">'+svg('check')+'来源：'+sourceLabel+'</div>'+
    '<div style="display:flex;gap:8px;margin-top:10px"><button class="nl-go" style="flex:1" data-act="nl-confirm">'+confirmText+'</button><button class="nl-cancel" data-act="nl-reset">重填</button></div>'+
  '</div>';
}
function nlErrorBox(nl){
  if(!nl.error)return '';
  const retry=byokReady()?'<button class="primary" data-act="nl-retry">重试 AI</button>':'';
  const local=nl.result&&!/AI/.test(nl.result._src||'')?'<button data-act="nl-confirm">使用本地结果添加</button>':'';
  return '<div class="nl-err">'+esc(nl.error)+'<div class="nl-err-actions">'+retry+'<button data-act="nav" data-arg="byok">改 API 设置</button>'+local+'</div></div>';
}
function readNLDraft(){
  if(!(S.nl&&S.nl.result))return null;
  const get=id=>document.getElementById(id);
  const price=parseFloat((get('nlPrice')&&get('nlPrice').value||'').replace(/,/g,''))||0;
  const value=parseFloat((get('nlValue')&&get('nlValue').value||'').replace(/,/g,''))||0;
  const bought=(get('nlBought')&&get('nlBought').value||TODAY).trim();
  const name=(get('nlName')&&get('nlName').value||'').trim();
  if(!name){showStamp('名称不能为空');return null;}
  if(!/^\d{4}-\d{2}-\d{2}$/.test(bought)){showStamp('日期格式不对');return null;}
  return {...S.nl.result,name,category:(get('nlCategory')&&get('nlCategory').value)||'其他',price,est_value:value,bought_date:bought,note:(get('nlNote')&&get('nlNote').value||'').trim()};
}
function smartAddCard(){
  const ready=byokReady();const nl=S.nl||{};
  return '<div class="block" style="margin-top:16px;padding:14px 16px">'+
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px"><div style="font-family:var(--cn);font-weight:600;font-size:15px">智能添加 · 文字 / 图片</div>'+
      '<button class="pill '+(ready?'active':'')+'" data-act="nav" data-arg="byok"><span class="dot"></span>'+(ready?'AI 已接入':'本地解析 · 接入 AI')+'</button></div>'+
    '<textarea id="nlInput" class="nl-ta" placeholder="一句话，如：昨天买了一个 399 元的背包">'+esc(nl.text||'')+'</textarea>'+
    (nl.image?'<div class="nl-img"><img src="'+nl.image+'"/><span>已选图片 · 点「传图」可换图</span></div>':'')+
    '<div style="display:flex;gap:8px;margin-top:9px">'+
      '<button class="nl-go" style="flex:1" data-act="nl-go"'+(nl.loading?' disabled':'')+'>'+(nl.loading?'识别中…':'✨ 智能添加')+'</button>'+
      '<button class="nl-cam" data-act="nl-pickimg">'+svg('camera')+'传图</button>'+
    '</div>'+
    '<input type="file" id="nlImg" accept="image/*" style="display:none"/>'+
    nlErrorBox(nl)+
    (nl.result?nlPreview(nl.result,!!nl.error):'')+
  '</div>';
}
function addAssetFromNL(r){
  const category=r.category||'其他', mileage=r.asset_type==='mileage'||(category==='权益'&&/里程|miles?/i.test(r.name||''));
  const kind=r.asset_type&&EDITOR_KINDS.some(k=>k[0]===r.asset_type)?r.asset_type:(mileage?'mileage':category==='现金'?'cash':category==='会员'?'member':category==='权益'?'entitle':'physical');
  const quantity=Number(r.quantity)||0, price=Math.round((r.price||0)*100)/100;
  const value=Math.round((kind==='mileage'?(quantity||Number(r.est_value)||0):(r.est_value||r.price||0))*100)/100;
  const draft={kind,name:r.name||'新资产',cat:category,unit:r.unit||(kind==='mileage'?'里程':''),value:kind==='mileage'?Math.round(quantity||Number(r.est_value)||0):value,
    price,bought:r.bought_date||TODAY,validUntil:r.valid_until||'',rate:Number(r.value_rate_per_10k)||700,faceValue:Number(r.face_value)||null,note:r.note||''};
  const a=buildAssetFromEditor(null,draft,r._src||'智能添加');
  if(S.nl&&S.nl.image){a.photo=S.nl.image;a.photoSource='ai_input_upload';a.photoUpdated=TODAY;}
  ASSETS.unshift(a);
  S.nl=null;S.currentAsset=a.id;saveAssets();showStamp('已添加');setTimeout(()=>route('asset-detail'),440);
}
async function exportData(){
  try{const payload=await prepareBackup();if(await invoke('export_backup',{payload}))showStamp('已导出（含图片）');}
  catch(e){alert('导出失败：'+e);}
}
function handleImportFile(ev){
  const f=ev.target.files&&ev.target.files[0];if(!f)return;
  persistEdit(async()=>{
    try{
      const imported=validateImportAssets(JSON.parse(await f.text()));
      if(!confirm('导入 '+imported.length+' 项资产并覆盖本机当前数据？'))return;
      await dbPutAll(imported);
      ASSETS=imported;
      ensureThumbs();
      S.currentAsset=null;S.edit=null;S.cat='全部';S.status='全部';
      showStamp('已导入');
      route('overview');
    }catch(e){showStamp('导入失败');alert('导入失败：'+(e.message||e));}
    ev.target.value='';
  });
}
function viewByok(){
  appbar('智能添加 · 接入 API',{back:'me'});
  const b=loadByok();
  const rawProv=b.provider||'xiaomi';
  const prov=BYOK_PRESETS[rawProv]?rawProv:(b.base?'custom':'xiaomi');
  const pre=BYOK_PRESETS[prov]||BYOK_PRESETS.xiaomi;
  const baseV=b.base||pre.base||'', modelV=b.model||pre.model||'', keyV=b.key||'';
  const presets=Object.keys(BYOK_PRESETS).map(k=>'<button class="chip'+(prov===k?' on':'')+'" data-act="byok-preset" data-arg="'+k+'">'+BYOK_PRESETS[k].label+'</button>').join('');
  setScreen(
    '<div class="section-label">服务商</div>'+
    '<div class="chips" style="padding-top:0">'+presets+'</div>'+
    '<div class="block" style="padding:14px 16px;margin-top:6px">'+
      '<div class="byok-note">自然语言添加会把"昨天买了一个 399 元的背包"这类话，调用大模型（OpenAI 兼容接口）解析成结构化资产；不填则用本地规则解析。<br/>· 小米 MiMo 已默认 <b>国内区 token-plan-cn + mimo-v2.5</b>：<b>只需粘贴 token</b> 保存即可。<br/>· 请求由本机直接发送到你配置的服务商，无需额外代理。<br/>· 其他 OpenAI-compatible 服务商可选「自定义」，Base URL 填到 <b>/v1</b>。</div>'+
      '<label class="byok-l">Base URL（到 /v1 即可）</label><input id="byokBase" class="byok-in" placeholder="https://token-plan-cn.xiaomimimo.com/v1" value="'+(baseV.replace(/"/g,'&quot;'))+'"/>'+
      '<label class="byok-l">API Key（粘贴你的 token）</label><input id="byokKey" class="byok-in" type="password" placeholder="粘贴小米 token…" value="'+(keyV.replace(/"/g,'&quot;'))+'"/>'+
      '<label class="byok-l">模型</label><input id="byokModel" class="byok-in" placeholder="mimo-v2.5" value="'+(modelV.replace(/"/g,'&quot;'))+'"/>'+
      '<div style="display:flex;gap:8px;margin-top:13px"><button class="nl-go" style="flex:1" data-act="byok-save">保存并启用</button><button class="nl-cancel" data-act="byok-clear">清除</button></div>'+
      '<div class="byok-warn">密钥保存在当前用户的本机台账数据库中（未加密），不包含在 JSON 备份内。智能解析由本机直接请求你配置的服务商，输入的文字或图片会发送给该服务商。</div>'+
    '</div>'+
    '<div class="section-label">状态</div><div class="block"><div class="me-row"><div class="ic">'+svg('shield')+'</div><div class="t">'+(byokReady()?'已接入 · '+(b.model||'')+' @ '+(b.base||''):'未接入 · 使用本地解析')+'</div></div></div>'+
    '<div style="height:8px"></div>'
  );
}
document.getElementById('app').addEventListener('click',e=>{
  const t=e.target.closest('[data-act]');if(!t)return;const act=t.dataset.act,arg=t.dataset.arg;
  if(act==='nav')route(arg);
  else if(act==='search'){S.searchOpen=true;route('assets');}
  else if(act==='close-search'){S.searchOpen=false;S.query='';viewAssets();renderTabs();}
  else if(act==='group'){S.cat=({financial:'现金',physical:'数码',entitle:'权益',member:'会员'})[arg]||'全部';S.status='全部';route('assets');}
  else if(act==='cat'){S.cat=arg;const l=document.getElementById('itemList');if(l)l.innerHTML=itemsHTML();document.querySelectorAll('.cat-tab').forEach(x=>x.classList.toggle('on',x.dataset.arg===arg));}
  else if(act==='status'){S.status=arg;const l=document.getElementById('itemList');if(l)l.innerHTML=itemsHTML();document.querySelectorAll('.chip').forEach(x=>x.classList.toggle('on',x.dataset.arg===arg));}
  else if(act==='viewmode'){S.viewMode=arg;const l=document.getElementById('itemList');if(l)l.innerHTML=itemsHTML();document.querySelectorAll('.view-toggle button').forEach(x=>x.classList.toggle('on',x.dataset.arg===arg));}
  else if(act==='asset'){S.currentAsset=arg;S.edit=null;route('asset-detail');}
  else if(act==='edit-asset')openEditAsset(S.currentAsset);
  else if(act==='use')useAsset(arg);
  else if(act==='renew')renew(arg);
  else if(act==='sell')sell(arg);
  else if(act==='setstatus')setStatus(arg);
  else if(act==='delete-asset')deleteAsset(arg);
  else if(act==='export-data')exportData();
  else if(act==='import-data'){const i=document.getElementById('importJson');if(i)i.click();}
  else if(act==='editor-save')persistEdit(saveAssetEditor);
  else if(act==='editor-cancel'){const back=S.editor&&S.editor.mode==='edit'?'asset-detail':'action';S.editor=null;route(back);}
  else if(act==='edit'){const a=ASSETS.find(x=>x.id===S.currentAsset);S.edit={field:arg,label:arg==='mileage'?'当前里程':arg==='value'?'当前估值':(arg==='bought'?'购入日':'当前余额'),value:String(arg==='mileage'?a.mileage.total:arg==='cont'?a.meter.remaining:(arg==='bought'?(a.bought||TODAY):a.value))};viewAssetDetail();}
  else if(act==='edit-ok')applyEdit();
  else if(act==='edit-cancel'){S.edit=null;viewAssetDetail();}
  else if(act==='valmode'){S.valueMode=S.valueMode==='all'?'cashOnly':'all';viewOverview();}
  else if(act==='ovmode'){S.ovMode=arg;viewOverview();}
  else if(act==='valset'){S.valueMode=arg;viewMe();}
  else if(act==='addtmpl')openNewAsset(arg);
  else if(act==='nl-go'){const inp=document.getElementById('nlInput');const text=inp?inp.value.trim():'';const img=S.nl&&S.nl.image;if(!text&&!img){showStamp('写一句话或传张图');return;}S.nl={text,image:img,loading:true,result:null,error:null};viewAction();runNL(text,img);}
  else if(act==='nl-pickimg'){if(!byokReady()){showStamp('传图识别需先接入 AI');return;}const i=document.getElementById('nlImg');if(i)i.click();}
  else if(act==='nl-retry'){const inp=document.getElementById('nlInput');const text=(inp&&inp.value.trim())||(S.nl&&S.nl.text)||'';const img=S.nl&&S.nl.image;if(!byokReady()){showStamp('先接入 AI');return;}S.nl={text,image:img,loading:true,result:S.nl&&S.nl.result,error:null};viewAction();runNL(text,img);}
  else if(act==='nl-confirm'){const draft=readNLDraft();if(draft)addAssetFromNL(draft);}
  else if(act==='nl-reset'){S.nl=null;viewAction();}
  else if(act==='byok-preset'){const p=BYOK_PRESETS[arg]||BYOK_PRESETS.xiaomi;const cur=loadByok();saveByok({provider:arg,base:p.base||cur.base||'',model:p.model||cur.model||'',key:cur.key||''});viewByok();}
  else if(act==='byok-save'){const base=(document.getElementById('byokBase').value||'').trim();const key=(document.getElementById('byokKey').value||'').trim();const cur=loadByok();const provider=BYOK_PRESETS[cur.provider]?cur.provider:(base?'custom':'xiaomi');const preset=BYOK_PRESETS[provider]||BYOK_PRESETS.xiaomi;const model=(document.getElementById('byokModel').value||'').trim()||preset.model||BYOK_PRESETS.xiaomi.model;saveByok({provider,base,key,model});showStamp(key&&base?'已启用 AI':'已保存');setTimeout(()=>route('me'),440);}
  else if(act==='byok-clear'){saveByok({});showStamp('已清除');viewByok();}
  else if(act==='reset-data'){if(confirm('确定要恢复初始化资产数据吗？这会覆盖本机当前修改。')){ASSETS=cloneAssets(DEFAULT_ASSETS);dbPutAll(ASSETS);ensureThumbs();showStamp('已恢复');setTimeout(()=>route('overview'),400);}}
  else if(act==='pickphoto'){const i=document.getElementById('assetPhoto');if(i)i.click();}
  else if(act==='noop')showStamp('演示中暂未开放');
});
document.getElementById('app').addEventListener('change',e=>{
  if(e.target&&e.target.id==='assetSort'){S.sort=e.target.value;const l=document.getElementById('itemList');if(l)l.innerHTML=itemsHTML();}
  if(e.target&&e.target.id==='editorKind')updateEditorKind();
});
document.getElementById('app').addEventListener('input',e=>{
  if(e.target&&e.target.id==='assetSearch'){S.query=e.target.value;const l=document.getElementById('itemList');if(l)l.innerHTML=itemsHTML();}
});
document.getElementById('app').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='editInput'){e.preventDefault();applyEdit();return;}if(e.key!=='Enter'&&e.key!==' ')return;const t=e.target.closest('[data-act][tabindex]');if(!t)return;e.preventDefault();t.click();});

/* --- 持久化：所有修改 ASSETS 的地方都调用 saveAssets --- */
function saveAssets(){return dbPutAll(ASSETS);}

/* 智能添加 ID 序列：启动时根据已有 nl* 资产初始化，避免重启后从 nl1 复用导致覆盖 */
function initNlSeq(){
  let max=0;
  ASSETS.forEach(a=>{
    const m=String(a.id||'').match(/^nl(\d+)$/);
    if(m)max=Math.max(max,parseInt(m[1],10));
  });
  nlSeq=max+1;
}
function nextNlId(){
  while(ASSETS.some(a=>a.id==='nl'+nlSeq))nlSeq++;
  return 'nl'+(nlSeq++);
}

/* --- boot：从 SQLite 加载，首次用默认数据 --- */
(async function boot(){
  const h=(location.hash||'').replace('#','');
  if(h&&VIEWS[h])S.screen=h;
  try{
    await hydrateByok();
    const saved=await dbGetAll();
    if(saved!==null){ASSETS=saved;}else{ASSETS=cloneAssets(DEFAULT_ASSETS);await dbPutAll(ASSETS);}
  }catch(e){document.getElementById('app').textContent='无法读取本地台账，请检查数据目录与磁盘空间后重新启动。';return;}
  ensureThumbs();
  initNlSeq();
  window.ledgerReady=true;
  route(S.screen);
})();
