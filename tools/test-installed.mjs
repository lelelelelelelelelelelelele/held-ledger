import { readdir, mkdtemp, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
if (process.platform !== 'win32') throw Error('Windows only');
// Installation alters shortcuts/registry. This script is exclusively for disposable CI users.
if (process.env.CI !== 'true') throw Error('Run installation checks only in a disposable CI user; local installation must use an explicitly chosen target');
const root = await mkdtemp(join(tmpdir(), 'held-ledger-installed-'));
const directory = resolve('src-tauri/target/release/bundle/nsis');
const installers = (await readdir(directory)).filter(f => f.endsWith('.exe'));
if (installers.length !== 1) throw Error('Expected one NSIS installer');
const installed = join(root, 'app');
const result = spawnSync(join(directory, installers[0]), ['/S', '/NS', `/D=${installed}`], { timeout: 120000 });
if (result.status !== 0) throw Error(`Installer failed: ${result.status}`);
const exe = join(installed, 'held-ledger.exe');
await stat(exe);
const tested = spawnSync(process.execPath, ['tools/test-native.mjs'], { env: { ...process.env, HELD_LEDGER_EXE: exe }, stdio: 'inherit', timeout: 180000 });
if (tested.status !== 0) throw Error(`Installed app tests failed: ${tested.status}`);
console.log('Real NSIS install and installed native application passed');
