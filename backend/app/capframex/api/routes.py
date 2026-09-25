from fastapi import APIRouter, Query, HTTPException, Body, UploadFile, File, Request
from typing import Optional, Dict, Any, List
from pydantic import BaseModel
import os
import subprocess
import asyncio
import json
import logging

from app.capframex.services.data_service import DataService
from app.capframex.services.gpu_hierarchy_service import gpu_hierarchy_service
from app.capframex.services.game_profile_service import game_profile_service
from app.capframex.services.custom_chart_service import custom_chart_service
from app.config import settings
from app.capframex.core.folder_picker import pick_folder
from app.capframex.core.parser import CapFrameXParser

logger = logging.getLogger(__name__)

router = APIRouter()
data_service = DataService(data_dir=settings.DEFAULT_DATA_DIR)

# Auto-scan default folder on startup if it exists
if data_service.data_dir:
    data_service.scan_directory(data_service.data_dir)

class ScanRequest(BaseModel):
    folder: Optional[str] = None
    mode: Optional[str] = None

class BrowseFolderRequest(BaseModel):
    folder: Optional[str] = None
    initial_dir: Optional[str] = None
    mode: Optional[str] = None

class AliasRequest(BaseModel):
    aliases: Dict[str, str]

class ModeRequest(BaseModel):
    mode: str

def open_native_folder_picker(initial_dir: Optional[str] = None) -> Optional[str]:
    """Preserved wrapper for backwards compatibility and test mocking."""
    res = pick_folder("Select CapFrameX Capture Folder", initial_dir or "")
    return res if res else None

@router.post("/browse-folder")
async def browse_folder(req: BrowseFolderRequest = Body(default=BrowseFolderRequest())):
    initial = req.folder or req.initial_dir or data_service.data_dir or ""
    if initial and not os.path.isdir(initial):
        initial = ""

    chosen = await asyncio.to_thread(open_native_folder_picker, initial)
    if not chosen:
        info = data_service.get_dataset_info(req.mode)
        return {
            "status": "cancelled",
            "folder": data_service.data_dir,
            "runs_count": len(data_service.get_raw_runs(mode=req.mode)),
            "games": data_service.get_games(req.mode),
            "detected_mode": info["detected_mode"],
            "laptop_names": info["laptop_names"],
            "power_profiles": info["power_profiles"]
        }

    count = data_service.scan_directory(chosen, mode=req.mode)
    info = data_service.get_dataset_info(req.mode)

    # Intelligently populate power profiles / hardware models into custom charts
    custom_chart_service.auto_sync_hardware(
        mode=req.mode,
        power_profiles=data_service.get_available_power_profiles(mode=req.mode),
        gpus=data_service.get_available_gpus(mode=req.mode),
        cpus=data_service.get_available_cpus(mode=req.mode),
        laptops=data_service.get_available_laptops(mode=req.mode)
    )

    return {
        "status": "success",
        "folder": chosen,
        "runs_count": count,
        "games": data_service.get_games(req.mode),
        "detected_mode": info["detected_mode"],
        "laptop_names": info["laptop_names"],
        "power_profiles": info["power_profiles"]
    }

@router.post("/scan")
async def scan_folder(req: ScanRequest = Body(default=ScanRequest())):
    target_dir = req.folder or settings.DEFAULT_DATA_DIR
    count = data_service.scan_directory(target_dir, mode=req.mode)
    info = data_service.get_dataset_info(req.mode)

    # Intelligently populate power profiles / hardware models into custom charts
    custom_chart_service.auto_sync_hardware(
        mode=req.mode,
        power_profiles=data_service.get_available_power_profiles(mode=req.mode),
        gpus=data_service.get_available_gpus(mode=req.mode),
        cpus=data_service.get_available_cpus(mode=req.mode),
        laptops=data_service.get_available_laptops(mode=req.mode)
    )

    return {
        "status": "success",
        "folder": target_dir,
        "runs_count": count,
        "games": data_service.get_games(req.mode),
        "detected_mode": info["detected_mode"],
        "laptop_names": info["laptop_names"],
        "power_profiles": info["power_profiles"]
    }

