import { _electron as electron } from 'playwright';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'win32') throw Error('Windows native test only');
const root = fileURLToPath(new URL('../', import.meta.url));
const { version } = JSON.parse(await readFile(join(root, 'package.json')));
const testRoot = await mkdtemp(join(tmpdir(), 'held-ledger-installed-'));
const installDir = process.env.HELD_INSTALL_DIR || join(testRoot, 'installed app');
const executablePath = join(installDir, '持有.exe');
if (existsSync(installDir)) throw Error('Refusing to replace an existing installation');
// NSIS upgrades the registered app even when /D points elsewhere. Use a clean user.
const registered = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
  "Get-ChildItem 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall','HKCU:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall' -ErrorAction SilentlyContinue | Get-ItemProperty | Where-Object { $_.DisplayName -like '持有*' } | Select-Object -ExpandProperty PSChildName"
], { encoding: 'utf8' }).trim();
if (registered) throw Error('Held Ledger is already installed; run installer tests in a clean Windows user to avoid replacing it');
const installer = join(root, `dist/Held-Ledger-${version}-windows-x64-setup.exe`);
await new Promise((ok, fail) => {
  // NSIS requires /D last, with an unquoted value even when the path contains spaces.
  const child = spawn(installer, ['/S', `/D=${installDir}`], { windowsVerbatimArguments: true });
  child.on('error', fail);
  child.on('exit', code => code === 0 ? ok() : fail(Error(`Installer exit ${code}`)));
});
assert.ok(existsSync(executablePath), 'Installer must create the application');
let app;
const profile = join(testRoot, 'profile-a');
async function launch(dir) {
  app = await electron.launch({ executablePath, args: [`--user-data-dir=${dir}`] });
  const page = await app.firstWindow();
  await page.waitForFunction(() => typeof ASSETS !== 'undefined' && ASSETS.length > 0);
  assert.ok(page.url().includes('app.asar'));
  assert.equal(await app.evaluate(({ app }) => app.getPath('userData')), dir);
  return page;
}
async function waitStored(p, predicate) {
  const end=Date.now()+10000;
  while(Date.now()<end) {
    const rows=await p.evaluate(()=>dbGetAll());
    if(predicate(rows)) return;
    await new Promise(r=>setTimeout(r,50));
  }
  throw Error('Database write was not observed');
}
const nav = (p, screen) => p.locator(`[data-act="nav"][data-arg="${screen}"]`).first().click();
// Regenerated SVG placeholders are not backup image bytes.
const normalize = a => a.map(row => {
  const copy=structuredClone(row);
  if(!copy.photo && copy.photoSource === 'generated_placeholder') delete copy.photoSource;
  return copy;
}).toSorted((x,y) => x.id.localeCompare(y.id));
async function exported(p, path) {
  await nav(p, 'me');
  await app.evaluate(({ session }, destination) => {
    globalThis.exportDone = new Promise((resolve, reject) => {
      session.defaultSession.once('will-download', (_event, item) => {
        item.setSavePath(destination);
        item.once('done', (_e, state) => state === 'completed' ? resolve() : reject(Error(state)));
      });
    });
  }, path);
  await p.locator('[data-act="export-data"]').click();
  await app.evaluate(() => globalThis.exportDone);
  return JSON.parse(await readFile(path, 'utf8'));
}
try {
  let p = await launch(profile);
  assert.equal(await p.evaluate(() => ASSETS.length), 5);
  await nav(p, 'todos');
  assert.ok((await p.locator('#app').innerText()).includes('演示礼品卡'));
  await nav(p, 'assets');
  await p.locator('[data-act="cat"][data-arg="数码"]').click();
  assert.equal(await p.locator('[data-act="asset"]').count(), 2);
  await p.locator('[data-act="cat"][data-arg="全部"]').click();
  await p.locator('[data-act="status"][data-arg="临期"]').click();
  assert.equal(await p.locator('[data-act="asset"]').count(), 2);
  await nav(p, 'action');
  await p.locator('#nlInput').fill('昨天 299 元买了一个背包');
  await p.locator('[data-act="nl-go"]').click();
  await p.locator('#nlName').fill('合成重启测试');
  await p.locator('#nlNote').fill('仅用于自动化测试');
  await p.locator('[data-act="nl-confirm"]').click();
  await p.locator('[data-act="edit"][data-arg="value"]').waitFor();
  await p.locator('[data-act="edit"][data-arg="value"]').click();
  await p.locator('#editInput').fill('250');
  await p.locator('[data-act="edit-ok"]').click();
  await waitStored(p, rows => rows.some(a => a.name === '合成重启测试' && a.value === 250));
  p.once('dialog', d => d.accept());
  await p.locator('[data-act="delete-asset"]').click();
  await p.locator('.undo-toast button').click();
  await waitStored(p, rows => rows.length === 6);
  // Add a generated raster image through the same photo input used by users.
  await nav(p, 'assets');
  await p.locator('[data-act="cat"][data-arg="全部"]').click();
  await p.locator('[data-act="status"][data-arg="全部"]').click();
  await p.locator('[data-act="asset"][data-arg="nl1"]').click();
  const image = await p.evaluate(() => { const c=document.createElement('canvas'); c.width=32;c.height=32;const ctx=c.getContext('2d');ctx.fillStyle='#367c55';ctx.fillRect(0,0,32,32);return c.toDataURL('image/png'); });
  const imagePath=join(testRoot,'synthetic.png');
  await writeFile(imagePath, Buffer.from(image.split(',')[1], 'base64'));
  await p.locator('input[type="file"][accept="image/*"]').setInputFiles(imagePath);
  await waitStored(p, rows => rows.some(a => a.id === 'nl1' && a.photo?.startsWith('data:image/') && a.photoSource === 'user_upload'));
  const first=await exported(p,join(testRoot,'first.json'));
  await app.close(); app=null;
  p=await launch(profile);
  assert.equal(await p.evaluate(() => ASSETS.length),6);
  const afterRestart=await exported(p,join(testRoot,'restarted.json'));
  assert.deepEqual(normalize(afterRestart.assets),normalize(first.assets));
  await nav(p,'action');
  await p.locator('#nlInput').fill('今天 100 元买了一个台灯');
  await p.locator('[data-act="nl-go"]').click();
  await p.locator('#nlName').fill('重启后的新资产');
  await p.locator('[data-act="nl-confirm"]').click();
  await waitStored(p, rows => rows.length===7);
  const second=await exported(p,join(testRoot,'roundtrip.json'));
  assert.equal(new Set(second.assets.map(a=>a.id)).size,7);
  assert.deepEqual(second.assets.find(a=>a.id==='nl1'), first.assets.find(a=>a.id==='nl1'));
  await app.close(); app=null;
  p=await launch(join(testRoot,'profile-b'));
  await nav(p,'me');
  p.once('dialog',d=>d.accept());
  await p.locator('#importJson').setInputFiles(join(testRoot,'roundtrip.json'));
  await p.waitForFunction(()=>ASSETS.length===7);
  const third=await exported(p,join(testRoot,'imported.json'));
  assert.deepEqual(normalize(third.assets),normalize(second.assets));
  console.log(JSON.stringify({ok:true, executablePath, testRoot, profile, scenarios:['silent NSIS install','installed asar launch','category and expiry filters','expiry reminders','smart add','edit value','delete and undo','uploaded synthetic raster','full process restart','distinct ID after restart','downloaded JSON and second-profile import: all fields and image equal']},null,2));
} finally { if(app) await app.close(); }
