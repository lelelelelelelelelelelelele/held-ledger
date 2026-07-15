import { _electron as electron } from 'playwright';
import { createServer } from 'node:http';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const requests = [];

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

    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      choices: [{
        message: {
          content: JSON.stringify({
            name: 'API 验证相机',
            category: '数码',
            price: 1234,
            est_value: 1200,
            bought_date: '2026-06-30',
            note: 'mocked',
          }),
        },
      }],
    }));
  });
});

await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
const { port } = server.address();

const userDataDir = await mkdtemp(resolve(tmpdir(), 'held-ledger-byok-api-'));
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

  await page.locator('#nlInput').fill('请用 API 解析这台相机');
  await page.locator('[data-act="nl-go"]').click();
  await page.locator('[data-act="nl-confirm"]').waitFor({ timeout: 10_000 });

  const previewText = await page.locator('.nl-preview').innerText();
  const previewValues = {
    name: await page.locator('#nlName').inputValue(),
    category: await page.locator('#nlCategory').inputValue(),
    price: Number(await page.locator('#nlPrice').inputValue()),
    bought: await page.locator('#nlBought').inputValue(),
    value: Number(await page.locator('#nlValue').inputValue()),
  };
  const expectedPreview = { name: 'API 验证相机', category: '数码', price: 1234, bought: '2026-06-30', value: 1200 };
  for (const [key, expected] of Object.entries(expectedPreview)) {
    if (previewValues[key] !== expected) {
      throw new Error(`BYOK preview ${key} mismatch: ${JSON.stringify(previewValues)}`);
    }
  }
  if (!previewText.includes('AI 智能解析')) {
    throw new Error(`BYOK preview source missing: ${previewText}`);
  }

  await page.locator('[data-act="nl-confirm"]').click();
  await page.waitForFunction(() => document.querySelector('#app')?.innerText.includes('API 验证相机'));

  const req = requests.find(item => item.url === '/v1/chat/completions');
  if (!req) {
    throw new Error('Mock API did not receive /v1/chat/completions request.');
  }
  if (req.authorization !== 'Bearer test-token') {
    throw new Error(`Unexpected authorization header: ${req.authorization}`);
  }
  if (req.body?.model !== 'mock-asset-model') {
    throw new Error(`Unexpected model in request: ${JSON.stringify(req.body)}`);
  }
  if (!JSON.stringify(req.body).includes('请用 API 解析这台相机')) {
    throw new Error(`User prompt missing from request body: ${JSON.stringify(req.body)}`);
  }

  console.log(JSON.stringify({
    ok: true,
    userDataDir,
    apiBase: `http://127.0.0.1:${port}/v1`,
    scenario: 'BYOK OpenAI-compatible API -> smart add preview -> confirm asset',
  }, null, 2));
} finally {
  await app.close();
  await new Promise(resolveClose => server.close(resolveClose));
}
