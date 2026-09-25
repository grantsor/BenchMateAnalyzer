import os
import json
import logging
from typing import Dict, Any, Optional
from pathlib import Path

logger = logging.getLogger(__name__)

class GameProfileService:
    def __init__(self, config_file: Optional[str] = None):
        if config_file:
            self.config_path = Path(config_file)
        else:
            # Check multiple candidates: data/capframex, data, next to exe, app/capframex/data
            from app.config import settings
            candidates = [
                settings.DATA_DIR / "capframex" / "game_profiles.json",
                settings.DATA_DIR / "game_profiles.json",
                settings.APP_DIR / "game_profiles.json",
                Path(__file__).resolve().parent.parent / "data" / "game_profiles.json"
            ]
            self.config_path = candidates[0]
            for c in candidates:
                if c.exists():
                    self.config_path = c
                    break

        self._profiles: Dict[str, Dict[str, str]] = {}
        self._last_mtime: float = 0.0
        self.load_profiles()

    def _should_reload(self) -> bool:
        if not self.config_path.exists():
            return False
        try:
            mtime = self.config_path.stat().st_mtime
            return mtime > self._last_mtime
        except Exception:
            return False

    def load_profiles(self) -> Dict[str, Dict[str, str]]:
        """Loads profiles from JSON file. Auto-reloads if modified on disk (e.g. edited in Notepad)."""
        if not self.config_path.exists():
            self._profiles = {}
            return self._profiles

        try:
            self._last_mtime = self.config_path.stat().st_mtime
            with open(self.config_path, "r", encoding="utf-8-sig") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    self._profiles = data
                else:
                    self._profiles = {}
        except Exception as e:
            logger.error(f"Failed to load game profiles from {self.config_path}: {e}")
            if not self._profiles:
                self._profiles = {}

        return self._profiles

    def reload(self) -> Dict[str, Dict[str, str]]:
        return self.load_profiles()

    def get_all_profiles(self) -> Dict[str, Dict[str, str]]:
        if self._should_reload():
            self.load_profiles()
        return dict(self._profiles)

    def get_profile(self, game_name: str) -> Optional[Dict[str, str]]:
        if self._should_reload():
            self.load_profiles()

        if not game_name:
            return None

        # Exact match first
        if game_name in self._profiles:
            return self._profiles[game_name]

        # Case-insensitive match
        norm = game_name.strip().lower()
        for k, v in self._profiles.items():
            if k.strip().lower() == norm:
                return v

        return None

    def save_profile(self, game_name: str, profile_data: Dict[str, str]) -> bool:
        if not game_name or not game_name.strip():
            return False

        clean_name = game_name.strip()
        self.load_profiles()

        # Update or insert
        # Preserve original key casing if case-insensitive match exists
        target_key = clean_name
        for k in self._profiles.keys():
            if k.strip().lower() == clean_name.lower():
                target_key = k
                break

        title = (profile_data.get("title") or clean_name).strip()
        sub_header = (profile_data.get("sub_header") or "").strip()
        notes = (profile_data.get("notes") or "").strip()

        self._profiles[target_key] = {
            "title": title,
            "sub_header": sub_header,
            "notes": notes
        }

        return self._write_to_disk()

    def delete_profile(self, game_name: str) -> bool:
        if not game_name:
            return False

        self.load_profiles()
        target_key = None
        for k in self._profiles.keys():
            if k.strip().lower() == game_name.strip().lower():
                target_key = k
                break

        if target_key and target_key in self._profiles:
            del self._profiles[target_key]
            return self._write_to_disk()

        return False

    def save_all_profiles(self, new_profiles: Dict[str, Dict[str, str]]) -> bool:
        if not isinstance(new_profiles, dict):
            return False

        clean: Dict[str, Dict[str, str]] = {}
        for k, v in new_profiles.items():
            if k and isinstance(k, str) and k.strip():
                clean[k.strip()] = {
                    "title": (v.get("title") or k).strip(),
                    "sub_header": (v.get("sub_header") or "").strip(),
                    "notes": (v.get("notes") or "").strip()
                }

        self._profiles = clean
        return self._write_to_disk()

    def _write_to_disk(self) -> bool:
        try:
            self.config_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.config_path, "w", encoding="utf-8") as f:
                json.dump(self._profiles, f, indent=2, ensure_ascii=False)
            self._last_mtime = self.config_path.stat().st_mtime
            logger.info(f"Saved {len(self._profiles)} game profiles to {self.config_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to save game profiles to {self.config_path}: {e}")
            return False

# Global singleton
game_profile_service = GameProfileService()
