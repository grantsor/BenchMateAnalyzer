import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from fastapi.testclient import TestClient
from app.main import app
from app.capframex.services.custom_chart_service import custom_chart_service

client = TestClient(app)

def test_custom_charts_endpoints():
    print("Testing GET /api/custom-charts?mode=pc...")
    res = client.get("/api/custom-charts?mode=pc")
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["status"] == "success"
    pc_chart_ids = [c["id"] for c in data["charts"]]
    print(f"PC custom chart IDs: {pc_chart_ids}")
    assert "pc_temps" in pc_chart_ids
    assert "pc_power" in pc_chart_ids

    print("Testing GET /api/custom-charts?mode=laptop...")
    res = client.get("/api/custom-charts?mode=laptop")
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["status"] == "success"
    laptop_chart_ids = [c["id"] for c in data["charts"]]
    print(f"Laptop custom chart IDs: {laptop_chart_ids}")
    assert "laptop_cpu_temps" in laptop_chart_ids
    assert "laptop_battery_life" in laptop_chart_ids

    print("Testing POST /api/custom-charts...")
    new_chart = {
        "id": "test_chart_123",
        "name": "Test Voltage",
        "title": "GPU CORE VOLTAGE COMPARISON",
        "sub_header": "MILLIVOLTS (mV) | LOWER IS BETTER",
        "unit": "mV",
        "higher_is_better": False,
        "metric_name": "Core Voltage",
        "mode": "pc",
        "category": "power",
        "rows": [
            {"id": "r1", "label": "RTX 4090", "value": 985.0, "value2": None},
            {"id": "r2", "label": "RTX 4080", "value": 970.0, "value2": None}
        ]
    }
    res = client.post("/api/custom-charts", json=new_chart)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["status"] == "success"
    saved = data["chart"]
    assert saved["id"] == "test_chart_123"
    assert len(saved["rows"]) == 2

    print("Testing GET /api/custom-charts/test_chart_123...")
    res = client.get("/api/custom-charts/test_chart_123")
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["chart"]["name"] == "Test Voltage"

    print("Testing DELETE /api/custom-charts/test_chart_123...")
    res = client.delete("/api/custom-charts/test_chart_123")
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["status"] == "success"

    res = client.get("/api/custom-charts/test_chart_123")
    assert res.status_code == 404

def test_auto_sync_hardware():
    print("Testing auto_sync_hardware for Laptop mode...")
    chart = custom_chart_service.get_chart("laptop_cpu_temps")
    chart["rows"] = []
    custom_chart_service.save_chart(chart)

    profiles = ["Silent", "Standard", "Performance"]
    charts = custom_chart_service.auto_sync_hardware(mode="laptop", power_profiles=profiles)
    cpu_temps = next(c for c in charts if c["id"] == "laptop_cpu_temps")
    labels = [r["label"] for r in cpu_temps["rows"]]
    print("Pre-filled laptop CPU temp rows:", labels)
    assert labels == ["Silent", "Standard", "Performance"]
    assert all(r["value"] is None for r in cpu_temps["rows"])

    # Simulate entering a value for "Silent"
    cpu_temps["rows"][0]["value"] = 68.5
    custom_chart_service.save_chart(cpu_temps)

    # Now simulate scanning more files that add "Turbo"
    more_profiles = ["Silent", "Standard", "Performance", "Turbo"]
    updated_charts = custom_chart_service.auto_sync_hardware(mode="laptop", power_profiles=more_profiles)
    updated_cpu_temps = next(c for c in updated_charts if c["id"] == "laptop_cpu_temps")
    updated_labels = [r["label"] for r in updated_cpu_temps["rows"]]
    print("Updated laptop CPU temp rows:", updated_labels)
    assert updated_labels == ["Silent", "Standard", "Performance", "Turbo"]
    # Check that Silent still retained 68.5
    silent_row = next(r for r in updated_cpu_temps["rows"] if r["label"] == "Silent")
    assert silent_row["value"] == 68.5, f"Expected 68.5 but got {silent_row['value']}"
    # Check that Turbo is None
    turbo_row = next(r for r in updated_cpu_temps["rows"] if r["label"] == "Turbo")
    assert turbo_row["value"] is None

    print("Testing auto_sync_hardware for PC mode...")
    gpus = ["RTX 5060 Ti", "RTX 4070 Ti"]
    pc_charts = custom_chart_service.auto_sync_hardware(mode="pc", gpus=gpus)
    pc_temps = next(c for c in pc_charts if c["id"] == "pc_temps")
    pc_labels = [r["label"] for r in pc_temps["rows"]]
    assert "RTX 5060 Ti" in pc_labels
    assert "RTX 4070 Ti" in pc_labels
    assert all(r["value"] is None for r in pc_temps["rows"] if r["label"] in ["RTX 5060 Ti", "RTX 4070 Ti"])

    print("All auto_sync_hardware tests passed successfully!")

if __name__ == "__main__":
    test_custom_charts_endpoints()
    test_auto_sync_hardware()

