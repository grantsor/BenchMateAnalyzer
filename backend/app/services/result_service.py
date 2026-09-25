import json
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.grouper import BenchmarkGrouper, GroupedBenchmarkDataset, GroupedConfigurationRow, GroupedMetricValue
from app.db.models import Benchmark, BenchmarkMetric, Configuration, ManualOverride, Project, Result, ResultMetric, SourceImage
from app.ocr.engine import ocr_engine
from app.ocr.preprocessor import ImagePreprocessor
from app.parsers.registry import parser_registry

class ResultService:
    @staticmethod
    async def get_project_results_grouped(
        session: AsyncSession,
        project_id: str,
        benchmark_id: Optional[str] = None,
        aggregation: str = "best",
        baseline_config_id: Optional[str] = None,
        scope: str = "project",
        category: Optional[str] = None
    ) -> List[GroupedBenchmarkDataset]:
        current_proj = (await session.execute(select(Project).where(Project.id == project_id))).scalars().first()
        proj_map: Dict[str, Project] = {}
        if current_proj:
            proj_map[current_proj.id] = current_proj

        if scope in ("all", "category", "cross_project"):
            if scope == "category" and current_proj and current_proj.product_category:
                stmt_p = select(Project).where(Project.product_category == current_proj.product_category)
            elif category and category != "all":
                stmt_p = select(Project).where(Project.product_category == category)
            else:
                stmt_p = select(Project)
            all_projects = (await session.execute(stmt_p)).scalars().all()
            for p in all_projects:
                proj_map[p.id] = p

        target_project_ids = list(proj_map.keys()) if proj_map else [project_id]

        # 1. Load configurations
        stmt_cfg = select(Configuration).where(
            Configuration.project_id.in_(target_project_ids)
        ).order_by(Configuration.sort_order.asc(), Configuration.display_name.asc())
        configs = (await session.execute(stmt_cfg)).scalars().all()
        config_map = {c.id: c for c in configs}

        # 2. Query results
        stmt_res = select(Result).options(
            selectinload(Result.metrics).selectinload(ResultMetric.metric_definition),
            selectinload(Result.source_image),
            selectinload(Result.benchmark).selectinload(Benchmark.metrics)
        ).where(Result.project_id.in_(target_project_ids))

        if benchmark_id:
            if benchmark_id == "arithmetic_benchmark":
                stmt_res = stmt_res.where(Result.benchmark_id.in_(["superpi_benchmark", "wprime_benchmark"]))
            elif benchmark_id == "threedmark_speedway_steelnomad":
                stmt_res = stmt_res.where(Result.benchmark_id.in_(["threedmark_speedway", "threedmark_steelnomad"]))
            elif benchmark_id == "threedmark_pcmark_storage":
                stmt_res = stmt_res.where(Result.benchmark_id.in_(["threedmark_storage", "pcmark10_quick_system_drive", "pcmark10_data_drive"]))
            else:
                stmt_res = stmt_res.where(Result.benchmark_id == benchmark_id)

        results = (await session.execute(stmt_res)).scalars().all()

        # Group results by benchmark_id -> config_id -> metric_id -> list of metric records
        bench_grouped: Dict[str, Dict[str, Dict[str, List[ResultMetric]]]] = {}
        bench_meta: Dict[str, Benchmark] = {}

        for r in results:
            if r.status == "ignored":
                continue

            b_id = r.benchmark_id
            c_id = r.configuration_id
            if b_id not in bench_grouped:
                bench_grouped[b_id] = {}
                bench_meta[b_id] = r.benchmark

            if c_id not in bench_grouped[b_id]:
                bench_grouped[b_id][c_id] = {}

            b_model = bench_meta[b_id]
            valid_metric_ids = {m.id for m in b_model.metrics} if b_model and b_model.metrics else None

            for rm in r.metrics:
                if valid_metric_ids is not None:
                    if rm.metric_id not in valid_metric_ids:
                        continue
                else:
                    if rm.benchmark_id != b_id and rm.benchmark_id != "unknown":
                        continue

                m_id = rm.metric_id
                if m_id not in bench_grouped[b_id][c_id]:
                    bench_grouped[b_id][c_id][m_id] = []
                bench_grouped[b_id][c_id][m_id].append(rm)

        # Build GroupedBenchmarkDataset
        datasets: List[GroupedBenchmarkDataset] = []

        # Identifiers that are merged into composite benchmarks
        composite_source_benchmarks = {
            "superpi_benchmark",
            "wprime_benchmark",
            "threedmark_speedway",
            "threedmark_steelnomad"
        }

        # 1. Synthesize 'Arithmetic Benchmark' (SuperPI 32M + wPrime 1024M)
        if benchmark_id in (None, "arithmetic_benchmark"):
            if "superpi_benchmark" in bench_grouped or "wprime_benchmark" in bench_grouped:
                sp_grouped = bench_grouped.get("superpi_benchmark", {})
                wp_grouped = bench_grouped.get("wprime_benchmark", {})
                arith_rows: List[GroupedConfigurationRow] = []

                for cfg in configs:
                    c_id = cfg.id
                    if c_id not in sp_grouped and c_id not in wp_grouped:
                        continue

                    row_metrics: Dict[str, GroupedMetricValue] = {}

                    # SuperPI 32M
                    if c_id in sp_grouped:
                        sp_list = sp_grouped[c_id].get("time_seconds")
                        if not sp_list:
                            sp_list = next(iter(sp_grouped[c_id].values()), None)
                        if sp_list:
                            first_rm = sp_list[0]
                            valid_vals = [rm.normalized_value for rm in sp_list if rm.normalized_value is not None]
                            agg_val = BenchmarkGrouper.aggregate_runs(valid_vals, aggregation, False)
                            src_file = first_rm.result.source_image.file_path if (first_rm.result and first_rm.result.source_image) else None
                            row_metrics["superpi_32m"] = GroupedMetricValue(
                                metric_id="superpi_32m",
                                metric_display_name="SuperPI 32M",
                                unit="s",
                                higher_is_better=False,
                                value=agg_val,
                                raw_values=valid_vals,
                                confidence=first_rm.confidence,
                                status=first_rm.result.status if first_rm.result else "verified",
                                source_file=src_file
                            )

                    # wPrime 1024M
                    if c_id in wp_grouped:
                        wp_list = wp_grouped[c_id].get("time_1024m")
                        if not wp_list:
                            wp_list = next(iter(wp_grouped[c_id].values()), None)
                        if wp_list:
                            first_rm = wp_list[0]
                            valid_vals = [rm.normalized_value for rm in wp_list if rm.normalized_value is not None]
                            agg_val = BenchmarkGrouper.aggregate_runs(valid_vals, aggregation, False)
                            src_file = first_rm.result.source_image.file_path if (first_rm.result and first_rm.result.source_image) else None
                            row_metrics["wprime_1024m"] = GroupedMetricValue(
                                metric_id="wprime_1024m",
                                metric_display_name="wPrime 1024M",
                                unit="s",
                                higher_is_better=False,
                                value=agg_val,
                                raw_values=valid_vals,
                                confidence=first_rm.confidence,
                                status=first_rm.result.status if first_rm.result else "verified",
                                source_file=src_file
                            )

                    if row_metrics:
                        proj = proj_map.get(cfg.project_id)
                        proj_name = (proj.product_name or proj.name) if proj else ""
                        if len(target_project_ids) > 1 and proj_name and not cfg.display_name.lower().startswith(proj_name.lower()):
                            row_display = f"{proj_name} - {cfg.display_name}"
                        else:
                            row_display = cfg.display_name

                        arith_rows.append(GroupedConfigurationRow(
                            configuration_id=c_id,
                            configuration_name=cfg.folder_name,
                            display_name=row_display,
                            sort_order=cfg.sort_order,
                            is_baseline=False,
                            metrics=row_metrics,
                            project_id=cfg.project_id,
                            project_name=proj_name
                        ))

                if arith_rows:
                    BenchmarkGrouper.compute_deltas(arith_rows, baseline_config_id)
                    metric_ids = [m for m in ["superpi_32m", "wprime_1024m"] if any(m in r.metrics for r in arith_rows)]
                    datasets.append(GroupedBenchmarkDataset(
                        benchmark_id="arithmetic_benchmark",
                        benchmark_name="Arithmetic Benchmark",
                        metric_ids=metric_ids,
                        rows=arith_rows
                    ))

        # 2. Synthesize '3DMark Suite - Speedway and Steel Nomad' (Graphics Test in FPS)
        if benchmark_id in (None, "threedmark_speedway_steelnomad"):
            if "threedmark_speedway" in bench_grouped or "threedmark_steelnomad" in bench_grouped:
                sw_grouped = bench_grouped.get("threedmark_speedway", {})
                sn_grouped = bench_grouped.get("threedmark_steelnomad", {})
                tdm_rows: List[GroupedConfigurationRow] = []

                for cfg in configs:
                    c_id = cfg.id
                    if c_id not in sw_grouped and c_id not in sn_grouped:
                        continue

                    row_metrics: Dict[str, GroupedMetricValue] = {}

                    # Speed Way Graphics Test
                    if c_id in sw_grouped:
                        sw_list = sw_grouped[c_id].get("graphics_test")
                        if sw_list:
                            first_rm = sw_list[0]
                            valid_vals = [rm.normalized_value for rm in sw_list if rm.normalized_value is not None]
                            agg_val = BenchmarkGrouper.aggregate_runs(valid_vals, aggregation, True)
                            src_file = first_rm.result.source_image.file_path if (first_rm.result and first_rm.result.source_image) else None
                            row_metrics["speed_way"] = GroupedMetricValue(
                                metric_id="speed_way",
                                metric_display_name="Speed Way",
                                unit="FPS",
                                higher_is_better=True,
                                value=agg_val,
                                raw_values=valid_vals,
                                confidence=first_rm.confidence,
                                status=first_rm.result.status if first_rm.result else "verified",
                                source_file=src_file
                            )

                    # Steel Nomad Graphics Test
                    if c_id in sn_grouped:
                        sn_list = sn_grouped[c_id].get("graphics_test")
                        if sn_list:
                            first_rm = sn_list[0]
                            valid_vals = [rm.normalized_value for rm in sn_list if rm.normalized_value is not None]
                            agg_val = BenchmarkGrouper.aggregate_runs(valid_vals, aggregation, True)
                            src_file = first_rm.result.source_image.file_path if (first_rm.result and first_rm.result.source_image) else None
                            row_metrics["steel_nomad"] = GroupedMetricValue(
                                metric_id="steel_nomad",
                                metric_display_name="Steel Nomad",
                                unit="FPS",
                                higher_is_better=True,
                                value=agg_val,
                                raw_values=valid_vals,
                                confidence=first_rm.confidence,
                                status=first_rm.result.status if first_rm.result else "verified",
                                source_file=src_file
                            )

                    if row_metrics:
                        proj = proj_map.get(cfg.project_id)
                        proj_name = (proj.product_name or proj.name) if proj else ""
                        if len(target_project_ids) > 1 and proj_name and not cfg.display_name.lower().startswith(proj_name.lower()):
                            row_display = f"{proj_name} - {cfg.display_name}"
                        else:
                            row_display = cfg.display_name

                        tdm_rows.append(GroupedConfigurationRow(
                            configuration_id=c_id,
                            configuration_name=cfg.folder_name,
                            display_name=row_display,
                            sort_order=cfg.sort_order,
                            is_baseline=False,
                            metrics=row_metrics,
                            project_id=cfg.project_id,
                            project_name=proj_name
                        ))

                if tdm_rows:
                    BenchmarkGrouper.compute_deltas(tdm_rows, baseline_config_id)
                    metric_ids = [m for m in ["speed_way", "steel_nomad"] if any(m in r.metrics for r in tdm_rows)]
                    datasets.append(GroupedBenchmarkDataset(
                        benchmark_id="threedmark_speedway_steelnomad",
                        benchmark_name="3DMark Suite - Speedway and Steel Nomad",
                        metric_ids=metric_ids,
                        rows=tdm_rows
                    ))

        # 3. Synthesize '3DMark and PCMark Storage Benchmark'
        if benchmark_id in (None, "threedmark_pcmark_storage"):
            if ("threedmark_storage" in bench_grouped or 
                "pcmark10_quick_system_drive" in bench_grouped or 
                "pcmark10_data_drive" in bench_grouped):
                tdm_st_grouped = bench_grouped.get("threedmark_storage", {})
                pcm_q_grouped = bench_grouped.get("pcmark10_quick_system_drive", {})
                pcm_d_grouped = bench_grouped.get("pcmark10_data_drive", {})
                storage_rows: List[GroupedConfigurationRow] = []

                for cfg in configs:
                    c_id = cfg.id
                    if (c_id not in tdm_st_grouped and 
                        c_id not in pcm_q_grouped and 
                        c_id not in pcm_d_grouped):
                        continue

                    row_metrics: Dict[str, GroupedMetricValue] = {}

                    def _pull_metric(src_grouped, raw_metric_id, target_metric_id, disp_name, unit, hib):
                        if c_id in src_grouped:
                            m_list = src_grouped[c_id].get(raw_metric_id)
                            if m_list:
                                first_rm = m_list[0]
                                valid_vals = [rm.normalized_value for rm in m_list if rm.normalized_value is not None]
                                agg_val = BenchmarkGrouper.aggregate_runs(valid_vals, aggregation, hib)
                                src_file = first_rm.result.source_image.file_path if (first_rm.result and first_rm.result.source_image) else None
                                row_metrics[target_metric_id] = GroupedMetricValue(
                                    metric_id=target_metric_id,
                                    metric_display_name=disp_name,
                                    unit=unit,
                                    higher_is_better=hib,
                                    value=agg_val,
                                    raw_values=valid_vals,
                                    confidence=first_rm.confidence,
                                    status=first_rm.result.status if first_rm.result else "verified",
                                    source_file=src_file
                                )

                    # Bandwidth
                    _pull_metric(tdm_st_grouped, "bandwidth", "tdm_bandwidth", "3DMark Storage Bandwidth", "MB/s", True)
                    _pull_metric(pcm_q_grouped, "bandwidth", "pcm_quick_bandwidth", "PCM10 Quick System Bandwidth", "MB/s", True)
                    _pull_metric(pcm_d_grouped, "bandwidth", "pcm_data_bandwidth", "PCM10 Data Drive Bandwidth", "MB/s", True)

                    # Access Time
                    _pull_metric(tdm_st_grouped, "average_access_time", "tdm_access_time", "3DMark Storage Access Time", "µs", False)
                    _pull_metric(pcm_q_grouped, "access_time", "pcm_quick_access_time", "PCM10 Quick System Access Time", "µs", False)
                    _pull_metric(pcm_d_grouped, "access_time", "pcm_data_access_time", "PCM10 Data Drive Access Time", "µs", False)

                    # Scores
                    _pull_metric(tdm_st_grouped, "storage_score", "tdm_score", "3DMark Storage Score", "pts", True)
                    _pull_metric(pcm_q_grouped, "score", "pcm_quick_score", "PCM10 Quick System Score", "pts", True)
                    _pull_metric(pcm_d_grouped, "score", "pcm_data_score", "PCM10 Data Drive Score", "pts", True)

                    if row_metrics:
                        proj = proj_map.get(cfg.project_id)
                        proj_name = (proj.product_name or proj.name) if proj else ""
                        if len(target_project_ids) > 1 and proj_name and not cfg.display_name.lower().startswith(proj_name.lower()):
                            row_display = f"{proj_name} - {cfg.display_name}"
                        else:
                            row_display = cfg.display_name

                        storage_rows.append(GroupedConfigurationRow(
                            configuration_id=c_id,
                            configuration_name=cfg.folder_name,
                            display_name=row_display,
                            sort_order=cfg.sort_order,
                            is_baseline=False,
                            metrics=row_metrics,
                            project_id=cfg.project_id,
                            project_name=proj_name
                        ))

                if storage_rows:
                    BenchmarkGrouper.compute_deltas(storage_rows, baseline_config_id)
                    all_metric_keys = [
                        "tdm_bandwidth", "pcm_quick_bandwidth", "pcm_data_bandwidth",
                        "tdm_access_time", "pcm_quick_access_time", "pcm_data_access_time",
                        "tdm_score", "pcm_quick_score", "pcm_data_score"
                    ]
                    metric_ids = [m for m in all_metric_keys if any(m in r.metrics for r in storage_rows)]
                    datasets.append(GroupedBenchmarkDataset(
                        benchmark_id="threedmark_pcmark_storage",
                        benchmark_name="3DMark and PCMark Storage Benchmark",
                        metric_ids=metric_ids,
                        rows=storage_rows
                    ))

        # 4. Standard Individual Benchmarks
        for b_id, c_data in bench_grouped.items():
            # If returning all datasets, omit the benchmarks merged into composite graphs
            if benchmark_id is None and b_id in composite_source_benchmarks:
                continue

            b_model = bench_meta[b_id]
            all_metric_ids = [m.id for m in b_model.metrics] if b_model and b_model.metrics else []
            rows: List[GroupedConfigurationRow] = []

            for cfg in configs:
                c_id = cfg.id
                if c_id not in c_data:
                    continue

                row_metrics: Dict[str, GroupedMetricValue] = {}
                for m_id, rm_list in c_data[c_id].items():
                    first_rm = rm_list[0]
                    bm_def = first_rm.metric_definition
                    unit = bm_def.unit if bm_def else "score"
                    hib = bm_def.higher_is_better if bm_def else True
                    m_disp = bm_def.display_name if bm_def else m_id

                    valid_vals = [rm.normalized_value for rm in rm_list if rm.normalized_value is not None]
                    agg_val = BenchmarkGrouper.aggregate_runs(valid_vals, aggregation, hib)

                    src_file = None
                    if first_rm.result and first_rm.result.source_image:
                        src_file = first_rm.result.source_image.file_path

                    row_metrics[m_id] = GroupedMetricValue(
                        metric_id=m_id,
                        metric_display_name=m_disp,
                        unit=unit,
                        higher_is_better=hib,
                        value=agg_val,
                        raw_values=valid_vals,
                        confidence=first_rm.confidence,
                        status=first_rm.result.status if first_rm.result else "verified",
                        source_file=src_file
                    )

                proj = proj_map.get(cfg.project_id)
                proj_name = (proj.product_name or proj.name) if proj else ""

                if len(target_project_ids) > 1 and proj_name and not cfg.display_name.lower().startswith(proj_name.lower()):
                    row_display = f"{proj_name} - {cfg.display_name}"
                else:
                    row_display = cfg.display_name

                rows.append(GroupedConfigurationRow(
                    configuration_id=c_id,
                    configuration_name=cfg.folder_name,
                    display_name=row_display,
                    sort_order=cfg.sort_order,
                    is_baseline=False,
                    metrics=row_metrics,
                    project_id=cfg.project_id,
                    project_name=proj_name
                ))

            # Compute deltas vs baseline
            BenchmarkGrouper.compute_deltas(rows, baseline_config_id)

            # Ensure all metrics actually present in rows are included
            row_metric_keys = [m_k for r in rows for m_k in r.metrics.keys()]
            combined_metric_ids = list(dict.fromkeys(all_metric_ids + row_metric_keys))

            datasets.append(GroupedBenchmarkDataset(
                benchmark_id=b_id,
                benchmark_name=b_model.name if b_model else b_id,
                metric_ids=combined_metric_ids,
                rows=rows
            ))

        datasets.sort(key=lambda d: d.benchmark_name.lower())
        return datasets

    @staticmethod
    async def update_metric_value(
        session: AsyncSession,
        result_metric_id: str,
        new_value: float,
        reason: Optional[str] = "Manual correction"
    ) -> Optional[ResultMetric]:
        stmt = select(ResultMetric).options(
            selectinload(ResultMetric.result).selectinload(Result.metrics),
            selectinload(ResultMetric.result).selectinload(Result.configuration),
            selectinload(ResultMetric.metric_definition)
        ).where(ResultMetric.id == result_metric_id)
        rm = (await session.execute(stmt)).scalar_one_or_none()
        if not rm:
            return None

        # Record manual override
        override = ManualOverride(
            result_metric_id=rm.id,
            original_value=rm.normalized_value,
            corrected_value=new_value,
            reason=reason
        )
        session.add(override)

        # Update metric
        rm.normalized_value = new_value
        rm.confidence = 1.0  # Manually verified by user
        if rm.result:
            rm.result.status = "manual_override"
            if rm.result.metrics:
                rm.result.overall_confidence = sum(m.confidence for m in rm.result.metrics) / len(rm.result.metrics)
            else:
                rm.result.overall_confidence = 1.0

            # Also auto-sync to SSD Database
            if rm.result.configuration:
                try:
                    from app.services.ssd_database_service import SSDDatabaseService
                    cfg = rm.result.configuration
                    model_name = cfg.display_name or cfg.folder_name
                    if model_name:
                        model = await SSDDatabaseService.upsert_model(session, model_name=model_name)
                        unit = rm.metric_definition.unit if rm.metric_definition else getattr(rm, "unit", "MB/s")
                        await SSDDatabaseService.update_score(
                            session=session,
                            model_id=model.id,
                            benchmark_id=rm.benchmark_id,
                            metric_id=rm.metric_id,
                            value=new_value,
                            unit=unit,
                            is_manual=True
                        )
                except Exception as e:
                    print(f"Warning: SSD database sync on metric override failed: {e}")

        await session.commit()
        await session.refresh(rm)
        return rm

    @staticmethod
    async def update_result_status(
        session: AsyncSession,
        result_id: str,
        status: str
    ) -> Optional[Result]:
        stmt = select(Result).options(
            selectinload(Result.metrics).selectinload(ResultMetric.metric_definition),
            selectinload(Result.configuration),
            selectinload(Result.source_image)
        ).where(Result.id == result_id)
        res = (await session.execute(stmt)).scalar_one_or_none()
        if not res:
            return None

        res.status = status
        if status == "verified":
            res.overall_confidence = 1.0
            for rm in res.metrics:
                rm.confidence = 1.0
        elif status == "needs_review":
            if res.metrics:
                res.overall_confidence = min(0.75, sum(m.confidence for m in res.metrics) / len(res.metrics))
            else:
                res.overall_confidence = 0.75

        # Auto-sync verified results to SSD Database if applicable
        if status in ("verified", "manual_override") and res.configuration:
            try:
                from app.services.ssd_database_service import SSDDatabaseService
                cfg = res.configuration
                model_name = cfg.display_name or cfg.folder_name
                if model_name:
                    model = await SSDDatabaseService.upsert_model(session, model_name=model_name)
                    for rm in res.metrics:
                        if rm.normalized_value is not None:
                            unit = rm.metric_definition.unit if rm.metric_definition else getattr(rm, "unit", "MB/s")
                            await SSDDatabaseService.update_score(
                                session=session,
                                model_id=model.id,
                                benchmark_id=res.benchmark_id,
                                metric_id=rm.metric_id,
                                value=rm.normalized_value,
                                unit=unit,
                                is_manual=True,
                                source_file=res.source_image.file_name if res.source_image else None
                            )
            except Exception as e:
                print(f"Warning: SSD database sync on status update failed: {e}")

        await session.commit()
        await session.refresh(res)
        return res

    @staticmethod
    async def reprocess_result(
        session: AsyncSession,
        result_id: str
    ) -> Optional[Result]:
        stmt = select(Result).options(
            selectinload(Result.source_image),
            selectinload(Result.metrics)
        ).where(Result.id == result_id)
        res = (await session.execute(stmt)).scalar_one_or_none()
        if not res or not res.source_image:
            return None

        cv_img = ImagePreprocessor.load_image(res.source_image.file_path)
        if cv_img is None:
            return None

        extraction = parser_registry.parse_image(cv_img, res.source_image.file_name)

        # Update result
        res.overall_confidence = extraction.overall_confidence
        res.status = extraction.status

        # Prune any old metrics that are no longer part of the reprocessed extraction
        new_metric_ids = set(extraction.metrics.keys())
        for m in list(res.metrics):
            if m.metric_id not in new_metric_ids:
                await session.delete(m)

        # Update or add metrics
        existing_metrics = {m.metric_id: m for m in res.metrics if m.metric_id in new_metric_ids}
        for m_id, m_res in extraction.metrics.items():
            if m_id in existing_metrics:
                em = existing_metrics[m_id]
                em.raw_ocr_value = m_res.raw_text
                em.normalized_value = m_res.normalized_value
                em.confidence = m_res.confidence
                em.ocr_region_json = json.dumps(m_res.ocr_region) if m_res.ocr_region else None
            else:
                new_m = ResultMetric(
                    result_id=res.id,
                    metric_id=m_id,
                    benchmark_id=res.benchmark_id,
                    raw_ocr_value=m_res.raw_text,
                    normalized_value=m_res.normalized_value,
                    confidence=m_res.confidence,
                    ocr_region_json=json.dumps(m_res.ocr_region) if m_res.ocr_region else None
                )
                session.add(new_m)

        await session.commit()
        await session.refresh(res)
        return res

    @staticmethod
    async def reassign_benchmark(
        session: AsyncSession,
        result_id: str,
        new_benchmark_id: str,
        reparse: bool = True
    ) -> Optional[Result]:
        from app.core.identifier import benchmark_identifier
        from app.db.models import OCRRun

        stmt = select(Result).options(
            selectinload(Result.source_image),
            selectinload(Result.metrics)
        ).where(Result.id == result_id)
        res = (await session.execute(stmt)).scalar_one_or_none()
        if not res:
            return None

        # Ensure benchmark exists in DB
        stmt_b = select(Benchmark).where(Benchmark.id == new_benchmark_id)
        b_db = (await session.execute(stmt_b)).scalar_one_or_none()
        if not b_db:
            b_def = benchmark_identifier.benchmarks.get(new_benchmark_id)
            b_name = b_def.name if b_def else new_benchmark_id.replace("_", " ").title()
            b_cat = b_def.category if b_def else "General"
            b_parser = b_def.parser_id if b_def else "generic_parser"
            b_db = Benchmark(
                id=new_benchmark_id,
                name=b_name,
                version="1.0",
                category=b_cat,
                parser_id=b_parser
            )
            session.add(b_db)
            await session.flush()

        res.benchmark_id = new_benchmark_id

        if reparse and res.source_image:
            cv_img = ImagePreprocessor.load_image(res.source_image.file_path)
            if cv_img is not None:
                extraction = parser_registry.parse_image(
                    cv_img,
                    res.source_image.file_name,
                    forced_benchmark_id=new_benchmark_id
                )
                res.parser_id = extraction.parser_id
                res.parser_version = extraction.parser_version
                res.overall_confidence = extraction.overall_confidence
                res.status = "verified" if extraction.overall_confidence >= 0.70 else "needs_review"

                # Delete old metrics
                for m in list(res.metrics):
                    await session.delete(m)
                res.metrics = []
                await session.flush()

                # Add newly extracted metrics
                for m_id, m_res in extraction.metrics.items():
                    # Ensure BenchmarkMetric exists
                    stmt_bm = select(BenchmarkMetric).where(
                        BenchmarkMetric.id == m_id,
                        BenchmarkMetric.benchmark_id == new_benchmark_id
                    )
                    bm_db = (await session.execute(stmt_bm)).scalar_one_or_none()
                    if not bm_db:
                        b_def = benchmark_identifier.benchmarks.get(new_benchmark_id)
                        m_def = next((m for m in (b_def.metrics if b_def else []) if m.get("id") == m_id), None)
                        disp_name = m_def.get("display_name") if m_def else m_id.replace('_', ' ').title()
                        u = m_def.get("unit") if m_def else m_res.unit
                        hib = m_def.get("higher_is_better", True) if m_def else True
                        bm_db = BenchmarkMetric(
                            id=m_id,
                            benchmark_id=new_benchmark_id,
                            name=disp_name,
                            display_name=disp_name,
                            unit=u,
                            higher_is_better=hib
                        )
                        session.add(bm_db)
                        await session.flush()

                    new_m = ResultMetric(
                        result_id=res.id,
                        metric_id=m_id,
                        benchmark_id=new_benchmark_id,
                        raw_ocr_value=m_res.raw_text,
                        normalized_value=m_res.normalized_value,
                        confidence=m_res.confidence,
                        ocr_region_json=json.dumps(m_res.ocr_region) if m_res.ocr_region else None
                    )
                    session.add(new_m)
                    res.metrics.append(new_m)
                    await session.flush()

                    ocr_run = OCRRun(
                        result_metric_id=new_m.id,
                        raw_text=m_res.raw_text,
                        confidence=m_res.confidence,
                        region_json=json.dumps(m_res.ocr_region) if m_res.ocr_region else None
                    )
                    session.add(ocr_run)

        await session.commit()
        
        stmt_reload = select(Result).options(
            selectinload(Result.source_image),
            selectinload(Result.configuration),
            selectinload(Result.benchmark).selectinload(Benchmark.metrics),
            selectinload(Result.metrics).selectinload(ResultMetric.metric_definition),
            selectinload(Result.metrics).selectinload(ResultMetric.manual_overrides)
        ).where(Result.id == result_id)
        res_reloaded = (await session.execute(stmt_reload)).scalar_one_or_none()
        return res_reloaded or res
