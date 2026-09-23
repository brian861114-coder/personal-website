#!/usr/bin/env node
// 雙語站端到端驗證：用真的瀏覽器把每個頁面開起來。
//
//   node serve.mjs                       # 另一個視窗先起服務
//   node tools/verify-pages.mjs          # 或 BASE=http://127.0.0.1:8766
//
// 檢查的四件事：
//   1. 載入過程沒有 JS 例外、沒有 console error
//   2. 沒有 404（圖片、影片、JSON、CSS 的路徑都要對）
//   3. 畫面上該出現的內容真的出現了（渲染成功，不是空殼）
//   4. 右上角語言切換鍵的 href 正確，而且點下去真的到得了另一語言的同一頁
//
// 離開碼 0 = 全部通過。

import { chromium } from 'playwright-core';

const BASE = process.env.BASE || 'http://127.0.0.1:8766';

const failures = [];
const passes = [];
const fail = (m) => failures.push(m);
const ok = (m) => passes.push(m);

// 每一筆：路徑、預期語言、該頁要驗的內容
const PAGES = [
  {
    path: '/style-4-notion-warm.html',
    lang: 'zh',
    name: '中文首頁',
    assert: {
      navLang: 'EN',
      navLangHrefEnds: '/en/',
      h1Contains: 'Brian',
      count: ['.project-card', 6],
      htmlLang: 'zh-Hant'
    }
  },
  {
    path: '/en/',
    lang: 'en',
    name: '英文首頁',
    assert: {
      navLang: '中文',
      navLangHrefEnds: '/style-4-notion-warm.html',
      h1Contains: 'Brian',
      count: ['.project-card', 6],
      htmlLang: 'en'
    }
  },
  {
    path: '/research/zno-bandgap/',
    lang: 'zh',
    name: '中文論文頁',
    assert: {
      navLang: 'EN',
      navLangHrefEnds: '/en/research/zno-bandgap/',
      h1: '利用機器學習建立模擬參數預測模型',
      h2s: ['核心理念', '遭遇挑戰', '貢獻與成果', '補充說明'],
      count: ['.figure-thumb', 3]
    }
  },
  {
    path: '/en/research/zno-bandgap/',
    lang: 'en',
    name: '英文論文頁',
    assert: {
      navLang: '中文',
      navLangHrefEnds: '/research/zno-bandgap/',
      h1: 'Machine-learning bandgap prediction',
      h2s: ['Core idea', 'The challenge', 'Contribution & results', 'Supporting material'],
      count: ['.figure-thumb', 3]
    }
  },
  {
    path: '/projects/life-dashboard/',
    lang: 'zh',
    name: '中文作品頁（影片）',
    assert: {
      navLang: 'EN',
      navLangHrefEnds: '/en/projects/life-dashboard/',
      h2s: ['核心理念', '問題與痛點', '過程與產出', '補充說明'],
      count: ['video', 1]
    }
  },
  {
    path: '/en/projects/life-dashboard/',
    lang: 'en',
    name: '英文作品頁（影片）',
    assert: {
      navLang: '中文',
      navLangHrefEnds: '/projects/life-dashboard/',
      h2s: ['Core idea', 'Problem & pain points', 'Process & deliverables', 'Supporting material'],
      count: ['video', 1]
    }
  },
  {
    path: '/skills/computational-materials/',
    lang: 'zh',
    name: '中文技能頁',
    assert: {
      navLang: 'EN',
      navLangHrefEnds: '/en/skills/computational-materials/',
      h1: '計算材料',
      count: ['table.skill-table tbody tr', 6]
    }
  },
  {
    path: '/en/skills/computational-materials/',
    lang: 'en',
    name: '英文技能頁',
    assert: {
      navLang: '中文',
      navLangHrefEnds: '/skills/computational-materials/',
      h1: 'Computational Materials',
      count: ['table.skill-table tbody tr', 6]
    }
  }
];

