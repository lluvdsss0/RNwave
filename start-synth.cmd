@echo off
setlocal
pushd "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js and npm were not found.
  echo Install the Node.js LTS release, then run this file again.
  pause
  popd
  exit /b 1
)

if not exist "node_modules\vite\bin\vite.js" (
  echo Installing project dependencies...
  call npm install
  if errorlevel 1 (
    echo Dependency installation failed. Check the npm output above.
    pause
    popd
    exit /b 1
  )
)

echo Starting RAW wave with Vite. Open the local URL shown below.
call npm run dev
popd
