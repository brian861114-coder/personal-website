const HINTS = {
  soWhat: '核心理念：非專家也聽得懂的主軸。',
  problem: '遭遇的挑戰：當時卡在哪、為什麼難。兩到四句即可。',
  role: '你的貢獻：第一作者、DFT 協作、還是獨立開發。',
  method: '成果：做成了什麼、得到什麼結果。',
  figure: '把圖放到 images/，在 page.json 填 figure 路徑。',
  metric: '補充說明：補充圖說以外的脈絡或數字。',
  transfer: '這份工作證明你能做製程／模擬／系統裡的哪一類事。',
  links: '補 PDF、DOI 或 repo 連結。空的 href 不會顯示。'
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

function renderLinks(links) {
  const items = (links || []).filter((l) => isFilled(l.href) && isFilled(l.label));
  if (!items.length) {
    return `<p class="placeholder">${HINTS.links}</p>`;
  }
  return `<div class="links">${items.map((l, i) => {
    const cls = i === 0 ? '' : ' class="secondary"';
    const extra = /^https?:/i.test(l.href) ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${l.href}"${cls}${extra}>${l.label}</a>`;
  }).join('')}</div>`;
}

function renderFigure(d) {
  if (isFilled(d.figure)) {
    const cap = isFilled(d.figureCaption) ? `<p class="figure-caption">${d.figureCaption}</p>` : '';
    return `<div class="figure-slot"><img src="${d.figure}" alt="${d.figureCaption || d.title || ''}"></div>${cap}`;
  }
  return `<div class="figure-slot empty">${HINTS.figure}</div>`;
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
      <p class="kicker">${d.kicker || backLabel}</p>
      <h1 class="hero-title">${d.title || '未命名'}</h1>
      ${meta}
      ${renderTags(d.tags)}

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
        <div class="role-grid">
          ${textOrPlaceholder(d.role, HINTS.role)}
          ${textOrPlaceholder(d.method, HINTS.method)}
        </div>
      </section>

      <section class="block">
        <h2>補充說明</h2>
        <div class="evidence">
          ${renderFigure(d)}
          ${textOrPlaceholder(d.metric, HINTS.metric)}
        </div>
      </section>

      <section class="block">
        <h2>可轉移能力</h2>
        ${textOrPlaceholder(d.transfer, HINTS.transfer)}
        ${renderLinks(d.links)}
      </section>
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
