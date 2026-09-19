# personal-website

Brian 的履歷／作品集靜態站。畫面上的文字幾乎都來自 **`data.json`**，改完存檔、重新整理瀏覽器即可。不必改 HTML，也不必再複製一份進網頁。

Agent 動手前記 `AGENTS.md`（技能頁模板、資料單一來源、研究／作品另一套內頁）。

本機預覽：雙擊專案裡的 **`start-website.lnk`**（或 `start-site.bat`），或桌面上的 **Personal-Website**。會啟動伺服器並打開瀏覽器。**不要雙擊 HTML**，否則讀不到 `data.json`。關掉標題為「個人網站預覽」的黑色視窗就會停止伺服器。也可在專案目錄執行 `node serve.mjs`。

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
| `img` | 封面圖，路徑相對網站根，例如 `images/foo.png`（檔放進 `images/`） |
| `icon` | 沒圖時的後備 emoji |
| `link` | 點進去的頁面，例如 `projects/my-app/` |

- 新增作品：複製一筆、改欄位；把圖放到 `images/`；在 `projects/` 建資料夾，放入 `index.html`（從 `templates/detail.html` 複製）與 `page.json`。沒有 `link` 的卡不能點。
- 刪除：從 `items` 拿掉；圖與資料夾可一併刪。
- 卡片超過三張同樣自動可左右滑。

### 論文／作品介紹頁 `page.json`

首頁卡片只負責標題與摘要。點進去的五塊寫在各資料夾的 **`page.json`**，存檔後重新整理該頁即可。空字串會顯示「待填」提示，不會假裝已完成。Agent 改模板或加頁時以根目錄 `AGENTS.md` 為準。

| 欄位 | 填什麼 |
|---|---|
| `soWhat` | 核心理念 |
| `problem` | 遭遇挑戰 |
| `role` / `method` | 貢獻；成果 |
| `figure` | 圖檔路徑，例如 `../../images/foo.png`（檔放進 `images/`） |
| `figureCaption` | 圖說 |
| `metric` | 補充說明（數字或脈絡） |
| `transfer` | 對下一份工作可轉移的能力 |
| `links[].href` | PDF、DOI、repo。**href 空白的按鈕不會出現** |

新增一頁：複製 `templates/detail.html` → `research/<短名>/index.html` 或 `projects/<短名>/index.html`；再複製 `templates/page.json` 改內容；在 `data.json` 該筆加上 `link`。

`index.html` 不用改。版面改 `css/detail.css` 與 `js/detail.js`，所有介紹頁一起變。

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

- `data.json` — 首頁文字與列表的唯一來源
- `style-4-notion-warm.html` — 版面與互動（一般改內容不必動）
- `serve.mjs` — 本機預覽
- `images/`、`files/`、`projects/`、`skills/` — 圖、PDF、子頁

---

## English

Edit **`data.json` only** for homepage copy. Preview with `node serve.mjs` → `http://127.0.0.1:8766/style-4-notion-warm.html`. Do not double-click the HTML file.

Array order is display order. Add an item by copying a neighbour object; delete by removing the whole object. JSON forbids a trailing comma after the last item.

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
