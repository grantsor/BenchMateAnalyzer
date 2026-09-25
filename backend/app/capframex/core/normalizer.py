import os
import re
from typing import Optional, Tuple

STANDARD_RESOLUTIONS = ["1080p", "1440p", "4K", "Native"]

GAME_NAME_MAPPINGS = {
    "assassins creed mirage": "Assassin's Creed Mirage",
    "assassin's creed mirage": "Assassin's Creed Mirage",
    "black myth: wukong": "Black Myth: Wukong",
    "black myth wukong": "Black Myth: Wukong",
    "counter-strike 2": "Counter-Strike 2",
    "cs2": "Counter-Strike 2",
    "cyberpunk 2077": "Cyberpunk 2077",
    "dota 2": "DOTA 2",
    "f1 23": "F1 23",
    "f1 24": "F1 24",
    "f1 25": "F1 25",
    "far cry 6": "Far Cry 6",
    "ghost of tsushima": "Ghost of Tsushima",
    "hogwarts legacy": "Hogwarts Legacy",
    "horizon forbidden west": "Horizon Forbidden West",
    "marvel's spider-man: miles morales": "Marvel's Spider-Man: Miles Morales",
    "marvels spider-man: miles morales": "Marvel's Spider-Man: Miles Morales",
    "returnal": "Returnal"
}

POWER_PROFILE_MAPPINGS = {
    "unleashed": "Unleashed",
    "unlashed": "Unleashed",
    "unlashed 2": "Unleashed 2",
    "unleashed 2": "Unleashed 2",
    "extreme": "Extreme",
    "turbo": "Turbo",
    "performance": "Performance",
    "perf": "Performance",
    "performance mode": "Performance Mode",
    "standard": "Standard",
    "balanced": "Balanced",
    "balanced mode": "Balanced Mode",
    "whisper": "Whisper",
    "whisper mode": "Whisper Mode",
    "quiet": "Quiet",
    "silent": "Silent",
    "silent mode": "Silent Mode",
    "eco": "Eco",
    "battery": "Battery",
    "custom": "Custom",
    "default": "Default"
}

POWER_PROFILE_RANKS = {
    "unleashed": 1,
    "unlashed": 1,
    "unleashed 2": 1,
    "extreme": 1,
    "turbo": 2,
    "performance": 3,
    "perf": 3,
    "performance mode": 3,
    "standard": 4,
    "balanced": 4,
    "balanced mode": 4,
    "whisper": 5,
    "whisper mode": 5,
    "quiet": 5,
    "silent": 5,
    "silent mode": 5,
    "eco": 6,
    "battery": 7,
    "custom": 8,
    "default": 9
}

GENERIC_SUBDIRS = {"captures", "runs", "data", "benchmark", "benchmarks", "json", "logs", "output"}

