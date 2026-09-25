@echo off
setlocal enabledelayedexpansion

echo =========================================================
echo       BenchMate Analyzer - Development Mode
echo =========================================================
echo.

set "PY_EXE="
if exist "%~dp0backend\venv\Scripts\python.exe" (
    set "PY_EXE=%~dp0backend\venv\Scripts\python.exe"
) else if exist "C:\Users\Grant Soriano\Documents\GitHub\Benchmark-OCR-Analyzer-Desktop\backend\venv\Scripts\python.exe" (
    set "PY_EXE=C:\Users\Grant Soriano\Documents\GitHub\Benchmark-OCR-Analyzer-Desktop\backend\venv\Scripts\python.exe"
) else (
    set "PY_EXE=python"
)

echo Starting backend server on http://127.0.0.1:8742 ...
start "BenchMate Backend" cmd /k "cd /d %~dp0backend && "%PY_EXE%" -m uvicorn app.main:app --host 127.0.0.1 --port 8742 --reload"

echo Starting frontend dev server on http://localhost:5173 ...
start "BenchMate Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo Development servers launched.
