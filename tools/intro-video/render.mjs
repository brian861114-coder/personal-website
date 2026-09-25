#!/usr/bin/env node
/**
 * 30 秒介紹動畫錄製工具
 *
 * 用法：
 *   node tools/intro-video/render.mjs video               # 錄影 + 配樂音效 → out/brian-intro.mp4
 *   node tools/intro-video/render.mjs video v3            # 輸出 out/brian-intro-v3.mp4
 *   node tools/intro-video/render.mjs audio [名稱]         # 只重做聲音，套到上次錄好的無聲影片（改音效時很快）
 *   node tools/intro-video/render.mjs stills 5 18.5       # 截指定秒數（影片時間）的靜態畫面 → out/still-<秒>.png
 *   任何指令加 --en：英文版（文案在 copy-en.js），預設輸出 out/brian-intro-en.mp4、截圖 still-en-<秒>.png
 *
 * 動畫本體是 intro.html（瀏覽器直接開會循環播放）；角色在 character.js，劇本在 scripts.js，
 * 配樂與音效由 audio.py 用 numpy 合成（需要 Python + numpy；Windows 用 py，可用 PYTHON 環境變數改）。
 * 圖片直接引用站上的 images/ 與 research/<slug>/images/；文案寫在 intro.html 裡，改 data.json 不會自動同步到影片。
 *
 * 做法：intro.html 以 window.__render(t) 依時間畫出每一格，這支腳本逐格截圖後餵給 ffmpeg，
 * 所以輸出是確定的、不受機器快慢影響。字型從 Google Fonts 載入（要連網）。
 *
 * 對拍：scripts.js 的 sync 給出配樂速度與「影片中各場景開始的時間」（都落在拍點上）。
 * 錄影時用分段線性時間校正，把劇本的換場時間對到這些拍點（每段速度差 < 2%，肉眼看不出來）；
 * 音效觸發點也用同一個換算轉成影片時間，畫面、音效、配樂才會同步。
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(DIR, 'out');
const FPS = 30;
const mode = process.argv[2] || 'video';
const EN = process.argv.includes('--en');
const args = process.argv.slice(3).filter(a => a !== '--en');
const tag = EN ? 'en' : '';
const PY = process.env.PYTHON || (process.platform === 'win32' ? 'py' : 'python3');

const run = (cmd, argv) => new Promise((ok, fail) => {
  const p = spawn(cmd, argv, { stdio: 'inherit', env: { ...process.env, PYTHONUTF8: '1' } });
  p.on('close', c => (c === 0 ? ok() : fail(new Error(`${cmd} exited ${c}`))));
});

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', e => { console.error('page error:', e.message); process.exitCode = 1; });
await page.goto(pathToFileURL(path.join(DIR, 'intro.html')).href + '?capture' + (EN ? '&lang=en' : ''));
await page.evaluate(async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].map(i => i.decode().catch(() => {})));
});
const DUR = await page.evaluate(() => window.__DUR);
const CUTS = await page.evaluate(() => window.__CUTS);
const { cues, sync } = await page.evaluate(() => window.__script());

// 影片時間 ↔ 劇本時間（分段線性）
const VK = [0, ...sync.cuts, DUR], SK = [0, ...CUTS, DUR];
const interp = (x, xs, ys) => { let i = 1; while (i < xs.length - 1 && x > xs[i]) i++;
  return ys[i - 1] + (ys[i] - ys[i - 1]) * (x - xs[i - 1]) / (xs[i] - xs[i - 1]); };
const toScript = v => interp(v, VK, SK), toVideo = s => interp(s, SK, VK);

const silent = path.join(OUT, EN ? '_silent-en.mp4' : '_silent.mp4');
const name = `brian-intro${[tag, args[0]].filter(Boolean).map(s => '-' + s).join('')}.mp4`;

async function renderVideo() {
  // JPEG 是全範圍色彩，轉成標準 yuv420p（tv range），LinkedIn／104 播放顏色才不會偏
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-vf', 'scale=in_range=full:out_range=tv,format=yuv420p', '-color_range', 'tv',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-movflags', '+faststart', silent], { stdio: ['pipe', 'inherit', 'inherit'] });
  const N = Math.round(DUR * FPS);
  for (let f = 0; f < N; f++) {
    await page.evaluate(t => window.__render(t), toScript(f / FPS));
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 150 === 0) console.log(`frame ${f}/${N}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
}

async function renderAudio() {
  const conv = cues.map(c => {
    const o = { ...c, t: toVideo(c.t) };
    if (c.d) o.d = toVideo(c.t + c.d) - o.t;
    if (c.mute) o.mute = c.mute.map(([a, b]) => [toVideo(a) - o.t, toVideo(b) - o.t]);
    return o;
  });
  const cuePath = path.join(OUT, 'cues.json'), wav = path.join(OUT, 'soundtrack.wav');
  await writeFile(cuePath, JSON.stringify({ dur: DUR, sync, cues: conv }, null, 1));
  await run(PY, [path.join(DIR, 'audio.py'), cuePath, wav]);
  // 響度正規化到 -14 LUFS（LinkedIn／YouTube 等平台的常見基準），AAC 192k
  await run('ffmpeg', ['-y', '-v', 'error', '-i', silent, '-i', wav, '-map', '0:v', '-map', '1:a',
    '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11,alimiter=limit=0.84:level=false', '-ar', '48000', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
    '-shortest', '-movflags', '+faststart', path.join(OUT, name)]);
  console.log('done', path.join(OUT, name));
}

if (mode === 'stills') {
  for (const t of args.map(Number)) {
    await page.evaluate(t => window.__render(t), toScript(t));
    await page.screenshot({ path: path.join(OUT, `still-${tag ? tag + '-' : ''}${t}.png`) });
  }
} else if (mode === 'audio') {
  await access(silent).catch(() => { throw new Error('找不到 out/_silent.mp4，先跑一次 video'); });
  await renderAudio();
} else {
  await renderVideo();
  await renderAudio();
}
await browser.close();
