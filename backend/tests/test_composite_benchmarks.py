import asyncio
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import sessionmaker
from app.db.database import Base
from app.ocr.engine import OCRItem
from app.parsers.superpi import SuperPIParser
from app.services.result_service import ResultService
from app.db.models import Project, Configuration, Benchmark, BenchmarkMetric, Result, ResultMetric

def test_superpi_parser_exact_seconds():
    parser = SuperPIParser()
    poly = [[0, 0], [10, 0], [10, 10], [0, 10]]

    # Test 1: 6m 53.157s -> exactly 413.157 (no rounding up to 413.16 or 414)
    item1 = OCRItem(text='6m 53.157s', confidence=0.9, polygon=poly, box=(0, 0, 10, 10))
    res1 = parser.extract_results(None, [item1], None)
    assert 'time_seconds' in res1.metrics
    assert res1.metrics['time_seconds'].normalized_value == 413.157

    # Test 2: 000h 09m 14s -> exactly 554.0
    item2 = OCRItem(text='000h 09m 14s', confidence=0.95, polygon=poly, box=(0, 0, 10, 10))
    res2 = parser.extract_results(None, [item2], None)
    assert 'time_seconds' in res2.metrics
    assert res2.metrics['time_seconds'].normalized_value == 554.0

    # Test 3: Colon format 06:53.157 -> exactly 413.157
    item3 = OCRItem(text='06:53.157', confidence=0.88, polygon=poly, box=(0, 0, 10, 10))
    res3 = parser.extract_results(None, [item3], None)
    assert 'time_seconds' in res3.metrics
    assert res3.metrics['time_seconds'].normalized_value == 413.157

