from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects", tags=["projects"])

class ProjectCreate(BaseModel):
    name: str
    product_name: Optional[str] = None
    product_category: Optional[str] = None
    cpu: Optional[str] = None
    gpu: Optional[str] = None
    motherboard: Optional[str] = None
    ram: Optional[str] = None
    storage: Optional[str] = None
    os: Optional[str] = None
    bios_version: Optional[str] = None
    driver_version: Optional[str] = None
    reviewer: Optional[str] = None
    notes: Optional[str] = None
    root_folder_path: Optional[str] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    product_name: Optional[str] = None
    product_category: Optional[str] = None
    cpu: Optional[str] = None
    gpu: Optional[str] = None
    motherboard: Optional[str] = None
    ram: Optional[str] = None
    storage: Optional[str] = None
    os: Optional[str] = None
    bios_version: Optional[str] = None
    driver_version: Optional[str] = None
    reviewer: Optional[str] = None
    notes: Optional[str] = None

class ConfigUpdate(BaseModel):
    display_name: str
    sort_order: Optional[int] = None

@router.post("")
async def create_project(data: ProjectCreate, db: AsyncSession = Depends(get_db)):
    project = await ProjectService.create_project(db, data.dict())
    return project

@router.get("")
async def list_projects(db: AsyncSession = Depends(get_db)):
    projects = await ProjectService.get_projects(db)
    return [
        {
            "id": p.id,
            "name": p.name,
            "product_name": p.product_name,
            "product_category": p.product_category,
            "root_folder_path": p.root_folder_path,
            "config_count": len(p.configurations),
            "result_count": len(p.results),
            "created_at": p.created_at,
            "updated_at": p.updated_at
        }
        for p in projects
    ]

@router.get("/check-duplicate")
async def check_duplicate_project(
    path: Optional[str] = None,
    name: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Checks if a project already exists with the given folder path (normalized) or name.
    """
    projects = await ProjectService.get_projects(db)

    def norm(p_str: Optional[str]) -> str:
        if not p_str:
            return ""
        return p_str.strip().lower().rstrip("\\/").replace("\\", "/")

    target_path_norm = norm(path)
    target_name_norm = (name or "").strip().lower()

    for p in projects:
        # Check path match
        if target_path_norm and p.root_folder_path:
            if norm(p.root_folder_path) == target_path_norm:
                return {
                    "is_duplicate": True,
                    "match_type": "path",
                    "project": {
                        "id": p.id,
                        "name": p.name,
                        "product_name": p.product_name,
                        "product_category": p.product_category,
                        "root_folder_path": p.root_folder_path,
                        "config_count": len(p.configurations),
                        "result_count": len(p.results),
                        "created_at": p.created_at.isoformat() if p.created_at else None
                    }
                }

        # Check name match
        if target_name_norm and p.name:
            if p.name.strip().lower() == target_name_norm:
                return {
                    "is_duplicate": True,
                    "match_type": "name",
                    "project": {
                        "id": p.id,
                        "name": p.name,
                        "product_name": p.product_name,
                        "product_category": p.product_category,
                        "root_folder_path": p.root_folder_path,
                        "config_count": len(p.configurations),
                        "result_count": len(p.results),
                        "created_at": p.created_at.isoformat() if p.created_at else None
                    }
                }

    return {"is_duplicate": False, "match_type": None, "project": None}

@router.get("/{project_id}")
async def get_project_detail(project_id: str, db: AsyncSession = Depends(get_db)):
    p = await ProjectService.get_project(db, project_id)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    return {
        "id": p.id,
        "name": p.name,
        "product_name": p.product_name,
        "product_category": p.product_category,
        "cpu": p.cpu,
        "gpu": p.gpu,
        "motherboard": p.motherboard,
        "ram": p.ram,
        "storage": p.storage,
        "os": p.os,
        "bios_version": p.bios_version,
        "driver_version": p.driver_version,
        "reviewer": p.reviewer,
        "notes": p.notes,
        "root_folder_path": p.root_folder_path,
        "created_at": p.created_at,
        "configurations": [
            {
                "id": c.id,
                "folder_name": c.folder_name,
                "display_name": c.display_name,
                "sort_order": c.sort_order,
                "image_count": len(c.source_images),
                "images": [
                    {
                        "id": img.id,
                        "file_path": img.file_path,
                        "file_name": img.file_name,
                        "width": img.width,
                        "height": img.height
                    }
                    for img in c.source_images
                ]
            }
            for c in p.configurations
        ]
    }

@router.put("/{project_id}")
async def update_project(project_id: str, data: ProjectUpdate, db: AsyncSession = Depends(get_db)):
    updated = await ProjectService.update_project(db, project_id, data.dict(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Project not found")
    return updated

@router.delete("/{project_id}")
async def delete_project(project_id: str, db: AsyncSession = Depends(get_db)):
    success = await ProjectService.delete_project(db, project_id)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"status": "deleted"}

@router.put("/configurations/{config_id}")
async def update_configuration_name(
    config_id: str,
    data: ConfigUpdate,
    db: AsyncSession = Depends(get_db)
):
    updated = await ProjectService.update_configuration(db, config_id, data.display_name, data.sort_order)
    if not updated:
        raise HTTPException(status_code=404, detail="Configuration not found")
    return updated
