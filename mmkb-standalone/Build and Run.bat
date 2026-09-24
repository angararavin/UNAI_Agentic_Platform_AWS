@echo off
cd /d "%~dp0"
echo Token-Economics Knowledge Assistant
echo ====================================
if not exist node_modules (
  echo Installing optional dependencies (video/OCR/PDF support) - first run only...
  call npm install --no-audit --no-fund
  echo.
)
echo Starting server on http://localhost:3300 ...
start "" http://localhost:3300
node server.js
pause
