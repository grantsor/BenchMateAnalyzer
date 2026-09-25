import asyncio
import csv
import io
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.db.database import Base
from app.db.models import Project, Configuration, Benchmark, BenchmarkMetric, Result, ResultMetric
from app.services.export_service import ExportService
from app.services.data_import_service import DataImportService

def run_async(coro):
    return asyncio.run(coro)

def test_export_csv_includes_product_and_category():
    async def _test():
        engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        async_session_maker = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        async with async_session_maker() as session:
            proj = Project(
                name="HP Omen 16 Review",
                product_name="HP Omen 16 (2026)",
                product_category="Laptop"
            )
            session.add(proj)
            await session.flush()

            cfg = Configuration(
                project_id=proj.id,
                folder_name="performance",
                display_name="Performance Mode",
                sort_order=0
            )
            session.add(cfg)

            bench = Benchmark(
                id="cinebench_r26",
                name="Cinebench 2026",
                version="2026",
                category="CPU",
                file_patterns_json="[]",
                parser_id="cinebench"
            )
            session.add(bench)

            metric = BenchmarkMetric(
                id="multi_core",
                benchmark_id="cinebench_r26",
                name="Multi Core",
                display_name="Multi Core",
                unit="pts",
                higher_is_better=True,
                decimal_places=0
            )
            session.add(metric)
            await session.flush()

            res = Result(
                project_id=proj.id,
                configuration_id=cfg.id,
                benchmark_id="cinebench_r26",
                parser_id="cinebench",
                overall_confidence=1.0,
                status="verified"
            )
            session.add(res)
            await session.flush()

            rm = ResultMetric(
                result_id=res.id,
                metric_id="multi_core",
                benchmark_id="cinebench_r26",
                raw_ocr_value="3829",
                normalized_value=3829.0,
                confidence=1.0
            )
            session.add(rm)
            await session.commit()

            csv_text = await ExportService.export_project_to_csv(session, proj.id)
            reader = csv.reader(io.StringIO(csv_text.strip()))
            header = next(reader)

            assert header == ["Product", "Category", "Benchmark", "Configuration", "Metric", "Score", "Unit", "Source"]

            row = next(reader)
            assert row[0] == "HP Omen 16 (2026)"
            assert row[1] == "Laptop"
            assert row[2] == "Cinebench 2026"
            assert row[3] == "Performance Mode"
            assert row[4] == "Multi Core"
            assert row[5] == "3829.0"
            assert row[6] == "pts"

        await engine.dispose()

    run_async(_test())

def test_import_csv_data():
    async def _test():
        engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        async_session_maker = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        async with async_session_maker() as session:
            sample_csv = (
                "Product,Category,Benchmark,Configuration,Metric,Score,Unit,Source\n"
                "AMD Ryzen 9 9950X,CPU,Geekbench 6,Stock,Single Core,3350,pts,screen1.png\n"
                "AMD Ryzen 9 9950X,CPU,Geekbench 6,Stock,Multi Core,21500,pts,screen1.png\n"
                "AMD Ryzen 9 9950X,CPU,Geekbench 6,PBO Enabled,Single Core,3420,pts,screen2.png\n"
                "AMD Ryzen 9 9950X,CPU,Geekbench 6,PBO Enabled,Multi Core,22800,pts,screen2.png\n"
            )

            result = await DataImportService.import_csv_data(
                session=session,
                csv_text=sample_csv,
                filename="ryzen_test.csv"
            )

            assert result["success"] is True
            assert result["product_name"] == "AMD Ryzen 9 9950X"
            assert result["product_category"] == "CPU"
            assert result["configuration_count"] == 2
            assert result["result_count"] == 2
            assert result["metric_count"] == 4

        await engine.dispose()

    run_async(_test())

def test_import_json_backup_roundtrip():
    async def _test():
        engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        async_session_maker = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        async with async_session_maker() as session:
            sample_json = {
                "version": "1.0",
                "name": "Samsung 990 Pro Test",
                "product_name": "Samsung 990 Pro 2TB",
                "product_category": "SSD",
                "specs": {
                    "storage": "2TB NVMe PCIe 4.0"
                },
                "configurations": [
                    {"folder_name": "heatsink", "display_name": "With Heatsink", "sort_order": 0},
                    {"folder_name": "bare", "display_name": "Bare Drive", "sort_order": 1}
                ],
                "results": [
                    {
                        "benchmark_id": "crystaldiskmark",
                        "benchmark_name": "CrystalDiskMark",
                        "configuration_name": "With Heatsink",
                        "metrics": [
                            {
                                "metric_id": "seq_read",
                                "name": "Sequential Read",
                                "display_name": "SEQ1M Q8T1 Read",
                                "unit": "MB/s",
                                "higher_is_better": True,
                                "normalized_value": 7450.0
                            }
                        ]
                    }
                ]
            }

            result = await DataImportService.import_json_data(
                session=session,
                data=sample_json
            )

            assert result["success"] is True
            assert result["product_name"] == "Samsung 990 Pro 2TB"
            assert result["product_category"] == "SSD"
            assert result["configuration_count"] == 2
            assert result["result_count"] == 1
            assert result["metric_count"] == 1

        await engine.dispose()

    run_async(_test())
