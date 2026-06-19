@echo off
cd /d "%~dp0"
echo 正在启动视频下载器...
start /min "" node server.js
timeout /t 2 /nobreak >nul
start http://localhost:8765
