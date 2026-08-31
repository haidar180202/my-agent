@echo off
title Real-Time AI Interview Copilot Stealth Overlay Launcher
echo ============================================================
echo   🚀 Launching Real-Time AI Interview Copilot (Stealth Mode)
echo   🛡️ OS-Level Screen Capture Protection: ACTIVE (Invisible to Meet/Teams)
echo ============================================================
echo.

cd /d "%~dp0"

echo 1. Connecting to Production Vercel Server (https://my-agent-mauve-omega.vercel.app)...
if "%COPILOT_URL%"=="" set COPILOT_URL=https://my-agent-mauve-omega.vercel.app/copilot?desktop=true

echo 2. Opening Native Invisible Stealth Windows Overlay...
if exist "node_modules\electron\dist\electron.exe" (
    "node_modules\electron\dist\electron.exe" electron/main.js
) else if exist "..\node_modules\electron\dist\electron.exe" (
    "..\node_modules\electron\dist\electron.exe" electron/main.js
) else (
    start msedge.exe --app="https://my-agent-mauve-omega.vercel.app/copilot?desktop=true" --window-size=1100,750
)

echo.
echo ✅ AI Copilot Stealth Desktop App is now running!
echo 🔑 Stealth Hotkeys (Electron Mode):
echo   [Alt+Shift+H] Hide / Show Overlay
echo   [Alt+Shift+T] Toggle Click-Through Mouse Pass-Through
echo   [Alt+S]       Snap Screen OCR
echo   [Alt+L]       Toggle Live Audio Listening
echo.
