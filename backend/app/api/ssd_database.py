from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.services.ssd_database_service import SSDDatabaseService, METRIC_COLUMNS

router = APIRouter(prefix="/ssd-database", tags=["ssd-database"])

class CreateModelRequest(BaseModel):
    model_name: str
    brand: Optional[str] = None
    capacity: Optional[str] = None
    interface: Optional[str] = None
    form_factor: Optional[str] = None
    notes: Optional[str] = None

class UpdateModelRequest(BaseModel):
    model_name: Optional[str] = None
    brand: Optional[str] = None
    capacity: Optional[str] = None
    interface: Optional[str] = None
    form_factor: Optional[str] = None
    notes: Optional[str] = None
    source_folder: Optional[str] = None
    aliases: Optional[str] = None

class UpdateScoreRequest(BaseModel):
    model_id: str
    benchmark_id: str
    metric_id: str
    value: float
    unit: Optional[str] = None
    is_manual: bool = True

class DeleteScoreRequest(BaseModel):
    model_id: str
    benchmark_id: str
    metric_id: str

class ScanFolderRequest(BaseModel):
    folder_path: str

class ImportCSVRequest(BaseModel):
    csv_text: str

@router.get("/metric-columns")
async def get_metric_columns():
    return [
        {
            "benchmark_id": b_id,
            "metric_id": m_id,
            "title": title,
            "unit": unit,
            "higher_is_better": hib
        }
        for b_id, m_id, title, unit, hib in METRIC_COLUMNS
    ]

@router.get("/models")
async def list_models(db: AsyncSession = Depends(get_db)):
    return await SSDDatabaseService.get_all_models_with_scores(db)

@router.post("/models")
async def create_model(data: CreateModelRequest, db: AsyncSession = Depends(get_db)):
    if not data.model_name.strip():
        raise HTTPException(status_code=400, detail="Model name is required")
    model = await SSDDatabaseService.upsert_model(
        db,
        model_name=data.model_name,
        brand=data.brand,
        capacity=data.capacity,
        interface=data.interface,
        form_factor=data.form_factor,
        notes=data.notes
    )
    return {
        "id": model.id,
        "model_name": model.model_name,
        "brand": model.brand,
        "capacity": model.capacity,
        "interface": model.interface,
        "status": "created"
    }

@router.put("/models/{model_id}")
async def update_model(model_id: str, data: UpdateModelRequest, db: AsyncSession = Depends(get_db)):
    try:
        model = await SSDDatabaseService.update_model_by_id(
            db,
            model_id=model_id,
            model_name=data.model_name,
            brand=data.brand,
            capacity=data.capacity,
            interface=data.interface,
            form_factor=data.form_factor,
            notes=data.notes,
            source_folder=data.source_folder,
            aliases=data.aliases
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not model:
        raise HTTPException(status_code=404, detail="SSD Model not found")

    return {
        "id": model.id,
        "model_name": model.model_name,
        "brand": model.brand,
        "capacity": model.capacity,
        "source_folder": getattr(model, "source_folder", None),
        "aliases": getattr(model, "aliases", None),
        "status": "updated"
    }

@router.delete("/models/{model_id}")
async def delete_model(model_id: str, db: AsyncSession = Depends(get_db)):
    success = await SSDDatabaseService.delete_model(db, model_id)
    if not success:
        raise HTTPException(status_code=404, detail="Model not found")
    return {"status": "deleted", "id": model_id}

@router.put("/scores")
async def update_score(data: UpdateScoreRequest, db: AsyncSession = Depends(get_db)):
    score = await SSDDatabaseService.update_score(
        session=db,
        model_id=data.model_id,
        benchmark_id=data.benchmark_id,
        metric_id=data.metric_id,
        value=data.value,
        unit=data.unit,
        is_manual=data.is_manual
    )
    return {
        "status": "updated",
        "score_id": score.id,
        "value": score.value,
        "unit": score.unit,
        "is_manual": score.is_manual
    }

@router.delete("/scores")
async def delete_score(data: DeleteScoreRequest, db: AsyncSession = Depends(get_db)):
    success = await SSDDatabaseService.delete_score(db, data.model_id, data.benchmark_id, data.metric_id)
    if not success:
        raise HTTPException(status_code=404, detail="Score not found")
    return {"status": "deleted"}

@router.post("/scan-folder")
async def scan_folder(data: ScanFolderRequest, db: AsyncSession = Depends(get_db)):
    if not data.folder_path.strip():
        raise HTTPException(status_code=400, detail="Folder path is required")
    report = await SSDDatabaseService.ingest_folder(db, data.folder_path)
    return report

@router.get("/export-csv")
async def export_csv(db: AsyncSession = Depends(get_db)):
    csv_str = await SSDDatabaseService.export_to_csv(db)
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=SSD_Benchmark_Database.csv"}
    )

@router.post("/import-csv")
async def import_csv(
    data: Optional[ImportCSVRequest] = None,
    file: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db)
):
    if file:
        content_bytes = await file.read()
        csv_text = content_bytes.decode("utf-8", errors="replace")
    elif data and data.csv_text:
        csv_text = data.csv_text
    else:
        raise HTTPException(status_code=400, detail="No CSV data or file provided")

    result = await SSDDatabaseService.import_from_csv(db, csv_text)
    return result

@router.get("/chart-data")
async def get_chart_data(
    benchmark_id: str = Query(..., description="Benchmark ID (e.g. crystaldiskmark_1gb)"),
    metric_id: str = Query(..., description="Metric ID (e.g. seq_read)"),
    baseline_model_id: Optional[str] = Query(None, description="Model ID to use as 100% baseline"),
    db: AsyncSession = Depends(get_db)
):
    return await SSDDatabaseService.get_chart_data(db, benchmark_id, metric_id, baseline_model_id)

@router.get("/grouped-datasets")
async def get_grouped_datasets(
    baseline_model_id: Optional[str] = Query(None, description="Model ID to use as baseline"),
    form_factor: Optional[str] = Query(None, description="Filter by form factor (e.g. M.2 NVMe, External USB)"),
    db: AsyncSession = Depends(get_db)
):
    return await SSDDatabaseService.get_grouped_datasets(db, baseline_model_id, form_factor)