function attachWatchers(page, bucket) {
  page.on('pageerror', (e) => bucket.errors.push(`JS 例外：${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') bucket.errors.push(`console.error：${m.text()}`);
  });
  page.on('response', (r) => {
    if (r.status() >= 400) bucket.badResponses.push(`${r.status()} ${r.url()}`);
  });
}

async function run() {
  const browser = await chromium.launch({ channel: 'chrome' });

  // --- 1. 每一頁載入、抓錯、驗內容 ---
  for (const spec of PAGES) {
    const context = await browser.newContext({ locale: spec.lang === 'en' ? 'en-US' : 'zh-TW' });
    const page = await context.newPage();
    const bucket = { errors: [], badResponses: [] };
    attachWatchers(page, bucket);

    try {
      const res = await page.goto(BASE + spec.path, { waitUntil: 'networkidle', timeout: 30000 });
      if (!res || !res.ok()) {
        fail(`${spec.name} ${spec.path} 回應 ${res ? res.status() : '無'}`);
        await context.close();
        continue;
      }

      const got = await page.evaluate(() => {
        const langEl = document.querySelector('.nav-lang');
        const h1 = document.querySelector('h1');
        return {
          htmlLang: document.documentElement.lang,
          navLangText: langEl ? langEl.textContent.trim() : null,
          navLangHref: langEl ? langEl.href : null,
          navLangAria: langEl ? langEl.getAttribute('aria-label') : null,
          h1: h1 ? h1.textContent.trim() : null,
          h2s: [...document.querySelectorAll('.detail-copy h2, .detail-evidence h2')].map((e) => e.textContent.trim()),
          hash: location.pathname
        };
      });

      const a = spec.assert;
      const problems = [];

      if (bucket.errors.length) problems.push(...bucket.errors);
      if (bucket.badResponses.length) problems.push(...bucket.badResponses.slice(0, 5));

      if (a.htmlLang && got.htmlLang !== a.htmlLang) {
        problems.push(`<html lang> 應為 ${a.htmlLang}，實際 ${got.htmlLang}`);
      }
      if (a.navLang && got.navLangText !== a.navLang) {
        problems.push(`語言切換鍵文字應為「${a.navLang}」，實際「${got.navLangText}」`);
      }
      if (a.navLangHrefEnds && !(got.navLangHref || '').endsWith(a.navLangHrefEnds)) {
        problems.push(`語言切換鍵應指向 ${a.navLangHrefEnds}，實際 ${got.navLangHref}`);
      }
      if (a.navLang && !got.navLangAria) problems.push('語言切換鍵缺少 aria-label');
      if (a.h1 && got.h1 !== a.h1) problems.push(`h1 應為「${a.h1}」，實際「${got.h1}」`);
      if (a.h1Contains && !(got.h1 || '').includes(a.h1Contains)) {
        problems.push(`h1 應包含「${a.h1Contains}」，實際「${got.h1}」`);
      }
      if (a.h2s) {
        const missing = a.h2s.filter((t) => !got.h2s.includes(t));
        if (missing.length) problems.push(`缺少區塊標題：${missing.join('、')}`);
      }
      if (a.count) {
        const [sel, want] = a.count;
        const n = await page.locator(sel).count();
        if (n !== want) problems.push(`${sel} 應有 ${want} 個，實際 ${n} 個`);
      }

      if (problems.length) fail(`${spec.name}（${spec.path}）\n      - ${problems.join('\n      - ')}`);
      else ok(`${spec.name}（${spec.path}）`);
    } catch (e) {
      fail(`${spec.name}（${spec.path}）驗證過程出錯：${e.message}`);
    }
    await context.close();
  }

  // --- 2. 語言入口依瀏覽器語言分流 ---
  for (const [locale, expectPath] of [['zh-TW', '/style-4-notion-warm.html'], ['en-US', '/en/']]) {
    const context = await browser.newContext({ locale });
    const page = await context.newPage();
    try {
      await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(500);
      const landed = new URL(page.url()).pathname;
      if (landed === expectPath) ok(`語言入口：${locale} 導向 ${landed}`);
      else fail(`語言入口：${locale} 應導向 ${expectPath}，實際 ${landed}`);
    } catch (e) {
      fail(`語言入口（${locale}）出錯：${e.message}`);
    }
    await context.close();
  }

  // --- 3. 語言切換鍵真的點得動（端到端） ---
  const hops = [
    { from: '/style-4-notion-warm.html', expect: '/en/' },
    { from: '/en/', expect: '/style-4-notion-warm.html' },
    { from: '/research/zno-bandgap/', expect: '/en/research/zno-bandgap/' },
    { from: '/en/research/zno-bandgap/', expect: '/research/zno-bandgap/' },
    { from: '/en/skills/computational-materials/', expect: '/skills/computational-materials/' }
  ];

  for (const hop of hops) {
    const context = await browser.newContext({ locale: 'zh-TW' });
    const page = await context.newPage();
    try {
      await page.goto(BASE + hop.from, { waitUntil: 'networkidle', timeout: 30000 });
      await page.click('.nav-lang');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(300);
      const landed = new URL(page.url()).pathname;
      if (landed === hop.expect) ok(`切換鍵：${hop.from} → ${landed}`);
      else fail(`切換鍵：從 ${hop.from} 應到 ${hop.expect}，實際 ${landed}`);
    } catch (e) {
      fail(`切換鍵（${hop.from}）出錯：${e.message}`);
    }
    await context.close();
  }

  await browser.close();

  console.log('\n=== 雙語站端到端驗證 ===\n');
  for (const p of passes) console.log(`  ✓ ${p}`);
  if (failures.length) {
    console.log('');
    for (const f of failures) console.log(`  ✗ ${f}`);
  }
  console.log(`\n結果：${failures.length} 個錯誤、${passes.length} 項通過\n`);
  process.exit(failures.length ? 1 : 0);
}

run().catch((e) => {
  console.error('驗證腳本本身失敗：', e);
  process.exit(1);
});
