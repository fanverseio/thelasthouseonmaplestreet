@echo off
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0..\.."
call npm run typecheck || exit /b 1
node node_modules\vitest\vitest.mjs --run apps/client
