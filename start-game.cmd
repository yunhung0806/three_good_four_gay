@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
where py.exe >nul 2>nul
if not errorlevel 1 (
  py -3 -c "import sys;sys.exit(0 if sys.version_info>=(3,10) else 1)" >nul 2>nul
  if not errorlevel 1 (
    echo Starting Lumina Cafe with Python. See the server output for the URL.
    py -3 server.py
    set status=!errorlevel!
    pause
    exit /b !status!
  )
)
where python.exe >nul 2>nul
if not errorlevel 1 (
  python -c "import sys;sys.exit(0 if sys.version_info>=(3,10) else 1)" >nul 2>nul
  if not errorlevel 1 (
    echo Starting Lumina Cafe with Python. See the server output for the URL.
    python server.py
    set status=!errorlevel!
    pause
    exit /b !status!
  )
)
where node.exe >nul 2>nul
if not errorlevel 1 (
  node -e "process.exit(Number(process.versions.node.split('.')[0])>=20?0:1)" >nul 2>nul
  if not errorlevel 1 (
    echo Starting Lumina Cafe with Node.js. See the server output for the URL.
    node server.js
    set status=!errorlevel!
    pause
    exit /b !status!
  )
)
echo Python 3.10+ or Node.js 20+ was not found.
pause
exit /b 1
