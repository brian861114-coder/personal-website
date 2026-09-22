const HINTS = {
  soWhat: '核心理念：非專家也聽得懂的主軸。',
  problem: '遭遇的挑戰：當時卡在哪、為什麼難。兩到四句即可。',
  role: '你的貢獻：第一作者、DFT 協作、還是獨立開發。',
  method: '成果：做成了什麼、得到什麼結果。',
  figure: '把圖放到 images/，在 page.json 填 figure 路徑。',
  metric: '補充說明：補充圖說以外的脈絡或數字。'
};

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

function figureItems(d) {
  if (Array.isArray(d.figures) && d.figures.length) {
    return d.figures.filter((f) => isFilled(f.src));
  }
  if (isFilled(d.figure)) {
    return [{ src: d.figure, caption: d.figureCaption || '' }];
  }
  return [];
}

function renderContribution(d) {
  const chunks = [d.role, d.method].filter((v) => isFilled(v));
  if (!chunks.length) {
    return `<div class="role-stack">${textOrPlaceholder('', HINTS.role)}${textOrPlaceholder('', HINTS.method)}</div>`;
  }
  return `<div class="prose">${chunks.join('')}</div>`;
}

function renderFigure(d) {
  const items = figureItems(d);
  if (!items.length) {
    return `<div class="figure-slot empty">${HINTS.figure}</div>`;
  }
  return items.map((f) => {
    const cap = isFilled(f.caption) ? `<p class="figure-caption">${f.caption}</p>` : '';
    const alt = f.caption || d.figureCaption || d.title || '';
    return `<div class="figure-item"><div class="figure-slot"><img src="${f.src}" alt="${alt}"></div>${cap}</div>`;
  }).join('');
}

function render(d) {
  document.title = d.title ? `${d.title} · Wei-Che Tseng` : '介紹頁 · Wei-Che Tseng';
  const home = d.homeHref || '../../style-4-notion-warm.html';
  const back = d.backHref || home;
  const contact = d.contactHref || `${home}#contact`;
  const backLabel = d.kind === 'project' ? '精選作品' : '研究發表';

  const meta = isFilled(d.meta) ? `<p class="meta">${d.meta}</p>` : '';

  document.body.className = d.kind === 'project' ? 'detail-project' : 'detail-research';

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
        <h1 class="hero-title">${d.title || '未命名'}</h1>
        ${meta}
        ${renderTags(d.tags)}
      </header>
      <div class="detail-grid">
        <div class="detail-copy">
          <section class="block">
            <h2>核心理念</h2>
            ${textOrPlaceholder(d.soWhat, HINTS.soWhat)}
          </section>
          <section class="block">
            <h2>遭遇挑戰</h2>
            ${textOrPlaceholder(d.problem, HINTS.problem)}
          </section>
          <section class="block">
            <h2>貢獻與成果</h2>
            ${renderContribution(d)}
          </section>
        </div>
        <aside class="detail-evidence">
          <section class="block">
            <h2>補充說明</h2>
            <div class="evidence">
              ${renderFigure(d)}
              ${isFilled(d.metric) ? `<div class="prose">${d.metric}</div>` : ''}
            </div>
          </section>
        </aside>
      </div>
    </main>
  `;
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
