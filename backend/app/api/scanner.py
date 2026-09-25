import os
import sys
import asyncio
from typing import Dict, Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.scanner import FolderScanner, ScanReport
from app.db.database import AsyncSessionLocal, get_db
from app.db.models import Project
from app.services.import_service import ImportService
from app.services.data_import_service import DataImportService

router = APIRouter(prefix="/scanner", tags=["scanner"])

class BrowseFolderRequest(BaseModel):
    initial_dir: Optional[str] = None

class ScanPreviewRequest(BaseModel):
    folder_path: str

class ImportRequest(BaseModel):
    project_id: str
    folder_path: str
    product_name: Optional[str] = None
    product_category: Optional[str] = None
    force_reparse: Optional[bool] = False

# In-memory progress tracker
scan_progress: Dict[str, dict] = {}

@router.post("/browse-folder")
async def browse_folder(data: BrowseFolderRequest = BrowseFolderRequest()):
    """Opens a native Windows folder picker popup dialog and returns the selected path."""
    from app.core.folder_picker import pick_folder

    initial = data.initial_dir or ""
    if initial and not os.path.isdir(initial):
        initial = ""

    try:
        folder = await asyncio.to_thread(pick_folder, "Select Benchmark Review Folder", initial)
        if folder and os.path.isdir(folder):
            return {"folder_path": folder, "cancelled": False}
        return {"folder_path": "", "cancelled": True}
    except Exception as e:
        logger.error(f"Folder picker error: {e}")
        raise HTTPException(status_code=500, detail=f"Folder picker error: {repr(e)}")

def run_import_background(
    project_id: str,
    folder_path: str,
    product_name: Optional[str] = None,
    product_category: Optional[str] = None,
    force_reparse: bool = False
):
    scan_progress[project_id] = {
        "status": "processing",
        "current": 0,
        "total": 0,
        "current_file": "",
        "error": None
    }

    def on_progress(curr, tot, fname):
        scan_progress[project_id]["current"] = curr
        scan_progress[project_id]["total"] = tot
        scan_progress[project_id]["current_file"] = fname

    import asyncio

    async def _do_import():
        async with AsyncSessionLocal() as db:
            try:
                stmt = select(Project).where(Project.id == project_id)
                proj = (await db.execute(stmt)).scalar_one_or_none()
                if proj:
                    if product_name:
                        proj.product_name = product_name.strip()
                    if product_category:
                        proj.product_category = product_category.strip()
                    proj.root_folder_path = folder_path.strip()
                    await db.commit()

                report = await ImportService.import_folder_into_project(
                    db, project_id, folder_path, on_progress, force_reparse=force_reparse
                )
                scan_progress[project_id]["status"] = "completed"
                scan_progress[project_id]["report"] = {
                    "total_files": report.total_files_scanned,
                    "total_images": report.total_images_found,
                    "recognized": report.recognized_benchmarks_count,
                    "unknowns": report.unknown_images_count,
                    "duplicates": report.duplicate_count
                }
            except Exception as e:
                import traceback
                traceback.print_exc()
                scan_progress[project_id]["status"] = "failed"
                scan_progress[project_id]["error"] = str(e)

    try:
        asyncio.run(_do_import())
    except Exception as e:
        import traceback
        traceback.print_exc()
        scan_progress[project_id]["status"] = "failed"
        scan_progress[project_id]["error"] = str(e)

def run_reprocess_background(project_id: str):
    scan_progress[project_id] = {
        "status": "processing",
        "current": 0,
        "total": 0,
        "current_file": "",
        "error": None
    }

    def on_progress(curr, tot, fname):
        scan_progress[project_id]["current"] = curr
        scan_progress[project_id]["total"] = tot
        scan_progress[project_id]["current_file"] = fname

    import asyncio

    async def _do_reprocess():
        async with AsyncSessionLocal() as db:
            try:
                count = await ImportService.reprocess_project(db, project_id, on_progress)
                scan_progress[project_id]["status"] = "completed"
                scan_progress[project_id]["report"] = {"reprocessed_count": count}
            except Exception as e:
                scan_progress[project_id]["status"] = "failed"
                scan_progress[project_id]["error"] = str(e)

    asyncio.run(_do_reprocess())

@router.post("/preview")
async def preview_folder(data: ScanPreviewRequest):
    if not os.path.exists(data.folder_path) or not os.path.isdir(data.folder_path):
        raise HTTPException(status_code=400, detail=f"Folder not found: {data.folder_path}")

    try:
        report = FolderScanner.scan_root_folder(data.folder_path)
        return {
            "root_folder": report.root_folder,
            "total_files": report.total_files_scanned,
            "total_images": report.total_images_found,
            "recognized_benchmarks_count": report.recognized_benchmarks_count,
            "unknown_images_count": report.unknown_images_count,
            "duplicate_count": report.duplicate_count,
            "configurations": [
                {
                    "folder_name": c.folder_name,
                    "display_name": c.display_name,
                    "image_count": len(c.images),
                    "images": [
                        {
                            "file_name": img.file_name,
                            "file_path": img.file_path,
                            "identified_benchmark_id": img.identified_benchmark_id,
                            "confidence": img.identification_confidence,
                            "is_duplicate": img.is_duplicate,
                            "duplicate_of": img.duplicate_of
                        }
                        for img in c.images
                    ]
                }
                for c in report.configurations
            ],
            "duplicates": [
                {
                    "original": d.original_path,
                    "duplicate": d.duplicate_path,
                    "config": d.configuration_name
                }
                for d in report.duplicates
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/import")
async def start_import(
    data: ImportRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    if not os.path.exists(data.folder_path) or not os.path.isdir(data.folder_path):
        raise HTTPException(status_code=400, detail=f"Folder not found: {data.folder_path}")

    # Launch background import task
    background_tasks.add_task(
        run_import_background,
        data.project_id,
        data.folder_path,
        data.product_name,
        data.product_category,
        bool(data.force_reparse)
    )
    return {"status": "started", "project_id": data.project_id}

@router.post("/reprocess/{project_id}")
async def reprocess_project_endpoint(
    project_id: str,
    background_tasks: BackgroundTasks
):
    background_tasks.add_task(run_reprocess_background, project_id)
    return {"status": "started", "project_id": project_id}

@router.get("/progress/{project_id}")
async def get_import_progress(project_id: str):
    prog = scan_progress.get(project_id, {"status": "idle"})
    return prog

@router.post("/import-file")
async def import_data_file(
    file: UploadFile = File(...),
    project_name: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Imports a CSV or JSON benchmark data file directly into SQLite database without requiring screenshots.
    """
    try:
        content = await file.read()
        res = await DataImportService.import_file(
            session=db,
            filename=file.filename or "import.csv",
            content=content,
            project_name_override=project_name
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to import data file: {str(e)}")

