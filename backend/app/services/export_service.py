import csv
import io
from typing import Any, Dict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.db.models import Configuration, Project, Result, ResultMetric, SourceImage

class ExportService:
    @staticmethod
    async def export_project_to_csv(session: AsyncSession, project_id: str) -> str:
        """
        Generates CSV format with full product and source traceability:
        Product,Category,Benchmark,Configuration,Metric,Score,Unit,Source
        """
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Product", "Category", "Benchmark", "Configuration", "Metric", "Score", "Unit", "Source"])

        stmt_p = select(Project).where(Project.id == project_id)
        proj = (await session.execute(stmt_p)).scalar_one_or_none()
        prod_name = (proj.product_name or proj.name) if proj else "Unknown Product"
        category = (proj.product_category or "Laptop") if proj else "Laptop"

        stmt = select(Result).options(
            selectinload(Result.benchmark),
            selectinload(Result.configuration),
            selectinload(Result.source_image),
            selectinload(Result.metrics).selectinload(ResultMetric.metric_definition)
        ).where(Result.project_id == project_id)

        results = (await session.execute(stmt)).scalars().all()

        for r in results:
            if r.status == "ignored":
                continue
            bench_name = r.benchmark.name if r.benchmark else r.benchmark_id
            cfg_name = r.configuration.display_name if r.configuration else ""
            src_path = r.source_image.file_path if r.source_image else ""

            for m in r.metrics:
                m_disp = m.metric_definition.display_name if m.metric_definition else m.metric_id
                unit = m.metric_definition.unit if m.metric_definition else ""
                val = m.normalized_value if m.normalized_value is not None else ""
                writer.writerow([prod_name, category, bench_name, cfg_name, m_disp, val, unit, src_path])

        return output.getvalue()

    @staticmethod
    async def export_project_to_json(session: AsyncSession, project_id: str) -> Dict[str, Any]:
        """
        Serializes entire project hierarchy into JSON for full backup/restore.
        """
        stmt_p = select(Project).options(
            selectinload(Project.configurations).selectinload(Configuration.source_images),
            selectinload(Project.results).selectinload(Result.metrics).selectinload(ResultMetric.metric_definition),
            selectinload(Project.results).selectinload(Result.benchmark)
        ).where(Project.id == project_id)

        proj = (await session.execute(stmt_p)).scalar_one_or_none()
        if not proj:
            return {}

        return {
            "version": "1.0",
            "id": proj.id,
            "name": proj.name,
            "product_name": proj.product_name or proj.name,
            "product_category": proj.product_category or "Laptop",
            "specs": {
                "cpu": proj.cpu,
                "gpu": proj.gpu,
                "motherboard": proj.motherboard,
                "ram": proj.ram,
                "storage": proj.storage,
                "os": proj.os,
                "bios": proj.bios_version,
                "driver": proj.driver_version
            },
            "reviewer": proj.reviewer,
            "notes": proj.notes,
            "root_folder_path": proj.root_folder_path,
            "configurations": [
                {
                    "id": c.id,
                    "folder_name": c.folder_name,
                    "display_name": c.display_name,
                    "sort_order": c.sort_order,
                    "images": [img.file_path for img in c.source_images]
                }
                for c in proj.configurations
            ],
            "results": [
                {
                    "id": r.id,
                    "benchmark_id": r.benchmark_id,
                    "benchmark_name": r.benchmark.name if r.benchmark else r.benchmark_id,
                    "configuration_id": r.configuration_id,
                    "configuration_name": r.configuration.display_name if r.configuration else "",
                    "confidence": r.overall_confidence,
                    "status": r.status,
                    "metrics": [
                        {
                            "metric_id": rm.metric_id,
                            "name": rm.metric_definition.name if rm.metric_definition else rm.metric_id,
                            "display_name": rm.metric_definition.display_name if rm.metric_definition else rm.metric_id,
                            "unit": rm.metric_definition.unit if rm.metric_definition else "",
                            "higher_is_better": rm.metric_definition.higher_is_better if rm.metric_definition else True,
                            "raw_text": rm.raw_ocr_value,
                            "normalized_value": rm.normalized_value,
                            "confidence": rm.confidence
                        }
                        for rm in r.metrics
                    ]
                }
                for r in proj.results
            ]
        }
