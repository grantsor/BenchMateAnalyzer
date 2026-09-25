import pytest
import os
import cv2
import json
from pathlib import Path
from app.core.identifier import benchmark_identifier
from app.parsers.dynamic_template import DynamicTemplateParser
from app.parsers.registry import parser_registry
from app.services.ai_vision_service import AIVisionService
from app.ocr.engine import ocr_engine, OCRItem

def test_dynamic_benchmark_registration():
    dyn_bench = {
        "id": "synthetic_render_test",
        "name": "Synthetic Render Test",
        "version": "1.0",
        "category": "GPU",
        "keywords": ["synthetic", "render"],
        "aliases": ["synthetic_render", "synth_bench"],
        "metrics": [
            {
                "id": "render_score",
                "name": "Render Score",
                "display_name": "Render Score",
                "unit": "pts",
                "higher_is_better": True,
                "decimal_places": 0,
                "sort_order": 0
            },
            {
                "id": "render_time",
                "name": "Render Time",
                "display_name": "Render Time",
                "unit": "s",
                "higher_is_better": False,
                "decimal_places": 2,
                "sort_order": 1
            }
        ]
    }

    # Register dynamically
    benchmark_identifier.register_dynamic_benchmark(dyn_bench)
    assert "synthetic_render_test" in benchmark_identifier.benchmarks

    # Filename match
    b_id, conf = benchmark_identifier.identify_by_filename("Review_Synth_Bench_Run01.png")
    assert b_id == "synthetic_render_test"
    assert conf >= 0.70

def test_dynamic_template_parser_extraction():
    dyn_bench = {
        "id": "custom_gpu_bench",
        "name": "Custom GPU Bench",
        "version": "2.0",
        "category": "GPU",
        "keywords": ["custom gpu bench"],
        "metrics": [
            {
                "id": "overall_score",
                "name": "Overall Score",
                "display_name": "Overall Score",
                "unit": "score",
                "higher_is_better": True,
                "decimal_places": 0,
                "sort_order": 0
            },
            {
                "id": "fps",
                "name": "Average FPS",
                "display_name": "Average FPS",
                "unit": "FPS",
                "higher_is_better": True,
                "decimal_places": 1,
                "sort_order": 1
            }
        ]
    }
    parser = DynamicTemplateParser(dyn_bench)

    # Simulated OCR items
    ocr_items = [
        OCRItem(text="Custom GPU Bench v2.0", box=(100, 50, 200, 30), confidence=0.95),
        OCRItem(text="Overall Score", box=(100, 150, 120, 20), confidence=0.92),
        OCRItem(text="14,850", box=(250, 150, 80, 25), confidence=0.94),
        OCRItem(text="Average FPS", box=(100, 200, 100, 20), confidence=0.90),
        OCRItem(text="124.5 FPS", box=(250, 200, 90, 22), confidence=0.91)
    ]

    # Check can_parse
    score = parser.can_parse("custom_gpu_bench_test.png", ocr_items, None)
    assert score >= 0.50

    # Check extraction
    import numpy as np
    dummy_img = np.zeros((400, 600, 3), dtype=np.uint8)
    res = parser.extract_results(dummy_img, ocr_items, ocr_engine)
    assert res.benchmark_id == "custom_gpu_bench"
    assert "overall_score" in res.metrics
    assert res.metrics["overall_score"].normalized_value == 14850.0
    assert "fps" in res.metrics
    assert res.metrics["fps"].normalized_value == 124.5

def test_ai_vision_local_detection_procyon():
    sample_path = r"C:/Users/Grant Soriano/.gemini/antigravity/brain/bdbbf081-dced-4167-b092-6f201fdef3b2/.user_uploaded/media_1789067221909.jpg"
    if os.path.exists(sample_path):
        img = cv2.imread(sample_path)
        items = ocr_engine.ocr_image(img)
        hints = benchmark_identifier.infer_context_from_path(sample_path)
        result = AIVisionService._analyze_with_local_engine(img, items, hints)

        assert "Procyon" in result["name"]
        assert result["category"] == "GPU"
        assert len(result["metrics"]) > 0
        # Hero score is 2003
        assert any(m["value"] == 2003.0 for m in result["metrics"])

def test_ai_vision_local_detection_geekbench():
    sample_path = r"C:/Users/Grant Soriano/.gemini/antigravity/brain/bdbbf081-dced-4167-b092-6f201fdef3b2/.user_uploaded/media_1789067221905.jpg"
    if os.path.exists(sample_path):
        img = cv2.imread(sample_path)
        items = ocr_engine.ocr_image(img)
        hints = benchmark_identifier.infer_context_from_path(sample_path)
        result = AIVisionService._analyze_with_local_engine(img, items, hints)

        assert "Geekbench 6 Vulkan" in result["name"]
        assert result["category"] == "GPU"
        assert len(result["metrics"]) > 0
        # Vulkan score is 156936
        assert any(m["value"] == 156936.0 for m in result["metrics"])

def test_ai_settings_lifecycle():
    current = AIVisionService.get_settings()
    assert "provider" in current

    # Update settings
    AIVisionService.save_settings({"provider": "directml", "model_name": "gemini-2.5-flash"})
    updated = AIVisionService.get_settings()
    assert updated["provider"] == "directml"
