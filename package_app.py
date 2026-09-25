import os
import sys
import shutil
import zipfile
import subprocess
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT_DIR / "backend"))
from app.config import settings

VERSION = settings.VERSION

print(f"============================================================")
print(f"       Packaging BenchMate Analyzer v{VERSION}")
print(f"       (Benchmark OCR Analyzer + CapFrameX Analyzer)")
print(f"============================================================")

# 1. Compile frontend if node_modules present, otherwise reuse compiled backend/static
frontend_dir = ROOT_DIR / "frontend"
dist_dir = frontend_dir / "dist"
static_dir = ROOT_DIR / "backend" / "static"

if (frontend_dir / "node_modules").exists():
    print("\n[1/4] Building production React frontend...")
    subprocess.run("cmd /c npm run build", cwd=str(frontend_dir), shell=True, check=True)
    print("\n[2/4] Syncing compiled assets to backend/static...")
    if static_dir.exists():
        shutil.rmtree(static_dir)
    shutil.copytree(dist_dir, static_dir)
elif (static_dir / "index.html").exists():
    print("\n[1/4] Using pre-compiled production React frontend in backend/static...")
else:
    print("\n[1/4] Building production React frontend...")
    subprocess.run("cmd /c npm run build", cwd=str(frontend_dir), shell=True, check=True)
    if static_dir.exists():
        shutil.rmtree(static_dir)
    shutil.copytree(dist_dir, static_dir)

# Ensure branding logos are in static directory
for logo in ["Full Logo Horizontal Colored.png", "default_logo.png", "capframex-icon.png", "capframex-logo.png"]:
    logo_src = ROOT_DIR / "backend" / "app" / "assets" / logo
    if logo_src.exists():
        shutil.copy2(logo_src, static_dir / logo)

# 3. Run PyInstaller
print("\n[3/4] Compiling offline executable with PyInstaller...")
spec_file = ROOT_DIR / "BenchMate-Analyzer.spec"
venv_python = Path(r"C:\Users\Grant Soriano\Documents\GitHub\Benchmark-OCR-Analyzer-Desktop\backend\venv\Scripts\python.exe")
if not venv_python.exists():
    venv_python = ROOT_DIR / "backend" / "venv" / "Scripts" / "python.exe"

cmd = f'"{venv_python}" -m PyInstaller --noconfirm "{spec_file}"'
subprocess.run(cmd, cwd=str(ROOT_DIR), shell=True, check=True)

# 4. Create Release Zip
print("\n[4/4] Creating standalone portable zip package...")
release_dir = ROOT_DIR / "release"
release_dir.mkdir(parents=True, exist_ok=True)
zip_path = release_dir / f"BenchMate-Analyzer-v{VERSION}-Windows.zip"

source_dir = ROOT_DIR / "dist" / "BenchMate-Analyzer"

# Ensure logos and utility batch scripts exist in the root of dist/BenchMate-Analyzer
for logo in ["Full Logo Horizontal Colored.png", "default_logo.png", "capframex-icon.png", "capframex-logo.png"]:
    logo_src = ROOT_DIR / "backend" / "app" / "assets" / logo
    if logo_src.exists():
        shutil.copy2(logo_src, source_dir / logo)

for bat in ["Stop-App.bat", "Restart-App.bat", "run_app.bat"]:
    bat_file = ROOT_DIR / bat
    if bat_file.exists():
        shutil.copy2(bat_file, source_dir / bat)

with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as zipf:
    for f in source_dir.rglob("*"):
        if f.is_file():
            arcname = f.relative_to(source_dir.parent)
            zipf.write(f, arcname)

size_mb = zip_path.stat().st_size / (1024 * 1024)
print(f"\nSUCCESS! Standalone portable package generated:")
print(f"  Executable: {source_dir / 'BenchMate-Analyzer.exe'}")
print(f"  Release Zip: {zip_path} ({size_mb:.2f} MB)")
print(f"============================================================\n")
