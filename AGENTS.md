# personal-website — agent 規則

求職用靜態履歷站。畫面給招募者掃證據，不是作品集玩具。人改內容看 `README.md`；agent 改程式或加技能／論文／作品頁，先讀本檔再動手。

## 每次先確認

1. 首頁文案只活在 `data.json`。`style-4-notion-warm.html` **fetch** 它（`cache: 'no-store'`）。不要再寫 `window.__DATA__`，也不要同一段文字貼進 HTML。
2. 本機用 `node serve.mjs` 或 `start-site.bat`。直接雙擊 HTML 會 CORS，讀不到 JSON。
3. 論文數字、角色、工具使用範圍：只寫 Brian 已放進 JSON／現有頁的內容。缺資料就停，問他，不要補完。
4. 中文名照他寫的 **曾為哲**。Logo／分頁標題用 `data.json` 的 `nav.logo`、`page.title`。
5. 沒有 CMS、沒有後台。Git 就是版本。

`ARCHITECTURE_for_VibeCoder.md` 是 2026-08 舊說明（內嵌資料、雙擊 HTML）。以本檔與現行程式為準。

## 專業技能（現行模板）

技能卡與內頁是同一份 `data.json` 的 `skills.categories[]`。內頁 HTML **不當文案來源**。

新增一類（做完才算完成：首頁出現卡片、點進去是表格、slug 對得上）：

1. 複製 `skills/_template/` → `skills/<slug>/`（資料夾名 = slug，英文小寫加連字號）。
2. 在 `skills.categories` 加一筆，欄位與計算材料相同：`name`、`slug`、`link`、`intro`、`tags[{name, detail}]`。
3. `slug`、資料夾名、`link`（`skills/<slug>/index.html`）三處相同。
4. 不要改 `_template` 或新頁裡的標題／表格文案；內頁用網址資料夾名去對 JSON。
5. `detail` 寫「我實際用它做過什麼」，不是工具百科或星等。

刪除一類：從 `categories` 拿掉，並刪對應資料夾。保留 `skills/_template/`。

首頁標籤：`typeof t === 'string' ? t : t.name`。新資料用物件；舊字串標籤仍要能顯示。

現況只放計算材料。其他類等 Brian 明確要加再加。

## 研究／作品內頁（另一套模板）

論文與專案介紹頁是給招募者的 **60 秒信用證明**：講 Brian 做了什麼、證據是什麼、下一份工作能轉什麼。不是重寫論文、不是產品 landing。

檔案：

- 新頁：複製 `templates/detail.html` → `research/<slug>/index.html` 或 `projects/<slug>/index.html`，再複製 `templates/page.json`。
- 文案只寫在該資料夾 `page.json`。`index.html` 不當文案來源。
- 渲染：`js/detail.js` + `css/detail.css`。區塊標題只改 `js/detail.js` 的 `<h2>`（所有介紹頁一起變）。
- 首頁 `data.json` 該筆加 `link` 指向該資料夾。論文卡與作品卡同一套點擊。
- **不要**套用 `skills/_template`。

畫面四塊（標題固定；括號是 `page.json` 鍵）。`transfer`、`links` 暫不渲染，欄位保留在 `page.json`。

| 畫面標題 | 鍵 | 寫什麼 |
|---|---|---|
| 核心理念 | `soWhat` | 非專家也聽得懂的主軸 |
| 遭遇挑戰 | `problem` | 當時卡在哪 |
| 貢獻與成果 | `role`、`method` | 他的貢獻；做成什麼 |
| 補充說明 | `figure`、`figures`、`figureCaption`、`metric` | 圖 + 可選脈絡。單張用 `figure`；多張用 `figures[{src,caption}]`。`metric` 沒填就不要畫 |

第三篇 CO₂ 文聽起來偏實驗：角色必須寫清他做計算還是製備，缺資料就停、問 Brian。

空字串顯示 placeholder。不要刪欄位來「看起來做完」，也不要替他編造內文、IF 崇拜或嵌入整份 PDF。

新增完成標準：首頁卡點得進去、四塊標題在、空欄是提示不是假內容、返回連回對應錨點（`#research` 或 `#projects`）。

## 版面

- 研究／作品：CSS 橫向 scroll-snap + 箭頭。不要上 Swiper。
- 介紹頁：標題全寬；**約 800px 以上**左文（核心理念／挑戰／貢獻）右圖（補充說明），`main` 約 1080px。不要 sticky 圖欄。窄螢幕單欄、文在上圖在下。
- 電腦版首頁現有桌面排版維持；手機規則已在主頁 CSS（約 640px）。
- 技能區單卡不要拉滿整行：`auto-fill` + `minmax(260px, 1fr)`。

## 預覽

改 UI 或資料後，用本機伺服器打開 `style-4-notion-warm.html`，點過受影響的卡與返回。不要只截一張靜態圖。
