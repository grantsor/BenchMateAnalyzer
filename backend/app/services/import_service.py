import json
import re
from pathlib import Path
from typing import Callable, Dict, List, Optional
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.identifier import benchmark_identifier
from app.core.scanner import FolderScanner, ScanReport
from app.db.models import (
    Benchmark, BenchmarkMetric, Configuration, OCRRun,
    Project, Result, ResultMetric, SourceImage
)
from app.ocr.engine import ocr_engine
from app.ocr.preprocessor import ImagePreprocessor
from app.parsers.registry import parser_registry

class ImportService:
    @staticmethod
    async def ensure_benchmarks_loaded(session: AsyncSession):
        """
        Syncs benchmark definitions from JSON files into the SQLite database.
        """
        for b_id, b_def in benchmark_identifier.benchmarks.items():
            stmt = select(Benchmark).where(Benchmark.id == b_id)
            res = await session.execute(stmt)
            existing = res.scalar_one_or_none()

            if not existing:
                b_entry = Benchmark(
                    id=b_id,
                    name=b_def.name,
                    version=b_def.version,
                    category=b_def.category,
                    file_patterns_json=json.dumps([p.pattern for p in b_def.file_patterns]),
                    parser_id=b_def.parser_id
                )
                session.add(b_entry)

                for m in b_def.metrics:
                    m_entry = BenchmarkMetric(
                        id=m["id"],
                        benchmark_id=b_id,
                        name=m["name"],
                        display_name=m.get("display_name", m["name"]),
                        unit=m.get("unit", "score"),
                        higher_is_better=m.get("higher_is_better", True),
                        decimal_places=m.get("decimal_places", 0),
                        range_min=m.get("range_min"),
                        range_max=m.get("range_max"),
                        sort_order=m.get("sort_order", 0)
                    )
                    session.add(m_entry)

        await session.commit()

    @staticmethod
    async def import_folder_into_project(
        session: AsyncSession,
        project_id: str,
        root_folder_path: str,
        progress_callback: Optional[Callable[[int, int, str], None]] = None,
        force_reparse: bool = False
    ) -> ScanReport:
        # Ensure definitions exist in DB
        await ImportService.ensure_benchmarks_loaded(session)

        # 1. Scan the folder
        report = FolderScanner.scan_root_folder(root_folder_path)

        # 2. Create Configurations & SourceImages in DB
        config_map: Dict[str, Configuration] = {}
        for idx, cfg in enumerate(report.configurations):
            stmt = select(Configuration).where(
                Configuration.project_id == project_id,
                Configuration.folder_name == cfg.folder_name
            )
            res = await session.execute(stmt)
            db_cfg = res.scalar_one_or_none()

            if not db_cfg:
                db_cfg = Configuration(
                    project_id=project_id,
                    folder_name=cfg.folder_name,
                    display_name=cfg.display_name,
                    sort_order=idx
                )
                session.add(db_cfg)
                await session.flush()

            config_map[cfg.folder_name] = db_cfg

        scanned_map: Dict[str, Tuple[Optional[str], float]] = {}
        for cfg in report.configurations:
            db_cfg = config_map.get(cfg.folder_name)
            if not db_cfg:
                continue
            for s_img in cfg.images:
                scanned_map[s_img.file_path] = (s_img.identified_benchmark_id, s_img.identification_confidence)

                # Check if image already indexed in DB
                stmt_img = select(SourceImage).where(
                    SourceImage.configuration_id == db_cfg.id,
                    SourceImage.file_path == s_img.file_path
                )
                res_img = await session.execute(stmt_img)
                db_img = res_img.scalar_one_or_none()

                if not db_img:
                    db_img = SourceImage(
                        configuration_id=db_cfg.id,
                        file_path=s_img.file_path,
                        file_name=s_img.file_name,
                        file_hash_sha256=s_img.sha256,
                        perceptual_hash=s_img.dhash,
                        width=s_img.width,
                        height=s_img.height,
                        file_size=s_img.file_size
                    )
                    session.add(db_img)
                    await session.flush()

        await session.commit()

        # 3. Process OCR on all indexed images
        all_images: List[SourceImage] = []
        for cfg in config_map.values():
            stmt = select(SourceImage).where(SourceImage.configuration_id == cfg.id)
            res = await session.execute(stmt)
            all_images.extend(res.scalars().all())

        total = len(all_images)
        for i, img in enumerate(all_images):
            if progress_callback:
                progress_callback(i + 1, total, img.file_name)

            # Check if result already exists for this image
            stmt_res = select(Result).where(Result.source_image_id == img.id)
            res_res = await session.execute(stmt_res)
            existing_result = res_res.scalar_one_or_none()
            if existing_result and existing_result.benchmark_id != "unknown" and not force_reparse:
                continue

            if existing_result:
                # Clean up old metrics and result before re-parsing
                stmt_rm = select(ResultMetric.id).where(ResultMetric.result_id == existing_result.id)
                rm_ids = (await session.execute(stmt_rm)).scalars().all()
                if rm_ids:
                    await session.execute(delete(OCRRun).where(OCRRun.result_metric_id.in_(rm_ids)))
                    await session.execute(delete(ResultMetric).where(ResultMetric.id.in_(rm_ids)))
                await session.execute(delete(Result).where(Result.id == existing_result.id))
                await session.flush()

            # Load image
            cv_img = ImagePreprocessor.load_image(img.file_path)
            if cv_img is None:
                continue

            # Pass benchmark identified by scanner if available
            forced_b_id = None
            if img.file_path in scanned_map:
                ident_id, conf = scanned_map[img.file_path]
                if ident_id and ident_id != "unknown" and conf >= 0.60:
                    forced_b_id = ident_id

            # Parse with parser registry
            extraction = parser_registry.parse_image(cv_img, img.file_name, forced_benchmark_id=forced_b_id)

            # Make sure benchmark exists in DB (even if 'unknown')
            b_id = extraction.benchmark_id
            stmt_b = select(Benchmark).where(Benchmark.id == b_id)
            b_db = (await session.execute(stmt_b)).scalar_one_or_none()
            if not b_db:
                b_db = Benchmark(
                    id=b_id,
                    name=extraction.detected_benchmark_name or "Unknown Benchmark",
                    version="1.0",
                    parser_id=extraction.parser_id
                )
                session.add(b_db)
                await session.flush()

            # Save Result
            result_record = Result(
                project_id=project_id,
                configuration_id=img.configuration_id,
                benchmark_id=b_id,
                source_image_id=img.id,
                parser_id=extraction.parser_id,
                parser_version=extraction.parser_version,
                overall_confidence=extraction.overall_confidence,
                status=extraction.status
            )
            session.add(result_record)
            await session.flush()

            # Save ResultMetrics
            for m_id, m_res in extraction.metrics.items():
                # Ensure BenchmarkMetric exists
                stmt_bm = select(BenchmarkMetric).where(
                    BenchmarkMetric.id == m_id,
                    BenchmarkMetric.benchmark_id == b_id
                )
                bm_db = (await session.execute(stmt_bm)).scalar_one_or_none()
                if not bm_db:
                    bm_db = BenchmarkMetric(
                        id=m_id,
                        benchmark_id=b_id,
                        name=m_id.replace('_', ' ').title(),
                        display_name=m_id.replace('_', ' ').title(),
                        unit=m_res.unit
                    )
                    session.add(bm_db)
                    await session.flush()

                rm_record = ResultMetric(
                    result_id=result_record.id,
                    metric_id=m_id,
                    benchmark_id=b_id,
                    raw_ocr_value=m_res.raw_text,
                    normalized_value=m_res.normalized_value,
                    confidence=m_res.confidence,
                    ocr_region_json=json.dumps(m_res.ocr_region) if m_res.ocr_region else None
                )
                session.add(rm_record)
                await session.flush()

                # Log OCR Run
                ocr_run = OCRRun(
                    result_metric_id=rm_record.id,
                    raw_text=m_res.raw_text,
                    confidence=m_res.confidence,
                    region_json=json.dumps(m_res.ocr_region) if m_res.ocr_region else None
                )
                session.add(ocr_run)

        await session.commit()

        # 4. Blackmagic Disambiguation: Ensure 1GB and 5GB are accurately assigned.
        # Blackmagic speed tests are strictly in 1GB and 5GB file sizes.
        # Rule 1: Filenames containing 1g/1gb -> 1GB; 5g/5gb/16g/16gb -> 5GB
        # Rule 2: If ambiguous or 2 runs exist in same configuration, 1GB is faster than 5GB on the same drive.
        try:
            for cfg in config_map.values():
                stmt_bm = select(Result).options(
                    selectinload(Result.source_image),
                    selectinload(Result.metrics)
                ).where(
                    Result.configuration_id == cfg.id,
                    Result.benchmark_id.in_(["blackmagic_1gb", "blackmagic_5gb", "blackmagic_16gb"])
                )
                bm_results = (await session.execute(stmt_bm)).scalars().all()
                if not bm_results:
                    continue

                for bmr in bm_results:
                    fn = (bmr.source_image.file_name if bmr.source_image else "").lower()
                    if re.search(r"(?:5|16)\s*g", fn):
                        bmr.benchmark_id = "blackmagic_5gb"
                    elif re.search(r"1\s*g", fn):
                        bmr.benchmark_id = "blackmagic_1gb"
                    elif bmr.benchmark_id == "blackmagic_16gb":
                        bmr.benchmark_id = "blackmagic_5gb"
                    for rm in bmr.metrics:
                        rm.benchmark_id = bmr.benchmark_id

                if len(bm_results) == 2 and bm_results[0].benchmark_id == bm_results[1].benchmark_id:
                    def get_bm_speed(res: Result) -> float:
                        return sum(m.normalized_value for m in res.metrics if m.normalized_value is not None)

                    r1, r2 = bm_results[0], bm_results[1]
                    s1, s2 = get_bm_speed(r1), get_bm_speed(r2)
                    faster, slower = (r1, r2) if s1 >= s2 else (r2, r1)
                    faster.benchmark_id = "blackmagic_1gb"
                    for rm in faster.metrics:
                        rm.benchmark_id = "blackmagic_1gb"
                    slower.benchmark_id = "blackmagic_5gb"
                    for rm in slower.metrics:
                        rm.benchmark_id = "blackmagic_5gb"

            await session.commit()
        except Exception as bm_err:
            print(f"[ImportService] Blackmagic disambiguation notice: {bm_err}")

        # Automatic sync to SSD database for any recognized storage benchmarks
        try:
            from app.services.ssd_database_service import SSDDatabaseService
            for cfg in config_map.values():
                model_name = cfg.display_name or cfg.folder_name
                stmt_ssd = select(Result).where(
                    Result.configuration_id == cfg.id,
                    Result.benchmark_id.in_([
                        "crystaldiskmark_1gb", "crystaldiskmark_16gb", "crystaldiskmark",
                        "as_ssd_1gb", "as_ssd_10gb", "as_ssd_copy",
                        "pcmark10_data_drive", "pcmark10_quick_system_drive",
                        "threedmark_storage",
                        "blackmagic_1gb", "blackmagic_5gb",
                        "occt_storage"
                    ])
                )
                ssd_res = (await session.execute(stmt_ssd)).scalars().all()
                if ssd_res:
                    cfg_folder = str(Path(root_folder_path) / cfg.folder_name)
                    model = await SSDDatabaseService.upsert_model(session, model_name=model_name, source_folder=cfg_folder)
                    for r in ssd_res:
                        stmt_m = select(ResultMetric).options(selectinload(ResultMetric.metric_definition)).where(ResultMetric.result_id == r.id)
                        metrics = (await session.execute(stmt_m)).scalars().all()
                        for m in metrics:
                            if m.normalized_value is not None:
                                unit = m.metric_definition.unit if m.metric_definition else "MB/s"
                                await SSDDatabaseService.update_score(
                                    session=session,
                                    model_id=model.id,
                                    benchmark_id=r.benchmark_id,
                                    metric_id=m.metric_id,
                                    value=m.normalized_value,
                                    unit=unit,
                                    is_manual=False,
                                    source_file="Auto-sync from Import"
                                )
            await session.commit()
        except Exception as sync_err:
            print(f"[ImportService] Optional SSD sync notice: {sync_err}")

        return report

    @staticmethod
    async def reprocess_project(
        session: AsyncSession,
        project_id: str,
        progress_callback: Optional[Callable[[int, int, str], None]] = None
    ) -> int:
        """
        Re-evaluates and re-parses all indexed images for a project with the latest parsers.
        """
        await ImportService.ensure_benchmarks_loaded(session)

        # 1. Fetch project
        stmt_proj = select(Project).where(Project.id == project_id)
        proj = (await session.execute(stmt_proj)).scalar_one_or_none()
        if not proj:
            return 0

        # 2. Delete existing results, result metrics, and ocr runs
        stmt_res_ids = select(Result.id).where(Result.project_id == project_id)
        res_ids = (await session.execute(stmt_res_ids)).scalars().all()
        if res_ids:
            stmt_rm_ids = select(ResultMetric.id).where(ResultMetric.result_id.in_(res_ids))
            rm_ids = (await session.execute(stmt_rm_ids)).scalars().all()
            if rm_ids:
                await session.execute(delete(OCRRun).where(OCRRun.result_metric_id.in_(rm_ids)))
                await session.execute(delete(ResultMetric).where(ResultMetric.id.in_(rm_ids)))
            await session.execute(delete(Result).where(Result.id.in_(res_ids)))
            await session.commit()

        # 3. Load all images
        stmt_images = select(SourceImage).join(Configuration).where(Configuration.project_id == project_id)
        images = (await session.execute(stmt_images)).scalars().all()
        total = len(images)

        # 4. Parse each image
        for i, img in enumerate(images):
            if progress_callback:
                progress_callback(i + 1, total, img.file_name)

            cv_img = ImagePreprocessor.load_image(img.file_path)
            if cv_img is None:
                continue

            extraction = parser_registry.parse_image(cv_img, img.file_name)
            b_id = extraction.benchmark_id

            stmt_b = select(Benchmark).where(Benchmark.id == b_id)
            b_db = (await session.execute(stmt_b)).scalar_one_or_none()
            if not b_db:
                b_db = Benchmark(
                    id=b_id,
                    name=extraction.detected_benchmark_name or b_id,
                    version="1.0",
                    parser_id=extraction.parser_id
                )
                session.add(b_db)
                await session.flush()

            res_record = Result(
                project_id=project_id,
                configuration_id=img.configuration_id,
                benchmark_id=b_id,
                source_image_id=img.id,
                parser_id=extraction.parser_id,
                parser_version=extraction.parser_version,
                overall_confidence=extraction.overall_confidence,
                status=extraction.status
            )
            session.add(res_record)
            await session.flush()

            for m_id, m_res in extraction.metrics.items():
                stmt_bm = select(BenchmarkMetric).where(
                    BenchmarkMetric.id == m_id,
                    BenchmarkMetric.benchmark_id == b_id
                )
                bm_db = (await session.execute(stmt_bm)).scalar_one_or_none()
                if not bm_db:
                    bm_db = BenchmarkMetric(
                        id=m_id,
                        benchmark_id=b_id,
                        name=m_id.replace('_', ' ').title(),
                        display_name=m_id.replace('_', ' ').title(),
                        unit=m_res.unit
                    )
                    session.add(bm_db)
                    await session.flush()

                rm_record = ResultMetric(
                    result_id=res_record.id,
                    metric_id=m_id,
                    benchmark_id=b_id,
                    raw_ocr_value=m_res.raw_text,
                    normalized_value=m_res.normalized_value,
                    confidence=m_res.confidence,
                    ocr_region_json=json.dumps(m_res.ocr_region) if m_res.ocr_region else None
                )
                session.add(rm_record)
                await session.flush()

                session.add(OCRRun(
                    result_metric_id=rm_record.id,
                    raw_text=m_res.raw_text,
                    confidence=m_res.confidence,
                    region_json=json.dumps(m_res.ocr_region) if m_res.ocr_region else None
                ))

            if (i + 1) % 10 == 0 or (i + 1) == total:
                await session.commit()

        await session.commit()
        return total
