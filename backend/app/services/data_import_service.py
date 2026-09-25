import csv
import io
import json
import re
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.identifier import benchmark_identifier
from app.db.models import Benchmark, BenchmarkMetric, Configuration, Project, Result, ResultMetric
from app.services.import_service import ImportService

def slugify(text: str) -> str:
    s = text.lower().strip()
    s = re.sub(r'[^\w\s-]', '', s)
    s = re.sub(r'[\s_-]+', '_', s)
    return s.strip('_') or "metric"

def parse_numeric_score(val: Any) -> Optional[float]:
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip().replace(',', '').replace(' ', '')
    try:
        return float(s)
    except (ValueError, TypeError):
        return None

class DataImportService:
    @staticmethod
    async def import_file(
        session: AsyncSession,
        filename: str,
        content: bytes,
        project_name_override: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Detects whether content is JSON or CSV and routes to the proper importer.
        """
        await ImportService.ensure_benchmarks_loaded(session)
        text = content.decode("utf-8", errors="replace").strip()

        # Try parsing as JSON first
        if filename.lower().endswith(".json") or (text.startswith("{") and text.endswith("}")):
            try:
                data = json.loads(text)
                if isinstance(data, dict):
                    return await DataImportService.import_json_data(session, data, project_name_override)
            except Exception as e:
                # If json fails, fall back to csv only if filename is not strictly .json
                if filename.lower().endswith(".json"):
                    raise ValueError(f"Invalid JSON file format: {str(e)}")

        # Otherwise parse as CSV
        return await DataImportService.import_csv_data(session, text, filename, project_name_override)

    @staticmethod
    async def import_json_data(
        session: AsyncSession,
        data: Dict[str, Any],
        project_name_override: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Restores full project hierarchy from a JSON backup.
        """
        proj_name = project_name_override or data.get("product_name") or data.get("name") or "Imported Benchmark Backup"
        prod_name = data.get("product_name") or proj_name
        prod_category = data.get("product_category") or "Laptop"
        specs = data.get("specs", {})

        project = Project(
            name=proj_name,
            product_name=prod_name,
            product_category=prod_category,
            cpu=specs.get("cpu"),
            gpu=specs.get("gpu"),
            motherboard=specs.get("motherboard"),
            ram=specs.get("ram"),
            storage=specs.get("storage"),
            os=specs.get("os"),
            bios_version=specs.get("bios"),
            driver_version=specs.get("driver"),
            reviewer=data.get("reviewer"),
            notes=data.get("notes") or f"Restored from JSON backup.",
            root_folder_path=data.get("root_folder_path")
        )
        session.add(project)
        await session.flush()

        # Build Configurations
        config_map: Dict[str, Configuration] = {} # keyed by id or name
        raw_configs = data.get("configurations", [])
        for idx, c in enumerate(raw_configs):
            folder_name = c.get("folder_name") or c.get("display_name") or f"Config_{idx+1}"
            display_name = c.get("display_name") or folder_name
            db_cfg = Configuration(
                project_id=project.id,
                folder_name=folder_name,
                display_name=display_name,
                sort_order=c.get("sort_order", idx)
            )
            session.add(db_cfg)
            await session.flush()
            if c.get("id"):
                config_map[c["id"]] = db_cfg
            config_map[folder_name.lower()] = db_cfg
            config_map[display_name.lower()] = db_cfg

        # Build Results and Metrics
        raw_results = data.get("results", [])
        created_results_count = 0
        created_metrics_count = 0

        for r in raw_results:
            cfg_id = r.get("configuration_id")
            cfg_name = r.get("configuration_name")
            target_cfg = None
            if cfg_id and cfg_id in config_map:
                target_cfg = config_map[cfg_id]
            elif cfg_name and cfg_name.lower() in config_map:
                target_cfg = config_map[cfg_name.lower()]
            elif config_map:
                target_cfg = next(iter(config_map.values()))

            if not target_cfg:
                target_cfg = Configuration(
                    project_id=project.id,
                    folder_name=cfg_name or "Default",
                    display_name=cfg_name or "Default",
                    sort_order=len(config_map)
                )
                session.add(target_cfg)
                await session.flush()
                config_map[(cfg_name or "default").lower()] = target_cfg

            bench_id = r.get("benchmark_id")
            bench_name = r.get("benchmark_name") or bench_id or "Custom Benchmark"
            bench_id = DataImportService._resolve_benchmark_id(bench_id, bench_name)

            # Ensure benchmark exists in DB
            await DataImportService._ensure_benchmark_entry(session, bench_id, bench_name, prod_category)

            db_result = Result(
                project_id=project.id,
                configuration_id=target_cfg.id,
                benchmark_id=bench_id,
                parser_id="backup_import",
                overall_confidence=r.get("confidence", 1.0),
                status=r.get("status", "verified")
            )
            session.add(db_result)
            await session.flush()
            created_results_count += 1

            for m in r.get("metrics", []):
                metric_id = m.get("metric_id") or slugify(m.get("name") or "score")
                raw_val = str(m.get("raw_text", m.get("normalized_value", "")))
                norm_val = parse_numeric_score(m.get("normalized_value", m.get("raw_text")))

                # Ensure metric definition exists
                await DataImportService._ensure_metric_entry(
                    session,
                    bench_id=bench_id,
                    metric_id=metric_id,
                    name=m.get("name") or metric_id,
                    display_name=m.get("display_name") or m.get("name") or metric_id,
                    unit=m.get("unit", "score"),
                    higher_is_better=m.get("higher_is_better", True)
                )

                db_metric = ResultMetric(
                    result_id=db_result.id,
                    metric_id=metric_id,
                    benchmark_id=bench_id,
                    raw_ocr_value=raw_val,
                    normalized_value=norm_val,
                    confidence=m.get("confidence", 1.0)
                )
                session.add(db_metric)
                created_metrics_count += 1

        await session.commit()
        await session.refresh(project)

        return {
            "success": True,
            "project_id": project.id,
            "project_name": project.name,
            "product_name": project.product_name,
            "product_category": project.product_category,
            "configuration_count": len({cfg.id for cfg in config_map.values()}),
            "result_count": created_results_count,
            "metric_count": created_metrics_count,
            "format": "json"
        }

    @staticmethod
    async def import_csv_data(
        session: AsyncSession,
        csv_text: str,
        filename: str = "import.csv",
        project_name_override: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Parses CSV data, supports:
        - New format: Product,Category,Benchmark,Configuration,Metric,Score,Unit,Source
        - Legacy format: Benchmark,Configuration,Metric,Score,Unit,Source
        - Varied header names (Model, Device, Test, Profile, etc.)
        """
        f = io.StringIO(csv_text.strip())
        reader = csv.reader(f)
        header = next(reader, None)
        if not header:
            raise ValueError("The provided CSV file is empty.")

        # Normalize header keys
        header_map = {}
        for idx, col in enumerate(header):
            clean = col.lower().strip().replace(' ', '_').replace('/', '_')
            header_map[clean] = idx

        def get_field(row: List[str], keys: List[str], default: str = "") -> str:
            for k in keys:
                if k in header_map and header_map[k] < len(row):
                    val = row[header_map[k]].strip()
                    if val:
                        return val
            return default

        rows = list(reader)
        if not rows:
            raise ValueError("CSV contains a header but no data rows.")

        # Determine Product Name & Category
        detected_prod = None
        detected_cat = None
        for r in rows:
            p = get_field(r, ["product", "product_model", "model", "product_name", "device"])
            c = get_field(r, ["category", "product_category", "type", "hardware_type"])
            if p and not detected_prod:
                detected_prod = p
            if c and not detected_cat:
                detected_cat = c
            if detected_prod and detected_cat:
                break

        inferred_name = project_name_override or detected_prod or filename.rsplit('.', 1)[0].replace('_', ' ')
        inferred_category = detected_cat or "Laptop"

        project = Project(
            name=inferred_name,
            product_name=detected_prod or inferred_name,
            product_category=inferred_category,
            notes=f"Imported from CSV file: {filename}"
        )
        session.add(project)
        await session.flush()

        # Group rows by Configuration and Benchmark
        # config_name -> Configuration
        config_map: Dict[str, Configuration] = {}
        # (cfg_name, bench_name) -> Result
        result_map: Dict[tuple, Result] = {}

        created_results_count = 0
        created_metrics_count = 0

        for r in rows:
            bench_name = get_field(r, ["benchmark", "benchmark_name", "test", "benchmark_id"], "Benchmark")
            cfg_name = get_field(r, ["configuration", "config", "profile", "configuration_display_name"], "Default")
            metric_name = get_field(r, ["metric", "metric_name", "subtest"], "Score")
            score_str = get_field(r, ["score", "result", "normalized_value", "value"], "")
            unit = get_field(r, ["unit"], "")
            source_path = get_field(r, ["source", "source_file", "image"], "")

            # 1. Configuration
            cfg_key = cfg_name.strip()
            if cfg_key.lower() not in config_map:
                sort_idx = len(config_map)
                db_cfg = Configuration(
                    project_id=project.id,
                    folder_name=cfg_key,
                    display_name=cfg_key,
                    sort_order=sort_idx
                )
                session.add(db_cfg)
                await session.flush()
                config_map[cfg_key.lower()] = db_cfg

            target_cfg = config_map[cfg_key.lower()]

            # 2. Benchmark
            bench_id = DataImportService._resolve_benchmark_id(None, bench_name)
            await DataImportService._ensure_benchmark_entry(session, bench_id, bench_name, inferred_category)

            # 3. Result
            res_key = (target_cfg.id, bench_id)
            if res_key not in result_map:
                db_result = Result(
                    project_id=project.id,
                    configuration_id=target_cfg.id,
                    benchmark_id=bench_id,
                    parser_id="csv_import",
                    overall_confidence=1.0,
                    status="verified"
                )
                session.add(db_result)
                await session.flush()
                result_map[res_key] = db_result
                created_results_count += 1

            target_result = result_map[res_key]

            # 4. Metric
            metric_id = slugify(metric_name)
            numeric_score = parse_numeric_score(score_str)

            # Detect lower is better if time/seconds
            is_lower_better = any(kw in metric_name.lower() or kw in unit.lower() for kw in ["time", "seconds", "sec", "latenc"])

            await DataImportService._ensure_metric_entry(
                session,
                bench_id=bench_id,
                metric_id=metric_id,
                name=metric_name,
                display_name=metric_name,
                unit=unit or "pts",
                higher_is_better=(not is_lower_better)
            )

            db_metric = ResultMetric(
                result_id=target_result.id,
                metric_id=metric_id,
                benchmark_id=bench_id,
                raw_ocr_value=score_str,
                normalized_value=numeric_score,
                confidence=1.0
            )
            session.add(db_metric)
            created_metrics_count += 1

        await session.commit()
        await session.refresh(project)

        return {
            "success": True,
            "project_id": project.id,
            "project_name": project.name,
            "product_name": project.product_name,
            "product_category": project.product_category,
            "configuration_count": len({cfg.id for cfg in config_map.values()}),
            "result_count": created_results_count,
            "metric_count": created_metrics_count,
            "format": "csv"
        }

    @staticmethod
    def _resolve_benchmark_id(raw_id: Optional[str], bench_name: str) -> str:
        """
        Maps names like 'Geekbench 6', 'Cinebench 2026', 'Blender Benchmark' to canonical IDs.
        """
        if raw_id and raw_id in benchmark_identifier.benchmarks:
            return raw_id

        name_lower = bench_name.lower()
        if "cinebench" in name_lower:
            if "2026" in name_lower or "r26" in name_lower:
                return "cinebench_r26"
            elif "2024" in name_lower or "r24" in name_lower:
                return "cinebench_2024"
            elif "r23" in name_lower:
                return "cinebench_r23"
            return "cinebench_r26"
        elif "geekbench ai" in name_lower or "gbai" in name_lower:
            return "geekbench_ai"
        elif "geekbench" in name_lower or "gb6" in name_lower:
            return "geekbench6"
        elif "blender" in name_lower:
            return "blender"
        elif "corona" in name_lower:
            return "corona"
        elif "pcmark" in name_lower or "pcm10" in name_lower:
            return "pcmark10"
        elif "super pi" in name_lower or "superpi" in name_lower:
            return "superpi"
        elif "v-ray" in name_lower or "vray" in name_lower:
            return "vray"
        elif "wprime" in name_lower:
            return "wprime"
        elif "octane" in name_lower:
            return "octane"
        elif "occt" in name_lower:
            if "storage" in name_lower or "disk" in name_lower or "ssd" in name_lower:
                return "occt_storage"
            return "occt_benchmark"
        elif "3dmark" in name_lower or "time spy" in name_lower:
            return "threedmark"
        elif "crystaldisk" in name_lower or "cdm" in name_lower:
            return "crystaldiskmark"

        return raw_id or slugify(bench_name)

    @staticmethod
    async def _ensure_benchmark_entry(session: AsyncSession, bench_id: str, bench_name: str, category: str):
        stmt = select(Benchmark).where(Benchmark.id == bench_id)
        existing = (await session.execute(stmt)).scalar_one_or_none()
        if not existing:
            b_def = benchmark_identifier.benchmarks.get(bench_id)
            new_b = Benchmark(
                id=bench_id,
                name=b_def.name if b_def else bench_name,
                version=b_def.version if b_def else "1.0",
                category=b_def.category if b_def else category,
                file_patterns_json="[]",
                parser_id="generic"
            )
            session.add(new_b)
            await session.flush()

    @staticmethod
    async def _ensure_metric_entry(
        session: AsyncSession,
        bench_id: str,
        metric_id: str,
        name: str,
        display_name: str,
        unit: str,
        higher_is_better: bool = True
    ):
        stmt = select(BenchmarkMetric).where(
            BenchmarkMetric.benchmark_id == bench_id,
            BenchmarkMetric.id == metric_id
        )
        existing = (await session.execute(stmt)).scalar_one_or_none()
        if not existing:
            new_m = BenchmarkMetric(
                id=metric_id,
                benchmark_id=bench_id,
                name=name,
                display_name=display_name,
                unit=unit,
                higher_is_better=higher_is_better,
                decimal_places=2 if ("." in str(unit) or "s" in unit) else 0,
                sort_order=0
            )
            session.add(new_m)
            await session.flush()
