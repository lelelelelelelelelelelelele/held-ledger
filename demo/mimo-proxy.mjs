// 小米 MiMo (Token Plan) 本地 CORS 代理 —— 解决浏览器直连被跨域拦截的问题。
//
// 用法:
//   node demo/mimo-proxy.mjs
// 然后在 demo 的「我的 → 智能添加 · 接入 API」里把 Base URL 改成:
//   http://localhost:8787/v1
// 模型保持 mimo-v2.5，粘贴你的 token 保存即可。
//
// 它只是把浏览器的请求原样转发到小米国内区，并补上 CORS 响应头；
// 你的 token 由浏览器随请求带上、代理仅转发，本文件不含任何密钥。
import http from 'node:http';

const TARGET = process.env.MIMO_TARGET || 'https://token-plan-cn.xiaomimimo.com'; // 海外区改 token-plan-sgp
const PORT = Number(process.env.PORT || 8787);
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'authorization,content-type',
  'access-control-max-age': '86400',
};

http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); res.end(); return; }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks);
  try {
    const upstream = await fetch(TARGET + req.url, {
      method: req.method,
      headers: {
        'content-type': req.headers['content-type'] || 'application/json',
        'authorization': req.headers['authorization'] || '',
      },
      body: (req.method === 'GET' || req.method === 'HEAD') ? undefined : body,
    });
    const text = await upstream.text();
    res.writeHead(upstream.status, { ...CORS, 'content-type': upstream.headers.get('content-type') || 'application/json' });
    res.end(text);
  } catch (e) {
    res.writeHead(502, { ...CORS, 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: { message: 'proxy error: ' + e.message } }));
  }
}).listen(PORT, () => {
  console.log('MiMo CORS 代理已启动 → ' + TARGET);
  console.log('在 BYOK 里把 Base URL 填: http://localhost:' + PORT + '/v1   (模型 mimo-v2.5)');
});
