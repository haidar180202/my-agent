@echo off
title Real-Time AI Interview Copilot Stealth Overlay Launcher
echo ============================================================
echo   🚀 Launching Real-Time AI Interview Copilot (Stealth Mode)
echo   🛡️ OS-Level Screen Capture Protection: ACTIVE (Invisible to Meet/Teams)
echo ============================================================
echo.

cd /d "%~dp0"

echo 1. Starting Next.js Local Server...
start "AI Copilot Server" /min npm run dev

echo 2. Waiting for server to initialize...
timeout /t 6 /nobreak >nul

echo 3. Opening Native Invisible Stealth Windows Overlay (Electron)...
set COPILOT_URL=http://localhost:3000/copilot?desktop=true
npx electron electron/main.js

echo.
echo ✅ AI Copilot Stealth Desktop App is now running!
echo 🔑 Stealth Hotkeys:
echo   [Alt+Shift+H] Hide / Show Overlay
echo   [Alt+Shift+T] Toggle Click-Through Mouse Pass-Through
echo   [Alt+S]       Snap Screen OCR
echo   [Alt+L]       Toggle Live Audio Listening
echo.
