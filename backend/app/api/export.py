import os
import json
import re
import base64
import subprocess
from pathlib import Path
from typing import Optional, List
from fastapi import APIRouter, Depends, Response, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.db.database import get_db
from app.db.models import Project
from app.services.export_service import ExportService

router = APIRouter(prefix="/export", tags=["export"])

def sanitize_filename(name: str) -> str:
    cleaned = re.sub(r'[\\/:*?"<>|]', '_', name)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned or "benchmark_export"

def get_user_downloads_dir() -> Path:
    """Resolve the user's Windows Downloads directory, with fallback to Path.home() / 'Downloads'."""
    try:
        import winreg
        with winreg.OpenKey(
            winreg.HKEY_CURRENT_USER,
            r'Software\Microsoft\Windows\CurrentVersion\Explorer\Shell Folders',
        ) as key:
            downloads = winreg.QueryValueEx(key, '{374DE290-123F-4565-9164-39C4925E467B}')[0]
            if downloads and os.path.exists(downloads):
                return Path(downloads)
    except Exception:
        pass
    d = Path.home() / "Downloads"
    d.mkdir(parents=True, exist_ok=True)
    return d

class SaveExportFileRequest(BaseModel):
    filename: str
    data_url: Optional[str] = None
    base64_data: Optional[str] = None
    directory: Optional[str] = None
    open_in_explorer: bool = False

class BatchSaveItem(BaseModel):
    filename: str
    data_url: Optional[str] = None
    base64_data: Optional[str] = None

class BatchSaveExportRequest(BaseModel):
    files: List[BatchSaveItem]
    directory: Optional[str] = None
    open_in_explorer: bool = False

class OpenExplorerRequest(BaseModel):
    file_path: Optional[str] = None
    directory: Optional[str] = None

@router.get("/csv/{project_id}")
async def export_csv(project_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Project).where(Project.id == project_id)
    proj = (await db.execute(stmt)).scalar_one_or_none()
    prod_name = (proj.product_name or proj.name) if proj else project_id
    safe_name = sanitize_filename(prod_name)

    csv_content = await ExportService.export_project_to_csv(db, project_id)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={safe_name}_benchmark_results.csv"}
    )

@router.get("/json/{project_id}")
async def export_json(project_id: str, db: AsyncSession = Depends(get_db)):
    data = await ExportService.export_project_to_json(db, project_id)
    return data

@router.get("/download-json/{project_id}")
async def download_json(project_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Project).where(Project.id == project_id)
    proj = (await db.execute(stmt)).scalar_one_or_none()
    prod_name = (proj.product_name or proj.name) if proj else project_id
    safe_name = sanitize_filename(prod_name)

    data = await ExportService.export_project_to_json(db, project_id)
    json_bytes = json.dumps(data, indent=2).encode("utf-8")
    return Response(
        content=json_bytes,
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={safe_name}_benchmark_backup.json"}
    )

@router.post("/save-file")
async def save_export_file(req: SaveExportFileRequest):
    """Save an exported image (WebP/PNG/JPG) or ZIP file directly to Downloads and local archive."""
    clean_name = sanitize_filename(req.filename)
    
    # Extract raw bytes
    raw_b64 = None
    if req.data_url and "," in req.data_url:
        raw_b64 = req.data_url.split(",", 1)[1]
    elif req.base64_data:
        raw_b64 = req.base64_data
    elif req.data_url:
        raw_b64 = req.data_url

    if not raw_b64:
        raise HTTPException(status_code=400, detail="No data provided for export file")

    try:
        file_bytes = base64.b64decode(raw_b64)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to decode base64 file data: {e}")

    # Determine destination directory
    target_dir = Path(req.directory) if req.directory and os.path.isdir(req.directory) else get_user_downloads_dir()
    target_dir.mkdir(parents=True, exist_ok=True)
    dest_path = target_dir / clean_name

    # Write file
    try:
        dest_path.write_bytes(file_bytes)
    except Exception as e:
        # If write fails (e.g. file is locked or PermissionError in Windows), try timestamped filename
        try:
            import time
            fallback_name = f"{dest_path.stem}_{int(time.time())}{dest_path.suffix}"
            dest_path = target_dir / fallback_name
            dest_path.write_bytes(file_bytes)
            clean_name = fallback_name
        except Exception:
            raise HTTPException(status_code=500, detail=f"Failed to write file to {dest_path}: {e}")

    # Also archive a copy in app's internal exports directory
    try:
        settings.EXPORTS_DIR.mkdir(parents=True, exist_ok=True)
        (settings.EXPORTS_DIR / clean_name).write_bytes(file_bytes)
    except Exception:
        pass

    if req.open_in_explorer:
        try:
            subprocess.Popen(["explorer", f"/select,{str(dest_path)}"])
        except Exception:
            pass

    return {
        "success": True,
        "filename": clean_name,
        "file_path": str(dest_path),
        "directory": str(target_dir),
        "size_bytes": len(file_bytes)
    }

