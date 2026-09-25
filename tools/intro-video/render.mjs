#!/usr/bin/env node
/**
 * 30 秒介紹動畫錄製工具
 *
 * 用法：
 *   node tools/intro-video/render.mjs video               # 錄成 out/brian-intro.mp4
 *   node tools/intro-video/render.mjs video v2            # 錄成 out/brian-intro-v2.mp4
 *   node tools/intro-video/render.mjs stills 5 18.5       # 只截指定秒數的靜態畫面（out/still-<秒>.png）
 *
 * 動畫本體是 intro.html（瀏覽器直接開會循環播放）；角色在 character.js，劇本在 scripts.js。圖片直接引用站上的
 * images/ 與 research/<slug>/images/，不另存副本；文案寫在 intro.html 裡，
 * 改 data.json 不會自動同步到影片。
 *
 * 做法：intro.html 以 window.__render(t) 依時間畫出每一格，這支腳本逐格截圖
 * 後餵給 ffmpeg，所以輸出是確定的、不受機器快慢影響。需要 Chrome 與 ffmpeg，
 * 字型從 Google Fonts 載入（要連網）。
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(DIR, 'out');
const FPS = 30;
const mode = process.argv[2] || 'video';
const args = process.argv.slice(3);

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', e => { console.error('page error:', e.message); process.exitCode = 1; });
await page.goto(pathToFileURL(path.join(DIR, 'intro.html')).href + '?capture');
await page.evaluate(async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].map(i => i.decode().catch(() => {})));
});
const DUR = await page.evaluate(() => window.__DUR);

if (mode === 'stills') {
  for (const t of args.map(Number)) {
    await page.evaluate(t => window.__render(t), t);
    await page.screenshot({ path: path.join(OUT, `still-${t}.png`) });
  }
} else {
  const out = path.join(OUT, args[0] ? `brian-intro-${args[0]}.mp4` : 'brian-intro.mp4');
  // JPEG 是全範圍色彩，轉成標準 yuv420p（tv range），LinkedIn／104 播放顏色才不會偏
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-vf', 'scale=in_range=full:out_range=tv,format=yuv420p', '-color_range', 'tv',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const N = Math.round(DUR * FPS);
  for (let f = 0; f < N; f++) {
    await page.evaluate(t => window.__render(t), f / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 150 === 0) console.log(`frame ${f}/${N}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  console.log('done', out);
}
await browser.close();
