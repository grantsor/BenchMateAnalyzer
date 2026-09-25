@echo off
title Stop Benchmark Analyzer
echo ========================================================
echo          Stopping Benchmark Analyzer Server...
echo ========================================================
taskkill /F /IM Benchmark-Analyzer.exe 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8742" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a 2>nul
)
echo.
echo Benchmark Analyzer has been completely stopped.
echo ========================================================
timeout /t 2 >nul
