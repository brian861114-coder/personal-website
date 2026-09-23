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
- 渲染：`js/detail.js` + `css/detail.css`。區塊標題在 `js/detail.js` 的 `KIND_COPY`（所有介紹頁一起變）。
- 首頁 `data.json` 該筆加 `link` 指向該資料夾。論文卡與作品卡同一套點擊。
- **不要**套用 `skills/_template`。

畫面四塊（**結構固定**；括號是 `page.json` 鍵）。h2 文字隨 `kind` 換：研究頁用下表；作品頁把「遭遇挑戰」換成「想解決什麼問題」、「貢獻與成果」換成「我做了什麼與結果」（見 `KIND_COPY`）。`transfer` 暫不渲染，欄位保留在 `page.json`。

| 畫面標題（研究頁） | 鍵 | 寫什麼 |
|---|---|---|
| 核心理念 | `soWhat` | 非專家也聽得懂的主軸 |
| 遭遇挑戰 | `problem` | 當時卡在哪 |
| 貢獻與成果 | `role`、`method` | 他的貢獻；做成什麼 |
| 補充說明 | `figure`、`figures`、`figureCaption`、`metric` | 圖或影片 + 可選脈絡。單張用 `figure`；多張用 `figures[{...}]`（自動變主圖 + 縮圖列）。`metric` 沒填就不要畫 |

`figures` 的每個項目可以是**靜態圖**或**影片**：

- 靜態圖：`{ "src": "images/x.webp", "caption": "…" }`
- 影片：`{ "video": "videos/x.mp4", "poster": "images/poster-x.webp", "caption": "…" }`

影片以 `autoplay loop muted playsinline` 渲染，像動圖一樣自己播；`poster` 同時當縮圖列來源（沒有 poster 的影片，縮圖列會是空的）。影片放該頁 `videos/`，poster 放 `images/`。UI 流程類的專案用影片比靜態圖有說服力。

標題：`title` 放全名，`shortTitle` 放 h1 用的短標題（建議 12 字內）。有填 `shortTitle` 才會在 h1 下方補一行全名；沒填則 h1 直接用 `title`。

`links` 會渲染成按鈕（第一個 primary、其餘 secondary），**但只有 `href` 有值的才出現**——空 href 不畫假按鈕。作品頁預設 Demo/GitHub、研究頁預設 PDF/DOI。

第三篇 CO₂ 文聽起來偏實驗：角色必須寫清他做計算還是製備，缺資料就停、問 Brian。

空字串顯示 placeholder。不要刪欄位來「看起來做完」，也不要替他編造內文、IF 崇拜或嵌入整份 PDF。

新增完成標準：首頁卡點得進去、四塊標題在、空欄是提示不是假內容、返回連回對應錨點（`#research` 或 `#projects`）。

## 圖片

- **卡片封面**：640×640 WebP（品質 85）。這類「純色漸層 + 扁平符號」的圖壓縮後約 3–11 KB；原始 2048×2048 PNG 每張 5–6 MB，不要直接上線（卡片顯示高度只有 160px）。
- 封面圖是 RGBA（有透明通道），**不能轉 JPEG**。
- 位置：卡片封面放根目錄 `images/`；論文插圖放各頁 `research/<slug>/images/`。

## 影片素材

專案展示影片放各頁 `videos/`，poster 放 `images/`（WebP、品質 85）。

**一律先 encode 再上線**——原始錄影從 4.8 MB 到 27 MB 不等。基準指令（無語音）：

```
ffmpeg -y -i SRC -vf "scale=1280:-2" -c:v libx264 -pix_fmt yuv420p -preset slow -crf 28 -an -movflags +faststart DEST.mp4
```

- **手機錄影（直式）**改成 `-vf "scale=540:-2,fps=30"`。內建錄影預設 60fps，降到 30 就省一半；直式面積小，540 寬在右欄與 lightbox 都夠用。
- 目標大小：橫式每支 < 1 MB、直式 < 300 KB。理工教材那類大量文字的例外（約 3 MB）——壓太狠小字會糊。
- 抽 poster：`ffmpeg -ss <秒> -i X.mp4 -frames:v 1 tmp.png`，再用 Pillow 轉 WebP。
- Android 錄影：手機內建螢幕錄影（Samsung 的不會錄到狀態列）或 `adb shell screenrecord --size 1080x2340 --bit-rate 8M`；靜態截圖用 `tools/shoot-android.mjs`。網頁類專案用 `tools/shoot.mjs`。

## 版面

- 研究／作品：CSS 橫向 scroll-snap + 箭頭。不要上 Swiper。
- 介紹頁：標題全寬；**約 800px 以上**兩欄 `0.9fr 1.1fr`（左文右媒體），`main` 約 1080px。右欄是媒體區，刻意比文字欄寬；不要改回等寬或讓文字欄更寬。不要 sticky 圖欄。窄螢幕單欄、文在上圖在下。
- 作品頁與研究頁**共用同一套視覺**（首頁的淺藍漸層底 + 半透明白卡），不要再加 `body.detail-project` 這類分岔規則。要改底色改 `css/detail.css` 的 `:root` 變數（首頁 `:root` 同步）。
- 多圖走「主圖 + 縮圖列」，點縮圖換主圖（`setupFigureGallery`）。單圖不顯示縮圖列。縮圖固定 62×62 正方形 + `object-fit: cover`，橫式與直式素材並排才會一致。
- **點擊放大**（`setupLightbox`）：點主圖區開全螢幕 overlay（`Esc`／點背景／✕ 關閉），影片在 overlay 裡繼續播。右欄只有約 500px，細節一律靠這個看；改渲染時不要弄掉 `.detail-evidence .figure-slot` 的 `role="button"` 與 `tabindex`。
- 媒體高度上限 420px（`.detail-evidence .figure-slot img/video`）：**橫式素材受寬度限制，碰不到這個值**；直式素材（手機錄影）靠它才不會縮成 100px 寬。
- 電腦版首頁現有桌面排版維持；手機規則已在主頁 CSS（約 640px）。
- 技能區單卡不要拉滿整行：`auto-fill` + `minmax(260px, 1fr)`。

## 預覽

改 UI 或資料後，用本機伺服器打開 `style-4-notion-warm.html`，點過受影響的卡與返回。不要只截一張靜態圖。
