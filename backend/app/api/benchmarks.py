import os
import json
import re
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.config import settings
from app.core.identifier import benchmark_identifier
from app.db.database import get_db
from app.db.models import Benchmark, BenchmarkMetric, Result, ResultMetric
from app.ocr.engine import ocr_engine
from app.ocr.preprocessor import ImagePreprocessor
from app.ocr.normalizer import NumberNormalizer
from app.services.import_service import ImportService

router = APIRouter(prefix="/benchmarks", tags=["benchmarks"])

class MetricUpdateRequest(BaseModel):
    id: str
    name: Optional[str] = None
    display_name: Optional[str] = None
    unit: Optional[str] = None
    higher_is_better: Optional[bool] = None
    decimal_places: Optional[int] = None
    sort_order: Optional[int] = None

class BenchmarkUpdateRequest(BaseModel):
    name: Optional[str] = None
    version: Optional[str] = None
    category: Optional[str] = None
    metrics: Optional[List[MetricUpdateRequest]] = None

class MetricCreateRequest(BaseModel):
    id: Optional[str] = None
    name: str
    display_name: Optional[str] = None
    unit: Optional[str] = "score"
    higher_is_better: Optional[bool] = True
    decimal_places: Optional[int] = 0
    sort_order: Optional[int] = 0

class BenchmarkCreateRequest(BaseModel):
    id: Optional[str] = None
    name: str
    version: Optional[str] = ""
    category: Optional[str] = "General"
    file_patterns: Optional[List[str]] = None
    aliases: Optional[List[str]] = None
    keywords: Optional[List[str]] = None
    metrics: List[MetricCreateRequest]

class AssignResultRequest(BaseModel):
    project_id: str
    configuration_id: str
    benchmark_id: str
    result_id: Optional[str] = None
    source_image_id: Optional[str] = None
    metric_values: Dict[str, float]

@router.get("")
async def get_benchmarks(db: AsyncSession = Depends(get_db)):
    await ImportService.ensure_benchmarks_loaded(db)
    stmt = select(Benchmark).options(selectinload(Benchmark.metrics)).order_by(Benchmark.category.asc(), Benchmark.name.asc())
    results = (await db.execute(stmt)).scalars().all()

    return [
        {
            "id": b.id,
            "name": b.name,
            "version": b.version,
            "category": b.category,
            "metrics": [
                {
                    "id": m.id,
                    "name": m.name,
                    "display_name": m.display_name,
                    "unit": m.unit,
                    "higher_is_better": m.higher_is_better,
                    "decimal_places": m.decimal_places,
                    "sort_order": m.sort_order
                }
                for m in sorted(b.metrics, key=lambda x: x.sort_order)
            ]
        }
        for b in results
    ]

