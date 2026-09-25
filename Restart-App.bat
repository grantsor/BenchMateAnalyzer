@echo off
title Restart Benchmark Analyzer
echo ========================================================
echo          Restarting Benchmark Analyzer...
echo ========================================================
taskkill /F /IM Benchmark-Analyzer.exe 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8742" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a 2>nul
)
timeout /t 1 /nobreak >nul
echo Launching Benchmark Analyzer...
start "" "%~dp0Benchmark-Analyzer.exe"
