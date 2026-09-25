import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from app.capframex.core.normalizer import MetricNormalizer
from app.capframex.core.parser import CapFrameXParser
from app.capframex.services.data_service import DataService

class TestLaptopIngestion(unittest.TestCase):
    def test_normalizer_laptop_and_power_profiles(self):
        self.assertTrue(MetricNormalizer.is_power_profile("unleashed"))
        self.assertTrue(MetricNormalizer.is_power_profile("performance"))
        self.assertTrue(MetricNormalizer.is_power_profile("standard"))
        self.assertTrue(MetricNormalizer.is_power_profile("whisper"))
        self.assertFalse(MetricNormalizer.is_power_profile("1080p"))
        self.assertFalse(MetricNormalizer.is_power_profile("1440p"))
        self.assertFalse(MetricNormalizer.is_power_profile("4k"))

        self.assertEqual(MetricNormalizer.normalize_power_profile("unleashed"), "Unleashed")
        self.assertEqual(MetricNormalizer.normalize_power_profile("unlashed 2"), "Unleashed 2")
        self.assertEqual(MetricNormalizer.normalize_power_profile("perf"), "Performance")
        self.assertEqual(MetricNormalizer.normalize_power_profile("whisper mode"), "Whisper Mode")

        self.assertEqual(MetricNormalizer.clean_laptop_name("HP OMEN MAX 16 DATA"), "HP OMEN MAX 16")
        self.assertEqual(MetricNormalizer.clean_laptop_name("ASUS ExpertBook Ultra"), "ASUS ExpertBook Ultra")
        self.assertEqual(MetricNormalizer.clean_laptop_name("Zenbook S16 2026"), "Zenbook S16 2026")

    def test_extract_folder_name(self):
        fpath = r"N:\BenchMarkTool\HP OMEN MAX 16 DATA\Captures\CapFrameX-cs2.exe-2025-06-24T0283.json"
        extracted = MetricNormalizer.extract_main_folder_name(fpath, scan_root=r"N:\BenchMarkTool\HP OMEN MAX 16 DATA")
        self.assertEqual(MetricNormalizer.clean_laptop_name(extracted), "HP OMEN MAX 16")

    def test_scan_omen_dataset(self):
        omen_dir = r"N:\BenchMarkTool\HP OMEN MAX 16 DATA"
        if not os.path.exists(omen_dir):
            self.skipTest(f"Directory {omen_dir} not available on this machine")

        ds = DataService()
        count = ds.scan_directory(omen_dir)
        self.assertGreater(count, 0)
        self.assertEqual(ds.detected_mode, "laptop")
        self.assertIn("HP OMEN MAX 16", ds.laptop_names)
        self.assertTrue(any(p in ["Unleashed", "Performance", "Standard"] for p in ds.power_profiles))

        # Check chart data for Black Myth: Wukong
        chart_data = ds.get_chart_data("Black Myth: Wukong", resolution="Native", group_by="laptop_power")
        self.assertEqual(len(chart_data), 3)

        labels = [item["label"] for item in chart_data]
        self.assertIn("HP OMEN MAX 16 - Unleashed", labels)
        self.assertIn("HP OMEN MAX 16 - Performance", labels)
        self.assertIn("HP OMEN MAX 16 - Standard", labels)

        # Verify ranking order: Unleashed should be first, then Performance, then Standard
        self.assertEqual(chart_data[0]["label"], "HP OMEN MAX 16 - Unleashed")
        self.assertEqual(chart_data[1]["label"], "HP OMEN MAX 16 - Performance")
        self.assertEqual(chart_data[2]["label"], "HP OMEN MAX 16 - Standard")

        # Verify metrics
        for item in chart_data:
            self.assertGreater(item["metrics"]["average_fps"], 0)
            self.assertGreater(item["metrics"]["p1_fps"], 0)

        # Test custom product name override
        custom_chart = ds.get_chart_data(
            "Black Myth: Wukong",
            resolution="Native",
            group_by="laptop_power",
            custom_product_name="OMEN 16"
        )
        custom_labels = [item["label"] for item in custom_chart]
        self.assertIn("OMEN 16 - Unleashed", custom_labels)

        # Test Laptop GPU Spec with CPU marker
        gpu_chart = ds.get_chart_data(
            "Black Myth: Wukong",
            resolution="Native",
            group_by="laptop_gpu",
            mode="laptop"
        )
        self.assertGreater(len(gpu_chart), 0)
        gpu_item = gpu_chart[0]
        # Must have GPU and CPU marker
        self.assertIn(gpu_item["gpu"], gpu_item["label"])
        self.assertIn(gpu_item["cpu"], gpu_item["label"])

    def test_separate_pc_and_laptop_sessions(self):
        ds = DataService()
        sample_pc_run = {
            "game_name": "TestGame",
            "resolution": "1080p",
            "gpu": "GeForce RTX 5090",
            "cpu": "Ryzen 7 9800X3D",
            "motherboard": "X870E",
            "is_laptop": False,
            "metrics": {"average_fps": 180.0, "p1_fps": 140.0, "p01_fps": 110.0, "median_fps": 180.0, "min_fps": 90.0, "max_fps": 220.0, "total_frames": 5000, "total_duration_s": 27.5}
        }
        sample_laptop_run = {
            "game_name": "TestGame",
            "resolution": "Native",
            "laptop_name": "Asus ROG Strix",
            "power_profile": "Turbo",
            "laptop_power_profile_label": "Asus ROG Strix - Turbo",
            "gpu": "RTX 4080 Laptop GPU",
            "cpu": "Core i9-14900HX",
            "is_laptop": True,
            "is_power_profile_mode": True,
            "metrics": {"average_fps": 120.0, "p1_fps": 95.0, "p01_fps": 70.0, "median_fps": 120.0, "min_fps": 60.0, "max_fps": 150.0, "total_frames": 3000, "total_duration_s": 25.0}
        }

        # Ingest into PC session
        ds.ingest_runs([sample_pc_run], folder_name="PC Captures", mode="pc")
        # Ingest into Laptop session
        ds.ingest_runs([sample_laptop_run], folder_name="Laptop Captures", mode="laptop")

        # Verify PC session has PC run and 0 laptop runs
        pc_runs = ds.get_raw_runs(mode="pc")
        self.assertEqual(len(pc_runs), 1)
        self.assertEqual(pc_runs[0]["gpu"], "GeForce RTX 5090")

        # Verify Laptop session has Laptop run and 0 PC runs
        laptop_runs = ds.get_raw_runs(mode="laptop")
        self.assertEqual(len(laptop_runs), 1)
        self.assertEqual(laptop_runs[0]["gpu"], "RTX 4080 Laptop GPU")

        # Verify Laptop GPU Spec has CPU marker
        laptop_gpu_data = ds.get_chart_data("TestGame", resolution="Native", group_by="laptop_gpu", mode="laptop")
        self.assertEqual(len(laptop_gpu_data), 1)
        self.assertEqual(laptop_gpu_data[0]["label"], "RTX 4080 Laptop GPU (Core i9-14900HX)")

if __name__ == "__main__":
    unittest.main()

