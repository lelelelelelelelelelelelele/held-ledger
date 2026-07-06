import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'reports/promo');
await mkdir(outDir, { recursive: true });

const shot = name => {
  const data = readFileSync(resolve(root, 'screenshots', name)).toString('base64');
  return `data:image/png;base64,${data}`;
};

const shots = {
  overview: shot('01-overview.png'),
  assets: shot('02-assets-card.png'),
  todos: shot('07-todos.png'),
  action: shot('08-action.png'),
  detail: shot('04-asset-detail-macbook.png'),
  me: shot('09-me.png'),
};

function shell(body, extra = '') {
  return `<!doctype html>
  <html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; width: 100%; height: 100%; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Noto Sans SC", "PingFang SC", sans-serif;
        color: #1c211d;
        background: #eff2ec;
      }
      .canvas {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background:
          linear-gradient(90deg, rgba(46,125,91,.05) 1px, transparent 1px),
          linear-gradient(180deg, rgba(46,125,91,.04) 1px, transparent 1px),
          linear-gradient(140deg, #f8faf5 0%, #edf3ea 58%, #e3ebe2 100%);
        background-size: 72px 72px, 72px 72px, 100% 100%;
      }
      .eyebrow {
        color: #2e7d5b;
        font-size: 25px;
        font-weight: 700;
        letter-spacing: 0;
      }
      h1 {
        margin: 16px 0 0;
        font-size: 88px;
        line-height: 1.04;
        letter-spacing: 0;
        font-weight: 800;
      }
      h2 {
        margin: 0;
        font-size: 48px;
        line-height: 1.14;
        letter-spacing: 0;
      }
      p {
        margin: 22px 0 0;
        color: #526056;
        font-size: 29px;
        line-height: 1.5;
      }
      .badge-row { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 34px; }
      .badge {
        padding: 12px 18px;
        border-radius: 999px;
        background: rgba(255,255,255,.75);
        border: 1px solid rgba(46,125,91,.18);
        color: #246349;
        font-size: 21px;
        font-weight: 650;
        box-shadow: 0 10px 30px rgba(28,33,29,.06);
      }
      .phone {
        position: absolute;
        width: 305px;
        height: 660px;
        border-radius: 38px;
        overflow: hidden;
        border: 9px solid #1f2822;
        background: #f3f5f0;
        box-shadow: 0 34px 90px rgba(28,33,29,.22);
      }
      .phone img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .card {
        background: rgba(255,255,255,.8);
        border: 1px solid rgba(28,33,29,.08);
        box-shadow: 0 18px 54px rgba(28,33,29,.10);
      }
      .caption {
        color: #637067;
        font-size: 18px;
        line-height: 1.45;
      }
      .brand { color: #2e7d5b; }
      ${extra}
    </style>
  </head>
  <body>${body}</body>
  </html>`;
}

const pages = [
  {
    name: 'release-cover.png',
    width: 1600,
    height: 900,
    html: shell(`
      <div class="canvas">
        <div style="position:absolute;left:94px;top:96px;width:640px">
          <div class="eyebrow">持有 · 0.1 Alpha</div>
          <h1>把生活资产<br/>认真收好</h1>
          <p>本机资产台账，记录实物、权益、会员和到期提醒。支持 JSON 备份与 BYOK 智能添加。</p>
          <div class="badge-row">
            <div class="badge">本地存储</div>
            <div class="badge">可导入导出</div>
            <div class="badge">BYOK 接入</div>
          </div>
        </div>
        <div class="phone" style="right:390px;top:86px;transform:rotate(-5deg)"><img src="${shots.overview}"/></div>
        <div class="phone" style="right:132px;top:154px;transform:rotate(5deg)"><img src="${shots.action}"/></div>
        <div style="position:absolute;left:94px;bottom:58px;color:#637067;font-size:19px">源码开放准备版 / 本机内部试用版 · 未签名未公证</div>
      </div>
    `),
  },
  {
    name: 'feature-grid.png',
    width: 1600,
    height: 1200,
    html: shell(`
      <div class="canvas">
        <div style="position:absolute;left:72px;top:66px">
          <div class="eyebrow">核心能力</div>
          <h2>资产、权益、待办和 AI 添加<br/>放在同一个本机台账里</h2>
        </div>
        <div class="grid">
          ${[
            ['总览净值', '总资产净值、日均成本和待办摘要一屏看清。', shots.overview],
            ['资产卡片', '按价值、购买日期、日均成本和到期时间排序。', shots.assets],
            ['到期提醒', '已过期、30 天内、60 天内分组，不再漏掉权益。', shots.todos],
            ['智能添加', '解析后可编辑字段，API 失败可重试或本地兜底。', shots.action],
          ].map(([title, desc, src]) => `
            <div class="fcard card">
              <div class="mini"><img src="${src}"/></div>
              <div class="ftitle">${title}</div>
              <div class="caption">${desc}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `, `
      .grid { position:absolute; left:72px; right:72px; bottom:76px; display:grid; grid-template-columns:repeat(4,1fr); gap:24px; }
      .fcard { border-radius: 26px; padding: 22px; min-height: 760px; }
      .mini { height: 528px; border-radius: 24px; overflow:hidden; border: 6px solid #1f2822; background:#f3f5f0; box-shadow:0 18px 44px rgba(28,33,29,.16); }
      .mini img { width:100%; height:100%; object-fit:cover; display:block; }
      .ftitle { margin-top: 22px; font-size: 30px; font-weight: 780; letter-spacing:0; }
    `),
  },
  {
    name: 'social-square.png',
    width: 1200,
    height: 1200,
    html: shell(`
      <div class="canvas">
        <div style="position:absolute;left:70px;top:72px;width:500px;z-index:2">
          <div class="eyebrow">持有 Alpha</div>
          <h1 style="font-size:76px">个人资产<br/>不再散落</h1>
          <p style="font-size:26px">实物、礼品卡、会员、车辆保险，<br/>加上 BYOK 智能添加，<br/>都先在本机跑起来。</p>
        </div>
        <div class="card" style="position:absolute;left:70px;bottom:76px;border-radius:24px;padding:24px 28px;width:470px">
          <div style="font-size:27px;font-weight:760">0.1 Alpha</div>
          <div class="caption" style="font-size:20px;margin-top:8px">本地存储 · JSON 备份 · 未签名试用包</div>
        </div>
        <div class="phone" style="right:268px;top:214px;transform:rotate(-6deg)"><img src="${shots.overview}"/></div>
        <div class="phone" style="right:70px;top:302px;transform:rotate(5deg)"><img src="${shots.detail}"/></div>
      </div>
    `),
  },
];

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const item of pages) {
    await page.setViewportSize({ width: item.width, height: item.height });
    await page.setContent(item.html, { waitUntil: 'networkidle' });
    await page.screenshot({ path: resolve(outDir, item.name), fullPage: false });
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({
  ok: true,
  outDir,
  files: pages.map(item => `reports/promo/${item.name}`),
}, null, 2));