@router.post("")
async def create_benchmark(
    payload: BenchmarkCreateRequest,
    db: AsyncSession = Depends(get_db)
):
    if not payload.name or not payload.name.strip():
        raise HTTPException(status_code=400, detail="Benchmark name is required")
    if not payload.metrics:
        raise HTTPException(status_code=400, detail="At least one metric is required")

    # Generate or sanitize ID
    b_id = payload.id.strip() if payload.id else re.sub(r'[^a-z0-9_]+', '_', payload.name.lower().strip()).strip('_')
    if not b_id:
        b_id = f"custom_bench_{uuid.uuid4().hex[:6]}"

    # Check if ID exists, append unique suffix if needed
    stmt = select(Benchmark).where(Benchmark.id == b_id)
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        b_id = f"{b_id}_{uuid.uuid4().hex[:4]}"

    # Process metrics
    processed_metrics = []
    seen_m_ids = set()
    for idx, m in enumerate(payload.metrics):
        m_name = m.name.strip()
        m_id = m.id.strip() if m.id else re.sub(r'[^a-z0-9_]+', '_', m_name.lower()).strip('_')
        if not m_id:
            m_id = f"metric_{idx + 1}"
        # Ensure unique metric ID within this benchmark
        orig_m_id = m_id
        counter = 1
        while m_id in seen_m_ids:
            m_id = f"{orig_m_id}_{counter}"
            counter += 1
        seen_m_ids.add(m_id)

        processed_metrics.append({
            "id": m_id,
            "name": m_name,
            "display_name": m.display_name.strip() if m.display_name else m_name,
            "unit": m.unit.strip() if m.unit else "score",
            "higher_is_better": m.higher_is_better if m.higher_is_better is not None else True,
            "decimal_places": m.decimal_places if m.decimal_places is not None else 0,
            "sort_order": idx
        })

    # Save JSON definition file to registry
    def_data = {
        "id": b_id,
        "name": payload.name.strip(),
        "version": payload.version.strip() if payload.version else "",
        "category": payload.category.strip() if payload.category else "General",
        "parser_id": "generic_parser",
        "file_patterns": payload.file_patterns or [f".*{re.escape(b_id)}.*\\.(jpg|jpeg|png|webp|bmp)$"],
        "aliases": payload.aliases or [payload.name.strip().lower(), b_id],
        "keywords": payload.keywords or [payload.name.strip()],
        "metrics": processed_metrics
    }

    # Save JSON definition file to registry and external data dir
    settings.DEFINITIONS_DIR.mkdir(parents=True, exist_ok=True)
    def_file = settings.DEFINITIONS_DIR / f"{b_id}.json"
    with open(def_file, "w", encoding="utf-8") as f:
        json.dump(def_data, f, indent=2)

    custom_dir = settings.DATA_DIR / "benchmarks"
    custom_dir.mkdir(parents=True, exist_ok=True)
    with open(custom_dir / f"{b_id}.json", "w", encoding="utf-8") as f:
        json.dump(def_data, f, indent=2)

    benchmark_identifier.register_dynamic_benchmark(def_data)

    # Insert into SQLite Database
    benchmark_entry = Benchmark(
        id=b_id,
        name=payload.name.strip(),
        version=payload.version.strip() if payload.version else "",
        category=payload.category.strip() if payload.category else "General",
        file_patterns_json=json.dumps(def_data["file_patterns"]),
        parser_id="generic_parser"
    )
    db.add(benchmark_entry)

    for m in processed_metrics:
        m_entry = BenchmarkMetric(
            id=m["id"],
            benchmark_id=b_id,
            name=m["name"],
            display_name=m["display_name"],
            unit=m["unit"],
            higher_is_better=m["higher_is_better"],
            decimal_places=m["decimal_places"],
            sort_order=m["sort_order"]
        )
        db.add(m_entry)

    await db.commit()

    # Reload identifier definitions so runtime scanner recognizes it immediately
    benchmark_identifier.load_definitions()

    return {
        "id": b_id,
        "name": benchmark_entry.name,
        "version": benchmark_entry.version,
        "category": benchmark_entry.category,
        "metrics": processed_metrics
    }

@router.post("/detect-scores")
async def detect_scores(
    file_path: Optional[str] = Form(None),
    image_file: Optional[UploadFile] = File(None)
):
    image_np = None
    target_path = file_path

    if image_file:
        content = await image_file.read()
        import cv2
        import numpy as np
        arr = np.asarray(bytearray(content), dtype=np.uint8)
        image_np = cv2.imdecode(arr, cv2.IMREAD_COLOR)

        filename = f"sample_{uuid.uuid4().hex[:8]}_{image_file.filename}"
        save_dest = settings.UPLOADS_DIR / filename
        with open(save_dest, "wb") as f:
            f.write(content)
        target_path = str(save_dest)
    elif file_path:
        if os.path.exists(file_path):
            image_np = ImagePreprocessor.load_image(file_path)

    if image_np is None:
        raise HTTPException(status_code=400, detail="Could not load or decode image")

    h, w = image_np.shape[:2]
    ocr_items = ocr_engine.ocr_image(image_np)

    candidates = []
    seen_vals = set()

    for idx, item in enumerate(ocr_items):
        val, unit, conf_mod = NumberNormalizer.normalize_score_text(item.text)
        if val is not None and val > 0:
            suggested_label = ""
            if idx > 0:
                prev_text = ocr_items[idx - 1].text.strip()
                if not re.search(r'^\d+$', prev_text) and len(prev_text) < 45:
                    clean = re.sub(r'[^\w\s-]', '', prev_text).strip()
                    if clean:
                        suggested_label = clean.title()

            if not suggested_label:
                bx, by, bw, bh = item.box
                for other in ocr_items:
                    if other == item:
                        continue
                    ox, oy, ow, oh = other.box
                    if ox + ow <= bx and abs(oy - by) < max(bh, oh) * 1.5:
                        clean = re.sub(r'[^\w\s-]', '', other.text).strip()
                        if clean and not re.search(r'^\d+$', clean):
                            suggested_label = clean.title()
                            break

            key = (round(val, 2), item.box[0], item.box[1])
            if key not in seen_vals:
                seen_vals.add(key)
                candidates.append({
                    "id": f"cand_{len(candidates) + 1}",
                    "raw_text": item.text,
                    "value": val,
                    "unit": unit or "score",
                    "suggested_name": suggested_label or f"Score {len(candidates) + 1}",
                    "confidence": round(item.confidence * conf_mod, 2),
                    "box": list(item.box)
                })

    return {
        "file_path": target_path,
        "width": w,
        "height": h,
        "candidates": candidates
    }

