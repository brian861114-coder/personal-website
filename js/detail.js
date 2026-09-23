// 介紹頁共用 renderer（研究 / 作品）。所有介紹頁的 index.html 都載入這一份。
//
// 語言由網址決定：/en/ 之下是英文版，其餘是中文版。
// 各語言的內頁 HTML 與 page.json 分屬各自目錄，這支程式只有一份。

function dirSegments() {
  let p = location.pathname.replace(/\/index\.html?$/i, '/');
  if (!p.endsWith('/')) p += '/';
  return p.split('/').filter(Boolean);
}

const SEGMENTS = dirSegments();
const LANG = SEGMENTS[0] === 'en' ? 'en' : 'zh';
const IS_EN = LANG === 'en';

const KIND_COPY = {
  zh: {
    research: {
      soWhat: '核心理念',
      problem: '遭遇挑戰',
      contribution: '貢獻與成果',
      evidence: '補充說明'
    },
    project: {
      soWhat: '核心理念',
      problem: '問題與痛點',
      contribution: '過程與產出',
      evidence: '補充說明'
    }
  },
  en: {
    research: {
      soWhat: 'Core idea',
      problem: 'The challenge',
      contribution: 'Contribution & results',
      evidence: 'Supporting material'
    },
    project: {
      soWhat: 'Core idea',
      problem: 'Problem & pain points',
      contribution: 'Process & deliverables',
      evidence: 'Supporting material'
    }
  }
};

const HINTS = {
  zh: {
    research: {
      soWhat: '核心理念：非專家也聽得懂的主軸。',
      problem: '遭遇的挑戰：當時卡在哪、為什麼難。兩到四句即可。',
      role: '你的貢獻：第一作者、DFT 協作、還是獨立開發。',
      method: '成果：做成了什麼、得到什麼結果。',
      figure: '把圖放到 images/，在 page.json 填 figure 路徑。'
    },
    project: {
      soWhat: '核心理念：這個作品想解決什麼問題。',
      problem: '遇到的問題：使用者的痛點在哪。',
      role: '你的角色：獨立開發，或負責哪一部分。',
      method: '成果：做出什麼功能、目前到什麼狀態。',
      figure: '把截圖放 images/、影片放 videos/，再在 page.json 填 figure 路徑。'
    }
  },
  en: {
    research: {
      soWhat: 'Core idea: the takeaway a non-specialist should still get.',
      problem: 'The challenge: where it got stuck and why it was hard. Two to four sentences.',
      role: 'Your contribution: first author, DFT collaborator, or sole developer.',
      method: 'Results: what was built and what came out of it.',
      figure: 'Put the figure under images/ and set the path in page.json.'
    },
    project: {
      soWhat: 'Core idea: the problem this project set out to solve.',
      problem: 'The problem: where users actually got stuck.',
      role: 'Your role: sole developer, or which part you owned.',
      method: 'Results: what it does and where it stands today.',
      figure: 'Put screenshots under images/, video under videos/, then set the path in page.json.'
    }
  }
};

// 與文案無關的固定介面文字
const UI = {
  zh: {
    detailTitle: '介紹頁 · Wei-Che Tseng',
    research: '研究發表',
    project: '精選作品',
    untitled: '未命名',
    itemN: (i) => `第 ${i} 個素材`,
    switchItems: '切換素材',
    clickEnlarge: '點擊放大檢視',
    enlarge: '放大檢視',
    closeEnlarge: '關閉放大檢視',
    langLabel: 'EN',
    langAria: 'Switch to English',
    langTag: 'en',
    langHreflang: 'en',
    loadError: '無法載入 <code>page.json</code>。請用本機伺服器開啟，不要直接雙擊 HTML。<br>在專案目錄執行 <code>node serve.mjs</code>。'
  },
  en: {
    detailTitle: 'Detail · Wei-Che Tseng',
    research: 'Research',
    project: 'Projects',
    untitled: 'Untitled',
    itemN: (i) => `Item ${i}`,
    switchItems: 'Switch item',
    clickEnlarge: 'Click to enlarge',
    enlarge: 'Enlarged view',
    closeEnlarge: 'Close enlarged view',
    langLabel: '中文',
    langAria: '切換至中文版',
    langTag: 'zh-Hant',
    langHreflang: 'zh-Hant',
    loadError: 'Could not load <code>page.json</code>. Open the site through a local server instead of double-clicking the HTML file.<br>Run <code>node serve.mjs</code> in the project folder.'
  }
};

const T = UI[LANG];
const COPY = KIND_COPY[LANG];
const HINT = HINTS[LANG];

function kindOf(d) {
  return d.kind === 'project' ? 'project' : 'research';
}

function isFilled(value) {
  return String(value || '').trim().length > 0;
}

// 語言切換：中英內頁結構對稱，用相對層數算就好。
// GitHub Pages 是 repo 子路徑，不能用 /en/... 這種站根絕對路徑。
function altLangHref() {
  const up = '../'.repeat(SEGMENTS.length);
  const target = IS_EN ? SEGMENTS.slice(1) : ['en', ...SEGMENTS];
  return up + target.join('/') + '/';
}

