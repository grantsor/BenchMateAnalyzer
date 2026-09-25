import unittest
import os
import sys
import json

backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from app.main import app
from app.capframex.services.game_profile_service import GameProfileService

client = TestClient(app)

class TestGameProfiles(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from app.capframex.services.game_profile_service import game_profile_service
        cls.config_path = game_profile_service.config_path
        if os.path.exists(cls.config_path):
            with open(cls.config_path, "r", encoding="utf-8") as f:
                cls.original_content = f.read()
        else:
            cls.original_content = "{}"

    @classmethod
    def tearDownClass(cls):
        if hasattr(cls, "config_path") and hasattr(cls, "original_content"):
            with open(cls.config_path, "w", encoding="utf-8") as f:
                f.write(cls.original_content)
        from app.capframex.services.game_profile_service import game_profile_service
        game_profile_service.reload()

    def test_01_get_game_profiles(self):
        res = client.get("/api/game-profiles")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        self.assertIn("profiles", data)
        self.assertIn("config_file", data)
        self.assertIn("DOTA 2", data["profiles"])
        print("[PASS] GET /api/game-profiles returned valid profiles map")

    def test_02_save_single_profile(self):
        payload = {
            "game_name": "DOTA 2",
            "title": "DOTA 2 - The International 2024 Finals Game 3",
            "sub_header": "1080p | ULTRA HIGH PRESET | VULKAN",
            "notes": "TI 2024 Finals Game 3 teamfight replay benchmark. 60 seconds duration."
        }
        res = client.post("/api/game-profiles", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        profile = data["profiles"].get("DOTA 2")
        self.assertIsNotNone(profile)
        self.assertEqual(profile["title"], "DOTA 2 - The International 2024 Finals Game 3")
        self.assertEqual(profile["sub_header"], "1080p | ULTRA HIGH PRESET | VULKAN")
        self.assertEqual(profile["notes"], "TI 2024 Finals Game 3 teamfight replay benchmark. 60 seconds duration.")

        # Check JSON formatting on disk
        config_path = data["config_file"]
        self.assertTrue(os.path.exists(config_path))
        with open(config_path, "r", encoding="utf-8") as f:
            content = f.read()
            # Verify indent=2 formatting
            self.assertIn('  "DOTA 2": {', content)
            self.assertIn('    "title": "DOTA 2 - The International 2024 Finals Game 3"', content)
        print("[PASS] POST /api/game-profiles successfully persisted formatted JSON to disk")

    def test_03_case_insensitive_lookup(self):
        from app.capframex.services.game_profile_service import game_profile_service
        prof = game_profile_service.get_profile("dota 2")
        self.assertIsNotNone(prof)
        self.assertEqual(prof["title"], "DOTA 2 - The International 2024 Finals Game 3")

        prof2 = game_profile_service.get_profile("cyberpunk 2077")
        self.assertIsNotNone(prof2)
        print("[PASS] Case-insensitive game profile lookup verified")

    def test_04_save_bulk_profiles(self):
        payload = {
            "profiles": {
                "DOTA 2": {
                    "title": "DOTA 2 - The International 2024 Finals Game 3",
                    "sub_header": "1080p | ULTRA HIGH PRESET | VULKAN",
                    "notes": "TI 2024 Finals Game 3 teamfight replay benchmark."
                },
                "F1 24": {
                    "title": "F1 24 (Spa Rain)",
                    "sub_header": "VERY HIGH | WET WEATHER",
                    "notes": "Spa Francorchamps in heavy rain."
                }
            }
        }
        res = client.post("/api/game-profiles", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("F1 24", data["profiles"])
        print("[PASS] Bulk game profiles update verified")

    def test_05_add_new_game_not_on_existing_list(self):
        new_game = "Ghost of Tsushima"
        payload = {
            "game_name": new_game,
            "title": new_game.upper(),
            "sub_header": "",
            "notes": ""
        }
        res = client.post("/api/game-profiles", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn(new_game, data["profiles"])
        self.assertEqual(data["profiles"][new_game]["title"], new_game.upper())

        from app.capframex.services.game_profile_service import game_profile_service
        prof = game_profile_service.get_profile(new_game)
        self.assertIsNotNone(prof)
        self.assertEqual(prof["title"], "GHOST OF TSUSHIMA")
        print(f"[PASS] Successfully added and saved new game '{new_game}' as a new profile")

if __name__ == "__main__":
    unittest.main()
