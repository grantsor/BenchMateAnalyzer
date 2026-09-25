import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

print("Starting Updated Integration Tests for CapFrameX Analyzer v1.1...")

# 1. Health check
res = client.get("/api/health")
assert res.status_code == 200, f"Health check failed: {res.text}"
print("[PASS] [1/11] /api/health passed:", res.json()["service"])

# 2. Scan endpoint
res = client.post("/api/scan", json={"folder": r"N:\BenchMarkTool\Sample CapframeX Data"})
assert res.status_code == 200, f"Scan failed: {res.text}"
data = res.json()
assert data["runs_count"] == 145, f"Expected 145 runs, got {data['runs_count']}"
assert len(data["games"]) == 12, f"Expected 12 games, got {len(data['games'])}"
print(f"[PASS] [2/11] /api/scan passed: {data['runs_count']} runs, {len(data['games'])} games")

# 3. Games endpoint
res = client.get("/api/games")
assert res.status_code == 200
games = res.json()["games"]
assert "Assassin's Creed Mirage" in games
print("[PASS] [3/11] /api/games passed:", games[:3])

# 4. Hardware endpoint (now includes motherboards!)
res = client.get("/api/hardware")
assert res.status_code == 200
hw = res.json()
assert len(hw["gpus"]) >= 3
assert len(hw["cpus"]) >= 3
assert "motherboards" in hw and len(hw["motherboards"]) >= 1
print("[PASS] [4/11] /api/hardware passed. Motherboards:", hw["motherboards"][:2])

# 5. Chart data default aggregation is average
res = client.get("/api/chart-data", params={"game": "Assassin's Creed Mirage", "resolution": "1080p", "group_by": "gpu"})
assert res.status_code == 200
chart_json = res.json()
assert chart_json["aggregation"] == "average", f"Expected default average, got {chart_json['aggregation']}"
items = chart_json["items"]
assert len(items) >= 2
assert items[0]["average_fps"] > 0
print(f"[PASS] [5/11] /api/chart-data default average aggregation passed: {items[0]['label']} Avg={items[0]['average_fps']} FPS")

# 6. Motherboard grouping and cross-filtering
res = client.get("/api/chart-data", params={"game": "Assassin's Creed Mirage", "resolution": "1080p", "group_by": "motherboard"})
assert res.status_code == 200
mb_items = res.json()["items"]
assert len(mb_items) >= 1
print(f"[PASS] [6/11] /api/chart-data (Motherboard grouping) passed: {mb_items[0]['label']}")

# 7. Tri-resolution endpoint (1080p, 1440p, 4K)
res = client.get("/api/tri-resolution", params={"game": "Assassin's Creed Mirage", "group_by": "gpu"})
assert res.status_code == 200
tri = res.json()["data"]
assert "1080p" in tri and "1440p" in tri and "4K" in tri
print("[PASS] [7/11] /api/tri-resolution (GPU) passed: 1080p, 1440p, 4K all populated")

# 8. CPU Comparison (Cyberpunk 2077 with RTX 5090 Founders Edition)
res = client.get("/api/tri-resolution", params={"game": "Cyberpunk 2077", "group_by": "cpu", "filter_gpu": "NVIDIA GeForce RTX 5090 Founders Edition"})
assert res.status_code == 200
cpu_tri = res.json()["data"]
assert len(cpu_tri["1080p"]) >= 3
print("[PASS] [8/11] /api/tri-resolution (CPU comparison) passed:", [it["label"] for it in cpu_tri["1080p"]])


# 9. Branding logo endpoint
res = client.get("/api/branding/default-logo-data")
assert res.status_code == 200
logo = res.json()
assert "data_url" in logo and logo["aspect_ratio"] > 0
print("[PASS] [9/11] /api/branding/default-logo-data passed: aspect ratio =", logo["aspect_ratio"])

# 10. Browse-folder endpoint with mocked user selection
from unittest.mock import patch
with patch("app.capframex.api.routes.open_native_folder_picker", return_value=r"N:\BenchMarkTool\Sample CapframeX Data"):
    res = client.post("/api/browse-folder")
    assert res.status_code == 200
    assert res.json()["status"] == "success"
    print("[PASS] [10/11] /api/browse-folder endpoint passed:", res.json()["status"])

# 11. Raw runs audit endpoint
res = client.get("/api/runs", params={"game": "Assassin's Creed Mirage"})
assert res.status_code == 200
runs = res.json()
assert runs["total"] >= 6
print(f"[PASS] [11/11] /api/runs passed: {runs['total']} capture runs for AC Mirage")

# 12. GPU Hierarchy endpoint GET
res = client.get("/api/gpu-hierarchy")
assert res.status_code == 200
h_data = res.json()
assert h_data["total"] >= 28
assert h_data["hierarchy"][0] == "RTX 5090"
assert "RTX 5060 Ti 8GB" in h_data["hierarchy"]
print(f"[PASS] [12/14] /api/gpu-hierarchy passed: {h_data['total']} ranked tiers. Top: {h_data['hierarchy'][:3]}")