function langSwitch() {
  return `<a class="nav-lang" href="${altLangHref()}" lang="${T.langTag}"`
    + ` hreflang="${T.langHreflang}" aria-label="${T.langAria}">${T.langLabel}</a>`;
}

// 一個文案欄位可以是字串（一段）或字串陣列（條列）。
// 條列渲染成 <ul>：招募者掃三秒就能抓到重點，不必讀完整段。
function hasContent(value) {
  if (Array.isArray(value)) return value.some((v) => isFilled(v));
  return isFilled(value);
}

function renderRich(value, hint) {
  if (Array.isArray(value)) {
    const items = value.filter((v) => isFilled(v));
    if (items.length) return `<ul>${items.map((v) => `<li>${v}</li>`).join('')}</ul>`;
    return `<p class="placeholder">${hint}</p>`;
  }
  if (isFilled(value)) return `<p>${value}</p>`;
  return `<p class="placeholder">${hint}</p>`;
}

function textOrPlaceholder(value, hint) {
  return `<div class="prose">${renderRich(value, hint)}</div>`;
}

function renderTags(tags) {
  if (!Array.isArray(tags) || !tags.length) return '';
  return `<div class="tag-list">${tags.map((t) => `<span class="tag">${t}</span>`).join('')}</div>`;
}

// 只渲染有填 href 的連結：空 href 會變成點了沒反應的假按鈕
function renderLinks(links) {
  if (!Array.isArray(links)) return '';
  const items = links.filter((l) => l && isFilled(l.href));
  if (!items.length) return '';
  return `<div class="links">${items.map((l, i) => {
    const external = /^https?:/i.test(l.href);
    const extra = external ? ' target="_blank" rel="noopener noreferrer"' : '';
    const cls = i === 0 ? '' : ' class="secondary"';
    return `<a href="${l.href}"${cls}${extra}>${l.label || l.href}</a>`;
  }).join('')}</div>`;
}

function figureItems(d) {
  if (Array.isArray(d.figures) && d.figures.length) {
    return d.figures.filter((f) => isFilled(f.src) || isFilled(f.video));
  }
  if (isFilled(d.figure)) {
    return [{ src: d.figure, caption: d.figureCaption || '' }];
  }
  return [];
}

function figureAlt(f, d) {
  return f.caption || d.figureCaption || d.title || '';
}

// 一個 figure 可以是靜態圖（src）或影片（video）。
// 影片帶 poster 當載入前的預覽，autoplay/loop/muted 讓它像動圖一樣自己播。
function renderMedia(f, d) {
  if (isFilled(f.video)) {
    const poster = isFilled(f.poster) ? ` poster="${f.poster}"` : '';
    return `<video src="${f.video}"${poster} autoplay loop muted playsinline`
      + ` aria-label="${figureAlt(f, d)}"></video>`;
  }
  return `<img src="${f.src}" alt="${figureAlt(f, d)}">`;
}

// 縮圖列一律用靜態圖：影片用 poster，靜態圖用自己
function thumbSource(f) {
  return f.poster || f.src;
}

// role 與 method 各自成段落（method 是陣列時成條列），不再黏成一句到底
function renderContribution(d) {
  const hints = HINT;
  const chunks = [d.role, d.method].filter(hasContent);
  if (!chunks.length) {
    return `<div class="role-stack">${textOrPlaceholder('', hints.role)}${textOrPlaceholder('', hints.method)}</div>`;
  }
  return `<div class="prose">${chunks.map((v) => renderRich(v, '')).join('')}</div>`;
}

function renderFigure(d) {
  const hints = HINT;
  const items = figureItems(d);
  if (!items.length) {
    return `<div class="figure-slot empty">${hints.figure}</div>`;
  }

  if (items.length === 1) {
    const f = items[0];
    const cap = isFilled(f.caption) ? `<p class="figure-caption">${f.caption}</p>` : '';
    return `<div class="figure-item"><div class="figure-slot">${renderMedia(f, d)}</div>${cap}</div>`;
  }

  // 多個素材：主圖 + 縮圖列，點縮圖換主圖
  const first = items[0];
  const thumbs = items.map((f, i) => {
    const active = i === 0;
    return `<button type="button" class="figure-thumb${active ? ' is-active' : ''}" data-gallery-index="${i}"`
      + ` aria-label="${T.itemN(i + 1)}"${active ? ' aria-current="true"' : ''}>`
      + `<img src="${thumbSource(f)}" alt=""></button>`;
  }).join('');

  return `<div class="figure-gallery">
    <div class="figure-slot" data-gallery-main>${renderMedia(first, d)}</div>
    <p class="figure-caption" data-gallery-caption${isFilled(first.caption) ? '' : ' hidden'}>${first.caption || ''}</p>
    <div class="figure-thumbs" role="group" aria-label="${T.switchItems}">${thumbs}</div>
  </div>`;
}