@router.post("/upload-captures")
async def upload_captures(
    request: Request,
    mode: Optional[str] = Query(None),
    append: bool = Query(False)
):
    # Support up to 50,000 files in a single dataset upload without Starlette throwing "Too many files"
    try:
        form = await request.form(max_files=50000, max_fields=50000)
    except Exception as e:
        logger.error(f"Form parsing error in upload-captures: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to parse uploaded form: {e}")

    files = form.getlist("files")
    parsed_runs = []
    detected_folder = "Uploaded Captures"

    for item in files:
        if not hasattr(item, "filename"):
            continue
        fname = item.filename or "capture.json"
        if not fname.lower().endswith(".json"):
            continue
        try:
            content_bytes = await item.read()
            text = content_bytes.decode("utf-8-sig", errors="ignore")
            data = json.loads(text)
            run = CapFrameXParser.parse_dict(data, file_path=fname)
            if run:
                parsed_runs.append(run)
                norm = fname.replace("\\", "/")
                parts = norm.split("/")
                if len(parts) > 1 and parts[0]:
                    detected_folder = parts[0]
        except Exception:
            continue

    if not parsed_runs and not append:
        raise HTTPException(status_code=400, detail="No valid CapFrameX JSON files found in selection")

    count = data_service.ingest_runs(parsed_runs, folder_name=detected_folder, mode=mode, append=append)
    info = data_service.get_dataset_info(mode)

    active_mode = "laptop" if (mode == "laptop" or "laptop" in (info.get("detected_mode") or "").lower()) else (mode or "pc")
    custom_chart_service.auto_sync_hardware(
        mode=active_mode,
        power_profiles=data_service.get_available_power_profiles(mode=active_mode),
        gpus=data_service.get_available_gpus(mode=active_mode),
        cpus=data_service.get_available_cpus(mode=active_mode),
        laptops=data_service.get_available_laptops(mode=active_mode)
    )

    return {
        "status": "success",
        "folder": detected_folder,
        "runs_count": count,
        "games": data_service.get_games(active_mode),
        "detected_mode": info["detected_mode"],
        "laptop_names": info["laptop_names"],
        "power_profiles": info["power_profiles"]
    }

@router.get("/dataset-info")
async def get_dataset_info(mode: Optional[str] = Query(None)):
    return data_service.get_dataset_info(mode)

@router.get("/games")
async def get_games(mode: Optional[str] = Query(None)):
    return {
        "games": data_service.get_games(mode)
    }

@router.get("/resolutions")
async def get_resolutions(game: Optional[str] = None, mode: Optional[str] = Query(None)):
    return {
        "resolutions": data_service.get_available_resolutions(game, mode=mode)
    }

@router.get("/hardware")
async def get_hardware(game: Optional[str] = None, mode: Optional[str] = Query(None)):
    return {
        "gpus": data_service.get_available_gpus(game, mode=mode),
        "cpus": data_service.get_available_cpus(game, mode=mode),
        "motherboards": data_service.get_available_motherboards(game, mode=mode),
        "laptops": data_service.get_available_laptops(game, mode=mode),
        "power_profiles": data_service.get_available_power_profiles(game, mode=mode)
    }

@router.get("/chart-data")
async def get_chart_data(
    game: str = Query(...),
    resolution: str = Query("1080p"),
    group_by: str = Query("gpu"),
    filter_gpu: Optional[str] = Query(None),
    filter_cpu: Optional[str] = Query(None),
    filter_motherboard: Optional[str] = Query(None),
    filter_laptop: Optional[str] = Query(None),
    filter_power_profile: Optional[str] = Query(None),
    aggregation: str = Query("average"),
    custom_product_name: Optional[str] = Query(None),
    mode: Optional[str] = Query(None)
):
    items = data_service.get_chart_data(
        game_name=game,
        resolution=resolution,
        group_by=group_by,
        filter_gpu=filter_gpu,
        filter_cpu=filter_cpu,
        filter_motherboard=filter_motherboard,
        filter_laptop=filter_laptop,
        filter_power_profile=filter_power_profile,
        aggregation=aggregation,
        custom_product_name=custom_product_name,
        mode=mode
    )
    return {
        "game": game,
        "resolution": resolution,
        "group_by": group_by,
        "aggregation": aggregation,
        "items": items
    }

