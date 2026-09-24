---
id: personal-website
name: 個人履歷網站
summary: 求職用中英雙語靜態履歷站，文案在 JSON 不進 HTML
state: active
locations:
  - host: nitro
    path: C:\Users\brian\Downloads\10_projects\11_active\personal-website
    role: source
status_source: inline
snapshot: full
related: []
card_reviewed: 2026-09-24
---

## 用途
給招募者掃證據的靜態履歷站，不是作品集玩具。中英兩套獨立資料，同一套 renderer。

## 功能
- 雙語首頁：`style-4-notion-warm.html` fetch `data.json`；`en/index.html` 對 `en/data.en.json`
- 研究／作品內頁：`templates/detail.html` + 各頁 `page.json`（`js/detail.js`）
- 技能卡與內頁同一份 JSON `skills.categories`

## 結構與入口
- `data.json`／`en/data.en.json`：首頁文案；`js/`、`css/`、`images/` 共用
- `research/`、`projects/`、`skills/`（英文在 `en/` 下多一層）
- 啟動：`node serve.mjs` 或 `start-site.bat`；檢查：`npm test`；瀏覽器驗需先起伺服器再跑 `tools/verify-pages.mjs`、`check-mobile.mjs`

## 外部依賴
- 無執行期後端；`package.json` 有 playwright-core 供檢查腳本

## 禁區
- 無（未發現金鑰／.env；履歷公開文案在 JSON）

## 給 AI 的注意事項
- 修改前先讀 AGENTS.md
- 首頁文案只活在 JSON，禁止 `window.__DATA__`；論文數字缺資料就停、不要編造
- 改完中文首頁 HTML 須同步 `en/index.html`；`kind` 不翻譯

## 現況
- 目標：求職用靜態履歷站（AGENTS.md）
- 卡在：文件未記載
- 下一步：文件未記載