@router.post("/assign-result")
async def assign_result(payload: AssignResultRequest, db: AsyncSession = Depends(get_db)):
    result = None
    if payload.result_id:
        stmt = select(Result).options(selectinload(Result.metrics)).where(Result.id == payload.result_id)
        result = (await db.execute(stmt)).scalar_one_or_none()

    if not result:
        result = Result(
            id=str(uuid.uuid4()),
            project_id=payload.project_id,
            configuration_id=payload.configuration_id,
            source_image_id=payload.source_image_id,
            benchmark_id=payload.benchmark_id,
            overall_confidence=1.0,
            status="verified"
        )
        db.add(result)
    else:
        result.benchmark_id = payload.benchmark_id
        result.status = "verified"
        result.configuration_id = payload.configuration_id

    # Update or insert ResultMetric rows
    existing_metrics_map = {rm.metric_id: rm for rm in (result.metrics or [])}
    for m_id, val in payload.metric_values.items():
        if m_id in existing_metrics_map:
            existing_metrics_map[m_id].normalized_value = float(val)
            existing_metrics_map[m_id].raw_ocr_value = str(val)
            existing_metrics_map[m_id].confidence = 1.0
            existing_metrics_map[m_id].status = "verified"
        else:
            new_rm = ResultMetric(
                id=str(uuid.uuid4()),
                result_id=result.id,
                metric_id=m_id,
                raw_ocr_value=str(val),
                normalized_value=float(val),
                confidence=1.0,
                status="verified"
            )
            db.add(new_rm)

    await db.commit()
    return {"status": "success", "result_id": result.id, "benchmark_id": payload.benchmark_id}

@router.put("/{benchmark_id}")
async def update_benchmark(
    benchmark_id: str,
    payload: BenchmarkUpdateRequest,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Benchmark).options(selectinload(Benchmark.metrics)).where(Benchmark.id == benchmark_id)
    benchmark = (await db.execute(stmt)).scalar_one_or_none()
    if not benchmark:
        raise HTTPException(status_code=404, detail="Benchmark not found")

    if payload.name is not None:
        benchmark.name = payload.name.strip()
    if payload.version is not None:
        benchmark.version = payload.version.strip()
    if payload.category is not None:
        benchmark.category = payload.category.strip()

    if payload.metrics:
        existing_metrics = {m.id: m for m in benchmark.metrics}
        for m_update in payload.metrics:
            metric = existing_metrics.get(m_update.id)
            if metric:
                if m_update.name is not None:
                    metric.name = m_update.name.strip()
                if m_update.display_name is not None:
                    metric.display_name = m_update.display_name.strip()
                if m_update.unit is not None:
                    metric.unit = m_update.unit.strip()
                if m_update.higher_is_better is not None:
                    metric.higher_is_better = m_update.higher_is_better
                if m_update.decimal_places is not None:
                    metric.decimal_places = m_update.decimal_places
                if m_update.sort_order is not None:
                    metric.sort_order = m_update.sort_order

    await db.commit()
    await db.refresh(benchmark)

    return {
        "id": benchmark.id,
        "name": benchmark.name,
        "version": benchmark.version,
        "category": benchmark.category,
        "metrics": [
            {
                "id": m.id,
                "name": m.name,
                "display_name": m.display_name,
                "unit": m.unit,
                "higher_is_better": m.higher_is_better,
                "decimal_places": m.decimal_places,
                "sort_order": m.sort_order
            }
            for m in sorted(benchmark.metrics, key=lambda x: x.sort_order)
        ]
    }

