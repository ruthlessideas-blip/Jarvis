@echo off
REM Launch the JARVIS command center on a local web server and open it.
cd /d "%~dp0"
set PORT=4173
echo   J.A.R.V.I.S  ^-^>  http://localhost:%PORT%
echo   (close this window to stop)
start "" http://localhost:%PORT%
python -m http.server %PORT% 2>nul || py -m http.server %PORT%
