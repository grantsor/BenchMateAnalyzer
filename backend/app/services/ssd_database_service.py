import io
import csv
import os
import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import SSDModel, SSDBenchmarkScore
from app.core.scanner import FolderScanner
from app.ocr.engine import OCREngine
from app.ocr.preprocessor import ImagePreprocessor
from app.parsers.registry import parser_registry

METRIC_COLUMNS = [
    # (benchmark_id, metric_id, column_header, default_unit, higher_is_better)
    ("crystaldiskmark_1gb", "seq_read", "CDM 1GB Seq Read (MB/s)", "MB/s", True),
    ("crystaldiskmark_1gb", "seq_write", "CDM 1GB Seq Write (MB/s)", "MB/s", True),
    ("crystaldiskmark_1gb", "rnd_4k_read", "CDM 1GB RND4K Read (MB/s)", "MB/s", True),
    ("crystaldiskmark_1gb", "rnd_4k_write", "CDM 1GB RND4K Write (MB/s)", "MB/s", True),

    ("crystaldiskmark_16gb", "seq_read", "CDM 16GB Seq Read (MB/s)", "MB/s", True),
    ("crystaldiskmark_16gb", "seq_write", "CDM 16GB Seq Write (MB/s)", "MB/s", True),
    ("crystaldiskmark_16gb", "rnd_4k_read", "CDM 16GB RND4K Read (MB/s)", "MB/s", True),
    ("crystaldiskmark_16gb", "rnd_4k_write", "CDM 16GB RND4K Write (MB/s)", "MB/s", True),

    ("as_ssd_1gb", "seq_read", "AS SSD 1GB Seq Read (MB/s)", "MB/s", True),
    ("as_ssd_1gb", "seq_write", "AS SSD 1GB Seq Write (MB/s)", "MB/s", True),
    ("as_ssd_1gb", "four_k_read", "AS SSD 1GB 4K Read (MB/s)", "MB/s", True),
    ("as_ssd_1gb", "four_k_write", "AS SSD 1GB 4K Write (MB/s)", "MB/s", True),
    ("as_ssd_1gb", "four_k_64_read", "AS SSD 1GB 4K-64 Read (MB/s)", "MB/s", True),
    ("as_ssd_1gb", "four_k_64_write", "AS SSD 1GB 4K-64 Write (MB/s)", "MB/s", True),
    ("as_ssd_1gb", "acc_time_read", "AS SSD 1GB Acc Time Read (ms)", "ms", False),
    ("as_ssd_1gb", "acc_time_write", "AS SSD 1GB Acc Time Write (ms)", "ms", False),
    ("as_ssd_1gb", "score", "AS SSD 1GB Score", "pts", True),

    ("as_ssd_10gb", "seq_read", "AS SSD 10GB Seq Read (MB/s)", "MB/s", True),
    ("as_ssd_10gb", "seq_write", "AS SSD 10GB Seq Write (MB/s)", "MB/s", True),
    ("as_ssd_10gb", "four_k_read", "AS SSD 10GB 4K Read (MB/s)", "MB/s", True),
    ("as_ssd_10gb", "four_k_write", "AS SSD 10GB 4K Write (MB/s)", "MB/s", True),
    ("as_ssd_10gb", "four_k_64_read", "AS SSD 10GB 4K-64 Read (MB/s)", "MB/s", True),
    ("as_ssd_10gb", "four_k_64_write", "AS SSD 10GB 4K-64 Write (MB/s)", "MB/s", True),
    ("as_ssd_10gb", "acc_time_read", "AS SSD 10GB Acc Time Read (ms)", "ms", False),
    ("as_ssd_10gb", "acc_time_write", "AS SSD 10GB Acc Time Write (ms)", "ms", False),
    ("as_ssd_10gb", "score", "AS SSD 10GB Score", "pts", True),

    ("as_ssd_copy", "iso_speed", "AS COPY ISO Speed (MB/s)", "MB/s", True),
    ("as_ssd_copy", "iso_duration", "AS COPY ISO Duration (s)", "s", False),
    ("as_ssd_copy", "program_speed", "AS COPY Program Speed (MB/s)", "MB/s", True),
    ("as_ssd_copy", "program_duration", "AS COPY Program Duration (s)", "s", False),
    ("as_ssd_copy", "game_speed", "AS COPY Game Speed (MB/s)", "MB/s", True),
    ("as_ssd_copy", "game_duration", "AS COPY Game Duration (s)", "s", False),

    ("threedmark_storage", "storage_score", "3DMark Storage Score", "pts", True),
    ("threedmark_storage", "bandwidth", "3DMark Bandwidth (MB/s)", "MB/s", True),
    ("threedmark_storage", "average_access_time", "3DMark Access Time (µs)", "µs", False),

    ("pcmark10_data_drive", "score", "PCMark Data Drive Score", "pts", True),
    ("pcmark10_data_drive", "bandwidth", "PCMark Data Drive Bandwidth (MB/s)", "MB/s", True),
    ("pcmark10_data_drive", "access_time", "PCMark Data Drive Access Time (µs)", "µs", False),

    ("pcmark10_quick_system_drive", "score", "PCMark Quick Sys Score", "pts", True),
    ("pcmark10_quick_system_drive", "bandwidth", "PCMark Quick Sys Bandwidth (MB/s)", "MB/s", True),
    ("pcmark10_quick_system_drive", "access_time", "PCMark Quick Sys Access Time (µs)", "µs", False),

    ("blackmagic_1gb", "write_speed", "Blackmagic 1GB Write (MB/s)", "MB/s", True),
    ("blackmagic_1gb", "read_speed", "Blackmagic 1GB Read (MB/s)", "MB/s", True),

    ("blackmagic_5gb", "write_speed", "Blackmagic 5GB Write (MB/s)", "MB/s", True),
    ("blackmagic_5gb", "read_speed", "Blackmagic 5GB Read (MB/s)", "MB/s", True),

    ("occt_storage", "seq_read", "OCCT Seq Read (MB/s)", "MB/s", True),
    ("occt_storage", "seq_write", "OCCT Seq Write (MB/s)", "MB/s", True),
    ("occt_storage", "rnd_read", "OCCT RND Read (MB/s)", "MB/s", True),
    ("occt_storage", "rnd_write", "OCCT RND Write (MB/s)", "MB/s", True),
]

