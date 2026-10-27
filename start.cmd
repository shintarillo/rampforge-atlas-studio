@echo off
chcp 65001 >nul
setlocal
title RampForge - Atlas Studio
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js no esta instalado o no se encuentra en el PATH.
  echo   Instala Node.js 18 o superior desde https://nodejs.org/
  echo.
  pause
  exit /b 1
)

if not defined PORT set "PORT=5173"
set "URL=http://127.0.0.1:%PORT%/"

echo.
echo   ================================================
echo    RampForge - Atlas Studio
echo   ================================================
echo.
echo   Iniciando servidor local en:
echo   %URL%
echo.
echo   El navegador se abrira automaticamente.
echo   Pulsa Ctrl+C para detener el servidor.
echo.

start "" /min powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Milliseconds 900; Start-Process '%URL%'"
node server.mjs

echo.
echo   El servidor se ha detenido.
pause
endlocal