@router.get("/tri-resolution")
async def get_tri_resolution(
    game: str = Query(...),
    group_by: str = Query("gpu"),
    filter_gpu: Optional[str] = Query(None),
    filter_cpu: Optional[str] = Query(None),
    filter_motherboard: Optional[str] = Query(None),
    filter_laptop: Optional[str] = Query(None),
    filter_power_profile: Optional[str] = Query(None),
    aggregation: str = Query("average"),
    custom_product_name: Optional[str] = Query(None),
    mode: Optional[str] = Query(None)
):
    data = data_service.get_tri_resolution_data(
        game_name=game,
        group_by=group_by,
        filter_gpu=filter_gpu,
        filter_cpu=filter_cpu,
        filter_motherboard=filter_motherboard,
        filter_laptop=filter_laptop,
        filter_power_profile=filter_power_profile,
        aggregation=aggregation,
        custom_product_name=custom_product_name,
        mode=mode
    )
    return {
        "game": game,
        "group_by": group_by,
        "aggregation": aggregation,
        "data": data
    }

@router.get("/aliases")
async def get_aliases():
    return data_service.aliases

@router.post("/aliases")
async def save_aliases(req: AliasRequest):
    data_service.save_aliases(req.aliases)
    return {"status": "success", "aliases": data_service.aliases}

@router.get("/runs")
async def get_raw_runs(
    game: Optional[str] = None,
    resolution: Optional[str] = None,
    mode: Optional[str] = Query(None)
):
    runs = data_service.get_raw_runs(game=game, resolution=resolution, mode=mode)
    return {
        "total": len(runs),
        "runs": runs
    }

@router.post("/mode")
async def set_mode(req: ModeRequest):
    clean = "laptop" if "laptop" in req.mode.lower() else "pc"
    data_service.current_mode = clean
    return {"status": "success", "mode": clean, "info": data_service.get_dataset_info(clean)}

class UpdateRunRequest(BaseModel):
    file_path: str
    comment: Optional[str] = None
    cpu: Optional[str] = None
    gpu: Optional[str] = None
    motherboard: Optional[str] = None
    ram: Optional[str] = None
    game_name: Optional[str] = None

class BatchUpdateRunsRequest(BaseModel):
    file_paths: List[str]
    comment: Optional[str] = None
    cpu: Optional[str] = None
    gpu: Optional[str] = None
    motherboard: Optional[str] = None
    ram: Optional[str] = None
    game_name: Optional[str] = None

@router.post("/runs/update")
async def update_run(req: UpdateRunRequest):
    updated = data_service.update_run_metadata(
        file_path=req.file_path,
        comment=req.comment,
        cpu=req.cpu,
        gpu=req.gpu,
        motherboard=req.motherboard,
        ram=req.ram,
        game_name=req.game_name
    )
    if not updated:
        raise HTTPException(status_code=400, detail="Failed to update run. Please verify file path.")
    return {
        "status": "success",
        "run": updated,
        "games": data_service.get_games(),
        "hardware": {
            "gpus": data_service.get_available_gpus(),
            "cpus": data_service.get_available_cpus(),
            "motherboards": data_service.get_available_motherboards()
        }
    }

@router.post("/runs/batch-update")
async def batch_update_runs(req: BatchUpdateRunsRequest):
    updated_list = data_service.batch_update_runs_metadata(
        file_paths=req.file_paths,
        comment=req.comment,
        cpu=req.cpu,
        gpu=req.gpu,
        motherboard=req.motherboard,
        ram=req.ram,
        game_name=req.game_name
    )
    return {
        "status": "success",
        "updated_count": len(updated_list),
        "runs": updated_list,
        "games": data_service.get_games(),
        "hardware": {
            "gpus": data_service.get_available_gpus(),
            "cpus": data_service.get_available_cpus(),
            "motherboards": data_service.get_available_motherboards()
        }
    }

