import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.db.database import Base
from app.services.ssd_database_service import SSDDatabaseService

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

@pytest_asyncio.fixture
async def async_session():
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session_maker = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session_maker() as session:
        yield session

    await engine.dispose()

@pytest.mark.asyncio
async def test_ssd_database_model_lifecycle(async_session: AsyncSession):
    # 1. Create model
    model = await SSDDatabaseService.upsert_model(
        async_session,
        model_name="ADATA Elite SC810",
        brand="ADATA",
        capacity="1TB",
        interface="USB 3.2 Gen 2x2"
    )
    assert model.id is not None
    assert model.model_name == "ADATA Elite SC810"

    # 2. Add scores
    s1 = await SSDDatabaseService.update_score(
        async_session,
        model_id=model.id,
        benchmark_id="crystaldiskmark_1gb",
        metric_id="seq_read",
        value=2096.81,
        unit="MB/s"
    )
    assert s1.value == 2096.81

    s2 = await SSDDatabaseService.update_score(
        async_session,
        model_id=model.id,
        benchmark_id="crystaldiskmark_1gb",
        metric_id="seq_write",
        value=1824.45,
        unit="MB/s"
    )
    assert s2.value == 1824.45

    # 3. Retrieve models with scores
    models = await SSDDatabaseService.get_all_models_with_scores(async_session)
    assert len(models) == 1
    assert "crystaldiskmark_1gb:seq_read" in models[0]["scores"]
    assert models[0]["scores"]["crystaldiskmark_1gb:seq_read"]["value"] == 2096.81

    # 4. Update score (e.g. inline cell edit)
    s1_updated = await SSDDatabaseService.update_score(
        async_session,
        model_id=model.id,
        benchmark_id="crystaldiskmark_1gb",
        metric_id="seq_read",
        value=2105.50,
        is_manual=True
    )
    assert s1_updated.value == 2105.50
    assert s1_updated.is_manual is True

@pytest.mark.asyncio
async def test_ssd_database_csv_export_and_import(async_session: AsyncSession):
    # Create models with scores
    m1 = await SSDDatabaseService.upsert_model(async_session, "ADATA Elite SC810", brand="ADATA", capacity="1TB")
    await SSDDatabaseService.update_score(async_session, m1.id, "crystaldiskmark_1gb", "seq_read", 2096.81, "MB/s")
    await SSDDatabaseService.update_score(async_session, m1.id, "as_ssd_1gb", "score", 1331.0, "pts")

    m2 = await SSDDatabaseService.upsert_model(async_session, "TeamGroup PD20M", brand="TeamGroup", capacity="2TB")
    await SSDDatabaseService.update_score(async_session, m2.id, "crystaldiskmark_1gb", "seq_read", 2050.12, "MB/s")
    await SSDDatabaseService.update_score(async_session, m2.id, "as_ssd_1gb", "score", 1315.0, "pts")

    # Export to CSV
    csv_text = await SSDDatabaseService.export_to_csv(async_session)
    assert "Model Name,Brand,Capacity" in csv_text
    assert "ADATA Elite SC810" in csv_text
    assert "2096.81" in csv_text
    assert "TeamGroup PD20M" in csv_text

    # Delete models
    await SSDDatabaseService.delete_model(async_session, m1.id)
    await SSDDatabaseService.delete_model(async_session, m2.id)
    models_empty = await SSDDatabaseService.get_all_models_with_scores(async_session)
    assert len(models_empty) == 0

    # Import back from CSV
    import_report = await SSDDatabaseService.import_from_csv(async_session, csv_text)
    assert import_report["status"] == "success"
    assert import_report["models_imported"] == 2
    assert import_report["scores_imported"] == 4

    # Verify data restored
    restored = await SSDDatabaseService.get_all_models_with_scores(async_session)
    assert len(restored) == 2
    adata = next(m for m in restored if m["model_name"] == "ADATA Elite SC810")
    assert adata["scores"]["crystaldiskmark_1gb:seq_read"]["value"] == 2096.81
    assert adata["scores"]["as_ssd_1gb:score"]["value"] == 1331.0

@pytest.mark.asyncio
async def test_ssd_database_chart_data(async_session: AsyncSession):
    m1 = await SSDDatabaseService.upsert_model(async_session, "ADATA Elite SC810")
    await SSDDatabaseService.update_score(async_session, m1.id, "crystaldiskmark_1gb", "seq_read", 2000.0, "MB/s")

    m2 = await SSDDatabaseService.upsert_model(async_session, "Crucial X9 Pro")
    await SSDDatabaseService.update_score(async_session, m2.id, "crystaldiskmark_1gb", "seq_read", 1000.0, "MB/s")

    chart_data = await SSDDatabaseService.get_chart_data(
        async_session,
        benchmark_id="crystaldiskmark_1gb",
        metric_id="seq_read",
        baseline_model_id=m2.id  # Crucial = baseline (1000 MB/s)
    )

    assert chart_data["benchmark_id"] == "crystaldiskmark_1gb"
    assert chart_data["higher_is_better"] is True
    assert len(chart_data["rows"]) == 2

    # First row should be ADATA (2000 MB/s, highest first)
    row0 = chart_data["rows"][0]
    assert row0["model_name"] == "ADATA Elite SC810"
    assert row0["value"] == 2000.0
    assert row0["delta_vs_baseline"] == 1000.0
    assert row0["pct_gain_vs_baseline"] == 100.0  # +100% vs Crucial
