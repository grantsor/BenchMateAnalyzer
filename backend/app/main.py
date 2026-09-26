import os
from pathlib import Path
from typing import Optional
from pydantic import BaseModel
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from app.api.benchmarks import router as benchmarks_router
from app.api.charts import router as charts_router
from app.api.export import router as export_router
from app.api.projects import router as projects_router
from app.api.results import router as results_router
from app.api.scanner import router as scanner_router
from app.api.ssd_database import router as ssd_database_router
from app.capframex.api.routes import router as capframex_router
from app.config import settings
from app.db.database import AsyncSessionLocal, init_db
from app.services.import_service import ImportService

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite tables for OCR App
    await init_db()
    # Ensure default benchmark definitions are seeded
    async with AsyncSessionLocal() as session:
        await ImportService.ensure_benchmarks_loaded(session)

    # Ensure CapFrameX configuration files are seeded in persistent data directory
    import shutil
    cfx_seed_dir = settings.BASE_DIR / "app" / "capframex" / "data"
    if not cfx_seed_dir.exists():
        cfx_seed_dir = Path(__file__).resolve().parent / "capframex" / "data"
    if cfx_seed_dir.exists():
        for seed_name in ["game_profiles.json", "custom_charts.json"]:
            target = settings.CAPFRAMEX_DATA_DIR / seed_name
            source = cfx_seed_dir / seed_name
            if not target.exists() and source.exists():
                try:
                    shutil.copy2(source, target)
                except Exception:
                    pass

    print(f"[{settings.PROJECT_NAME}] Backend initialized and ready at http://{settings.HOST}:{settings.PORT}")
    print(f"[{settings.PROJECT_NAME}] Dual Engines Online: [Benchmark OCR Analyzer] + [CapFrameX Analyzer]")
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register OCR routers
app.include_router(projects_router, prefix=settings.API_PREFIX)
app.include_router(scanner_router, prefix=settings.API_PREFIX)
app.include_router(results_router, prefix=settings.API_PREFIX)
app.include_router(benchmarks_router, prefix=settings.API_PREFIX)
app.include_router(charts_router, prefix=settings.API_PREFIX)
app.include_router(export_router, prefix=settings.API_PREFIX)
app.include_router(ssd_database_router, prefix=settings.API_PREFIX)

# Register CapFrameX dedicated router
app.include_router(capframex_router, prefix="/api/capframex")
app.include_router(capframex_router, prefix="/api")

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "engines": {
            "ocr_engine": "ready",
            "capframex_engine": "ready"
        }
    }

@app.post("/api/system/shutdown")
async def shutdown_system():
    """
    Cleanly shuts down the backend server process.
    """
    def _delayed_exit():
        import time
        time.sleep(0.5)
        os._exit(0)
    import threading
    threading.Thread(target=_delayed_exit, daemon=True).start()
    return {"status": "shutting_down", "message": "Server is terminating"}

@app.post("/api/system/open-data-folder")
async def open_data_folder():
    """
    Opens the local persistent data folder in Windows File Explorer.
    """
    import sys
    import subprocess
    data_dir = settings.DATA_DIR
    data_dir.mkdir(parents=True, exist_ok=True)
    try:
        if sys.platform == "win32":
            os.startfile(str(data_dir))
        elif sys.platform == "darwin":
            subprocess.run(["open", str(data_dir)])
        else:
            subprocess.run(["xdg-open", str(data_dir)])
        return {"status": "opened", "path": str(data_dir)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class OpenImportFolderRequest(BaseModel):
    path: Optional[str] = None
    app_type: Optional[str] = "ocr"  # "ocr" or "capframex"

@app.post("/api/system/open-import-folder")
async def open_import_folder(request: Optional[OpenImportFolderRequest] = None):
    """
    Opens the active application's import folder (OCR or CapFrameX) in Windows File Explorer.
    """
    import sys
    import subprocess
    from pathlib import Path

    app_type = (request.app_type if request and request.app_type else "ocr").lower()
    req_path = (request.path.strip() if request and request.path else "")

    target_dir: Optional[Path] = None

    if req_path:
        p = Path(req_path)
        if p.is_dir():
            target_dir = p
        elif p.is_file():
            target_dir = p.parent
        elif p.parent.exists():
            target_dir = p.parent

    if not target_dir or not target_dir.exists():
        if app_type == "capframex":
            candidates = [
                Path(settings.CAPFRAMEX_DEFAULT_DIR),
                Path(r"N:\BenchMarkTool\Sample CapframeX Data"),
                settings.CAPFRAMEX_DATA_DIR,
                settings.DATA_DIR
            ]
        else:
            candidates = [
                Path(r"N:\BenchMarkTool"),
                settings.UPLOADS_DIR,
                settings.DATA_DIR
            ]
        for c in candidates:
            if c.exists():
                target_dir = c
                break

    if not target_dir:
        target_dir = settings.DATA_DIR
        target_dir.mkdir(parents=True, exist_ok=True)

    try:
        if sys.platform == "win32":
            os.startfile(str(target_dir))
        elif sys.platform == "darwin":
            subprocess.run(["open", str(target_dir)])
        else:
            subprocess.run(["xdg-open", str(target_dir)])
        return {"status": "opened", "path": str(target_dir), "app_type": app_type}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/changelog")
async def get_changelog():
    """
    Returns the latest CHANGELOG.md content dynamically from the repository.
    """
    candidates = [
        settings.BASE_DIR.parent / "CHANGELOG.md",
        settings.BASE_DIR / "CHANGELOG.md",
        Path(__file__).resolve().parent.parent.parent / "CHANGELOG.md"
    ]
    for p in candidates:
        if p.exists():
            try:
                return {
                    "version": settings.VERSION,
                    "changelog_raw": p.read_text(encoding="utf-8")
                }
            except Exception as e:
                pass

    return {
        "version": settings.VERSION,
        "changelog_raw": "# Changelog\n\nUnable to load CHANGELOG.md file."
    }

@app.get("/api/images/view")
async def view_image(path: str = Query(..., description="Absolute path to screenshot")):
    """
    Serves local screenshot images safely to the frontend for preview.
    """
    if not os.path.exists(path) or not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Image file not found")

    ext = os.path.splitext(path)[1].lower()
    media_types = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".bmp": "image/bmp"
    }
    media_type = media_types.get(ext, "application/octet-stream")
    return FileResponse(path, media_type=media_type)

