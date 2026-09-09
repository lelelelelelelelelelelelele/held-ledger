/* ---------- Rust / SQLite 本地存储 ---------- */
const invoke=(command,args)=>window.__TAURI__.core.invoke(command,args);
let pendingWrite=Promise.resolve();
function queueWrite(id,value){
  const snapshot=JSON.parse(JSON.stringify(value));
  pendingWrite=pendingWrite.catch(()=>{}).then(()=>invoke('write_state',{id,value:snapshot}));
  pendingWrite.catch(()=>{showStamp('保存失败，请重试，暂勿退出');});
  return pendingWrite;
}
async function dbGetAll(){await pendingWrite;return invoke('read_state',{id:'assets'});}
function dbPutAll(assets){return queueWrite('assets',assets);}
function dbGetConfig(id){return invoke('read_state',{id});}
function dbPutConfig(id,value){return queueWrite(id,value);}
const pendingEdits=new Set();
function persistEdit(operation){
  const task=operation();pendingEdits.add(task);
  task.catch(e=>alert('操作失败：'+(e.message||e))).finally(()=>pendingEdits.delete(task));
  return task;
}
function readImage(file){return new Promise((resolve,reject)=>{
  const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(file);
});}
let closing=false;
window.closeLedger=async()=>{
  if(closing)return;closing=true;
  document.getElementById('app').inert=true;
  try{
    await Promise.all([...pendingEdits]);
    if(window.ledgerReady){await dbPutAll(ASSETS);await dbPutConfig('byok_v1',loadByok());}
    await pendingWrite;
    await invoke('finish_close');
  }catch(e){closing=false;document.getElementById('app').inert=false;alert('保存失败，窗口未关闭。请检查磁盘空间后重试。');}
};
