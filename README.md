# personal-website

Brian 的履歷／作品集靜態站，**中英雙語**。畫面上的文字幾乎都來自資料檔（中文 `data.json`、英文 `en/data.en.json`），改完存檔、重新整理瀏覽器即可。不必改 HTML，也不必再複製一份進網頁。

Agent 動手前記 `AGENTS.md`（技能頁模板、資料單一來源、研究／作品另一套內頁、雙語同步規則）。

| 版本 | 網址 | 首頁資料 |
|---|---|---|
| 中文 | `style-4-notion-warm.html` | `data.json` |
| English | `en/`（即 `en/index.html`） | `en/data.en.json` |

站根的 `index.html` 是語言入口：依「上次選過的語言 → 瀏覽器語言 → 中文」把訪客帶到對的版本。兩個版本都有固定網址，可以直接分享，不必先進來再切換。

右上角那顆 **EN / 中文** 就是語言切換。它永遠帶你到「同一頁的另一個語言版本」——從中文論文頁切過去，落地的是同一篇論文的英文頁，不是回首頁。

本機預覽：雙擊專案裡的 **`start-website.lnk`**（或 `start-site.bat`），或桌面上的 **Personal-Website**。會啟動伺服器並打開瀏覽器。**不要雙擊 HTML**，否則讀不到 `data.json`。關掉標題為「個人網站預覽」的黑色視窗就會停止伺服器。也可在專案目錄執行 `node serve.mjs`。

---

## 雙語版怎麼維護

**改內容時兩個語言都要改。** 中英是兩份獨立資料，不會自動同步：

| 改什麼 | 中文 | 英文 |
|---|---|---|
| 首頁文字 | `data.json` | `en/data.en.json` |
| 作品介紹頁 | `projects/<slug>/page.json` | `en/projects/<slug>/page.json` |
| 論文介紹頁 | `research/<slug>/page.json` | `en/research/<slug>/page.json` |
| 技能內頁 | `data.json` 的 `skills.categories` | `en/data.en.json` 的同一區塊 |

英文版的圖片、影片、PDF 路徑**比中文多一層 `../`**（`en/` 在中文樹的下一層）。例如中文寫 `images/x.webp`，英文寫 `../images/x.webp`。

改完跑一次檢查（純檔案比對，不必先起伺服器）：

```bash
node tools/check-i18n.mjs
```

它會抓出：兩邊資料結構不對齊、英文版漏頁、路徑指到不存在的檔案、首頁 HTML 只改了一邊、內頁渲染出錯語言。

想連瀏覽器行為一起驗（需要另一個視窗先跑 `node serve.mjs`）：

```bash
node tools/verify-pages.mjs    # 真的開 Chrome：JS 錯誤、404、切換鍵能不能點
node tools/check-mobile.mjs    # 375 / 320px 下 header 會不會擠爆
```

---

## 編輯前先記住

- 只動 `data.json`（技能／作品的「點進去之後那一頁」除外，見下方）。
- 陣列裡的**順序 = 畫面上的順序**。新增：複製相鄰那一筆，改內容，貼在要出現的位置。刪除：整筆物件拿掉。
- JSON 很挑格式：字串用雙引號；物件之間要有逗號；**最後一筆後面不能有逗號**。存檔後若整頁變成錯誤說明，多半是少逗號或引號沒閉合。
- `details` 等欄位可以寫 `<strong>粗體</strong>`；一般文字裡的 `"` 要寫成 `\"`。

---

## 各區塊對照

| 畫面上 | `data.json` 鍵 | 改什麼 |
|---|---|---|
| 瀏覽器分頁標題 | `page.title` | 一個字串 |
| 頂部 Logo、選單、藍色 Contact | `nav` | `logo`、`links[]`、`cta` |
| 大頭照、Hello、副標 | `hero` | `photo`、`greeting`、`subtitle` |
| 關於我 | `about` | `title`、`description`、`paragraphs[]`、`info[]` |
| 學經歷時間軸 | `experience` | `title`、`description`、`items[]` |
| 專業技能卡片 | `skills` | `title`、`description`、`categories[]` |
| 研究發表（可左右滑） | `research` | `title`、`description`、`papers[]` |
| 精選作品（可左右滑） | `projects` | `title`、`description`、`items[]` |
| 聯絡我 | `contact` | `title`、`description`、`links[]` |

選單的 `href` 必須對應區塊 id，例如 `"#about"`。新增／刪除選單項只影響導覽列，**不會**自動長出新區塊。

---

### 關於我 `about`

- 改標題／一句話：`title`、`description`
- 改左側文章：編輯 `paragraphs` 裡的字串。多一段就在陣列加一個字串；刪一段就拿掉那個字串。
- 改右側重點卡：編輯 `info[].text`。加一張卡複製 `{ "text": "……" }`；刪就拿掉整張。可選 `icon`（有的話會顯示在文字前）。

