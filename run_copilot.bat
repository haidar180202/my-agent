@echo off
title Real-Time AI Interview Copilot Desktop Launcher
echo ============================================================
echo   🚀 Launching Real-Time AI Interview Copilot (Desktop App)
echo ============================================================
echo.

cd /d "%~dp0"

echo 1. Starting Next.js Local Server...
start "AI Copilot Server" /min npm run dev

echo 2. Waiting for server to initialize...
timeout /t 6 /nobreak >nul

echo 3. Opening Native Transparent Windows Desktop App (Electron Always-On-Top)...
npx electron electron/main.js

echo.
echo ✅ AI Copilot Desktop App is now running!
echo You can use [Alt+S] to snap screen and [Alt+L] for live audio listening.
echo.