def test_composite_benchmarks_grouping():
    async def _test():
        engine = create_async_engine('sqlite+aiosqlite:///:memory:', echo=False)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        async_session_maker = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        async with async_session_maker() as session:
            # Setup test project & config
            proj = Project(name='Test Composite Laptop', product_name='Test Laptop')
            session.add(proj)
            await session.flush()

            cfg = Configuration(project_id=proj.id, folder_name='Performance', display_name='Performance', sort_order=0)
            session.add(cfg)
            await session.flush()

            # SuperPI & wPrime benchmarks
            b_spi = Benchmark(id='superpi_benchmark', name='Super PI Mod', category='CPU', parser_id='superpi_parser')
            b_wp = Benchmark(id='wprime_benchmark', name='wPrime Benchmark', category='CPU', parser_id='wprime_parser')
            b_sw = Benchmark(id='threedmark_speedway', name='3DMark Speed Way', category='GPU/CPU', parser_id='threedmark_parser')
            b_sn = Benchmark(id='threedmark_steelnomad', name='3DMark Steel Nomad', category='GPU/CPU', parser_id='threedmark_parser')
            session.add_all([b_spi, b_wp, b_sw, b_sn])

            m_spi = BenchmarkMetric(id='time_seconds', benchmark_id='superpi_benchmark', name='Calculation Time', display_name='Time (Seconds)', unit='s', higher_is_better=False, decimal_places=3, sort_order=0)
            m_wp = BenchmarkMetric(id='time_1024m', benchmark_id='wprime_benchmark', name='1024M Time', display_name='1024M Time (Seconds)', unit='s', higher_is_better=False, decimal_places=2, sort_order=0)
            m_sw_gt = BenchmarkMetric(id='graphics_test', benchmark_id='threedmark_speedway', name='Graphics Test', display_name='Graphics Test', unit='FPS', higher_is_better=True, decimal_places=2, sort_order=1)
            m_sn_gt = BenchmarkMetric(id='graphics_test', benchmark_id='threedmark_steelnomad', name='Graphics Test', display_name='Graphics Test', unit='FPS', higher_is_better=True, decimal_places=2, sort_order=1)
            session.add_all([m_spi, m_wp, m_sw_gt, m_sn_gt])
            await session.flush()

            # Results
            r_spi = Result(project_id=proj.id, configuration_id=cfg.id, benchmark_id='superpi_benchmark', status='verified', parser_id='superpi_parser')
            r_wp = Result(project_id=proj.id, configuration_id=cfg.id, benchmark_id='wprime_benchmark', status='verified', parser_id='wprime_parser')
            r_sw = Result(project_id=proj.id, configuration_id=cfg.id, benchmark_id='threedmark_speedway', status='verified', parser_id='threedmark_parser')
            r_sn = Result(project_id=proj.id, configuration_id=cfg.id, benchmark_id='threedmark_steelnomad', status='verified', parser_id='threedmark_parser')
            session.add_all([r_spi, r_wp, r_sw, r_sn])
            await session.flush()

            rm_spi = ResultMetric(result_id=r_spi.id, metric_id='time_seconds', benchmark_id='superpi_benchmark', normalized_value=413.157, confidence=0.95)
            rm_wp = ResultMetric(result_id=r_wp.id, metric_id='time_1024m', benchmark_id='wprime_benchmark', normalized_value=70.022, confidence=0.95)
            rm_sw = ResultMetric(result_id=r_sw.id, metric_id='graphics_test', benchmark_id='threedmark_speedway', normalized_value=9.80, confidence=0.95)
            rm_sn = ResultMetric(result_id=r_sn.id, metric_id='graphics_test', benchmark_id='threedmark_steelnomad', normalized_value=15.98, confidence=0.95)
            session.add_all([rm_spi, rm_wp, rm_sw, rm_sn])
            await session.commit()

            # Query all grouped results
            datasets = await ResultService.get_project_results_grouped(session, proj.id)
            ds_map = {d.benchmark_id: d for d in datasets}

            # Verify standalone were merged away in the all-results list
            assert 'superpi_benchmark' not in ds_map
            assert 'wprime_benchmark' not in ds_map
            assert 'threedmark_speedway' not in ds_map
            assert 'threedmark_steelnomad' not in ds_map

            # Verify Arithmetic Benchmark
            assert 'arithmetic_benchmark' in ds_map
            ds_arith = ds_map['arithmetic_benchmark']
            assert ds_arith.benchmark_name == 'Arithmetic Benchmark'
            assert 'superpi_32m' in ds_arith.metric_ids
            assert 'wprime_1024m' in ds_arith.metric_ids
            assert len(ds_arith.rows) == 1
            row_arith = ds_arith.rows[0]
            assert row_arith.metrics['superpi_32m'].value == 413.157
            assert row_arith.metrics['superpi_32m'].unit == 's'
            assert row_arith.metrics['superpi_32m'].higher_is_better is False
            assert row_arith.metrics['wprime_1024m'].value == 70.022
            assert row_arith.metrics['wprime_1024m'].unit == 's'
            assert row_arith.metrics['wprime_1024m'].higher_is_better is False

            # Verify 3DMark Suite - Speedway and Steel Nomad
            assert 'threedmark_speedway_steelnomad' in ds_map
            ds_3dm = ds_map['threedmark_speedway_steelnomad']
            assert ds_3dm.benchmark_name == '3DMark Suite - Speedway and Steel Nomad'
            assert 'speed_way' in ds_3dm.metric_ids
            assert 'steel_nomad' in ds_3dm.metric_ids
            assert len(ds_3dm.rows) == 1
            row_3dm = ds_3dm.rows[0]
            assert row_3dm.metrics['speed_way'].value == 9.80
            assert row_3dm.metrics['speed_way'].unit == 'FPS'
            assert row_3dm.metrics['speed_way'].higher_is_better is True
            assert row_3dm.metrics['steel_nomad'].value == 15.98
            assert row_3dm.metrics['steel_nomad'].unit == 'FPS'
            assert row_3dm.metrics['steel_nomad'].higher_is_better is True

    asyncio.run(_test())