class GpuHierarchyRequest(BaseModel):
    hierarchy: List[str]

@router.get("/gpu-hierarchy")
async def get_gpu_hierarchy():
    return {
        "hierarchy": gpu_hierarchy_service.hierarchy,
        "total": len(gpu_hierarchy_service.hierarchy)
    }

@router.post("/gpu-hierarchy")
async def save_gpu_hierarchy(req: GpuHierarchyRequest):
    success = gpu_hierarchy_service.save_hierarchy(req.hierarchy)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save GPU hierarchy")
    return {
        "status": "success",
        "hierarchy": gpu_hierarchy_service.hierarchy,
        "total": len(gpu_hierarchy_service.hierarchy)
    }

@router.post("/gpu-hierarchy/reset")
async def reset_gpu_hierarchy():
    hierarchy = gpu_hierarchy_service.reset_hierarchy()
    return {
        "status": "success",
        "hierarchy": hierarchy,
        "total": len(hierarchy)
    }

@router.get("/game-profiles")
async def get_game_profiles():
    profiles = game_profile_service.get_all_profiles()
    return {
        "status": "success",
        "profiles": profiles,
        "total": len(profiles),
        "config_file": str(game_profile_service.config_path)
    }

@router.post("/game-profiles")
async def save_game_profile(body: Dict[str, Any] = Body(...)):
    if "profiles" in body and isinstance(body["profiles"], dict):
        success = game_profile_service.save_all_profiles(body["profiles"])
    elif "game_name" in body:
        game_name = str(body["game_name"])
        profile_data = {
            "title": str(body.get("title", "")),
            "sub_header": str(body.get("sub_header", "")),
            "notes": str(body.get("notes", ""))
        }
        success = game_profile_service.save_profile(game_name, profile_data)
    else:
        success = game_profile_service.save_all_profiles(body)

    if not success:
        raise HTTPException(status_code=500, detail="Failed to save game profiles to disk")

    return {
        "status": "success",
        "profiles": game_profile_service.get_all_profiles(),
        "total": len(game_profile_service._profiles),
        "config_file": str(game_profile_service.config_path)
    }

@router.delete("/game-profiles/{game_name}")
async def delete_game_profile(game_name: str):
    success = game_profile_service.delete_profile(game_name)
    return {
        "status": "success" if success else "not_found",
        "profiles": game_profile_service.get_all_profiles(),
        "total": len(game_profile_service._profiles)
    }

@router.get("/custom-charts")
async def get_custom_charts(mode: Optional[str] = Query(None)):
    active_mode = mode or data_service.detected_mode or "pc"
    power_profiles = data_service.get_available_power_profiles(mode=active_mode)
    gpus = data_service.get_available_gpus(mode=active_mode)
    cpus = data_service.get_available_cpus(mode=active_mode)
    laptops = data_service.get_available_laptops(mode=active_mode)

    if power_profiles or gpus or cpus or laptops:
        custom_chart_service.auto_sync_hardware(
            mode=active_mode,
            power_profiles=power_profiles,
            gpus=gpus,
            cpus=cpus,
            laptops=laptops
        )

    charts = custom_chart_service.get_charts(mode=mode)
    return {
        "status": "success",
        "charts": charts,
        "total": len(charts)
    }

@router.get("/custom-charts/{chart_id}")
async def get_custom_chart(chart_id: str):
    chart = custom_chart_service.get_chart(chart_id)
    if not chart:
        raise HTTPException(status_code=404, detail="Custom chart not found")
    return {
        "status": "success",
        "chart": chart
    }

@router.post("/custom-charts")
async def save_custom_chart(body: Dict[str, Any] = Body(...)):
    chart = custom_chart_service.save_chart(body)
    return {
        "status": "success",
        "chart": chart,
        "charts": custom_chart_service.get_charts(mode=chart.get("mode"))
    }

@router.delete("/custom-charts/{chart_id}")
async def delete_custom_chart(chart_id: str):
    success = custom_chart_service.delete_chart(chart_id)
    return {
        "status": "success" if success else "not_found",
        "charts": custom_chart_service.get_charts()
    }