@router.delete("/{benchmark_id}")
async def delete_benchmark(benchmark_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Benchmark).options(selectinload(Benchmark.metrics)).where(Benchmark.id == benchmark_id)
    benchmark = (await db.execute(stmt)).scalar_one_or_none()
    if not benchmark:
        raise HTTPException(status_code=404, detail="Benchmark not found")

    for m in benchmark.metrics:
        await db.delete(m)
    await db.delete(benchmark)
    await db.commit()

    def_file = settings.DEFINITIONS_DIR / f"{benchmark_id}.json"
    if def_file.exists():
        try:
            os.remove(def_file)
        except Exception:
            pass

    benchmark_identifier.load_definitions()
    return {"status": "deleted", "benchmark_id": benchmark_id}

@router.post("/{benchmark_id}/reset")
async def reset_benchmark(
    benchmark_id: str,
    db: AsyncSession = Depends(get_db)
):
    b_def = benchmark_identifier.benchmarks.get(benchmark_id)
    if not b_def:
        raise HTTPException(status_code=404, detail="Default benchmark definition not found")

    stmt = select(Benchmark).options(selectinload(Benchmark.metrics)).where(Benchmark.id == benchmark_id)
    benchmark = (await db.execute(stmt)).scalar_one_or_none()
    if not benchmark:
        raise HTTPException(status_code=404, detail="Benchmark not found in database")

    benchmark.name = b_def.name
    benchmark.version = b_def.version
    benchmark.category = b_def.category

    metric_def_map = {m["id"]: m for m in b_def.metrics}
    for m in benchmark.metrics:
        if m.id in metric_def_map:
            m_def = metric_def_map[m.id]
            m.name = m_def["name"]
            m.display_name = m_def.get("display_name", m_def["name"])
            m.unit = m_def.get("unit", "score")
            m.higher_is_better = m_def.get("higher_is_better", True)
            m.decimal_places = m_def.get("decimal_places", 0)
            m.sort_order = m_def.get("sort_order", 0)

    await db.commit()
    await db.refresh(benchmark)

    return {
        "id": benchmark.id,
        "name": benchmark.name,
        "version": benchmark.version,
        "category": benchmark.category,
        "metrics": [
            {
                "id": m.id,
                "name": m.name,
                "display_name": m.display_name,
                "unit": m.unit,
                "higher_is_better": m.higher_is_better,
                "decimal_places": m.decimal_places,
                "sort_order": m.sort_order
            }
            for m in sorted(benchmark.metrics, key=lambda x: x.sort_order)
        ]
    }

@router.post("/custom")
async def create_custom_benchmark(payload: BenchmarkCreateRequest, db: AsyncSession = Depends(get_db)):
    b_id = payload.id or re.sub(r'[^a-z0-9_]', '_', payload.name.lower()).strip('_')
    stmt = select(Benchmark).where(Benchmark.id == b_id)
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail=f"Benchmark '{b_id}' already exists")

    b_entry = Benchmark(
        id=b_id,
        name=payload.name.strip(),
        version=payload.version.strip() if payload.version else "1.0",
        category=payload.category.strip() if payload.category else "General",
        file_patterns_json=json.dumps(payload.file_patterns or []),
        parser_id=f"dynamic_{b_id}"
    )
    db.add(b_entry)

    metrics_list = []
    for idx, m in enumerate(payload.metrics):
        m_id = m.id or re.sub(r'[^a-z0-9_]', '_', m.name.lower()).strip('_')
        m_entry = BenchmarkMetric(
            id=m_id,
            benchmark_id=b_id,
            name=m.name.strip(),
            display_name=m.display_name.strip() if m.display_name else m.name.strip(),
            unit=m.unit.strip() if m.unit else "score",
            higher_is_better=m.higher_is_better if m.higher_is_better is not None else True,
            decimal_places=m.decimal_places or 0,
            sort_order=m.sort_order if m.sort_order is not None else idx
        )
        db.add(m_entry)
        metrics_list.append({
            "id": m_id,
            "name": m.name.strip(),
            "display_name": m.display_name.strip() if m.display_name else m.name.strip(),
            "unit": m.unit.strip() if m.unit else "score",
            "higher_is_better": m.higher_is_better if m.higher_is_better is not None else True,
            "decimal_places": m.decimal_places or 0,
            "sort_order": idx
        })

    await db.commit()

    b_dict = {
        "id": b_id,
        "name": payload.name.strip(),
        "version": payload.version.strip() if payload.version else "1.0",
        "category": payload.category.strip() if payload.category else "General",
        "parser_id": f"dynamic_{b_id}",
        "aliases": payload.aliases or [b_id, payload.name.lower()],
        "keywords": payload.keywords or [payload.name.lower()] + [m["name"].lower() for m in metrics_list],
        "metrics": metrics_list
    }
    benchmark_identifier.register_dynamic_benchmark(b_dict)
    return {"status": "success", "benchmark": b_dict}

