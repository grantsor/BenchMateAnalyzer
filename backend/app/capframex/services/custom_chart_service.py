import os
import json
import logging
from typing import Dict, Any, List, Optional
from pathlib import Path

logger = logging.getLogger(__name__)

DEFAULT_CHARTS: List[Dict[str, Any]] = [
    {
        "id": "pc_temps",
        "name": "GPU Temperatures",
        "mode": "pc",
        "category": "temperatures",
        "title": "GPU TEMPERATURES",
        "sub_header": "PEAK LOAD TEMPERATURES (°C) | LOWER IS BETTER",
        "unit": "°C",
        "higher_is_better": False,
        "metric_name": "Temperature",
        "metric2_name": "",
        "metric2_unit": "",
        "rows": [],
        "notes": ""
    },
    {
        "id": "pc_power",
        "name": "Power Consumption",
        "mode": "pc",
        "category": "power",
        "title": "TOTAL BOARD POWER CONSUMPTION",
        "sub_header": "PEAK GAMING POWER (WATTS) | LOWER IS BETTER",
        "unit": "W",
        "higher_is_better": False,
        "metric_name": "Power",
        "metric2_name": "",
        "metric2_unit": "",
        "rows": [],
        "notes": ""
    },
    {
        "id": "laptop_cpu_temps",
        "name": "CPU Temperatures",
        "mode": "laptop",
        "category": "temperatures",
        "title": "CPU TEMPERATURES",
        "sub_header": "MAX CPU TEMPERATURES (°C) | LOWER IS BETTER",
        "unit": "°C",
        "higher_is_better": False,
        "metric_name": "CPU Temp",
        "metric2_name": "",
        "metric2_unit": "",
        "rows": [],
        "notes": ""
    },
    {
        "id": "laptop_gpu_temps",
        "name": "GPU Temperatures",
        "mode": "laptop",
        "category": "temperatures",
        "title": "GPU TEMPERATURES",
        "sub_header": "MAX GPU TEMPERATURES (°C) | LOWER IS BETTER",
        "unit": "°C",
        "higher_is_better": False,
        "metric_name": "GPU Temp",
        "metric2_name": "",
        "metric2_unit": "",
        "rows": [],
        "notes": ""
    },
    {
        "id": "laptop_battery_life",
        "name": "Battery Life",
        "mode": "laptop",
        "category": "battery",
        "title": "BATTERY LIFE RUNTIME",
        "sub_header": "BATTERY RUNTIME (MINUTES) | HIGHER IS BETTER",
        "unit": "mins",
        "higher_is_better": True,
        "metric_name": "Battery Runtime",
        "metric2_name": "",
        "metric2_unit": "",
        "rows": [],
        "notes": ""
    }
]

