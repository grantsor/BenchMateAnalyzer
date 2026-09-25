import os
import json
import logging
from typing import Dict, Any, Optional
from .calculator import FrameMetricCalculator
from .normalizer import MetricNormalizer

logger = logging.getLogger(__name__)

class CapFrameXParser:
    @staticmethod
    def parse_dict(data: Dict[str, Any], file_path: str = "", scan_root: str = "") -> Optional[Dict[str, Any]]:
        info = data.get("Info", {})
        runs = data.get("Runs", [])

        if not runs:
            logger.warning(f"No runs found in {file_path or 'data'}")
            return None

        # Extract frame time delta array (MsBetweenPresents)
        first_run = runs[0]
        capture_data = first_run.get("CaptureData", {})
        ms_between_presents = capture_data.get("MsBetweenPresents", [])

        if not ms_between_presents:
            logger.warning(f"No MsBetweenPresents data in {file_path or 'data'}")
            return None

        metrics = FrameMetricCalculator.calculate_fps_metrics(ms_between_presents)

        raw_game = info.get("GameName", "")
        raw_comment = (info.get("Comment") or "").strip()
        game_name = MetricNormalizer.normalize_game_name(raw_game)

        raw_gpu = info.get("GPU") or ""
        raw_cpu = info.get("Processor") or ""
        gpu = MetricNormalizer.clean_hardware_name(raw_gpu or "Unknown GPU")
        cpu = MetricNormalizer.clean_hardware_name(raw_cpu or "Unknown CPU")

        # Determine laptop name from folder structure or virtual path
        main_folder = MetricNormalizer.extract_main_folder_name(file_path, scan_root)
        laptop_name = MetricNormalizer.clean_laptop_name(main_folder)

        # Distinguish resolution vs power profile
        is_resolution = MetricNormalizer.is_standard_resolution(raw_comment)
        is_laptop = MetricNormalizer.is_laptop_system(gpu, cpu, raw_comment)

        if is_resolution:
            resolution = MetricNormalizer.normalize_resolution(raw_comment, fallback="Native")
            power_profile = "Default"
            is_power_profile_mode = False
        else:
            # Comment is the power profile (e.g. Unleashed, Performance, Standard, Whisper)
            power_profile = MetricNormalizer.normalize_power_profile(raw_comment, fallback="Standard")
            resolution = "Native"
            is_power_profile_mode = True
            is_laptop = True

        power_rank = MetricNormalizer.get_power_profile_rank(power_profile)
        laptop_specs = f"{cpu} | {gpu}"
        laptop_power_label = f"{laptop_name} - {power_profile}"

        file_name = os.path.basename(file_path) if file_path else "capture.json"

        return {
            "id": info.get("Id") or file_name,
            "file_path": file_path,
            "file_name": file_name,
            "game_name": game_name,
            "raw_game_name": raw_game,
            "resolution": resolution,
            "raw_comment": raw_comment,
            "power_profile": power_profile,
            "power_rank": power_rank,
            "is_power_profile_mode": is_power_profile_mode,
            "is_laptop": is_laptop,
            "laptop_name": laptop_name,
            "laptop_specs": laptop_specs,
            "laptop_power_profile_label": laptop_power_label,
            "gpu": gpu,
            "raw_gpu": raw_gpu,
            "cpu": cpu,
            "raw_cpu": raw_cpu,
            "motherboard": info.get("Motherboard") or "",
            "system_ram": info.get("SystemRam") or "",
            "gpu_driver": info.get("GPUDriverVersion") or "",
            "api_info": info.get("ApiInfo") or "",
            "process_name": info.get("ProcessName") or "",
            "creation_date": info.get("CreationDate") or "",
            "metrics": metrics
        }

    @staticmethod
    def parse_file(file_path: str, scan_root: str = "") -> Optional[Dict[str, Any]]:
        if not os.path.exists(file_path):
            logger.warning(f"File does not exist: {file_path}")
            return None

        try:
            with open(file_path, "r", encoding="utf-8-sig") as f:
                data = json.load(f)
        except Exception as e:
            logger.error(f"Failed to read or parse JSON {file_path}: {e}")
            return None

        return CapFrameXParser.parse_dict(data, file_path=file_path, scan_root=scan_root)
