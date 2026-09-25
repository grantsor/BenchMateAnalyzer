import json
import re
from fastapi import APIRouter, Depends, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.db.models import Project
from app.services.export_service import ExportService

router = APIRouter(prefix="/export", tags=["export"])

def sanitize_filename(name: str) -> str:
    cleaned = re.sub(r'[^\w\-_\. ]', '_', name)
    cleaned = re.sub(r'\s+', '_', cleaned).strip('_')
    return cleaned or "benchmark_project"

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
