#!/usr/bin/env node
/**
 * 專案展示截圖工具（網頁類專案）
 *
 * 用法：
 *   node tools/shoot.mjs                 # 跑全部
 *   node tools/shoot.mjs stem-learning   # 只跑指定專案
 *   node tools/shoot.mjs --headed        # 顯示瀏覽器視窗（除錯用）
 *
 * 前提：對應專案的服務已經起好（見下面 TARGETS 的 note）。
 * 產出：projects/<slug>/images/shot-<name>.png
 *
 * 為什麼要腳本：手動截圖每張的視窗尺寸、縮放、有無瀏覽器 UI 都不一樣，
 * 放進介紹頁的「主圖 + 縮圖列」會很明顯。這支腳本固定 viewport，
 * 改版後重跑一次就能全部更新。
 */
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const VIEWPORT = { width: 1440, height: 900 };

// 隱藏捲軸與文字游標，避免截圖出現雜訊
const HIDE_UI = `
  ::-webkit-scrollbar { display: none !important; }
  html { scrollbar-width: none !important; }
  * { caret-color: transparent !important; }
`;

/**
 * 每個專案的服務位址與要截的畫面。
 * fullPage: true → 截整頁；否則只截首屏（1440x900）。
 */
const TARGETS = {
  'japanese-learning': {
    label: '日文學習 MyJapan',
    note: '先跑 open-myjapan.bat（127.0.0.1:8778）',
    base: 'http://127.0.0.1:8778',
    shots: [
      { name: 'home', url: '/index.html' },
      { name: 'lesson', url: '/n4/n4-ch-batch01-basics.html' },
      { name: 'grammar', url: '/grammar.html' },
      { name: 'dictionary', url: '/dictionary.html' }
    ]
  },

  'stem-learning': {
    label: '理工學習中心',
    note: '在專案根目錄跑 python -m http.server 8010（8000 常被其他服務佔用）',
    base: 'http://127.0.0.1:8010',
    shots: [
      { name: 'home', url: '/index.html' },
      { name: 'calculus', url: '/subjects/calculus/index.html' },
      { name: 'semiconductor', url: '/subjects/solid-state-physics/index.html' }
    ]
  },

  'fridge-inventory': {
    label: '冰箱庫存管理系統',
    note: 'cd 專案根目錄 → pnpm dev（Next.js 預設 3000）。若改用 docker compose，對外是 3100，要改這裡的 base',
    base: 'http://localhost:3000',
    shots: [
      { name: 'home', url: '/' },
      { name: 'login', url: '/login' }
    ]
  },

  'life-dashboard': {
    label: 'Life Dashboard',
    note: '在 desktop/ 跑 pnpm dev（Vite 預設 5173）；首次需在畫面中匯入示範資料',
    base: 'http://localhost:5173',
    shots: [
      { name: 'home', url: '/' }
    ]
  }
};

function parseArgs(argv) {
  const headed = argv.includes('--headed');
  const slugs = argv.filter((a) => !a.startsWith('--'));
  return { headed, slugs };
}

async function launch() {
  const options = { headless: !parseArgs(process.argv.slice(2)).headed };
  if (process.env.CHROME_PATH) {
    options.executablePath = process.env.CHROME_PATH;
  } else {
    options.channel = 'chrome';
  }
  return chromium.launch(options);
}

async function shootOne(page, slug, shot, dir) {
  const target = TARGETS[slug];
  const url = target.base + shot.url;
  const out = path.join(dir, `shot-${shot.name}.png`);

  process.stdout.write(`  ${shot.name.padEnd(14)} ${url}\n`);

  const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  if (response && response.status() >= 400) {
    throw new Error(`HTTP ${response.status()}`);
  }

  await page.addStyleTag({ content: HIDE_UI });
  // 讓字型、MathJax、互動模型有時間完成渲染
  await page.waitForTimeout(shot.wait ?? 1200);

  await page.screenshot({ path: out, fullPage: !!shot.fullPage });
  return out;
}

async function main() {
  const { slugs } = parseArgs(process.argv.slice(2));
  const selected = slugs.length ? slugs : Object.keys(TARGETS);

  const unknown = selected.filter((s) => !TARGETS[s]);
  if (unknown.length) {
    console.error(`未知的專案代號：${unknown.join(', ')}`);
    console.error(`可用：${Object.keys(TARGETS).join(', ')}`);
    process.exit(1);
  }

  const browser = await launch();
  const page = await browser.newPage({
    viewport: VIEWPORT,
    deviceScaleFactor: 2 // 2x 截圖，縮圖列與主圖都不會糊
  });

  let ok = 0;
  const failures = [];

  for (const slug of selected) {
    const target = TARGETS[slug];
    const dir = path.join(ROOT, 'projects', slug, 'images');
    await mkdir(dir, { recursive: true });

    console.log(`\n${target.label}  (${slug})`);
    console.log(`  前提：${target.note}`);

    for (const shot of target.shots) {
      try {
        await shootOne(page, slug, shot, dir);
        ok += 1;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log(`  !! 失敗：${msg}`);
        failures.push(`${slug}/${shot.name}: ${msg}`);
      }
    }
  }

  await browser.close();

  console.log(`\n完成 ${ok} 張，失敗 ${failures.length} 張。`);
  if (failures.length) {
    console.log('失敗清單：');
    failures.forEach((f) => console.log(`  - ${f}`));
    console.log('\n多數失敗原因是服務沒起，或該頁需要先登入／載入資料。');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
