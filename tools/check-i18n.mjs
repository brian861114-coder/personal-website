#!/usr/bin/env node
// 雙語站一致性檢查。
//
// 這個站沒有 build step，兩份資料（中文在 root、英文在 en/）靠人與 agent 同步。
// 這支腳本就是守門員：改完任何一語言後跑一次，抓出「兩邊結構不對齊」、「路徑指到
// 不存在的檔案」、「英文頁面漏了」這類問題。
//
//   node tools/check-i18n.mjs
//
// 離開碼 0 = 通過（可能仍有提醒），1 = 有錯誤。

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KINDS = ['research', 'projects'];
const LANGS = [
  { key: 'zh', label: '中文', prefix: '' },
  { key: 'en', label: 'English', prefix: 'en' }
];

const errors = [];
const warnings = [];
const pass = [];
const fail = (m) => errors.push(m);
const warn = (m) => warnings.push(m);
const ok = (m) => pass.push(m);

const abs = (...p) => path.join(ROOT, ...p);
const exists = (p) => fs.existsSync(p);
const readJSON = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/');

// 外部連結與頁內錨點不用檢查檔案
const isExternal = (href) => /^(https?:|mailto:|tel:|#|data:)/i.test(href);

// ---------------------------------------------------------------------------
// 1. 首頁資料結構對齊（data.json ↔ en/data.en.json）
// ---------------------------------------------------------------------------
function shapeKeys(value, prefix = '') {
  const out = [];
  if (Array.isArray(value)) {
    out.push(`${prefix}[]`);
    if (value.length) out.push(...shapeKeys(value[0], `${prefix}[]`));
  } else if (value && typeof value === 'object') {
    for (const k of Object.keys(value).sort()) {
      out.push(`${prefix}.${k}`);
      out.push(...shapeKeys(value[k], `${prefix}.${k}`));
    }
  }
  return out;
}

const zhHome = abs('data.json');
const enHome = abs('en', 'data.en.json');

if (!exists(zhHome)) fail('找不到 data.json');
if (!exists(enHome)) fail('找不到 en/data.en.json');

if (exists(zhHome) && exists(enHome)) {
  const zh = readJSON(zhHome);
  const en = readJSON(enHome);
  const zhKeys = new Set(shapeKeys(zh));
  const enKeys = new Set(shapeKeys(en));

  const missingInEn = [...zhKeys].filter((k) => !enKeys.has(k));
  const missingInZh = [...enKeys].filter((k) => !zhKeys.has(k));

  if (missingInEn.length || missingInZh.length) {
    fail(`首頁資料結構不對齊：英文缺 ${missingInEn.join(', ') || '—'}；中文缺 ${missingInZh.join(', ') || '—'}`);
  } else {
    ok('首頁資料結構對齊（data.json ↔ en/data.en.json）');
  }

  // 列表長度也要一致，否則會出現「中文 6 張卡、英文 5 張」
  const listChecks = [
    ['nav.links', zh.nav?.links, en.nav?.links],
    ['hero.stats', zh.hero?.stats, en.hero?.stats],
    ['about.paragraphs', zh.about?.paragraphs, en.about?.paragraphs],
    ['about.info', zh.about?.info, en.about?.info],
    ['experience.items', zh.experience?.items, en.experience?.items],
    ['skills.categories', zh.skills?.categories, en.skills?.categories],
    ['skills.categories[0].tags', zh.skills?.categories?.[0]?.tags, en.skills?.categories?.[0]?.tags],
    ['research.papers', zh.research?.papers, en.research?.papers],
    ['projects.items', zh.projects?.items, en.projects?.items],
    ['contact.links', zh.contact?.links, en.contact?.links]
  ];
  for (const [name, a, b] of listChecks) {
    if (Array.isArray(a) && Array.isArray(b) && a.length !== b.length) {
      fail(`${name} 數量不一致：中文 ${a.length} 筆、英文 ${b.length} 筆`);
    }
  }

  // 標籤這種「兩邊都該一樣」的技術名詞
  const zhSkills = (zh.skills?.categories?.[0]?.tags || []).map((t) => (typeof t === 'string' ? t : t.name));
  const enSkills = (en.skills?.categories?.[0]?.tags || []).map((t) => (typeof t === 'string' ? t : t.name));
  if (zhSkills.join('|') !== enSkills.join('|')) {
    warn(`技能標籤名稱不一致：\n      中文 ${zhSkills.join(', ')}\n      英文 ${enSkills.join(', ')}`);
  }
}

// ---------------------------------------------------------------------------
// 2. 內頁目錄對齊（每個 slug 在兩邊都要有 index.html 與 page.json）
// ---------------------------------------------------------------------------
const slugsByLang = {};

for (const lang of LANGS) {
  slugsByLang[lang.key] = {};
  for (const kind of KINDS) {
    const dir = abs(...[lang.prefix, kind].filter(Boolean));
    if (!exists(dir)) {
      fail(`缺少目錄 ${rel(dir)}`);
      slugsByLang[lang.key][kind] = [];
      continue;
    }
    const slugs = fs.readdirSync(dir).filter((s) => fs.statSync(path.join(dir, s)).isDirectory()).sort();
    slugsByLang[lang.key][kind] = slugs;

    for (const slug of slugs) {
      const pageDir = path.join(dir, slug);
      if (!exists(path.join(pageDir, 'index.html'))) fail(`${lang.label} ${kind}/${slug} 缺少 index.html`);
      if (!exists(path.join(pageDir, 'page.json'))) fail(`${lang.label} ${kind}/${slug} 缺少 page.json`);
    }
  }
}

if (slugsByLang.zh && slugsByLang.en) {
  for (const kind of KINDS) {
    const zh = new Set(slugsByLang.zh[kind] || []);
    const en = new Set(slugsByLang.en[kind] || []);
    const onlyZh = [...zh].filter((s) => !en.has(s));
    const onlyEn = [...en].filter((s) => !zh.has(s));
    if (onlyZh.length) fail(`${kind}：英文版缺少 ${onlyZh.join(', ')}`);
    if (onlyEn.length) fail(`${kind}：中文版缺少 ${onlyEn.join(', ')}`);
  }
  const total = KINDS.reduce((n, k) => n + (slugsByLang.zh[k] || []).length, 0);
  if (!errors.length) ok(`內頁目錄兩邊對齊（${total} 個頁面 × 2 語言）`);
}

// ---------------------------------------------------------------------------
// 3. page.json / data.json 內的相對路徑都要真的存在
// ---------------------------------------------------------------------------
function checkHref(pageDir, href, label) {
  if (!href || isExternal(href)) return;
  const bare = href.split('#')[0].split('?')[0];
  if (!bare) return;
  const target = path.resolve(pageDir, bare);
  if (!exists(target)) fail(`${label} 指到不存在的檔案：${href}`);
}

for (const lang of LANGS) {
  for (const kind of KINDS) {
    for (const slug of slugsByLang[lang.key]?.[kind] || []) {
      const pageDir = abs(...[lang.prefix, kind, slug].filter(Boolean));
      const jsonPath = path.join(pageDir, 'page.json');
      if (!exists(jsonPath)) continue;
      const d = readJSON(jsonPath);
      const tag = `${lang.label} ${kind}/${slug}/page.json`;
      const tagKey = `${lang.label} ${kind}/${slug}/page.json (${lang.key})`;

      for (const field of ['homeHref', 'backHref', 'contactHref']) {
        checkHref(pageDir, d[field], `${tagKey} → ${field}`);
      }
      checkHref(pageDir, d.figure, `${tagKey} → figure`);
      for (const f of d.figures || []) {
        checkHref(pageDir, f.src, `${tagKey} → figures[].src`);
        checkHref(pageDir, f.video, `${tagKey} → figures[].video`);
        checkHref(pageDir, f.poster, `${tagKey} → figures[].poster`);
      }
      for (const l of d.links || []) checkHref(pageDir, l.href, `${tagKey} → links[].href`);

      // kind 是程式判斷用的值，兩邊必須相同
      const zhKindPath = abs(kind, slug, 'page.json');
      if (lang.key === 'en' && exists(zhKindPath)) {
        const zhPage = readJSON(zhKindPath);
        if (zhPage.kind !== d.kind) {
          fail(`${kind}/${slug}：kind 不一致（中文 ${zhPage.kind}、英文 ${d.kind}）`);
        }
        const zhLinks = (zhPage.links || []).map((l) => l.label).filter(Boolean).join('|');
        const enLinks = (d.links || []).map((l) => l.label).filter(Boolean).join('|');
        if (zhLinks !== enLinks) {
          warn(`${kind}/${slug}：按鈕標籤不同（中文 ${zhLinks || '—'}、英文 ${enLinks || '—'}）`);
        }
      }
    }
  }
}

// 首頁資料裡的圖與技能連結（路徑相對於該 JSON 所在目錄）
for (const lang of LANGS) {
  const jsonPath = lang.prefix ? abs(lang.prefix, 'data.en.json') : abs('data.json');
  if (!exists(jsonPath)) continue;
  const dir = path.dirname(jsonPath);
  const d = readJSON(jsonPath);
  checkHref(dir, d.hero?.photo, `${lang.label} data → hero.photo`);
  for (const item of d.projects?.items || []) {
    checkHref(dir, item.img, `${lang.label} data → projects[].img (${item.title || '?'})`);
    checkHref(dir, item.link, `${lang.label} data → projects[].link (${item.title || '?'})`);
  }
  for (const paper of d.research?.papers || []) {
    checkHref(dir, paper.link, `${lang.label} data → research[].link`);
  }
  for (const cat of d.skills?.categories || []) {
    checkHref(dir, cat.link, `${lang.label} data → skills.categories[].link`);
  }
}

// ---------------------------------------------------------------------------
// 4. 頁面 HTML 對齊
// ---------------------------------------------------------------------------
// 首頁 HTML 兩邊是同一份——只有 lang / title / favicon 允許不同（favicon 少一層 ../），
// 其餘任何差異都代表有人只改了其中一邊。
const zhHomeHtml = abs('style-4-notion-warm.html');
const enHomeHtml = abs('en', 'index.html');
if (exists(zhHomeHtml) && exists(enHomeHtml)) {
  const norm = (s) => s
    .replace(/<html lang="[^"]*">/, '<html lang="LANG">')
    .replace(/<title>[^<]*<\/title>/, '<title>TITLE</title>')
    .replace(/(<link rel="icon"[^>]*href=")[^"]*(")/, '$1ICON$2')
    .replace(/\r\n/g, '\n');
  const a = norm(fs.readFileSync(zhHomeHtml, 'utf8'));
  const b = norm(fs.readFileSync(enHomeHtml, 'utf8'));
  if (a !== b) {
    fail('en/index.html 與 style-4-notion-warm.html 不同步（首頁 HTML 應為同一份，'
      + '只有卡片資料檔名由 JS 依路徑決定）。請把中文那份複製過去、再改 lang 與 favicon。');
  } else {
    ok('首頁 HTML 兩邊同步（只差 lang / title / favicon）');
  }
}

// 技能頁：兩邊只允許差 lang / title / favicon
const zhSkill = abs('skills', 'computational-materials', 'index.html');
const enSkill = abs('en', 'skills', 'computational-materials', 'index.html');
if (exists(zhSkill) && exists(enSkill)) {
  const norm = (s) => s
    .replace(/<html lang="[^"]*">/, '<html lang="LANG">')
    .replace(/<title>[^<]*<\/title>/, '<title>TITLE</title>')
    .replace(/(<link rel="icon"[^>]*href=")[^"]*(")/, '$1ICON$2')
    .replace(/\r\n/g, '\n');
  if (norm(fs.readFileSync(zhSkill, 'utf8')) !== norm(fs.readFileSync(enSkill, 'utf8'))) {
    fail('技能頁 HTML 兩邊不同步（只允許 lang / title / favicon 不同）');
  } else {
    ok('技能頁 HTML 兩邊同步（只差 lang / title / favicon）');
  }
}

// 內頁 HTML：資源路徑深度必須對（中文 2 層、英文 3 層）。
// 注意不能用 includes('../../js/detail.js') 判斷——'../../../js/detail.js' 也包含它。
const depthFor = { zh: '../../', en: '../../../' };
for (const lang of LANGS) {
  for (const kind of KINDS) {
    for (const slug of slugsByLang[lang.key]?.[kind] || []) {
      const p = abs(...[lang.prefix, kind, slug, 'index.html'].filter(Boolean));
      if (!exists(p)) continue;
      const html = fs.readFileSync(p, 'utf8');
      const want = `${depthFor[lang.key]}js/detail.js`;
      const srcs = [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]);
      const hrefs = [...html.matchAll(/<link[^>]*\shref="([^"]+)"/g)].map((m) => m[1]);
      if (!srcs.includes(want)) {
        fail(`${rel(p)} 的 script 路徑不對（應為 ${want}，實際 ${srcs.join(', ') || '無'}）`);
      }
      const cssWant = `${depthFor[lang.key]}css/detail.css`;
      if (!hrefs.includes(cssWant)) {
        fail(`${rel(p)} 的 CSS 路徑不對（應為 ${cssWant}）`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 5. 渲染 smoke test：用真的 detail.js 產生 HTML，確認語言有切換
// ---------------------------------------------------------------------------
function renderPage(lang, kind, slug) {
  const pageDir = abs(...[lang.prefix, kind, slug].filter(Boolean));
  const data = readJSON(path.join(pageDir, 'page.json'));
  let code;
  try {
    code = fs.readFileSync(abs('js', 'detail.js'), 'utf8').replace(/boot\(\);\s*$/, '');
  } catch {
    return null;
  }

  const stubEl = () => ({
    innerHTML: '',
    className: '',
    hidden: false,
    style: {},
    dataset: {},
    classList: { contains: () => false, toggle: () => {}, add: () => {} },
    setAttribute: () => {},
    removeAttribute: () => {},
    addEventListener: () => {},
    appendChild: () => {},
    querySelector: () => null,
    focus: () => {}
  });

  const sandbox = {
    location: { pathname: `/${[lang.prefix, kind, slug].filter(Boolean).join('/')}/` },
    fetch: () => Promise.reject(new Error('no fetch in check')),
    console: { error: () => {}, log: () => {} }
  };
  sandbox.document = {
    body: stubEl(),
    documentElement: stubEl(),
    head: { appendChild: () => {} },
    title: '',
    createElement: () => stubEl(),
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {}
  };
  sandbox.globalThis = sandbox;

  try {
    vm.createContext(sandbox);
    vm.runInContext(`${code}\n;globalThis.__out = render;`, sandbox);
    sandbox.__out(data);
    return sandbox.document.body.innerHTML;
  } catch (e) {
    fail(`渲染測試失敗（${lang.label} ${kind}/${slug}）：${e.message}`);
    return null;
  }
}

// 每個 kind 的四個區塊標題（對應 js/detail.js 的 KIND_COPY）：
// 作品頁把「遭遇挑戰」換成「問題與痛點」、「貢獻與成果」換成「過程與產出」。
const SECTION_TITLES = {
  zh: {
    research: ['核心理念', '遭遇挑戰', '貢獻與成果', '補充說明'],
    project: ['核心理念', '問題與痛點', '過程與產出', '補充說明']
  },
  en: {
    research: ['Core idea', 'The challenge', 'Contribution & results', 'Supporting material'],
    project: ['Core idea', 'Problem & pain points', 'Process & deliverables', 'Supporting material']
  }
};

for (const [kindDir, slug] of [['research', 'zno-bandgap'], ['projects', 'life-dashboard']]) {
  const kindKey = kindDir === 'projects' ? 'project' : 'research';
  for (const lang of LANGS) {
    if (!slugsByLang[lang.key]?.[kindDir]?.includes(slug)) continue;
    const html = renderPage(lang, kindDir, slug);
    if (html === null) continue;

    const other = lang.key === 'zh' ? 'en' : 'zh';
    const expect = SECTION_TITLES[lang.key][kindKey].map((t) => `<h2>${t}</h2>`);
    const reject = SECTION_TITLES[other][kindKey].map((t) => `<h2>${t}</h2>`);

    const missing = expect.filter((t) => !html.includes(t));
    const leaked = reject.filter((t) => html.includes(t));
    if (missing.length) fail(`${lang.label} ${kindDir}/${slug} 渲染後缺少區塊標題：${missing.join(', ')}`);
    if (leaked.length) fail(`${lang.label} ${kindDir}/${slug} 渲染後混入另一語言的標題：${leaked.join(', ')}`);
    if (!missing.length && !leaked.length) {
      ok(`${lang.label} ${kindDir}/${slug} 渲染語言正確（四個區塊標題都對）`);
    }
  }
}

// ---------------------------------------------------------------------------
// 輸出
// ---------------------------------------------------------------------------
console.log('\n=== 雙語站一致性檢查 ===\n');
for (const p of pass) console.log(`  ✓ ${p}`);
if (warnings.length) {
  console.log('');
  for (const w of warnings) console.log(`  ⚠ ${w}`);
}
if (errors.length) {
  console.log('');
  for (const e of errors) console.log(`  ✗ ${e}`);
}

console.log(`\n結果：${errors.length} 個錯誤、${warnings.length} 個提醒、${pass.length} 項通過\n`);
process.exit(errors.length ? 1 : 0);

