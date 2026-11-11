@echo off
rem Lint the given files (repo-wide lint trips over diag.tmp.mjs). Usage: lint-files.cmd <files...>
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0..\.."
node node_modules\eslint\bin\eslint.js %*
echo EXIT %errorlevel%