class SSDDatabaseService:

    @staticmethod
    async def get_all_models_with_scores(session: AsyncSession) -> List[Dict[str, Any]]:
        stmt = select(SSDModel).options(
            selectinload(SSDModel.scores)
        ).order_by(SSDModel.sort_order.asc(), SSDModel.model_name.asc())

        models = (await session.execute(stmt)).scalars().all()
        result = []
        for m in models:
            scores_map: Dict[str, Dict[str, Any]] = {}
            for s in m.scores:
                key = f"{s.benchmark_id}:{s.metric_id}"
                scores_map[key] = {
                    "id": s.id,
                    "benchmark_id": s.benchmark_id,
                    "metric_id": s.metric_id,
                    "value": s.value,
                    "unit": s.unit,
                    "source_file": s.source_file,
                    "is_manual": s.is_manual,
                    "updated_at": s.updated_at.isoformat() if s.updated_at else None
                }

            result.append({
                "id": m.id,
                "model_name": m.model_name,
                "brand": m.brand,
                "capacity": m.capacity,
                "interface": m.interface,
                "form_factor": m.form_factor,
                "notes": m.notes,
                "source_folder": getattr(m, "source_folder", None),
                "aliases": getattr(m, "aliases", None),
                "sort_order": m.sort_order,
                "created_at": m.created_at.isoformat() if m.created_at else None,
                "updated_at": m.updated_at.isoformat() if m.updated_at else None,
                "scores": scores_map
            })
        return result

    @staticmethod
    async def upsert_model(
        session: AsyncSession,
        model_name: str,
        brand: Optional[str] = None,
        capacity: Optional[str] = None,
        interface: Optional[str] = None,
        form_factor: Optional[str] = None,
        notes: Optional[str] = None,
        source_folder: Optional[str] = None
    ) -> SSDModel:
        clean_name = model_name.strip()
        stmt = select(SSDModel).where(func.lower(SSDModel.model_name) == clean_name.lower())
        model = (await session.execute(stmt)).scalars().first()

        if not model:
            model = SSDModel(
                model_name=clean_name,
                brand=brand,
                capacity=capacity,
                interface=interface,
                form_factor=form_factor,
                notes=notes,
                source_folder=source_folder
            )
            session.add(model)
        else:
            if brand is not None:
                model.brand = brand
            if capacity is not None:
                model.capacity = capacity
            if interface is not None:
                model.interface = interface
            if form_factor is not None:
                model.form_factor = form_factor
            if notes is not None:
                model.notes = notes
            if source_folder is not None and not model.source_folder:
                model.source_folder = source_folder
            model.updated_at = datetime.utcnow()

        await session.commit()
        await session.refresh(model)
        return model

    @staticmethod
    async def update_model_by_id(
        session: AsyncSession,
        model_id: str,
        model_name: Optional[str] = None,
        brand: Optional[str] = None,
        capacity: Optional[str] = None,
        interface: Optional[str] = None,
        form_factor: Optional[str] = None,
        notes: Optional[str] = None,
        source_folder: Optional[str] = None,
        aliases: Optional[str] = None
    ) -> Optional[SSDModel]:
        stmt = select(SSDModel).where(SSDModel.id == model_id)
        model = (await session.execute(stmt)).scalars().first()
        if not model:
            return None

        if model_name is not None and model_name.strip():
            clean_name = model_name.strip()
            if clean_name.lower() != model.model_name.lower():
                # Check uniqueness against other models
                stmt_dup = select(SSDModel).where(
                    func.lower(SSDModel.model_name) == clean_name.lower(),
                    SSDModel.id != model_id
                )
                dup = (await session.execute(stmt_dup)).scalars().first()
                if dup:
                    raise ValueError(f"An SSD model named '{clean_name}' already exists.")

                # Record previous name into aliases so re-scanning folder retains the link
                old_name = model.model_name
                existing_aliases = set()
                if getattr(model, "aliases", None):
                    for a in model.aliases.split(","):
                        if a.strip():
                            existing_aliases.add(a.strip())
                existing_aliases.add(old_name)

                # If source_folder is empty, record old_name as source_folder
                if not getattr(model, "source_folder", None):
                    model.source_folder = old_name

                model.aliases = ", ".join(sorted(existing_aliases))
                model.model_name = clean_name

        if brand is not None:
            model.brand = brand
        if capacity is not None:
            model.capacity = capacity
        if interface is not None:
            model.interface = interface
        if form_factor is not None:
            model.form_factor = form_factor
        if notes is not None:
            model.notes = notes
        if source_folder is not None:
            model.source_folder = source_folder
        if aliases is not None:
            model.aliases = aliases

        model.updated_at = datetime.utcnow()
        await session.commit()
        await session.refresh(model)
        return model

    @staticmethod
    async def update_score(
        session: AsyncSession,
        model_id: str,
        benchmark_id: str,
        metric_id: str,
        value: float,
        unit: Optional[str] = None,
        is_manual: bool = True,
        source_file: Optional[str] = None
    ) -> SSDBenchmarkScore:
        stmt = select(SSDBenchmarkScore).where(
            SSDBenchmarkScore.model_id == model_id,
            SSDBenchmarkScore.benchmark_id == benchmark_id,
            SSDBenchmarkScore.metric_id == metric_id
        )
        score = (await session.execute(stmt)).scalars().first()

        if not score:
            score = SSDBenchmarkScore(
                model_id=model_id,
                benchmark_id=benchmark_id,
                metric_id=metric_id,
                value=value,
                unit=unit or "MB/s",
                is_manual=is_manual,
                source_file=source_file
            )
            session.add(score)
        else:
            score.value = value
            if unit:
                score.unit = unit
            score.is_manual = is_manual
            if source_file:
                score.source_file = source_file
            score.updated_at = datetime.utcnow()

        # Also touch parent model updated_at
        stmt_m = select(SSDModel).where(SSDModel.id == model_id)
        m = (await session.execute(stmt_m)).scalars().first()
        if m:
            m.updated_at = datetime.utcnow()

        await session.commit()
        await session.refresh(score)
        return score

    @staticmethod
    async def delete_model(session: AsyncSession, model_id: str) -> bool:
        stmt = select(SSDModel).where(SSDModel.id == model_id)
        model = (await session.execute(stmt)).scalars().first()
        if not model:
            return False
        await session.delete(model)
        await session.commit()
        return True

    @staticmethod
    async def delete_score(session: AsyncSession, model_id: str, benchmark_id: str, metric_id: str) -> bool:
        stmt = select(SSDBenchmarkScore).where(
            SSDBenchmarkScore.model_id == model_id,
            SSDBenchmarkScore.benchmark_id == benchmark_id,
            SSDBenchmarkScore.metric_id == metric_id
        )
        score = (await session.execute(stmt)).scalars().first()
        if not score:
            return False
        await session.delete(score)
        await session.commit()
        return True

    @classmethod
    async def ingest_folder(
        cls,
        session: AsyncSession,
        folder_path: str
    ) -> Dict[str, Any]:
        """
        Scans a folder (either a single SSD model directory or a root folder containing multiple SSD directories).
        Runs OCR and parsers, and upserts models and scores in the SSD database.
        """
        scanner = FolderScanner()
        scan_report = scanner.scan_root_folder(folder_path)

        ocr_engine = OCREngine()
        models_updated: List[str] = []
        total_scores_saved = 0

        # Pre-load all existing models to match against
        stmt_all = select(SSDModel)
        all_existing_models = list((await session.execute(stmt_all)).scalars().all())

        for cfg in scan_report.configurations:
            folder_or_cfg_name = (cfg.display_name or cfg.folder_name).strip()
            folder_path_clean = cfg.folder_path.strip() if cfg.folder_path else ""

            # Check if an existing model already matches this folder by:
            # 1. exact/case-insensitive model_name
            # 2. source_folder matches folder_or_cfg_name or folder_path_clean
            # 3. folder_or_cfg_name or folder_path_clean exists in aliases
            model = None
            for m in all_existing_models:
                # 1. match by current model_name
                if m.model_name.strip().lower() == folder_or_cfg_name.lower():
                    model = m
                    break
                # 2. match by source_folder
                if getattr(m, "source_folder", None):
                    sf = m.source_folder.strip().lower()
                    if sf == folder_or_cfg_name.lower() or (folder_path_clean and sf == folder_path_clean.lower()):
                        model = m
                        break
                # 3. match by aliases
                if getattr(m, "aliases", None):
                    alias_list = [a.strip().lower() for a in m.aliases.split(",") if a.strip()]
                    if folder_or_cfg_name.lower() in alias_list or (folder_path_clean and folder_path_clean.lower() in alias_list):
                        model = m
                        break

            if not model:
                model = await cls.upsert_model(session, model_name=folder_or_cfg_name)
                model.source_folder = folder_or_cfg_name
                await session.commit()
                await session.refresh(model)
                all_existing_models.append(model)
            else:
                # Ensure source_folder is linked if it wasn't
                if not getattr(model, "source_folder", None):
                    model.source_folder = folder_or_cfg_name
                    await session.commit()
                    await session.refresh(model)

            effective_model_name = model.model_name

            for img in cfg.images:
                fn = img.file_name
                fp = img.file_path

                try:
                    loaded_img = ImagePreprocessor.load_image(fp)
                    ocr_items = ocr_engine.ocr_image(loaded_img)
                    dims = (loaded_img.shape[1], loaded_img.shape[0]) if loaded_img is not None else None

                    parser = parser_registry.find_best_parser(fn, ocr_items, dims)
                    if parser:
                        parsed = parser.extract_results(loaded_img, ocr_items, dims)
                        if parsed and parsed.status != "ignored":
                            b_id = parsed.benchmark_id
                            for m_id, m_val in parsed.metrics.items():
                                if m_val.normalized_value is not None:
                                    await cls.update_score(
                                        session=session,
                                        model_id=model.id,
                                        benchmark_id=b_id,
                                        metric_id=m_id,
                                        value=m_val.normalized_value,
                                        unit=m_val.unit,
                                        is_manual=False,
                                        source_file=fn
                                    )
                                    total_scores_saved += 1
                except Exception as e:
                    print(f"[SSDDatabaseService] Error processing image {fp}: {e}")

            if effective_model_name not in models_updated:
                models_updated.append(effective_model_name)

        return {
            "status": "success",
            "models_updated": models_updated,
            "total_scores_saved": total_scores_saved
        }

    @classmethod
    async def export_to_csv(cls, session: AsyncSession) -> str:
        models = await cls.get_all_models_with_scores(session)
        output = io.StringIO()
        writer = csv.writer(output)

        headers = ["Model Name", "Brand", "Capacity", "Interface", "Form Factor", "Notes"]
        for _, _, col_title, _, _ in METRIC_COLUMNS:
            headers.append(col_title)
        writer.writerow(headers)

        for m in models:
            row = [
                m["model_name"],
                m.get("brand") or "",
                m.get("capacity") or "",
                m.get("interface") or "",
                m.get("form_factor") or "",
                m.get("notes") or "",
            ]
            scores = m.get("scores", {})
            for b_id, m_id, _, _, _ in METRIC_COLUMNS:
                key = f"{b_id}:{m_id}"
                if key in scores and scores[key]["value"] is not None:
                    row.append(str(scores[key]["value"]))
                else:
                    row.append("")
            writer.writerow(row)

        return output.getvalue()

    @classmethod
    async def import_from_csv(cls, session: AsyncSession, csv_text: str) -> Dict[str, Any]:
        reader = csv.reader(io.StringIO(csv_text.strip()))
        rows = list(reader)
        if not rows:
            return {"status": "error", "message": "CSV file is empty"}

        headers = [h.strip() for h in rows[0]]
        header_map: Dict[int, Tuple[str, str, str]] = {}

        # Map columns by matching header text
        for idx, h in enumerate(headers):
            for b_id, m_id, col_title, unit, _ in METRIC_COLUMNS:
                if col_title.lower() in h.lower() or f"{b_id}_{m_id}".lower() in h.lower():
                    header_map[idx] = (b_id, m_id, unit)
                    break

        model_name_idx = 0
        brand_idx = None
        capacity_idx = None
        interface_idx = None

        for idx, h in enumerate(headers):
            hl = h.lower()
            if "model" in hl:
                model_name_idx = idx
            elif "brand" in hl:
                brand_idx = idx
            elif "capacity" in hl:
                capacity_idx = idx
            elif "interface" in hl:
                interface_idx = idx

        models_imported = 0
        scores_imported = 0

        for row in rows[1:]:
            if not row or not row[model_name_idx].strip():
                continue

            model_name = row[model_name_idx].strip()
            brand = row[brand_idx].strip() if brand_idx is not None and brand_idx < len(row) else None
            cap = row[capacity_idx].strip() if capacity_idx is not None and capacity_idx < len(row) else None
            inter = row[interface_idx].strip() if interface_idx is not None and interface_idx < len(row) else None

            model = await cls.upsert_model(session, model_name=model_name, brand=brand, capacity=cap, interface=inter)
            models_imported += 1

            for col_idx, (b_id, m_id, unit) in header_map.items():
                if col_idx < len(row) and row[col_idx].strip():
                    try:
                        val_str = row[col_idx].strip().replace(",", "")
                        val = float(val_str)
                        await cls.update_score(
                            session=session,
                            model_id=model.id,
                            benchmark_id=b_id,
                            metric_id=m_id,
                            value=val,
                            unit=unit,
                            is_manual=True,
                            source_file="csv_import"
                        )
                        scores_imported += 1
                    except ValueError:
                        pass

        return {
            "status": "success",
            "models_imported": models_imported,
            "scores_imported": scores_imported
        }

    @classmethod
    async def get_chart_data(
        cls,
        session: AsyncSession,
        benchmark_id: str,
        metric_id: str,
        baseline_model_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Retrieves formatted chart data comparing all SSD models for a specific benchmark and metric.
        """
        # Find metric column info
        metric_info = None
        for b_id, m_id, title, unit, hib in METRIC_COLUMNS:
            if b_id == benchmark_id and m_id == metric_id:
                metric_info = (title, unit, hib)
                break

        unit = metric_info[1] if metric_info else "MB/s"
        higher_is_better = metric_info[2] if metric_info else True
        chart_title = metric_info[0] if metric_info else f"{benchmark_id} - {metric_id}"

        stmt = select(SSDModel).options(
            selectinload(SSDModel.scores)
        ).order_by(SSDModel.sort_order.asc(), SSDModel.model_name.asc())

        models = (await session.execute(stmt)).scalars().all()

        chart_rows = []
        baseline_val = None

        # First pass to find baseline value
        for m in models:
            for s in m.scores:
                if s.benchmark_id == benchmark_id and s.metric_id == metric_id:
                    if baseline_model_id and m.id == baseline_model_id:
                        baseline_val = s.value
                    break

        for m in models:
            val = None
            source_file = None
            for s in m.scores:
                if s.benchmark_id == benchmark_id and s.metric_id == metric_id:
                    val = s.value
                    source_file = s.source_file
                    break

            if val is None:
                continue

            delta = None
            pct_gain = None
            if baseline_val is not None and baseline_val != 0:
                delta = round(val - baseline_val, 2)
                if higher_is_better:
                    pct_gain = round(((val - baseline_val) / baseline_val) * 100.0, 1)
                else:
                    # Inverted for lower is better: baseline / val
                    pct_gain = round(((baseline_val - val) / baseline_val) * 100.0, 1)

            chart_rows.append({
                "model_id": m.id,
                "model_name": m.model_name,
                "display_name": m.model_name,
                "brand": m.brand,
                "capacity": m.capacity,
                "value": val,
                "unit": unit,
                "source_file": source_file,
                "is_baseline": (m.id == baseline_model_id),
                "delta_vs_baseline": delta,
                "pct_gain_vs_baseline": pct_gain
            })

        # Sort rows by performance (highest first if higher is better, lowest first if lower is better)
        chart_rows.sort(key=lambda r: r["value"], reverse=higher_is_better)

        return {
            "benchmark_id": benchmark_id,
            "metric_id": metric_id,
            "metric_title": chart_title,
            "unit": unit,
            "higher_is_better": higher_is_better,
            "baseline_model_id": baseline_model_id,
            "rows": chart_rows
        }

    @classmethod
    async def get_grouped_datasets(
        cls,
        session: AsyncSession,
        baseline_model_id: Optional[str] = None,
        form_factor: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        # Fetch all models with scores
        models = await cls.get_all_models_with_scores(session)
        if not models:
            return []

        if form_factor and form_factor.strip().lower() not in ["all", ""]:
            ff_clean = form_factor.strip().lower()
            models = [
                m for m in models
                if ff_clean in (m.get("form_factor") or "").lower()
            ]

        # Find all benchmarks present
        benchmark_titles = {
            "crystaldiskmark_1gb": "CrystalDiskMark (1GB)",
            "crystaldiskmark_16gb": "CrystalDiskMark (16GB)",
            "as_ssd_1gb": "AS SSD Benchmark (1GB)",
            "as_ssd_10gb": "AS SSD Benchmark (10GB)",
            "as_ssd_copy": "AS SSD Copy Benchmark",
            "threedmark_storage": "3DMark Storage Benchmark",
            "pcmark10_data_drive": "PCMark 10 Data Drive",
            "pcmark10_quick_system_drive": "PCMark 10 Quick System Drive",
            "blackmagic_1gb": "Blackmagic Disk Speed Test (1GB)",
            "blackmagic_5gb": "Blackmagic Disk Speed Test (5GB)",
            "occt_storage": "OCCT Storage Benchmark",
        }

        # Build datasets
        datasets_by_bid: Dict[str, Dict[str, Any]] = {}

        # Organize METRIC_COLUMNS by benchmark_id
        metrics_by_bid: Dict[str, List[Tuple[str, str, str, bool]]] = {}
        for b_id, m_id, title, unit, hib in METRIC_COLUMNS:
            if b_id not in metrics_by_bid:
                metrics_by_bid[b_id] = []
            metrics_by_bid[b_id].append((m_id, title, unit, hib))

        for b_id, metric_defs in metrics_by_bid.items():
            b_name = benchmark_titles.get(b_id, b_id.replace("_", " ").title())
            m_ids = [m[0] for m in metric_defs]

            # Check baseline values if baseline_model_id is specified
            baseline_vals: Dict[str, float] = {}
            if baseline_model_id:
                for m in models:
                    if m["id"] == baseline_model_id:
                        for m_id, _, _, _ in metric_defs:
                            key = f"{b_id}:{m_id}"
                            if key in m["scores"]:
                                baseline_vals[m_id] = m["scores"][key]["value"]
                        break

            rows = []
            for m in models:
                row_metrics = {}
                has_any_score = False

                for m_id, m_title, unit, hib in metric_defs:
                    key = f"{b_id}:{m_id}"
                    if key in m["scores"] and m["scores"][key]["value"] is not None:
                        has_any_score = True
                        val = m["scores"][key]["value"]
                        base_v = baseline_vals.get(m_id)
                        delta = None
                        pct_gain = None
                        if base_v is not None and base_v != 0:
                            delta = round(val - base_v, 2)
                            if hib:
                                pct_gain = round(((val - base_v) / base_v) * 100.0, 1)
                            else:
                                pct_gain = round(((base_v - val) / base_v) * 100.0, 1)

                        row_metrics[m_id] = {
                            "metric_id": m_id,
                            "metric_display_name": m_title,
                            "unit": unit,
                            "higher_is_better": hib,
                            "value": val,
                            "raw_values": [val],
                            "confidence": 0.95,
                            "status": "verified",
                            "source_file": m["scores"][key].get("source_file"),
                            "delta_vs_baseline": delta,
                            "pct_gain_vs_baseline": pct_gain
                        }

                if has_any_score:
                    rows.append({
                        "configuration_id": m["id"],
                        "configuration_name": m["model_name"],
                        "display_name": m["model_name"],
                        "form_factor": m.get("form_factor"),
                        "interface": m.get("interface"),
                        "sort_order": m.get("sort_order", 0),
                        "is_baseline": (m["id"] == baseline_model_id),
                        "metrics": row_metrics
                    })

            if rows:
                datasets_by_bid[b_id] = {
                    "benchmark_id": b_id,
                    "benchmark_name": b_name,
                    "version": "1.0",
                    "category": "Storage / SSD",
                    "metric_ids": m_ids,
                    "rows": rows
                }

        return list(datasets_by_bid.values())
