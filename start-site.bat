@echo off
chcp 65001 >nul
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo 找不到 node。請先安裝 Node.js，再雙擊這個檔。
  pause
  exit /b 1
)

powershell -NoProfile -Command "try { $null = Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 http://127.0.0.1:8766/data.json; exit 0 } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
  start "個人網站預覽 — 關掉此視窗即停止" cmd /k "cd /d "%~dp0" && node serve.mjs"
  ping -n 2 127.0.0.1 >nul
)

start "" "http://127.0.0.1:8766/style-4-notion-warm.html"
