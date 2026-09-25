from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.db.database import get_db
from app.db.models import Benchmark, Configuration, Result, ResultMetric, SourceImage
from app.services.result_service import ResultService

router = APIRouter(prefix="/results", tags=["results"])

class OverrideRequest(BaseModel):
    new_value: float
    reason: Optional[str] = "Manual correction"

class StatusUpdateRequest(BaseModel):
    status: str

@router.get("/project/{project_id}")
async def get_grouped_results(
    project_id: str,
    benchmark_id: Optional[str] = None,
    aggregation: str = "best",
    baseline_config_id: Optional[str] = None,
    scope: str = "project",
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    datasets = await ResultService.get_project_results_grouped(
        db, project_id, benchmark_id, aggregation, baseline_config_id, scope=scope, category=category
    )
    return [
        {
            "benchmark_id": ds.benchmark_id,
            "benchmark_name": ds.benchmark_name,
            "metric_ids": ds.metric_ids,
            "rows": [
                {
                    "configuration_id": r.configuration_id,
                    "configuration_name": r.configuration_name,
                    "display_name": r.display_name,
                    "sort_order": r.sort_order,
                    "is_baseline": r.is_baseline,
                    "project_id": r.project_id,
                    "project_name": r.project_name,
                    "metrics": {
                        m_id: {
                            "metric_id": m.metric_id,
                            "metric_display_name": m.metric_display_name,
                            "unit": m.unit,
                            "higher_is_better": m.higher_is_better,
                            "value": m.value,
                            "raw_values": m.raw_values,
                            "confidence": m.confidence,
                            "status": m.status,
                            "source_file": m.source_file,
                            "delta_vs_baseline": m.delta_vs_baseline,
                            "pct_gain_vs_baseline": m.pct_gain_vs_baseline
                        }
                        for m_id, m in r.metrics.items()
                    }
                }
                for r in ds.rows
            ]
        }
        for ds in datasets
    ]

@router.get("/ocr-review/{project_id}")
async def get_ocr_review_list(project_id: str, db: AsyncSession = Depends(get_db)):
    """
    Returns flat list of results with screenshot info, metrics, and OCR regions
    for the OCR Review screen.
    """
    stmt = select(Result).options(
        selectinload(Result.source_image),
        selectinload(Result.configuration),
        selectinload(Result.benchmark).selectinload(Benchmark.metrics),
        selectinload(Result.metrics).selectinload(ResultMetric.metric_definition),
        selectinload(Result.metrics).selectinload(ResultMetric.manual_overrides)
    ).where(Result.project_id == project_id).order_by(Result.created_at.desc())

    results = (await db.execute(stmt)).scalars().all()

    items = []
    for r in results:
        img = r.source_image
        cfg = r.configuration
        bench = r.benchmark

        items.append({
            "result_id": r.id,
            "benchmark_id": r.benchmark_id,
            "benchmark_name": bench.name if bench else r.benchmark_id,
            "configuration_id": r.configuration_id,
            "configuration_name": cfg.display_name if cfg else "",
            "overall_confidence": r.overall_confidence,
            "status": r.status,
            "image": {
                "id": img.id if img else None,
                "file_path": img.file_path if img else "",
                "file_name": img.file_name if img else "",
                "width": img.width if img else 0,
                "height": img.height if img else 0
            } if img else None,
            "metrics": [
                {
                    "result_metric_id": rm.id,
                    "metric_id": rm.metric_id,
                    "metric_name": rm.metric_definition.display_name if rm.metric_definition else rm.metric_id.replace('_', ' ').title(),
                    "unit": rm.metric_definition.unit if rm.metric_definition else "",
                    "higher_is_better": rm.metric_definition.higher_is_better if rm.metric_definition else True,
                    "raw_ocr_value": rm.raw_ocr_value,
                    "normalized_value": rm.normalized_value,
                    "confidence": rm.confidence,
                    "ocr_region": rm.ocr_region_json,
                    "has_override": len(rm.manual_overrides) > 0,
                    "override_history": [
                        {
                            "original": o.original_value,
                            "corrected": o.corrected_value,
                            "reason": o.reason,
                            "created_at": o.created_at
                        }
                        for o in rm.manual_overrides
                    ]
                }
                for rm in r.metrics
            ]
        })
    return items

@router.put("/metrics/{metric_id}/override")
async def override_metric(
    metric_id: str,
    data: OverrideRequest,
    db: AsyncSession = Depends(get_db)
):
    rm = await ResultService.update_metric_value(db, metric_id, data.new_value, data.reason)
    if not rm:
        raise HTTPException(status_code=404, detail="Result metric not found")
    return {"status": "updated", "id": rm.id, "new_value": rm.normalized_value}

@router.post("/{result_id}/status")
async def update_status(
    result_id: str,
    data: StatusUpdateRequest,
    db: AsyncSession = Depends(get_db)
):
    res = await ResultService.update_result_status(db, result_id, data.status)
    if not res:
        raise HTTPException(status_code=404, detail="Result not found")
    return {"status": "updated", "result_id": res.id, "new_status": res.status}

@router.post("/{result_id}/reprocess")
async def reprocess_result(result_id: str, db: AsyncSession = Depends(get_db)):
    res = await ResultService.reprocess_result(db, result_id)
    if not res:
        raise HTTPException(status_code=404, detail="Result or source image not found")
    return {"status": "reprocessed", "result_id": res.id, "confidence": res.overall_confidence}

class ReassignBenchmarkRequest(BaseModel):
    benchmark_id: str
    reparse: Optional[bool] = True

@router.post("/{result_id}/reassign")
async def reassign_result_benchmark(
    result_id: str,
    data: ReassignBenchmarkRequest,
    db: AsyncSession = Depends(get_db)
):
    res = await ResultService.reassign_benchmark(db, result_id, data.benchmark_id, bool(data.reparse))
    if not res:
        raise HTTPException(status_code=404, detail="Result not found")

    img = res.source_image
    cfg = res.configuration
    bench = res.benchmark

    item_data = {
        "result_id": res.id,
        "benchmark_id": res.benchmark_id,
        "benchmark_name": bench.name if bench else res.benchmark_id,
        "configuration_id": res.configuration_id,
        "configuration_name": cfg.display_name if cfg else "",
        "overall_confidence": res.overall_confidence,
        "status": res.status,
        "image": {
            "id": img.id if img else None,
            "file_path": img.file_path if img else "",
            "file_name": img.file_name if img else "",
            "width": img.width if img else 0,
            "height": img.height if img else 0
        } if img else None,
        "metrics": [
            {
                "result_metric_id": rm.id,
                "metric_id": rm.metric_id,
                "metric_name": rm.metric_definition.display_name if rm.metric_definition else rm.metric_id.replace('_', ' ').title(),
                "unit": rm.metric_definition.unit if rm.metric_definition else "",
                "higher_is_better": rm.metric_definition.higher_is_better if rm.metric_definition else True,
                "raw_ocr_value": rm.raw_ocr_value,
                "normalized_value": rm.normalized_value,
                "confidence": rm.confidence,
                "ocr_region": rm.ocr_region_json,
                "has_override": len(rm.manual_overrides) > 0 if hasattr(rm, "manual_overrides") and rm.manual_overrides else False,
                "override_history": []
            }
            for rm in res.metrics
        ]
    }
    return {
        "status": "reassigned",
        "result_id": res.id,
        "benchmark_id": res.benchmark_id,
        "confidence": res.overall_confidence,
        "item": item_data
    }