function setupFigureGallery(items, d) {
  const host = document.querySelector('[data-gallery-main]');
  if (!host) return;

  const caption = document.querySelector('[data-gallery-caption]');
  const thumbs = Array.from(document.querySelectorAll('[data-gallery-index]'));

  thumbs.forEach((btn) => {
    btn.addEventListener('click', () => {
      const f = items[Number(btn.dataset.galleryIndex)];
      if (!f) return;

      // 素材可能是 <img> 也可能是 <video>，換掉容器內容比換屬性單純
      host.innerHTML = renderMedia(f, d);

      if (caption) {
        caption.textContent = f.caption || '';
        caption.hidden = !isFilled(f.caption);
      }

      thumbs.forEach((b) => {
        const active = b === btn;
        b.classList.toggle('is-active', active);
        if (active) b.setAttribute('aria-current', 'true');
        else b.removeAttribute('aria-current');
      });
    });
  });
}

// 點擊放大：主圖區可點，overlay 以接近原始尺寸顯示（影片在裡面繼續播）
function setupLightbox() {
  const slot = document.querySelector('.detail-evidence .figure-slot');
  if (!slot || slot.classList.contains('empty')) return;

  const overlay = document.createElement('div');
  overlay.className = 'lightbox';
  overlay.hidden = true;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', T.enlarge);
  overlay.innerHTML = `<button type="button" class="lightbox-close" aria-label="${T.closeEnlarge}">&times;</button>`
    + '<div class="lightbox-body"></div>';
  document.body.appendChild(overlay);

  const body = overlay.querySelector('.lightbox-body');
  const closeBtn = overlay.querySelector('.lightbox-close');

  function open() {
    // 讀當前主圖，而不是第一張——縮圖切換過也要放大對的那一個
    const media = slot.querySelector('img, video');
    if (!media) return;

    if (media.tagName === 'VIDEO') {
      body.innerHTML = `<video src="${media.getAttribute('src')}" autoplay loop muted playsinline></video>`;
    } else {
      body.innerHTML = `<img src="${media.getAttribute('src')}" alt="${media.getAttribute('alt') || ''}">`;
    }

    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }

  function close() {
    overlay.hidden = true;
    body.innerHTML = '';
    document.body.style.overflow = '';
    slot.focus();
  }

  slot.setAttribute('tabindex', '0');
  slot.setAttribute('role', 'button');
  slot.setAttribute('aria-label', T.clickEnlarge);
  slot.addEventListener('click', open);
  slot.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open();
    }
  });

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close(); // 點背景也可關
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.hidden) close();
  });
}

function render(d) {
  const kind = kindOf(d);
  const copy = COPY[kind];

  // <html lang> 要放「這一頁自己的語言」，不是切換鍵要去的語言（T.langTag）
  document.documentElement.lang = IS_EN ? 'en' : 'zh-Hant';
  document.title = d.title ? `${d.title} · Wei-Che Tseng` : T.detailTitle;

  const home = d.homeHref || '../../style-4-notion-warm.html';
  const back = d.backHref || home;
  const contact = d.contactHref || `${home}#contact`;
  const backLabel = kind === 'project' ? T.project : T.research;

  // h1 用短標題；有短標題時才把全名補在下方，避免標題重複
  const hasShortTitle = isFilled(d.shortTitle);
  const heading = hasShortTitle ? d.shortTitle : (d.title || T.untitled);
  const fullTitle = hasShortTitle && isFilled(d.title) ? `<p class="full-title">${d.title}</p>` : '';
  const meta = isFilled(d.meta) ? `<p class="meta">${d.meta}</p>` : '';

  const figures = figureItems(d);

  document.body.className = kind === 'project' ? 'detail-project' : 'detail-research';

  document.body.innerHTML = `
    <nav>
      <div class="nav-inner">
        <a href="${back}">← ${backLabel}</a>
        <div class="nav-end">
          ${langSwitch()}
          <a class="nav-cta" href="${contact}">Contact</a>
        </div>
      </div>
    </nav>
    <main>
      <header class="detail-hero">
        <p class="kicker">${d.kicker || backLabel}</p>
        <h1 class="hero-title">${heading}</h1>
        ${fullTitle}
        ${meta}
        ${renderTags(d.tags)}
        ${renderLinks(d.links)}
      </header>
      <div class="detail-grid">
        <div class="detail-copy">
          <section class="block">
            <h2>${copy.soWhat}</h2>
            ${textOrPlaceholder(d.soWhat, HINT.soWhat)}
          </section>
          <section class="block">
            <h2>${copy.problem}</h2>
            ${textOrPlaceholder(d.problem, HINT.problem)}
          </section>
          <section class="block">
            <h2>${copy.contribution}</h2>
            ${renderContribution(d)}
          </section>
        </div>
        <aside class="detail-evidence">
          <section class="block">
            <h2>${copy.evidence}</h2>
            <div class="evidence">
              ${renderFigure(d)}
              ${isFilled(d.metric) ? `<p class="metric">${d.metric}</p>` : ''}
            </div>
          </section>
        </aside>
      </div>
    </main>
  `;

  setupFigureGallery(figures, d);
  setupLightbox();
}

async function boot() {
  try {
    const res = await fetch('page.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(res.statusText);
    render(await res.json());
  } catch (err) {
    console.error(err);
    document.body.innerHTML = `<p class="data-error">${T.loadError}</p>`;
  }
}

boot();
