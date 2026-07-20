@echo off
REM ============================================================
REM   JARVIS - one-click desktop launcher (Windows)
REM   Double-click this file. It starts JARVIS and opens it in
REM   its own app window. No setup, no typing localhost.
REM ============================================================
cd /d "%~dp0"
set PORT=4173
set URL=http://localhost:%PORT%/index.html

echo.
echo   Booting J.A.R.V.I.S ...
echo.

set SERVERCMD=
where node >nul 2>nul && set "SERVERCMD=node desktop\server.js %PORT%"
if not defined SERVERCMD ( where python >nul 2>nul && set "SERVERCMD=python -m http.server %PORT%" )

if defined SERVERCMD (
  start "JARVIS engine" /min cmd /c "%SERVERCMD%"
  timeout /t 1 /nobreak >nul
  REM Edge ships with Windows, so try it first; then Chrome.
  start "" msedge --app=%URL% --new-window 2>nul || start "" chrome --app=%URL% --new-window 2>nul || start "" %URL%
  echo   JARVIS is up - it should appear in its own window.
  echo.
  echo   Keep THIS window open while you use JARVIS.
  echo   Press any key here to shut JARVIS down.
  pause >nul
  taskkill /fi "WINDOWTITLE eq JARVIS engine*" /f >nul 2>nul
) else (
  echo   No Node or Python found - opening JARVIS directly.
  echo   Tip: install Node.js from nodejs.org for full voice support.
  start "" msedge --app=file:///%CD%\index.html 2>nul || start "" index.html
  pause
)