def test_storage_composite_benchmark(tmp_path):
    async def _test():
        db_file = tmp_path / "test_storage.db"
        engine = create_async_engine(f"sqlite+aiosqlite:///{db_file}")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        session_factory = async_sessionmaker(engine, expire_on_commit=False)
        async with session_factory() as session:
            proj = Project(name="SSD Test", product_name="SSD Suite")
            session.add(proj)
            await session.flush()

            cfg = Configuration(project_id=proj.id, folder_name="SSD1", display_name="SSD 1TB", sort_order=0)
            session.add(cfg)
            await session.flush()

            b_tdm = Benchmark(id='threedmark_storage', name='3DMark Storage Benchmark', category='Storage', parser_id='threedmark_storage_parser')
            b_pcm_q = Benchmark(id='pcmark10_quick_system_drive', name='PCMark 10 Quick System Drive', category='Storage', parser_id='pcmark10_storage_parser')
            b_pcm_d = Benchmark(id='pcmark10_data_drive', name='PCMark 10 Data Drive', category='Storage', parser_id='pcmark10_storage_parser')
            session.add_all([b_tdm, b_pcm_q, b_pcm_d])
            await session.flush()

            m_tdm_s = BenchmarkMetric(id='storage_score', benchmark_id='threedmark_storage', name='Score', display_name='Score', unit='pts', higher_is_better=True, decimal_places=0, sort_order=0)
            m_tdm_b = BenchmarkMetric(id='bandwidth', benchmark_id='threedmark_storage', name='Bandwidth', display_name='Bandwidth', unit='MB/s', higher_is_better=True, decimal_places=2, sort_order=1)
            m_tdm_a = BenchmarkMetric(id='average_access_time', benchmark_id='threedmark_storage', name='Access Time', display_name='Access Time', unit='µs', higher_is_better=False, decimal_places=1, sort_order=2)
            m_pcm_q_s = BenchmarkMetric(id='score', benchmark_id='pcmark10_quick_system_drive', name='Score', display_name='Score', unit='pts', higher_is_better=True, decimal_places=0, sort_order=0)
            m_pcm_q_b = BenchmarkMetric(id='bandwidth', benchmark_id='pcmark10_quick_system_drive', name='Bandwidth', display_name='Bandwidth', unit='MB/s', higher_is_better=True, decimal_places=2, sort_order=1)
            m_pcm_q_a = BenchmarkMetric(id='access_time', benchmark_id='pcmark10_quick_system_drive', name='Access Time', display_name='Access Time', unit='µs', higher_is_better=False, decimal_places=1, sort_order=2)
            session.add_all([m_tdm_s, m_tdm_b, m_tdm_a, m_pcm_q_s, m_pcm_q_b, m_pcm_q_a])
            await session.flush()

            r_tdm = Result(project_id=proj.id, configuration_id=cfg.id, benchmark_id='threedmark_storage', status='verified', parser_id='threedmark_storage_parser')
            r_pcm_q = Result(project_id=proj.id, configuration_id=cfg.id, benchmark_id='pcmark10_quick_system_drive', status='verified', parser_id='pcmark10_storage_parser')
            session.add_all([r_tdm, r_pcm_q])
            await session.flush()

            rm_tdm_s = ResultMetric(result_id=r_tdm.id, metric_id='storage_score', benchmark_id='threedmark_storage', normalized_value=3500.0, confidence=0.95)
            rm_tdm_b = ResultMetric(result_id=r_tdm.id, metric_id='bandwidth', benchmark_id='threedmark_storage', normalized_value=600.5, confidence=0.95)
            rm_tdm_a = ResultMetric(result_id=r_tdm.id, metric_id='average_access_time', benchmark_id='threedmark_storage', normalized_value=50.0, confidence=0.95)
            rm_pcm_q_s = ResultMetric(result_id=r_pcm_q.id, metric_id='score', benchmark_id='pcmark10_quick_system_drive', normalized_value=2500.0, confidence=0.95)
            rm_pcm_q_b = ResultMetric(result_id=r_pcm_q.id, metric_id='bandwidth', benchmark_id='pcmark10_quick_system_drive', normalized_value=300.2, confidence=0.95)
            rm_pcm_q_a = ResultMetric(result_id=r_pcm_q.id, metric_id='access_time', benchmark_id='pcmark10_quick_system_drive', normalized_value=65.0, confidence=0.95)
            session.add_all([rm_tdm_s, rm_tdm_b, rm_tdm_a, rm_pcm_q_s, rm_pcm_q_b, rm_pcm_q_a])
            await session.commit()

            datasets = await ResultService.get_project_results_grouped(session, proj.id)
            ds_map = {d.benchmark_id: d for d in datasets}

            assert 'threedmark_pcmark_storage' in ds_map
            ds_st = ds_map['threedmark_pcmark_storage']
            assert ds_st.benchmark_name == '3DMark and PCMark Storage Benchmark'
            assert 'tdm_bandwidth' in ds_st.metric_ids
            assert 'tdm_access_time' in ds_st.metric_ids
            assert 'tdm_score' in ds_st.metric_ids
            assert 'pcm_quick_bandwidth' in ds_st.metric_ids
            assert 'pcm_quick_access_time' in ds_st.metric_ids
            assert 'pcm_quick_score' in ds_st.metric_ids

            row = ds_st.rows[0]
            assert row.metrics['tdm_score'].value == 3500.0
            assert row.metrics['tdm_bandwidth'].value == 600.5
            assert row.metrics['tdm_access_time'].value == 50.0
            assert row.metrics['pcm_quick_score'].value == 2500.0
            assert row.metrics['pcm_quick_bandwidth'].value == 300.2
            assert row.metrics['pcm_quick_access_time'].value == 65.0

    asyncio.run(_test())

