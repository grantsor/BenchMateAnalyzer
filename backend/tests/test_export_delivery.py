import pytest
import base64
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.config import settings

@pytest.mark.asyncio
async def test_save_export_file_data_url(tmp_path):
    sample_bytes = b"fake-png-image-data-for-testing"
    b64_str = base64.b64encode(sample_bytes).decode("ascii")
    data_url = f"data:image/png;base64,{b64_str}"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post("/api/export/save-file", json={
            "filename": "test_chart.png",
            "data_url": data_url,
            "directory": str(tmp_path),
            "open_in_explorer": False
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["filename"] == "test_chart.png"
        saved_file = tmp_path / "test_chart.png"
        assert saved_file.exists()
        assert saved_file.read_bytes() == sample_bytes

@pytest.mark.asyncio
async def test_save_export_batch(tmp_path):
    sample_bytes = b"batch-item-test"
    b64_str = base64.b64encode(sample_bytes).decode("ascii")
    data_url = f"data:image/webp;base64,{b64_str}"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post("/api/export/save-batch", json={
            "files": [
                {"filename": "chart1.webp", "data_url": data_url},
                {"filename": "chart2.webp", "data_url": data_url}
            ],
            "directory": str(tmp_path),
            "open_in_explorer": False
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["saved_count"] == 2
        assert (tmp_path / "chart1.webp").exists()
        assert (tmp_path / "chart2.webp").exists()