class MetricNormalizer:
    @staticmethod
    def is_standard_resolution(val: Optional[str]) -> bool:
        if not val:
            return False
        c = str(val).strip().lower()
        if not c:
            return False
        # Matches patterns like 1080p, 1080, 1440p, 1440, 4k, 2160p, 2160, 720p, 720, fhd, qhd, uhd
        res_pattern = re.compile(r"\b(4k|2160p?|1440p?|2k|1080p?|720p?|fhd|qhd|uhd)\b", re.IGNORECASE)
        return bool(res_pattern.search(c))

    @staticmethod
    def normalize_resolution(comment: Optional[str], fallback: str = "Native") -> str:
        if not comment:
            return fallback
        
        c = str(comment).strip().lower()
        if not c:
            return fallback

        if "4k" in c or "2160" in c or "uhd" in c:
            return "4K"
        if "1440" in c or "2k" in c or "qhd" in c:
            return "1440p"
        if "1080" in c or "fhd" in c:
            return "1080p"
        if "720" in c or "hd" in c:
            return "720p"

        return fallback

    @staticmethod
    def is_power_profile(comment: Optional[str]) -> bool:
        if not comment:
            return False
        c = str(comment).strip().lower()
        if not c:
            return False
        if MetricNormalizer.is_standard_resolution(c):
            return False
        for prefix in POWER_PROFILE_MAPPINGS:
            if prefix in c:
                return True
        return True

    @staticmethod
    def normalize_power_profile(comment: Optional[str], fallback: str = "Standard") -> str:
        if not comment:
            return fallback
        c = str(comment).strip()
        lower = c.lower()
        if lower in POWER_PROFILE_MAPPINGS:
            return POWER_PROFILE_MAPPINGS[lower]
        
        # Check partial mapping
        for key, display in POWER_PROFILE_MAPPINGS.items():
            if lower.startswith(key):
                suffix = c[len(key):].strip()
                if suffix:
                    return f"{display} {suffix}"
                return display

        # Default: clean and title-case
        return " ".join(word.capitalize() for word in c.split())

    @staticmethod
    def get_power_profile_rank(profile: Optional[str]) -> int:
        if not profile:
            return 99
        lower = profile.strip().lower()
        return POWER_PROFILE_RANKS.get(lower, 50)

    @staticmethod
    def clean_laptop_name(folder_name: str) -> str:
        if not folder_name:
            return "Laptop"
        cleaned = folder_name.strip()
        # Clean trailing ' DATA', ' Data', ' Captures', ' Review'
        cleaned = re.sub(r"(?i)\s+(data|captures|benchmarks?|review)$", "", cleaned).strip()
        return cleaned or folder_name.strip()

    @staticmethod
    def extract_main_folder_name(file_path: str, scan_root: str = "") -> str:
        norm_file = os.path.normpath(file_path)
        file_dir = os.path.dirname(norm_file)
        dir_name = os.path.basename(file_dir)

        if scan_root and os.path.isdir(scan_root):
            norm_root = os.path.normpath(scan_root)
            try:
                rel = os.path.relpath(norm_file, norm_root)
                parts = rel.split(os.sep)
                if len(parts) > 1:
                    first_sub = parts[0]
                    # If first_sub is generic like Captures, look at norm_root
                    if first_sub.lower() in GENERIC_SUBDIRS:
                        root_base = os.path.basename(norm_root)
                        if root_base.lower() in GENERIC_SUBDIRS:
                            return os.path.basename(os.path.dirname(norm_root))
                        return root_base
                    # If first subfolder is not a generic folder, it might be the laptop folder
                    return first_sub
            except Exception:
                pass

            root_base = os.path.basename(norm_root)
            if root_base.lower() in GENERIC_SUBDIRS:
                parent_base = os.path.basename(os.path.dirname(norm_root))
                if parent_base:
                    return parent_base
            elif root_base:
                return root_base

        if dir_name.lower() in GENERIC_SUBDIRS:
            parent_dir = os.path.dirname(file_dir)
            parent_base = os.path.basename(parent_dir)
            if parent_base:
                return parent_base
        return dir_name

    @staticmethod
    def is_laptop_system(gpu: Optional[str] = None, cpu: Optional[str] = None, comment: Optional[str] = None) -> bool:
        gpu_str = str(gpu or "").lower()
        cpu_str = str(cpu or "").lower()
        if "laptop gpu" in gpu_str or "mobile" in gpu_str or "max-q" in gpu_str:
            return True
        if any(term in cpu_str for term in ["hx", "hs", "ultra 9", "ultra 7", "ultra 5", "core 7", "core 5"]):
            return True
        if comment and MetricNormalizer.is_power_profile(comment):
            return True
        return False

    @staticmethod
    def normalize_game_name(game_name: Optional[str]) -> str:
        if not game_name:
            return "Unknown Game"
        cleaned = str(game_name).strip()
        lower = cleaned.lower()
        return GAME_NAME_MAPPINGS.get(lower, cleaned)

    @staticmethod
    def clean_hardware_name(hardware_name: Optional[str]) -> str:
        if not hardware_name:
            return "Unknown"
        return " ".join(str(hardware_name).strip().split())
