/*
 * 英文版文案（網址加 ?lang=en；錄影：node render.mjs video --en）。
 * 全部取自英文站既有內容：en/data.en.json 與 en/research、en/projects 各頁 page.json 的 shortTitle。
 * 新增或改文案時兩邊都要看，不要在這裡自己翻譯。
 * 每筆：[CSS 選擇器, 文字]；選到多個元素時依序套用陣列。
 */
window.COPY_EN = [
  ['#name1', 'Wei-Che Tseng'],
  ['#w1', 'Semiconductor physics'],
  ['#w2', 'AI systems'],
  ['#tagline', 'Reasoning from first principles, automating with intelligence'],
  ['#s3 .l', ['SCI journal papers', 'Highest impact factor', 'Complete projects', 'Years in packaging process engineering']],
  ['#s4 .h2', 'Background'],
  ['#s4 .t', ['B.S. — Materials Science and Engineering', 'M.S. — Materials Science and Engineering', 'Bumping Process Engineer']],
  ['#s4 .o', ['National Cheng Kung University', 'National Cheng Kung University · 3 SCI journal papers', 'Winstek Semiconductor Co., Ltd.']],
  ['#s5 .h2', '3 SCI journal papers'],
  ['#s5 .st', ['Machine-learning bandgap prediction', 'Screening hydrogen-evolution catalysts by simulation', 'CO₂ photocatalytic heterostructure']],
  ['#s6 .h2', '6 complete projects'],
  ['#s6 .pt', ['3C Detox App', 'Elder Life App', 'JLPT grammar study site MyJapan', 'Interactive STEM textbook site', 'Fridge inventory system', 'Life roles dashboard']],
  ['#s6 .ps', ['Flutter · Android', 'Hive + AES · AI Q&A', 'JLPT N4–N2 · TTS', '83 chapters · 1,209 practice questions', 'Next.js + FastAPI', 'React + Electron']],
  ['#outroName', 'Wei-Che Tseng'],
  ['#outroEn', 'Brian · 曾為哲'],
  ['#outroLine', "A good engineer doesn't just solve problems; they build systems that keep evolving."],
];
