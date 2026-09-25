import os
import json
import logging
from typing import List, Dict, Any, Optional, Set
from collections import defaultdict
import numpy as np

from app.capframex.core.parser import CapFrameXParser
from app.capframex.core.normalizer import STANDARD_RESOLUTIONS, MetricNormalizer
from app.capframex.services.gpu_hierarchy_service import gpu_hierarchy_service

logger = logging.getLogger(__name__)

class DatasetSession:
    """Encapsulates a distinct session/memory for PC Components vs Laptop benchmarks."""
    def __init__(self, mode: str = "pc"):
        self.mode: str = mode
        self.runs: List[Dict[str, Any]] = []
        self.data_dir: str = ""
        self.detected_mode: str = "laptop" if mode == "laptop" else "pc_components"
        self.laptop_names: List[str] = []
        self.power_profiles: List[str] = []

class DataService:
    def __init__(self, data_dir: str = "", alias_file: str = "aliases.json"):
        self.alias_file = alias_file
        self.aliases: Dict[str, str] = self._load_aliases()
        self.sessions: Dict[str, DatasetSession] = {
            "pc": DatasetSession("pc"),
            "laptop": DatasetSession("laptop")
        }
        self.current_mode: str = "pc"
        if data_dir:
            self.sessions["pc"].data_dir = data_dir

    def _get_session(self, mode: Optional[str] = None) -> DatasetSession:
        if mode:
            clean = "laptop" if "laptop" in mode.lower() else "pc"
            return self.sessions[clean]
        return self.sessions[self.current_mode]

    # Backwards-compatible properties
    @property
    def runs(self) -> List[Dict[str, Any]]:
        return self._get_session().runs

    @runs.setter
    def runs(self, val: List[Dict[str, Any]]):
        self._get_session().runs = val

    @property
    def data_dir(self) -> str:
        return self._get_session().data_dir

    @data_dir.setter
    def data_dir(self, val: str):
        self._get_session().data_dir = val

    @property
    def detected_mode(self) -> str:
        return self._get_session().detected_mode

    @detected_mode.setter
    def detected_mode(self, val: str):
        self._get_session().detected_mode = val

    @property
    def laptop_names(self) -> List[str]:
        return self._get_session().laptop_names

    @laptop_names.setter
    def laptop_names(self, val: List[str]):
        self._get_session().laptop_names = val

    @property
    def power_profiles(self) -> List[str]:
        return self._get_session().power_profiles

    @power_profiles.setter
    def power_profiles(self, val: List[str]):
        self._get_session().power_profiles = val

    def _load_aliases(self) -> Dict[str, str]:
        if os.path.exists(self.alias_file):
            try:
                with open(self.alias_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Failed to load aliases: {e}")
            return {}
        return {}

    def save_aliases(self, new_aliases: Dict[str, str]):
        self.aliases.update(new_aliases)
        try:
            with open(self.alias_file, "w", encoding="utf-8") as f:
                json.dump(self.aliases, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save aliases: {e}")

    def scan_directory(self, directory: Optional[str] = None, mode: Optional[str] = None) -> int:
        session = self._get_session(mode) if mode else None
        target_dir = directory or (session.data_dir if session else self.data_dir)
        if not target_dir or not os.path.isdir(target_dir):
            logger.warning(f"Target directory does not exist: {target_dir}")
            return 0

        parsed_runs = []
        for root, _, files in os.walk(target_dir):
            for file in files:
                if file.lower().endswith(".json"):
                    full_path = os.path.join(root, file)
                    run_data = CapFrameXParser.parse_file(full_path, scan_root=target_dir)
                    if run_data:
                        parsed_runs.append(run_data)

        # Detect mode if not explicitly forced
        target_mode = mode
        if not target_mode:
            laptop_count = sum(1 for r in parsed_runs if r.get("is_laptop") or r.get("is_power_profile_mode"))
            target_mode = "laptop" if (laptop_count > len(parsed_runs) / 2) else "pc"

        clean_mode = "laptop" if "laptop" in target_mode.lower() else "pc"
        active_sess = self.sessions[clean_mode]
        active_sess.data_dir = target_dir
        active_sess.runs = parsed_runs
        self.current_mode = clean_mode
        self._analyze_dataset(clean_mode)

        logger.info(f"Scanned {len(active_sess.runs)} runs from {target_dir} into '{clean_mode}' session (detected: {active_sess.detected_mode})")
        return len(active_sess.runs)

    def ingest_runs(
        self,
        new_runs: List[Dict[str, Any]],
        folder_name: str = "Uploaded Dataset",
        mode: Optional[str] = None,
        append: bool = False
    ) -> int:
        target_mode = mode
        if not target_mode:
            laptop_count = sum(1 for r in new_runs if r.get("is_laptop") or r.get("is_power_profile_mode"))
            target_mode = "laptop" if (laptop_count > len(new_runs) / 2) else "pc"

        clean_mode = "laptop" if "laptop" in target_mode.lower() else "pc"
        active_sess = self.sessions[clean_mode]
        active_sess.data_dir = folder_name
        if append:
            active_sess.runs.extend(new_runs)
        else:
            active_sess.runs = new_runs
        self.current_mode = clean_mode
        self._analyze_dataset(clean_mode)
        logger.info(f"Ingested {len(new_runs)} runs into '{clean_mode}' session (total: {len(active_sess.runs)}, append={append})")
        return len(active_sess.runs)

    def _analyze_dataset(self, mode: Optional[str] = None):
        sess = self._get_session(mode)
        if not sess.runs:
            sess.detected_mode = "laptop" if sess.mode == "laptop" else "pc_components"
            sess.laptop_names = []
            sess.power_profiles = []
            return

        laptop_count = sum(1 for r in sess.runs if r.get("is_laptop") or r.get("is_power_profile_mode"))
        sess.detected_mode = "laptop" if (laptop_count > len(sess.runs) / 2 or sess.mode == "laptop") else "pc_components"

        names: Set[str] = {r["laptop_name"] for r in sess.runs if r.get("laptop_name")}
        sess.laptop_names = sorted(list(names))

        profiles: Set[str] = {r["power_profile"] for r in sess.runs if r.get("power_profile") and r.get("power_profile") != "Default"}
        sess.power_profiles = sorted(list(profiles), key=lambda p: MetricNormalizer.get_power_profile_rank(p))

    def get_dataset_info(self, mode: Optional[str] = None) -> Dict[str, Any]:
        sess = self._get_session(mode)
        return {
            "total_runs": len(sess.runs),
            "folder": sess.data_dir,
            "detected_mode": sess.detected_mode,
            "laptop_names": sess.laptop_names,
            "power_profiles": sess.power_profiles,
            "games_count": len(self.get_games(mode))
        }

    def get_games(self, mode: Optional[str] = None) -> List[str]:
        sess = self._get_session(mode)
        games = sorted(list({r["game_name"] for r in sess.runs if r.get("game_name")}))
        return games

    def get_available_resolutions(self, game_name: Optional[str] = None, mode: Optional[str] = None) -> List[str]:
        sess = self._get_session(mode)
        if game_name:
            res_set = {r["resolution"] for r in sess.runs if r.get("game_name") == game_name}
        else:
            res_set = {r["resolution"] for r in sess.runs if r.get("resolution")}
        
        ordered = [r for r in STANDARD_RESOLUTIONS if r in res_set]
        others = sorted([r for r in res_set if r not in STANDARD_RESOLUTIONS])
        return ordered + others

    def get_available_gpus(self, game_name: Optional[str] = None, mode: Optional[str] = None) -> List[str]:
        sess = self._get_session(mode)
        if game_name:
            return sorted(list({r["gpu"] for r in sess.runs if r.get("game_name") == game_name and r.get("gpu")}))
        return sorted(list({r["gpu"] for r in sess.runs if r.get("gpu")}))

    def get_available_cpus(self, game_name: Optional[str] = None, mode: Optional[str] = None) -> List[str]:
        sess = self._get_session(mode)
        if game_name:
            return sorted(list({r["cpu"] for r in sess.runs if r.get("game_name") == game_name and r.get("cpu")}))
        return sorted(list({r["cpu"] for r in sess.runs if r.get("cpu")}))

    def get_available_motherboards(self, game_name: Optional[str] = None, mode: Optional[str] = None) -> List[str]:
        sess = self._get_session(mode)
        if game_name:
            return sorted(list({r["motherboard"] for r in sess.runs if r.get("game_name") == game_name and r.get("motherboard")}))
        return sorted(list({r["motherboard"] for r in sess.runs if r.get("motherboard")}))

    def get_available_laptops(self, game_name: Optional[str] = None, mode: Optional[str] = None) -> List[str]:
        sess = self._get_session(mode)
        if game_name:
            return sorted(list({r["laptop_name"] for r in sess.runs if r.get("game_name") == game_name and r.get("laptop_name")}))
        return sorted(list({r["laptop_name"] for r in sess.runs if r.get("laptop_name")}))

    def get_available_power_profiles(self, game_name: Optional[str] = None, mode: Optional[str] = None) -> List[str]:
        sess = self._get_session(mode)
        if game_name:
            profiles = {r["power_profile"] for r in sess.runs if r.get("game_name") == game_name and r.get("power_profile")}
        else:
            profiles = {r["power_profile"] for r in sess.runs if r.get("power_profile")}
        return sorted(list(profiles), key=lambda p: MetricNormalizer.get_power_profile_rank(p))

    def get_raw_runs(self, game: Optional[str] = None, resolution: Optional[str] = None, mode: Optional[str] = None) -> List[Dict[str, Any]]:
        # Defensive: if caller passed "pc" or "laptop" as resolution
        if resolution and resolution.lower() in ("pc", "laptop", "pc_components"):
            if not mode:
                mode = resolution
            resolution = None

        sess = self._get_session(mode)
        runs = sess.runs
        if game:
            runs = [r for r in runs if r.get("game_name", "").lower() == game.lower()]
        if resolution:
            runs = [r for r in runs if r.get("resolution", "").lower() == resolution.lower()]
        return runs

    def get_chart_data(
        self,
        game_name: str,
        resolution: str,
        group_by: str = "gpu",  # "gpu", "cpu", "motherboard", "laptop_power", "power_profile", "laptop_model", "laptop_gpu"
        filter_gpu: Optional[str] = None,
        filter_cpu: Optional[str] = None,
        filter_motherboard: Optional[str] = None,
        filter_laptop: Optional[str] = None,
        filter_power_profile: Optional[str] = None,
        aggregation: str = "average",  # "average" (default), "best", "latest"
        custom_product_name: Optional[str] = None,
        mode: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        sess = self._get_session(mode)
        # Filter all runs for the game
        game_runs = [r for r in sess.runs if r["game_name"].lower() == game_name.lower()]
        if not game_runs:
            return []

        # Resolution filtering:
        # If resolution is 'all', 'any', or 'native', or if no runs for this game match the specific resolution
        # (common in laptop captures where resolution is Native), include all game runs.
        req_res_lower = resolution.lower()
        if req_res_lower in ("all", "any", "native"):
            matched = game_runs
        else:
            has_exact = any(r["resolution"].lower() == req_res_lower for r in game_runs)
            if has_exact:
                matched = [r for r in game_runs if r["resolution"].lower() == req_res_lower]
            else:
                matched = game_runs

        if filter_gpu:
            matched = [r for r in matched if r["gpu"] == filter_gpu]
        if filter_cpu:
            matched = [r for r in matched if r["cpu"] == filter_cpu]
        if filter_motherboard:
            matched = [r for r in matched if r["motherboard"] == filter_motherboard]
        if filter_laptop:
            matched = [r for r in matched if r.get("laptop_name") == filter_laptop]
        if filter_power_profile:
            matched = [r for r in matched if r.get("power_profile") == filter_power_profile]

        if not matched:
            return []

        is_laptop_dataset = (sess.mode == "laptop") or any(r.get("is_laptop") or r.get("is_power_profile_mode") for r in matched)
        effective_group_by = group_by

        # Group runs by chosen component / profile key
        grouped = defaultdict(list)
        for r in matched:
            if effective_group_by in ("laptop_power", "laptop_profile"):
                raw_key = r.get("laptop_power_profile_label") or f"{r.get('laptop_name', 'Laptop')} - {r.get('power_profile', 'Standard')}"
            elif effective_group_by == "power_profile":
                raw_key = r.get("power_profile") or "Standard"
            elif effective_group_by == "laptop_model":
                raw_key = r.get("laptop_name") or "Laptop"
            elif effective_group_by in ("laptop_gpu", "laptop_gpu_spec") or (is_laptop_dataset and group_by == "gpu"):
                # Laptop GPU Spec: show GPU of laptop with CPU marker
                cpu_marker = f" ({r['cpu']})" if r.get("cpu") else ""
                raw_key = f"{r['gpu']}{cpu_marker}"
            elif effective_group_by == "cpu":
                raw_key = r["cpu"]
            elif effective_group_by == "motherboard":
                raw_key = r["motherboard"] or "Unknown Motherboard"
            else:  # default gpu
                raw_key = r["gpu"]
            
            grouped[raw_key].append(r)

        result = []
        for group_label, run_list in grouped.items():
            sample_run = run_list[0]
            display_name = group_label

            # Handle custom product name override for laptop_power mode
            if effective_group_by in ("laptop_power", "laptop_profile"):
                if custom_product_name and custom_product_name.strip():
                    profile_name = sample_run.get("power_profile", "Standard")
                    display_name = f"{custom_product_name.strip()} - {profile_name}"
                elif sample_run.get("laptop_name") and sample_run.get("power_profile"):
                    display_name = f"{sample_run['laptop_name']} - {sample_run['power_profile']}"
            elif effective_group_by in ("laptop_gpu", "laptop_gpu_spec") or (is_laptop_dataset and group_by == "gpu"):
                cpu_marker = f" ({sample_run['cpu']})" if sample_run.get("cpu") else ""
                display_name = f"{sample_run['gpu']}{cpu_marker}"

            # Check aliases
            display_name = self.aliases.get(display_name, self.aliases.get(group_label, display_name))

            if aggregation == "latest":
                chosen_run = sorted(run_list, key=lambda x: x.get("creation_date", ""), reverse=True)[0]
                metrics = chosen_run["metrics"]
            elif aggregation == "best":
                chosen_run = sorted(run_list, key=lambda x: x["metrics"]["average_fps"], reverse=True)[0]
                metrics = chosen_run["metrics"]
            else:  # "average" default
                avg_fps_list = [r["metrics"]["average_fps"] for r in run_list]
                p1_fps_list = [r["metrics"]["p1_fps"] for r in run_list]
                p01_fps_list = [r["metrics"]["p01_fps"] for r in run_list]
                median_fps_list = [r["metrics"]["median_fps"] for r in run_list]
                metrics = {
                    "average_fps": round(float(np.mean(avg_fps_list)), 1),
                    "p1_fps": round(float(np.mean(p1_fps_list)), 1),
                    "p01_fps": round(float(np.mean(p01_fps_list)), 1),
                    "median_fps": round(float(np.mean(median_fps_list)), 1),
                    "min_fps": round(float(np.min([r["metrics"]["min_fps"] for r in run_list])), 1),
                    "max_fps": round(float(np.max([r["metrics"]["max_fps"] for r in run_list])), 1),
                    "total_frames": sum(r["metrics"]["total_frames"] for r in run_list),
                    "total_duration_s": round(sum(r["metrics"]["total_duration_s"] for r in run_list), 2)
                }

            tier_rank = 999999
            matched_model = None
            if effective_group_by == "gpu" and not is_laptop_dataset:
                tier_rank, matched_model = gpu_hierarchy_service.get_tier_rank(display_name)
                if matched_model is None and sample_run.get("gpu"):
                    tier_rank, matched_model = gpu_hierarchy_service.get_tier_rank(sample_run["gpu"])

            result.append({
                "label": display_name,
                "raw_label": group_label,
                "laptop_name": sample_run.get("laptop_name", ""),
                "power_profile": sample_run.get("power_profile", ""),
                "power_rank": sample_run.get("power_rank", 50),
                "is_laptop": sample_run.get("is_laptop", False),
                "laptop_specs": sample_run.get("laptop_specs", ""),
                "gpu": sample_run["gpu"],
                "cpu": sample_run["cpu"],
                "motherboard": sample_run.get("motherboard", ""),
                "system_ram": sample_run.get("system_ram", ""),
                "api_info": sample_run.get("api_info", ""),
                "resolution": sample_run.get("resolution", resolution),
                "game_name": game_name,
                "run_count": len(run_list),
                "metrics": metrics,
                "average_fps": metrics["average_fps"],
                "p1_fps": metrics["p1_fps"],
                "p01_fps": metrics["p01_fps"],
                "tier_rank": tier_rank,
                "matched_model": matched_model
            })

        # Sort:
        if effective_group_by in ("laptop_power", "laptop_profile", "power_profile"):
            # Sort by power rank (Unleashed/Extreme -> Turbo -> Performance -> Standard -> Whisper -> Silent)
            # then by average fps descending
            result.sort(key=lambda x: (x.get("power_rank", 50), -x["average_fps"]))
        elif effective_group_by == "gpu" and not is_laptop_dataset:
            result.sort(key=lambda x: (x["tier_rank"], -x["average_fps"]))
        else:
            result.sort(key=lambda x: -x["average_fps"])

        return result

    def get_tri_resolution_data(
        self,
        game_name: str,
        group_by: str = "gpu",
        filter_gpu: Optional[str] = None,
        filter_cpu: Optional[str] = None,
        filter_motherboard: Optional[str] = None,
        filter_laptop: Optional[str] = None,
        filter_power_profile: Optional[str] = None,
        aggregation: str = "average",
        custom_product_name: Optional[str] = None,
        mode: Optional[str] = None
    ) -> Dict[str, List[Dict[str, Any]]]:
        sess = self._get_session(mode)
        available_res = self.get_available_resolutions(game_name, mode=mode)
        data = {}

        # If standard resolutions exist, populate them
        has_std = any(r in available_res for r in ["1080p", "1440p", "4K"])
        if has_std:
            for res in ["1080p", "1440p", "4K"]:
                data[res] = self.get_chart_data(
                    game_name=game_name,
                    resolution=res,
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
        else:
            # Laptop or single resolution dataset (e.g. Native)
            primary_res = available_res[0] if available_res else "Native"
            data[primary_res] = self.get_chart_data(
                game_name=game_name,
                resolution=primary_res,
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

        return data

    def update_run_metadata(
        self,
        file_path: str,
        comment: Optional[str] = None,
        cpu: Optional[str] = None,
        gpu: Optional[str] = None,
        motherboard: Optional[str] = None,
        ram: Optional[str] = None,
        game_name: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        normalized_path = os.path.normpath(file_path)
        disk_updated = False
        if os.path.exists(normalized_path):
            try:
                with open(normalized_path, "r", encoding="utf-8-sig") as f:
                    data = json.load(f)
                if "Info" not in data or not isinstance(data["Info"], dict):
                    data["Info"] = {}

                info = data["Info"]
                if comment is not None:
                    info["Comment"] = comment
                if cpu is not None:
                    info["Processor"] = cpu
                if gpu is not None:
                    info["GPU"] = gpu
                if motherboard is not None:
                    info["Motherboard"] = motherboard
                if ram is not None:
                    info["SystemRam"] = ram
                if game_name is not None:
                    info["GameName"] = game_name

                with open(normalized_path, "w", encoding="utf-8-sig") as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                disk_updated = True
            except Exception as e:
                logger.error(f"Failed to write updated JSON back to {normalized_path}: {e}")

        # Re-parse run with scan_root context and update in sessions if file was updated on disk
        if disk_updated:
            updated_run = CapFrameXParser.parse_file(normalized_path, scan_root=self.data_dir)
            if updated_run:
                for s in self.sessions.values():
                    found = False
                    for i, r in enumerate(s.runs):
                        if os.path.normpath(r.get("file_path", "")) == normalized_path or r.get("id") == updated_run.get("id"):
                            s.runs[i] = updated_run
                            found = True
                            break
                    if found:
                        self._analyze_dataset(s.mode)
                return updated_run

        # If file is not on disk (e.g. browser uploaded dataset), update in-memory run directly
        for s in self.sessions.values():
            for i, r in enumerate(s.runs):
                if (
                    r.get("file_path") == file_path
                    or os.path.normpath(r.get("file_path", "")) == normalized_path
                    or r.get("id") == file_path
                    or r.get("file_name") == file_path
                ):
                    if comment is not None:
                        r["raw_comment"] = comment
                        r["resolution"] = MetricNormalizer.extract_resolution(comment) or r.get("resolution", "1080p")
                    if cpu is not None:
                        r["cpu"] = MetricNormalizer.clean_cpu_name(cpu)
                        r["raw_cpu"] = cpu
                    if gpu is not None:
                        r["gpu"] = MetricNormalizer.clean_gpu_name(gpu)
                        r["raw_gpu"] = gpu
                    if motherboard is not None:
                        r["motherboard"] = motherboard
                    if ram is not None:
                        r["system_ram"] = ram
                    if game_name is not None:
                        r["game_name"] = game_name
                    self._analyze_dataset(s.mode)
                    return r

        return None

    def batch_update_runs_metadata(
        self,
        file_paths: List[str],
        comment: Optional[str] = None,
        cpu: Optional[str] = None,
        gpu: Optional[str] = None,
        motherboard: Optional[str] = None,
        ram: Optional[str] = None,
        game_name: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        updated_runs = []
        for fp in file_paths:
            res = self.update_run_metadata(
                file_path=fp,
                comment=comment,
                cpu=cpu,
                gpu=gpu,
                motherboard=motherboard,
                ram=ram,
                game_name=game_name,
            )
            if res:
                updated_runs.append(res)
        return updated_runs