### 學經歷 `experience.items`

每一筆需要 `date`、`title`、`org`。

- 條列說明用 `details`（字串陣列）。加／刪其中一行即可。
- 改成一段話用 `description`，可省略 `details`（現況「Bumping 製程工程師」就是這樣）。
- 兩種可以並存。新增一筆：複製現有物件，改四個欄位。刪一筆：拿掉整個 `{ ... }`。

### 專業技能 `skills.categories`

內頁模板：複製 `skills/_template/` 整夾，改成新的英文資料夾名（= `slug`）。內頁會依資料夾名去對 `data.json`，**不必改 HTML 標題或表格**。

每一張卡（完整範例見計算材料）：

```json
{
  "name": "計算材料",
  "slug": "computational-materials",
  "link": "skills/computational-materials/index.html",
  "intro": "這張卡點進去後，標題底下的一句話。",
  "tags": [
    { "name": "VASP", "detail": "我實際用它做過什麼（不是工具百科）。" }
  ]
}
```

- `slug`、資料夾名、`link` 三處必須相同（英文小寫、連字號）。
- 首頁標籤只顯示 `name`；內頁表格兩欄是「能力｜我實際做過什麼」（`detail`）。
- **新增一類：** 複製 `_template` → `skills/<slug>/`；在 `categories` 加一筆如上。不要另寫一份 HTML 文案。
- **刪除一類：** 從 `categories` 拿掉；對應資料夾一併刪。不要刪 `_template`。
- 沒有 `link` 的卡仍會顯示，但點了不開新頁。

### 研究發表 `research.papers`

每一篇：`title`、`journal`、`description`、`tags`。可選 `link` 指向介紹頁，例如 `research/zno-bandgap/`。

- 新增／刪除論文 = 增刪 `papers` 裡的物件。超過三篇會進入左右滑軌道，不必改版面。
- 區標題旁的「3 篇 SCI…」是 `research.description` 這句字，篇數變了要**手動改這句**。
- **介紹頁內容**不在 `data.json`，而在該資料夾的 `page.json`（見下方）。

### 精選作品 `projects.items`

每一筆：

| 欄位 | 用途 |
|---|---|
| `title`、`description` | 卡片文字 |
| `img` | 封面圖，路徑相對網站根，例如 `images/foo.webp`（檔放進 `images/`）。**規格 640×640 WebP**，不要直接放原始 PNG（每張 5–6 MB，卡片只顯示 160px 高） |
| `icon` | 沒圖時的後備 emoji |
| `link` | 點進去的頁面，例如 `projects/my-app/` |

- 新增作品：複製一筆、改欄位；把圖放到 `images/`；在 `projects/` 建資料夾，放入 `index.html`（從 `templates/detail.html` 複製）與 `page.json`。沒有 `link` 的卡不能點。
- 刪除：從 `items` 拿掉；圖與資料夾可一併刪。
- 卡片超過三張同樣自動可左右滑。

### 論文／作品介紹頁 `page.json`

首頁卡片只負責標題與摘要。點進去的四塊寫在各資料夾的 **`page.json`**，存檔後重新整理該頁即可。空字串會顯示「待填」提示，不會假裝已完成。Agent 改模板或加頁時以根目錄 `AGENTS.md` 為準。

| 欄位 | 填什麼 |
|---|---|
| `soWhat` | 核心理念 |
| `problem` | 遭遇挑戰（作品頁的標題會顯示成「想解決什麼問題」） |
| `role` / `method` | 貢獻；成果。**兩者各成一段**（不再黏成一句）。寫字串＝一段文字；寫字串陣列＝條列，適合「做了哪幾件事」這種並列項目 |
| `figure` | 單張圖路徑，例如 `images/foo.webp`（放該頁資料夾的 `images/`） |
| `figures` | 多個素材。靜態圖：`{ "src": "images/x.webp", "caption": "圖說" }`；影片：`{ "video": "videos/x.mp4", "poster": "images/poster-x.webp", "caption": "圖說" }`。有此欄就不再重複畫 `figure` |
| `figureCaption` | 單張圖的圖說 |
| `metric` | 可選。圖下方的脈絡／數字；空白就不顯示 |
| `links` | 按鈕陣列 `[{ "label": "PDF", "href": "…" }]`。第一個是主按鈕、其餘次要。**`href` 空的就不會畫出來**，所以留空等於不顯示 |
| `transfer` | 暫不顯示，欄位保留 |

`figures` 超過一個時會自動變成「主圖 + 縮圖列」，點縮圖換素材；**主圖區可點擊放大**（全螢幕檢視，`Esc`、點背景或右上角 ✕ 關閉）。影片自動靜音循環播放，`poster` 是載入前的預覽圖、同時當縮圖。

