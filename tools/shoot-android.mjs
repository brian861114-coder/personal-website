#!/usr/bin/env node
/**
 * Android 模擬器／實機截圖（Flutter App 用）
 *
 * 用法：
 *   node tools/shoot-android.mjs 3c-detox home focus schedule music
 *   node tools/shoot-android.mjs elder-life home medical life contacts
 *
 * 流程：腳本會依序提示「請切到 <name> 畫面」，你在模擬器／手機上操作到那個畫面，
 *       回到終端按 Enter，就截一張。
 * 產出：projects/<slug>/images/shot-<name>.png
 *
 * 前提：模擬器已啟動或手機已接 USB、App 已安裝並開著（`adb devices` 看得到裝置）。
 * 若找不到 adb，設定環境變數 ADB_PATH 指向 adb.exe，或把 platform-tools 加進 PATH。
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const exec = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let ADB = 'adb';

const KNOWN = {
  '3c-detox': '3C Detox App（FocusFlow）',
  'elder-life': 'Elder Life App（輕鬆銀髮）'
};

async function run(args, options = {}) {
  return exec(ADB, args, { maxBuffer: 64 * 1024 * 1024, ...options });
}

/** adb 通常不在 PATH；依序試 ADB_PATH、PATH、Android SDK 預設位置。 */
async function resolveAdb() {
  const sdkAdb = process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools', 'adb.exe')
    : null;
  const candidates = [process.env.ADB_PATH, 'adb', sdkAdb].filter(Boolean);

  for (const candidate of candidates) {
    try {
      const { stdout } = await execFile(candidate, ['version'], { maxBuffer: 4 * 1024 * 1024 });
      ADB = candidate;
      return stdout.split('\n')[0].trim();
    } catch {
      // 換下一個候選路徑
    }
  }

  console.error('找不到 adb。試過：');
  candidates.forEach((c) => console.error(`  - ${c}`));
  console.error('解法：設定環境變數 ADB_PATH 指向 adb.exe，或把 platform-tools 加進 PATH。');
  process.exit(1);
}

async function listDevices() {
  const { stdout } = await run(['devices']);
  const lines = stdout.split('\n').slice(1).map((l) => l.trim()).filter(Boolean);
  return lines
    .map((l) => {
      const [id, state] = l.split(/\s+/);
      return { id, state };
    })
    .filter((d) => d.state === 'device');
}

function waitEnter(prompt) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(prompt, () => {
      rl.close();
      resolve();
    });
  });
}

async function capture(outPath) {
  // screencap 是二進位輸出，必須用 buffer 讀，否則 PNG 會被當成字串破壞
  const { stdout } = await run(['exec-out', 'screencap', '-p'], { encoding: 'buffer' });
  if (!stdout || stdout.length < 1000) {
    throw new Error('截圖資料過小，裝置可能已斷線');
  }
  await writeFile(outPath, stdout);
  return stdout.length;
}

async function main() {
  const [slug, ...names] = process.argv.slice(2);

  if (!slug || !names.length) {
    console.error('用法：node tools/shoot-android.mjs <slug> <畫面名稱...>');
    console.error(`已知專案：${Object.keys(KNOWN).join(', ')}`);
    console.error('範例：node tools/shoot-android.mjs 3c-detox home focus schedule');
    process.exit(1);
  }

  console.log(`adb：${await resolveAdb()}`);

  const devices = await listDevices();
  if (!devices.length) {
    console.error('沒有可用的裝置。請先啟動模擬器，或接上手機並開啟 USB 偵錯。');
    process.exit(1);
  }
  if (devices.length > 1) {
    console.error(`偵測到多台裝置，請只留一台（目前：${devices.map((d) => d.id).join(', ')}）。`);
    process.exit(1);
  }
  console.log(`裝置：${devices[0].id}`);

  const dir = path.join(ROOT, 'projects', slug, 'images');
  await mkdir(dir, { recursive: true });

  console.log(`\n${KNOWN[slug] || slug} — 準備截 ${names.length} 張`);
  console.log('提示：模擬器若顯示狀態列（時間／電量），可在模擬器設定中隱藏，或事後裁掉。\n');

  const saved = [];
  for (const name of names) {
    await waitEnter(`  [${name}] 請在 App 切到這個畫面，好了按 Enter…`);
    const out = path.join(dir, `shot-${name}.png`);
    try {
      const bytes = await capture(out);
      console.log(`    已存 ${path.relative(ROOT, out)}  (${Math.round(bytes / 1024)} KB)`);
      saved.push(out);
    } catch (err) {
      console.log(`    !! 失敗：${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`\n完成 ${saved.length}/${names.length} 張。`);
  if (saved.length) {
    console.log('接著在該專案的 page.json 的 figures 陣列填入：');
    saved.forEach((p, i) => {
      console.log(`  { "src": "images/${path.basename(p)}", "caption": "（第 ${i + 1} 張圖說）" }`);
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
