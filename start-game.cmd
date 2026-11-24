@echo off
setlocal
cd /d "%~dp0"
where python.exe >nul 2>nul
if not errorlevel 1 (
  echo Starting Lumina Cafe with Python at http://localhost:3000
  python server.py
  pause
  exit /b %errorlevel%
)
where node.exe >nul 2>nul
if not errorlevel 1 (
  echo Starting Lumina Cafe with Node.js at http://localhost:3000
  node server.js
  pause
  exit /b %errorlevel%
)
echo Python or Node.js was not found. Install Python 3.10+ from https://www.python.org/downloads/
pause
exit /b 1
