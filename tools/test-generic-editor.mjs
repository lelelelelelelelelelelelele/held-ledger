import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { launch } from './native-app.mjs';

const root = await mkdtemp(join(tmpdir(), 'held-ledger-generic-editor-'));
const profile = join(root, 'profile');
await mkdir(profile, { recursive: true });
const db = new DatabaseSync(join(profile, 'ledger.sqlite3'));
db.exec('CREATE TABLE state (id TEXT PRIMARY KEY, value TEXT NOT NULL)');
db.prepare('INSERT INTO state(id,value) VALUES (?,?)').run('assets', '[]');
db.close();

const executable = process.env.HELD_LEDGER_EXE || resolve('src-tauri/target/release/held-ledger.exe');
let app = await launch(profile, executable);
try {
  const page = app.page;
  assert.deepEqual(await page.evaluate(() => dbGetAll()), []);
  assert.match(await page.locator('#app').innerText(), /从第一项资产开始/);

  await page.evaluate(() => route('action'));
  await page.locator('[data-act="addtmpl"][data-arg="里程"]').click();
  assert.match(await page.locator('#app').innerText(), /添加资产/);
  await page.locator('#editorName').fill('国泰里程');
  await page.locator('#editorValue').fill('9,850');
  await page.locator('#editorRate').fill('700');
  await page.locator('[data-act="editor-save"]').click();
  await page.waitForFunction(() => ASSETS.some(a => a.name === '国泰里程'));

  await page.evaluate(() => route('action'));
  await page.locator('[data-act="addtmpl"][data-arg="里程"]').click();
  await page.locator('#editorName').fill('南航里程');
  await page.locator('#editorValue').fill('12,000');
  await page.locator('#editorRate').fill('650');
  await page.locator('[data-act="editor-save"]').click();
  await page.waitForFunction(() => ASSETS.length === 2);

  let assets = await page.evaluate(() => dbGetAll());
  assert.equal(assets.length, 2);
  assert.equal(assets.find(a => a.name === '国泰里程').mileage.total, 9850);
  assert.equal(assets.find(a => a.name === '南航里程').mileage.total, 12000);

  const cathay = assets.find(a => a.name === '国泰里程');
  await page.evaluate(id => { S.currentAsset = id; route('asset-detail'); }, cathay.id);
  await page.locator('[data-act="edit-asset"]').click();
  await page.locator('#editorName').fill('亚洲万里通');
  await page.locator('[data-act="editor-save"]').click();
  await page.waitForFunction(() => ASSETS.some(a => a.name === '亚洲万里通' && a.mileage));
  await page.getByText('更新里程', { exact: true }).waitFor();
  assert.equal(await page.locator('[data-act="edit"][data-arg="mileage"]').count(), 1);
  assert.equal(await page.locator('[data-act="edit-asset"]').count(), 1);

  const after = await page.evaluate(() => dbGetAll());
  assert.equal(after.find(a => a.name === '亚洲万里通').mileage.total, 9850);
  assert.equal(after.find(a => a.name === '南航里程').mileage.total, 12000);
  await app.close();
  app = await launch(profile, executable);
  assert.deepEqual(await app.page.evaluate(() => dbGetAll()), after);
  await app.page.evaluate(() => route('assets'));
  await app.page.locator('[data-act="search"]').click();
  await app.page.locator('#assetSearch').fill('亚洲');
  assert.equal(await app.page.locator('[data-act="asset"]').count(), 1);
  await app.page.locator('[data-act="close-search"]').click();
  const south = after.find(a => a.name === '南航里程');
  await app.page.evaluate(id => { S.currentAsset = id; route('asset-detail'); }, south.id);
  app.page.once('dialog', dialog => dialog.accept());
  await app.page.locator('[data-act="delete-asset"]').click();
  await app.page.locator('.undo-toast button').click();
  await app.page.waitForFunction(() => ASSETS.length === 2);
  console.log('PASS: empty ledger; two user-created mileage assets; rename preserves type capability; restart persists');
} finally {
  await app.close();
}
