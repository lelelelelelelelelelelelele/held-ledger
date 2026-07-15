import { _electron as electron } from 'playwright';
import { createServer } from 'node:http';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const requests = [];
let postCount = 0;

const server = createServer((req, res) => {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', 'POST, OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type, authorization');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  let body = '';
  req.setEncoding('utf8');
  req.on('data', chunk => {
    body += chunk;
  });
  req.on('end', () => {
    requests.push({
      method: req.method,
      url: req.url,
      authorization: req.headers.authorization,
      body: body ? JSON.parse(body) : null,
    });

    if (req.method !== 'POST' || req.url !== '/v1/chat/completions') {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'not found' }));
      return;
    }

    postCount += 1;
    if (postCount === 1) {
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'temporary failure' }));
      return;
    }

    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      choices: [{
        message: {
          content: JSON.stringify({
            name: 'API 重试相机',
            category: '数码',
            price: 4321,
            est_value: 4100,
            bought_date: '2026-07-01',
            note: 'retry-ok',
          }),
        },
      }],
    }));
  });
});

await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
const { port } = server.address();

const userDataDir = await mkdtemp(resolve(tmpdir(), 'held-ledger-byok-error-'));
const app = await electron.launch({ args: [root, `--user-data-dir=${userDataDir}`] });

try {
  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('#app', { timeout: 10_000 });
  await page.evaluate(apiBase => {
    localStorage.setItem('byok_v1', JSON.stringify({
      provider: 'custom',
      base: apiBase,
      model: 'mock-asset-model',
      key: 'test-token',
    }));
    window.fillAdd();
  }, `http://127.0.0.1:${port}/v1`);

  await page.locator('#nlInput').fill('请用 API 解析 4321 元买的重试相机');
  await page.locator('[data-act="nl-go"]').click();
  await page.locator('.nl-err').waitFor({ timeout: 10_000 });

  const errorText = await page.locator('.nl-err').innerText();
  if (!errorText.includes('AI 解析失败') || !errorText.includes('重试 AI') || !errorText.includes('改 API 设置')) {
    throw new Error(`Retry UI missing after API failure: ${errorText}`);
  }
  const fallbackSource = await page.locator('.nl-preview').innerText();
  if (!fallbackSource.includes('本地规则解析')) {
    throw new Error(`Fallback preview should be local after API failure: ${fallbackSource}`);
  }
  if ((await page.locator('#app').innerText()).includes('API 重试相机')) {
    throw new Error('Failed API call should not add the retry asset before confirmation.');
  }

  await page.locator('[data-act="nl-retry"]').click();
  await page.waitForFunction(() => document.querySelector('#nlName')?.value === 'API 重试相机');
  const retryPreview = {
    name: await page.locator('#nlName').inputValue(),
    price: Number(await page.locator('#nlPrice').inputValue()),
    bought: await page.locator('#nlBought').inputValue(),
    value: Number(await page.locator('#nlValue').inputValue()),
  };
  if (retryPreview.name !== 'API 重试相机' || retryPreview.price !== 4321 || retryPreview.bought !== '2026-07-01' || retryPreview.value !== 4100) {
    throw new Error(`Retry preview mismatch: ${JSON.stringify(retryPreview)}`);
  }
  const retryText = await page.locator('.nl-preview').innerText();
  if (!retryText.includes('AI 智能解析')) {
    throw new Error(`Retry preview should switch back to AI source: ${retryText}`);
  }

  await page.locator('[data-act="nl-confirm"]').click();
  await page.waitForFunction(() => document.querySelector('#app')?.innerText.includes('API 重试相机'));

  const postRequests = requests.filter(item => item.url === '/v1/chat/completions');
  if (postRequests.length !== 2) {
    throw new Error(`Expected two API requests after retry, got ${postRequests.length}`);
  }
  for (const req of postRequests) {
    if (req.authorization !== 'Bearer test-token' || req.body?.model !== 'mock-asset-model') {
      throw new Error(`Retry request lost auth/model: ${JSON.stringify(req)}`);
    }
  }

  console.log(JSON.stringify({
    ok: true,
    userDataDir,
    apiBase: `http://127.0.0.1:${port}/v1`,
    scenario: 'BYOK API failure -> local fallback -> retry -> AI preview -> confirm once',
  }, null, 2));
} finally {
  await app.close();
  await new Promise(resolveClose => server.close(resolveClose));
}