@router.post("/save-batch")
async def save_export_batch(req: BatchSaveExportRequest):
    """Save multiple exported chart files directly to Downloads in one request."""
    if not req.files:
        raise HTTPException(status_code=400, detail="No files provided in batch")

    target_dir = Path(req.directory) if req.directory and os.path.isdir(req.directory) else get_user_downloads_dir()
    target_dir.mkdir(parents=True, exist_ok=True)
    settings.EXPORTS_DIR.mkdir(parents=True, exist_ok=True)

    saved_files = []
    first_path = None

    for item in req.files:
        clean_name = sanitize_filename(item.filename)
        raw_b64 = None
        if item.data_url and "," in item.data_url:
            raw_b64 = item.data_url.split(",", 1)[1]
        elif item.base64_data:
            raw_b64 = item.base64_data
        elif item.data_url:
            raw_b64 = item.data_url

        if not raw_b64:
            continue

        try:
            file_bytes = base64.b64decode(raw_b64)
            dest_path = target_dir / clean_name
            try:
                dest_path.write_bytes(file_bytes)
            except Exception:
                import time
                fallback_name = f"{dest_path.stem}_{int(time.time())}_{len(saved_files)}{dest_path.suffix}"
                dest_path = target_dir / fallback_name
                dest_path.write_bytes(file_bytes)
                clean_name = fallback_name
            
            # Archive copy
            try:
                (settings.EXPORTS_DIR / clean_name).write_bytes(file_bytes)
            except Exception:
                pass

            saved_files.append(str(dest_path))
            if not first_path:
                first_path = dest_path
        except Exception as e:
            print(f"Error saving batch item {clean_name}: {e}")

    if req.open_in_explorer and first_path:
        try:
            subprocess.Popen(["explorer", f"/select,{str(first_path)}"])
        except Exception:
            pass

    return {
        "success": True,
        "saved_count": len(saved_files),
        "directory": str(target_dir),
        "files": saved_files
    }

@router.post("/open-in-explorer")
async def open_in_explorer(req: OpenExplorerRequest):
    """Open Windows File Explorer focusing on the specific file or directory."""
    try:
        if req.file_path and os.path.exists(req.file_path):
            subprocess.Popen(f'explorer /select,"{req.file_path}"')
            return {"success": True, "opened": req.file_path}
        elif req.directory and os.path.exists(req.directory):
            os.startfile(req.directory)
            return {"success": True, "opened": req.directory}
        else:
            downloads = get_user_downloads_dir()
            os.startfile(str(downloads))
            return {"success": True, "opened": str(downloads)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to open File Explorer: {e}")

@router.get("/download-file")
async def download_file(filename: str):
    """Fallback standard HTTP file download."""
    clean_name = sanitize_filename(filename)
    downloads_path = get_user_downloads_dir() / clean_name
    exports_path = settings.EXPORTS_DIR / clean_name

    target = downloads_path if downloads_path.exists() else exports_path
    if not target.exists():
        raise HTTPException(status_code=404, detail=f"File {clean_name} not found")

    return FileResponse(
        path=str(target),
        filename=clean_name,
        media_type="application/octet-stream"
    )