class CustomChartService:
    def __init__(self, config_file: Optional[str] = None):
        if config_file:
            self.config_path = Path(config_file)
        else:
            from app.config import settings
            candidates = [
                settings.DATA_DIR / "capframex" / "custom_charts.json",
                settings.DATA_DIR / "custom_charts.json",
                settings.APP_DIR / "custom_charts.json",
                Path(__file__).resolve().parent.parent / "data" / "custom_charts.json"
            ]
            self.config_path = candidates[0]
            for c in candidates:
                if c.exists():
                    self.config_path = c
                    break

        self._charts: Dict[str, Dict[str, Any]] = {}
        self._last_mtime: float = 0.0
        self.load_charts()

    def _should_reload(self) -> bool:
        if not self.config_path.exists():
            return False
        try:
            mtime = self.config_path.stat().st_mtime
            return mtime > self._last_mtime
        except Exception:
            return False

    def load_charts(self) -> Dict[str, Dict[str, Any]]:
        """Loads custom charts from JSON file. Auto-initializes defaults if file missing."""
        if not self.config_path.exists():
            self._charts = {c["id"]: dict(c) for c in DEFAULT_CHARTS}
            self._write_to_disk()
            return self._charts

        try:
            self._last_mtime = self.config_path.stat().st_mtime
            with open(self.config_path, "r", encoding="utf-8-sig") as f:
                data = json.load(f)
                if isinstance(data, list):
                    self._charts = {c["id"]: c for c in data if isinstance(c, dict) and "id" in c}
                elif isinstance(data, dict):
                    self._charts = data
                else:
                    self._charts = {}
        except Exception as e:
            logger.error(f"Failed to load custom charts from {self.config_path}: {e}")
            if not self._charts:
                self._charts = {c["id"]: dict(c) for c in DEFAULT_CHARTS}

        # Ensure baseline default templates exist if empty
        if not self._charts:
            self._charts = {c["id"]: dict(c) for c in DEFAULT_CHARTS}
            self._write_to_disk()

        return self._charts

    def get_charts(self, mode: Optional[str] = None) -> List[Dict[str, Any]]:
        if self._should_reload():
            self.load_charts()

        charts = list(self._charts.values())
        if mode:
            charts = [c for c in charts if c.get("mode") == mode]
        return charts

    def get_chart(self, chart_id: str) -> Optional[Dict[str, Any]]:
        if self._should_reload():
            self.load_charts()
        return self._charts.get(chart_id)

    def save_chart(self, chart_data: Dict[str, Any]) -> Dict[str, Any]:
        self.load_charts()

        chart_id = chart_data.get("id")
        if not chart_id or not str(chart_id).strip():
            # Generate ID from name
            raw_name = chart_data.get("name") or "custom_chart"
            slug = raw_name.lower().replace(" ", "_").replace("-", "_")
            mode = chart_data.get("mode") or "pc"
            chart_id = f"{mode}_{slug}_{int(os.path.getmtime(self.config_path) if self.config_path.exists() else 0)}"

        chart_id = str(chart_id).strip()

        cleaned_chart = {
            "id": chart_id,
            "name": str(chart_data.get("name") or "Custom Chart").strip(),
            "mode": str(chart_data.get("mode") or "pc").strip(),
            "category": str(chart_data.get("category") or "custom").strip(),
            "title": str(chart_data.get("title") or chart_data.get("name") or "CUSTOM CHART").strip(),
            "sub_header": str(chart_data.get("sub_header") or "").strip(),
            "unit": str(chart_data.get("unit") or "").strip(),
            "higher_is_better": bool(chart_data.get("higher_is_better", False)),
            "metric_name": str(chart_data.get("metric_name") or "Value").strip(),
            "metric2_name": str(chart_data.get("metric2_name") or "").strip(),
            "metric2_unit": str(chart_data.get("metric2_unit") or "").strip(),
            "rows": chart_data.get("rows") or [],
            "notes": str(chart_data.get("notes") or "").strip()
        }

        self._charts[chart_id] = cleaned_chart
        self._write_to_disk()
        return cleaned_chart

    def delete_chart(self, chart_id: str) -> bool:
        self.load_charts()
        if chart_id in self._charts:
            del self._charts[chart_id]
            return self._write_to_disk()
        return False

    def auto_sync_hardware(
        self,
        mode: str,
        power_profiles: Optional[List[str]] = None,
        gpus: Optional[List[str]] = None,
        cpus: Optional[List[str]] = None,
        laptops: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """Intelligently populates hardware models or power profiles as rows into default / custom charts.
        Preserves existing user-entered numeric values and extra custom rows."""
        self.load_charts()
        changed = False

        clean_profiles = [str(p).strip() for p in (power_profiles or []) if p and str(p).strip()]
        clean_gpus = [str(g).strip() for g in (gpus or []) if g and str(g).strip()]
        clean_cpus = [str(c).strip() for c in (cpus or []) if c and str(c).strip()]
        clean_laptops = [str(l).strip() for l in (laptops or []) if l and str(l).strip()]

        for chart_id, chart in self._charts.items():
            chart_mode = chart.get("mode", "pc")
            if chart_mode != mode:
                continue

            target_items: List[str] = []
            item_type = "item"

            if chart_mode == "laptop":
                # For laptops, temperatures, power, battery life compare power profiles (or laptops if no profiles)
                if clean_profiles:
                    target_items = clean_profiles
                    item_type = "profile"
                elif clean_laptops:
                    target_items = clean_laptops
                    item_type = "laptop"
            else:
                # For PC components, compare GPUs (or CPUs if specified)
                name_title = (chart.get("name", "") + " " + chart.get("title", "")).lower()
                if "cpu" in name_title and clean_cpus:
                    target_items = clean_cpus
                    item_type = "cpu"
                elif clean_gpus:
                    target_items = clean_gpus
                    item_type = "gpu"

            if not target_items:
                continue

            existing_rows = chart.get("rows") or []
            existing_map = {}
            for r in existing_rows:
                if isinstance(r, dict) and r.get("label"):
                    existing_map[r["label"].strip().lower()] = r

            new_rows = []
            chart_changed = False

            # Add all target items in order
            for idx, item in enumerate(target_items):
                key = item.strip().lower()
                if key in existing_map:
                    # Keep existing row with any user-entered values
                    new_rows.append(existing_map.pop(key))
                else:
                    # Pre-fill new hardware row
                    chart_changed = True
                    new_row = {
                        "id": f"row_{item_type}_{idx}_{item.replace(' ', '_')}",
                        "label": item,
                        "value": None,
                        "value2": None
                    }
                    if item_type == "gpu":
                        new_row["gpu"] = item
                    elif item_type == "cpu":
                        new_row["cpu"] = item
                    new_rows.append(new_row)

            # Preserve any extra manually added rows that didn't match target_items
            for leftover in existing_map.values():
                new_rows.append(leftover)

            if chart_changed or len(new_rows) != len(existing_rows):
                chart["rows"] = new_rows
                changed = True

        if changed:
            self._write_to_disk()

        return [c for c in self._charts.values() if c.get("mode") == mode]

    def _write_to_disk(self) -> bool:
        try:
            self.config_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.config_path, "w", encoding="utf-8") as f:
                json.dump(list(self._charts.values()), f, indent=2, ensure_ascii=False)
            self._last_mtime = self.config_path.stat().st_mtime
            logger.info(f"Saved {len(self._charts)} custom charts to {self.config_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to save custom charts to {self.config_path}: {e}")
            return False

# Global singleton
custom_chart_service = CustomChartService()
