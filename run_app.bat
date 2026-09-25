@echo off
setlocal enabledelayedexpansion

echo =========================================================
echo       BenchMate Analyzer & Chart Generator v1.0.0
echo       (Benchmark OCR Analyzer + CapFrameX Analyzer)
echo =========================================================
echo.

set "PY_EXE="
if exist "%~dp0backend\venv\Scripts\python.exe" (
    set "PY_EXE=%~dp0backend\venv\Scripts\python.exe"
) else if exist "C:\Users\Grant Soriano\Documents\GitHub\Benchmark-OCR-Analyzer-Desktop\backend\venv\Scripts\python.exe" (
    set "PY_EXE=C:\Users\Grant Soriano\Documents\GitHub\Benchmark-OCR-Analyzer-Desktop\backend\venv\Scripts\python.exe"
) else if exist "C:\Users\Grant Soriano\Documents\GitHub\Benchmark-OCR-Analyzer\backend\venv\Scripts\python.exe" (
    set "PY_EXE=C:\Users\Grant Soriano\Documents\GitHub\Benchmark-OCR-Analyzer\backend\venv\Scripts\python.exe"
) else (
    where python >nul 2>nul
    if %errorlevel% equ 0 (
        set "PY_EXE=python"
    )
)

if "%PY_EXE%"=="" (
    echo [ERROR] Python environment not found!
    echo Please install Python or set up a virtual environment.
    pause
    exit /b 1
)

cd /d "%~dp0"
"%PY_EXE%" run_app.py
pause
