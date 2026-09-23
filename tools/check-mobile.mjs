#!/usr/bin/env node
// 手機寬度下的版面檢查：加了語言切換鍵之後，nav 右端多一顆，
// 中文 logo 又比英文長（「Wei-Che Tseng 曾為哲 個人簡歷」），窄螢幕最容易在這裡爆掉。
//
//   node serve.mjs                        # 另一個視窗先起服務
//   node tools/check-mobile.mjs           # 或 BASE=http://127.0.0.1:8767
//
// 判準：整頁不能出現水平捲動（scrollWidth > innerWidth），nav 也不能擠到換行亂掉。
// 離開碼 0 = 通過。

import { chromium } from 'playwright-core';

const BASE = process.env.BASE || 'http://127.0.0.1:8766';
const WIDTHS = [375, 320];

const PAGES = [
  ['/style-4-notion-warm.html', 'zh', '中文首頁'],
  ['/en/', 'en', '英文首頁'],
  ['/research/zno-bandgap/', 'zh', '中文論文頁'],
  ['/en/research/zno-bandgap/', 'en', '英文論文頁'],
  ['/projects/life-dashboard/', 'zh', '中文作品頁'],
  ['/en/projects/life-dashboard/', 'en', '英文作品頁'],
  ['/skills/computational-materials/', 'zh', '中文技能頁'],
  ['/en/skills/computational-materials/', 'en', '英文技能頁']
];

const failures = [];
const passes = [];

const browser = await chromium.launch({ channel: 'chrome' });

for (const width of WIDTHS) {
  console.log(`\n--- viewport ${width}px ---`);
  for (const [path, lang, name] of PAGES) {
    const context = await browser.newContext({
      viewport: { width, height: 812 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      locale: lang === 'en' ? 'en-US' : 'zh-TW'
    });
    const page = await context.newPage();
    try {
      await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(250);

      const m = await page.evaluate(() => {
        const inner = document.querySelector('nav .nav-inner');
        const logo = document.querySelector('nav .logo');
        const langEl = document.querySelector('.nav-lang');
        const cta = document.querySelector('.nav-cta');
        const box = (el) => (el ? Math.round(el.getBoundingClientRect().width) : null);
        return {
          docScrollW: document.documentElement.scrollWidth,
          winW: window.innerWidth,
          navH: inner ? Math.round(inner.getBoundingClientRect().height) : null,
          logoW: box(logo),
          langW: box(langEl),
          ctaW: box(cta),
          gap: getComputedStyle(inner || document.body).gap
        };
      });

      const overflow = m.docScrollW > m.winW + 1;
      const tag = `${name} @${width}px`;
      const detail = `docW=${m.docScrollW} winW=${m.winW} navH=${m.navH} logo=${m.logoW} 語言鍵=${m.langW} CTA=${m.ctaW}`;

      if (overflow) {
        failures.push(`${tag} 出現水平捲動（${detail}）`);
        console.log(`  ✗ ${tag.padEnd(22)} ${detail}`);
      } else {
        passes.push(tag);
        console.log(`  ✓ ${tag.padEnd(22)} ${detail}`);
      }

      // nav 高度暴增代表擠到換行了
      if (m.navH && m.navH > 74) {
        failures.push(`${tag} nav 高度 ${m.navH}px，元件被擠到換行`);
      }
    } catch (e) {
      failures.push(`${name} @${width}px 檢查失敗：${e.message}`);
    }
    await context.close();
  }
}

await browser.close();

console.log(`\n結果：${failures.length} 個問題、${passes.length} 項通過`);
if (failures.length) {
  console.log('');
  for (const f of failures) console.log(`  ✗ ${f}`);
}
console.log('');
process.exit(failures.length ? 1 : 0);