def find_default_logo_path() -> Optional[Path]:
    candidates = [
        # Bundled backend assets (primary location)
        settings.BASE_DIR / "app" / "assets" / "Full Logo Horizontal Colored.png",
        settings.BASE_DIR / "app" / "assets" / "default_logo.png",
        Path(__file__).resolve().parent / "assets" / "Full Logo Horizontal Colored.png",
        Path(__file__).resolve().parent / "assets" / "default_logo.png",
        # Frozen dist / application root directory
        settings.APP_DIR / "Full Logo Horizontal Colored.png",
        settings.APP_DIR / "default_logo.png",
        settings.APP_DIR / "app" / "assets" / "Full Logo Horizontal Colored.png",
        settings.APP_DIR / "app" / "assets" / "default_logo.png",
        # Compiled static directory
        settings.BASE_DIR / "static" / "Full Logo Horizontal Colored.png",
        settings.BASE_DIR / "static" / "default_logo.png",
        # External fallback if present
        Path(r"N:\BenchMarkTool\Full Logo Horizontal Colored.png"),
    ]
    for p in candidates:
        try:
            if p and p.exists() and p.is_file():
                return p
        except Exception:
            continue
    return None

_cached_default_logo_data = None

@app.get("/api/branding/default-logo")
@app.get("/api/capframex/branding/default-logo")
async def get_default_logo():
    path = find_default_logo_path()
    if path:
        return FileResponse(str(path), media_type="image/png")
    raise HTTPException(status_code=404, detail="Default logo not found")

@app.get("/api/branding/default-logo-data")
@app.get("/api/capframex/branding/default-logo-data")
async def get_default_logo_data():
    global _cached_default_logo_data
    if _cached_default_logo_data is not None:
        return _cached_default_logo_data

    path = find_default_logo_path()
    if path:
        import base64
        from PIL import Image
        with open(path, "rb") as f:
            data = f.read()
        b64 = base64.b64encode(data).decode("utf-8")
        try:
            with Image.open(path) as im:
                w, h = im.size
                aspect_ratio = round(w / h, 4) if h > 0 else 2.7778
        except Exception:
            w, h, aspect_ratio = 12500, 4500, 2.7778
        _cached_default_logo_data = {
            "data_url": f"data:image/png;base64,{b64}",
            "width": w,
            "height": h,
            "aspect_ratio": aspect_ratio
        }
        return _cached_default_logo_data

    raise HTTPException(status_code=404, detail="Default logo not found")

# Serve compiled React frontend if available
from fastapi.staticfiles import StaticFiles

candidates_dist = [
    settings.BASE_DIR / "frontend" / "dist",
    settings.APP_DIR / "frontend" / "dist",
    settings.BASE_DIR.parent / "frontend" / "dist",
    settings.BASE_DIR / "static",
    settings.BASE_DIR / "dist",
    Path(__file__).resolve().parent.parent.parent / "frontend" / "dist",
]
for dist in candidates_dist:
    if dist.exists() and (dist / "index.html").exists():
        app.mount("/", StaticFiles(directory=str(dist), html=True), name="static")
        print(f"[{settings.PROJECT_NAME}] Mounted frontend static files from {dist}")
        break

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