# 13. GPU Model Tier Matching & Sorting in chart-data
res = client.get("/api/chart-data", params={"game": "Assassin's Creed Mirage", "resolution": "1080p", "group_by": "gpu"})
assert res.status_code == 200
items = res.json()["items"]
# Check that each item has tier_rank and matched_model
for it in items:
    assert "tier_rank" in it and "matched_model" in it
# Check that tier_ranks are sorted non-decreasing (rank 0 <= rank 1 <= ...)
ranks = [it["tier_rank"] for it in items]
assert ranks == sorted(ranks), f"Expected items sorted by tier rank, got: {ranks}"
print(f"[PASS] [13/14] GPU tier hierarchy sorting passed: {[(it['label'], it['tier_rank'], it['matched_model']) for it in items]}")

# 14. GPU Hierarchy Save and Reset endpoints
res = client.post("/api/gpu-hierarchy", json={"hierarchy": ["RTX 5080", "RTX 5090"] + h_data["hierarchy"][2:]})
assert res.status_code == 200
assert res.json()["hierarchy"][0] == "RTX 5080"
# Reset back
res_reset = client.post("/api/gpu-hierarchy/reset")
assert res_reset.status_code == 200
assert res_reset.json()["hierarchy"][0] == "RTX 5090"
print("[PASS] [14/16] /api/gpu-hierarchy POST and Reset endpoints passed")

# 15. Run Metadata Update endpoint (Comment, CPU, GPU, Motherboard, RAM)
import shutil
import tempfile
import glob

sample_files = glob.glob(r"N:\BenchMarkTool\Sample CapframeX Data\*.json")
assert len(sample_files) > 0
temp_dir = tempfile.mkdtemp()
temp_file = os.path.join(temp_dir, os.path.basename(sample_files[0]))
shutil.copyfile(sample_files[0], temp_file)

# Test updating metadata on temp file
res_update = client.post("/api/runs/update", json={
    "file_path": temp_file,
    "comment": "1440p Custom Preset",
    "cpu": "AMD Ryzen 9 9950X3D",
    "gpu": "NVIDIA GeForce RTX 5090 Ti",
    "motherboard": "ASUS ROG Crosshair X870E HERO",
    "ram": "64GB (2x32GB) 6400MT/s CL28"
})
assert res_update.status_code == 200, f"Update failed: {res_update.text}"
up_data = res_update.json()
assert up_data["status"] == "success"
assert up_data["run"]["raw_comment"] == "1440p Custom Preset"
assert up_data["run"]["cpu"] == "AMD Ryzen 9 9950X3D"
assert up_data["run"]["gpu"] == "NVIDIA GeForce RTX 5090 Ti"
assert up_data["run"]["motherboard"] == "ASUS ROG Crosshair X870E HERO"
assert up_data["run"]["system_ram"] == "64GB (2x32GB) 6400MT/s CL28"

# Verify on disk file encoding and data
import json
with open(temp_file, "r", encoding="utf-8-sig") as f:
    disk_data = json.load(f)
assert disk_data["Info"]["Comment"] == "1440p Custom Preset"
assert disk_data["Info"]["Processor"] == "AMD Ryzen 9 9950X3D"
assert disk_data["Info"]["GPU"] == "NVIDIA GeForce RTX 5090 Ti"
assert disk_data["Info"]["Motherboard"] == "ASUS ROG Crosshair X870E HERO"
assert disk_data["Info"]["SystemRam"] == "64GB (2x32GB) 6400MT/s CL28"
print(f"[PASS] [15/16] /api/runs/update verified on disk and in memory: {up_data['run']['gpu']}")

# 16. Batch update endpoint
temp_file2 = os.path.join(temp_dir, os.path.basename(sample_files[1]))
shutil.copyfile(sample_files[1], temp_file2)

res_batch = client.post("/api/runs/batch-update", json={
    "file_paths": [temp_file, temp_file2],
    "motherboard": "Gigabyte X870 AORUS ELITE",
    "ram": "32GB (2x16GB) 6000MT/s"
})
assert res_batch.status_code == 200, f"Batch update failed: {res_batch.text}"
batch_data = res_batch.json()
assert batch_data["updated_count"] == 2
assert batch_data["runs"][0]["motherboard"] == "Gigabyte X870 AORUS ELITE"
assert batch_data["runs"][1]["motherboard"] == "Gigabyte X870 AORUS ELITE"

# Cleanup temp dir
shutil.rmtree(temp_dir, ignore_errors=True)
print(f"[PASS] [16/16] /api/runs/batch-update passed: updated {batch_data['updated_count']} files")

print("\n========================================")
print("ALL 16 BACKEND TESTS PASSED 100%!")
print("========================================")