@router.post("/test-extract")
async def test_extract_dynamic_benchmark(
    image: Optional[UploadFile] = File(None),
    image_path: Optional[str] = Form(None),
    benchmark_data: str = Form(...)
):
    try:
        b_dict = json.loads(benchmark_data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {e}")

    import cv2
    import numpy as np
    from app.parsers.dynamic_template import DynamicTemplateParser
    from app.ocr.engine import ocr_engine

    cv_img = None
    if image:
        content = await image.read()
        nparr = np.frombuffer(content, np.uint8)
        cv_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    elif image_path and os.path.isfile(image_path):
        cv_img = cv2.imread(image_path)

    if cv_img is None:
        raise HTTPException(status_code=400, detail="Could not load or decode image")

    ocr_items = ocr_engine.ocr_image(cv_img)
    dyn_parser = DynamicTemplateParser(b_dict)
    res = dyn_parser.extract_results(cv_img, ocr_items, ocr_engine)

    return {
        "benchmark_id": res.benchmark_id,
        "detected_benchmark_name": res.detected_benchmark_name,
        "overall_confidence": res.overall_confidence,
        "status": res.status,
        "metrics": {
            k: {
                "metric_id": m.metric_id,
                "raw_text": m.raw_text,
                "normalized_value": m.normalized_value,
                "unit": m.unit,
                "confidence": m.confidence,
                "ocr_region": list(m.ocr_region) if m.ocr_region else None
            }
            for k, m in res.metrics.items()
        }
    }

@router.post("/ai-detect")
async def ai_detect_benchmark(
    image: Optional[UploadFile] = File(None),
    image_path: Optional[str] = Form(None)
):
    import cv2
    import numpy as np
    from app.services.ai_vision_service import AIVisionService
    from app.ocr.engine import ocr_engine

    cv_img = None
    hints = None
    if image:
        content = await image.read()
        nparr = np.frombuffer(content, np.uint8)
        cv_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    elif image_path and os.path.isfile(image_path):
        cv_img = cv2.imread(image_path)
        hints = benchmark_identifier.infer_context_from_path(image_path)

    if cv_img is None:
        raise HTTPException(status_code=400, detail="Valid image or image_path is required")

    ocr_items = ocr_engine.ocr_image(cv_img)
    proposal = await AIVisionService.detect_benchmark(cv_img, ocr_items, hints)
    return proposal

class AISettingsUpdate(BaseModel):
    provider: str
    api_key: Optional[str] = None
    model_name: Optional[str] = "gemini-2.5-flash"

@router.get("/ai-settings")
async def get_ai_settings():
    from app.services.ai_vision_service import AIVisionService
    cfg = AIVisionService.get_settings()
    return {
        "provider": cfg.get("provider", "directml"),
        "has_api_key": bool(cfg.get("api_key")),
        "model_name": cfg.get("model_name", "gemini-2.5-flash")
    }

@router.post("/ai-settings")
async def update_ai_settings(payload: AISettingsUpdate):
    from app.services.ai_vision_service import AIVisionService
    update_data = {"provider": payload.provider, "model_name": payload.model_name}
    if payload.api_key is not None:
        update_data["api_key"] = payload.api_key.strip()
    AIVisionService.save_settings(update_data)
    return {"status": "success", "settings": await get_ai_settings()}
