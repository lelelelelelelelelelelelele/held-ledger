import { spawn, execFileSync } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import assert from 'node:assert/strict';
if (process.platform !== 'darwin') throw Error('Mac native smoke requires a Mac');
const data = await mkdtemp(join(tmpdir(), 'held-ledger-mac-synthetic-'));
const executable = resolve('src-tauri/target/release/bundle/macos/持有.app/Contents/MacOS/held-ledger');
const db = join(data, 'ledger.sqlite3');
let child;
function read() { return execFileSync('/usr/bin/sqlite3', [db, "SELECT value FROM state WHERE id='assets'"], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
async function start() {
  child = spawn(executable, [], { env: { ...process.env, HELD_LEDGER_DATA_DIR: data }, stdio: 'ignore' });
  for (let i = 0; i < 200; i++) {
    if (child.exitCode !== null) throw Error(`Native Mac app exited: ${child.exitCode}`);
    try { if (read()) return; } catch {}
    await delay(100);
  }
  throw Error('Mac WebKit frontend did not initialize native SQLite');
}
async function stop() {
  execFileSync('/usr/bin/osascript', ['-e', 'tell application id "app.heldledger.desktop" to quit']);
  for (let i = 0; i < 100 && child.exitCode === null; i++) await delay(100);
  if (child.exitCode === null) throw Error('Mac native quit did not exit');
}
try {
  await start();
  const first = JSON.parse(read());
  assert.equal(first.length, 5);
  await stop();
  await start();
  await delay(1500);
  assert.equal(child.exitCode, null);
  assert.deepEqual(JSON.parse(read()).map(a => a.id).sort(), first.map(a => a.id).sort());
  await stop();
  console.log('Mac native package boot, SQLite initialization, normal quit and restart passed; interactive UI and DMG drag-install are not covered');
} finally { if (child?.exitCode === null) child.kill(); }
