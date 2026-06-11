@echo off
cd /d "%~dp0"
echo Starting live debug server at http://127.0.0.1:5173/index.html?debug=1^&stage=1
echo Save any file and the browser will refresh automatically.
npx --yes live-server . --port=5173 --watch=css,js,index.html --entry-file=index.html --open=/index.html?debug=1^&stage=1
