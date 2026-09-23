const KIND_COPY = {
  research: {
    soWhat: '核心理念',
    problem: '遭遇挑戰',
    contribution: '貢獻與成果',
    evidence: '補充說明'
  },
  project: {
    soWhat: '核心理念',
    problem: '想解決什麼問題',
    contribution: '我做了什麼與結果',
    evidence: '補充說明'
  }
};

const HINTS = {
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
};

function kindOf(d) {
  return d.kind === 'project' ? 'project' : 'research';
}

function isFilled(value) {
  return String(value || '').trim().length > 0;
}

function textOrPlaceholder(value, hint) {
  if (isFilled(value)) return `<div class="prose">${value}</div>`;
  return `<p class="placeholder">${hint}</p>`;
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

function renderContribution(d, hints) {
  const chunks = [d.role, d.method].filter((v) => isFilled(v));
  if (!chunks.length) {
    return `<div class="role-stack">${textOrPlaceholder('', hints.role)}${textOrPlaceholder('', hints.method)}</div>`;
  }
  return `<div class="prose">${chunks.join('')}</div>`;
}

function renderFigure(d, hints) {
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
      + ` aria-label="第 ${i + 1} 個素材"${active ? ' aria-current="true"' : ''}>`
      + `<img src="${thumbSource(f)}" alt=""></button>`;
  }).join('');

  return `<div class="figure-gallery">
    <div class="figure-slot" data-gallery-main>${renderMedia(first, d)}</div>
    <p class="figure-caption" data-gallery-caption${isFilled(first.caption) ? '' : ' hidden'}>${first.caption || ''}</p>
    <div class="figure-thumbs" role="group" aria-label="切換素材">${thumbs}</div>
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
  overlay.setAttribute('aria-label', '放大檢視');
  overlay.innerHTML = '<button type="button" class="lightbox-close" aria-label="關閉放大檢視">&times;</button>'
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
  slot.setAttribute('aria-label', '點擊放大檢視');
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
  const copy = KIND_COPY[kind];
  const hints = HINTS[kind];

  document.title = d.title ? `${d.title} · Wei-Che Tseng` : '介紹頁 · Wei-Che Tseng';

  const home = d.homeHref || '../../style-4-notion-warm.html';
  const back = d.backHref || home;
  const contact = d.contactHref || `${home}#contact`;
  const backLabel = kind === 'project' ? '精選作品' : '研究發表';

  // h1 用短標題；有短標題時才把全名補在下方，避免標題重複
  const hasShortTitle = isFilled(d.shortTitle);
  const heading = hasShortTitle ? d.shortTitle : (d.title || '未命名');
  const fullTitle = hasShortTitle && isFilled(d.title) ? `<p class="full-title">${d.title}</p>` : '';
  const meta = isFilled(d.meta) ? `<p class="meta">${d.meta}</p>` : '';

  const figures = figureItems(d);

  document.body.className = kind === 'project' ? 'detail-project' : 'detail-research';

  document.body.innerHTML = `
    <nav>
      <div class="nav-inner">
        <a href="${back}">← ${backLabel}</a>
        <a class="nav-cta" href="${contact}">Contact</a>
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
            ${textOrPlaceholder(d.soWhat, hints.soWhat)}
          </section>
          <section class="block">
            <h2>${copy.problem}</h2>
            ${textOrPlaceholder(d.problem, hints.problem)}
          </section>
          <section class="block">
            <h2>${copy.contribution}</h2>
            ${renderContribution(d, hints)}
          </section>
        </div>
        <aside class="detail-evidence">
          <section class="block">
            <h2>${copy.evidence}</h2>
            <div class="evidence">
              ${renderFigure(d, hints)}
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
    document.body.innerHTML = `
      <p class="data-error">
        無法載入 <code>page.json</code>。請用本機伺服器開啟，不要直接雙擊 HTML。<br>
        在專案目錄執行 <code>node serve.mjs</code>。
      </p>`;
  }
}

boot();