新增一頁：複製 `templates/detail.html` → `research/<短名>/index.html` 或 `projects/<短名>/index.html`；再複製 `templates/page.json` 改內容；在 `data.json` 該筆加上 `link`。

`index.html` 不用改。版面改 `css/detail.css` 與 `js/detail.js`，所有介紹頁一起變。電腦約 800px 以上是標題全寬、兩欄（左文右媒體）；窄螢幕單欄。手機 App 的直式錄影在這裡會顯示得較小，**點擊放大**後才看得清細節。

### 聯絡 `contact.links`

每一筆：`icon`、`label`、`href`。

- `icon` 用 [Phosphor](https://phosphoricons.com/) 的 class，例如 `ph ph-envelope`、`ph ph-phone`、`ph ph-linkedin-logo`。
- Email：`href` 用 `mailto:信箱`。電話：`tel:+886……`。一般網址用 `https://...`。暫時沒連結可寫 `"#"`（現況 LinkedIn）。
- 增刪按鈕 = 增刪這個陣列裡的物件。

### 首屏 `hero`

- 換大頭照：把檔放到 `images/`，改 `photo` 路徑。不設 `photo` 就不會顯示照片。
- `hero.buttons` 目前沒用；若加上 `{ "label", "href", "class": "btn-primary" }` 陣列，會在副標下出現按鈕。

---

## 主要檔案

| 路徑 | 用途 |
|---|---|
| `data.json` / `en/data.en.json` | 中／英首頁文字與列表的唯一來源 |
| `style-4-notion-warm.html` / `en/index.html` | 中／英首頁版面與互動。一般改內容不必動；兩份只差 `lang`、`title`、favicon 路徑，改完要複製過去 |
| `index.html` | 語言入口：依瀏覽器語言把訪客導到中文或英文版 |
| `research/`、`projects/` | 各頁 `index.html` + `page.json`；英文版在 `en/` 下的同名路徑 |
| `skills/_template/` | 新增技能頁的模板（`_template` 與現有技能頁內容相同） |
| `templates/detail.html`、`templates/detail-en.html` | 新增介紹頁的中／英模板（只差資源路徑層數） |
| `js/detail.js`、`css/detail.css` | 介紹頁的渲染與樣式，中英共用一份，語言由網址判斷 |
| `tools/` | `check-i18n.mjs`、`verify-pages.mjs`、`check-mobile.mjs`、截圖工具 |
| `images/`、`files/`、`assets/` | 卡片封面、論文 PDF、網站 icon（中英共用，不複製） |
| `serve.mjs` | 本機預覽 |

---

## English

This site ships in two languages. Homepage copy lives in **`data.json`** (Chinese) and **`en/data.en.json`** (English). Preview with `node serve.mjs` → `http://127.0.0.1:8766/` (the root picks a language by browser setting) or go straight to `http://127.0.0.1:8766/en/`. Do not double-click the HTML file.

**Every content change has to be made in both languages — there is no automatic sync.** English pages live under `en/` and carry their own `page.json`. Asset paths there are one level deeper (`../images/x.webp` versus `images/x.webp`), because shared assets stay in the repo root.

After editing, run `node tools/check-i18n.mjs`. It catches mismatched JSON structure, pages missing on the English side, dead asset paths, and a homepage HTML that was only edited on one side.

Array order is display order. Add an item by copying a neighbour object; delete by removing the whole object. JSON forbids a trailing comma after the last item.

Inside a detail page's `page.json`, `soWhat`, `problem`, `role`, and `method` each accept either a string (one paragraph) or an array of strings (a bullet list). Use an array when the text lists parallel items — recruiters scan bullets far faster than a paragraph.

| On screen | Key | Notes |
|---|---|---|
| Tab title | `page.title` | string |
| Nav | `nav` | `logo`, `links[]`, `cta` — `href` must match section ids |
| Hero | `hero` | `photo`, `greeting`, `subtitle` |
| About | `about` | `paragraphs[]` strings; `info[].text` cards (`icon` optional) |
| Timeline | `experience.items` | `date`, `title`, `org`; `details[]` and/or `description` |
| Skills | `skills.categories` | `name`, `slug`, `intro`, `tags[{name,detail}]`; copy `skills/_template/` |
| Research | `research.papers` | optional `link` to `research/<folder>/`; extra papers become a horizontal track; update `description` if the count sentence changes |
| Projects | `projects.items` | `img` under `images/`; `link` to `projects/<folder>/` |
| Contact | `contact.links` | Phosphor `icon`, `label`, `href` (`mailto:`, `tel:`, or URL) |

New **skills**: copy `skills/_template/` to `skills/<slug>/`, add a matching object in `data.json` (`slug` = folder name; tag `detail` lives in JSON). Project detail pages are still their own `index.html`. Nav edits do not create new page sections.
