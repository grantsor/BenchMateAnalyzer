import os
import json
import re
import logging
from typing import List, Tuple, Optional, Dict, Any
from pathlib import Path

logger = logging.getLogger(__name__)

DEFAULT_GPU_HIERARCHY: List[str] = [
    "RTX 5090",
    "RTX 5080",
    "RTX 5070 Ti",
    "RTX 5070",
    "RTX 5060 Ti 16GB",
    "RTX 5060 Ti 8GB",
    "RTX 5060",
    "RX 9070 XT",
    "RX 9070",
    "RX 9070 GRE",
    "RX 9060 XT 16GB",
    "RX 9060 XT 8GB",
    "RTX 4090",
    "RTX 4080 Super",
    "RTX 4080",
    "RTX 4070 Ti Super",
    "RTX 4070 Ti",
    "RTX 4070 Super",
    "RTX 4070",
    "RTX 4060 Ti",
    "RTX 4060",
    "RTX 3090",
    "RTX 3080 Ti",
    "RTX 3080",
    "RTX 3070 Ti",
    "RTX 3070",
    "RTX 3060",
    "RTX 3050"
]

class GpuHierarchyService:
    def __init__(self, config_file: Optional[str] = None):
        if config_file:
            self.config_path = Path(config_file)
        else:
            from app.config import settings
            candidates = [
                settings.DATA_DIR / "capframex" / "gpu_hierarchy.json",
                settings.BASE_DIR / "app" / "capframex" / "data" / "gpu_hierarchy.json",
                Path(__file__).resolve().parent.parent / "data" / "gpu_hierarchy.json",
                settings.APP_DIR / "gpu_hierarchy.json"
            ]
            self.config_path = candidates[0]
            for c in candidates:
                if c.exists():
                    self.config_path = c
                    break

        self.hierarchy: List[str] = []
        self.matchers: List[Tuple[int, int, int, str, re.Pattern]] = []
        self.load_hierarchy()

    def _compile_matchers(self):
        """
        Compile regex matchers for each model in hierarchy, sorted by specificity descending.
        This ensures 'RTX 5060 Ti 8GB' is checked before 'RTX 5060 Ti' or 'RTX 5060',
        and 'RX 9070 XT' / 'RX 9070 GRE' are checked before 'RX 9070'.
        """
        matchers = []
        for idx, model in enumerate(self.hierarchy):
            parts = model.strip().split()
            regex_parts = []
            for p in parts:
                p_lower = re.escape(p.lower())
                m_gb = re.match(r"^(\d+)(?:gb|g)$", p.lower())
                if m_gb:
                    num = m_gb.group(1)
                    # Match 8GB, 8 GB, 8g
                    regex_parts.append(rf"(?:{num}\s*(?:gb|g\b)|\b{num}gb\b)")
                else:
                    regex_parts.append(rf"\b{p_lower}\b")

            pattern = r".*".join(regex_parts)
            compiled = re.compile(pattern, re.IGNORECASE)
            # Tuple: (token_count, string_length, original_rank, model_name, compiled_regex)
            matchers.append((len(parts), len(model), idx, model, compiled))

        # Sort by token count desc, then length desc (most specific first)
        matchers.sort(key=lambda x: (x[0], x[1]), reverse=True)
        self.matchers = matchers

    def load_hierarchy(self) -> List[str]:
        if self.config_path.exists():
            try:
                with open(self.config_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list) and all(isinstance(x, str) for x in data):
                        self.hierarchy = [x.strip() for x in data if x.strip()]
                        self._compile_matchers()
                        logger.info(f"Loaded {len(self.hierarchy)} GPU hierarchy tiers from {self.config_path}")
                        return self.hierarchy
            except Exception as e:
                logger.error(f"Error loading GPU hierarchy from {self.config_path}: {e}")

        # Fallback to default
        self.hierarchy = list(DEFAULT_GPU_HIERARCHY)
        self.save_hierarchy(self.hierarchy)
        return self.hierarchy

    def save_hierarchy(self, new_hierarchy: List[str]) -> bool:
        clean = [m.strip() for m in new_hierarchy if m and isinstance(m, str) and m.strip()]
        self.hierarchy = clean
        self._compile_matchers()
        try:
            self.config_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.config_path, "w", encoding="utf-8") as f:
                json.dump(self.hierarchy, f, indent=2)
            logger.info(f"Saved {len(self.hierarchy)} GPU hierarchy tiers to {self.config_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to save GPU hierarchy: {e}")
            return False

    def reset_hierarchy(self) -> List[str]:
        self.save_hierarchy(list(DEFAULT_GPU_HIERARCHY))
        return self.hierarchy

    def get_tier_rank(self, gpu_name: str) -> Tuple[int, Optional[str]]:
        """
        Match a raw GPU name, display name, or card description against the hierarchy.
        Returns:
            (rank_index, matched_model)
            rank_index is 0 for highest tier (e.g. RTX 5090).
            If unranked, returns (999999, None).
        """
        if not gpu_name:
            return (999999, None)

        target = gpu_name.strip()
        for _, _, rank, model, regex in self.matchers:
            if regex.search(target):
                return (rank, model)

        return (999999, None)

# Global singleton
gpu_hierarchy_service = GpuHierarchyService()
