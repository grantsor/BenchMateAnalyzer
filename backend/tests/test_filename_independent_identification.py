import pytest
from app.ocr.engine import OCRItem
from app.parsers.registry import parser_registry
from app.parsers.base import BaseBenchmarkParser

def test_telemetry_filtering():
    hw_items = [
        OCRItem(text="HWiNFO64 v8.26-5730", box=(10, 10, 200, 25), confidence=0.98),
        OCRItem(text="Sensors Status", box=(10, 40, 150, 25), confidence=0.97),
        OCRItem(text="Sensor Current Minimum Maximum Average", box=(10, 70, 400, 25), confidence=0.95),
        OCRItem(text="Core Temperatures 45 35 85 55", box=(10, 100, 300, 25), confidence=0.90)
    ]
    assert BaseBenchmarkParser.is_system_monitoring_image("random_name.png", hw_items) is True

    tm_items = [
        OCRItem(text="Task Manager", box=(10, 10, 150, 25), confidence=0.98),
        OCRItem(text="Processes Performance App history", box=(10, 40, 350, 25), confidence=0.95)
    ]
    assert BaseBenchmarkParser.is_system_monitoring_image("screenshot123.png", tm_items) is True

def test_visual_signatures_independent_of_filename():
    gbai_items = [
        OCRItem(text="https://browser.geekbench.com/ai/v1/cpu/12345", box=(50, 50, 400, 25), confidence=0.95),
        OCRItem(text="Single Precision 3828", box=(50, 100, 200, 25), confidence=0.95),
        OCRItem(text="Half Precision 1382", box=(50, 150, 200, 25), confidence=0.95),
        OCRItem(text="Quantized 5917", box=(50, 200, 200, 25), confidence=0.95)
    ]
    p = parser_registry.find_best_parser("Screenshot_2025_01_01.png", gbai_items, None)
    assert p.target_benchmark_id == "geekbench_ai"

    octane_items = [
        OCRItem(text="Octane 2.0 JavaScript Benchmark", box=(50, 50, 350, 30), confidence=0.98),
        OCRItem(text="Single Core Score 118,900", box=(50, 120, 300, 30), confidence=0.95)
    ]
    p_oct = parser_registry.find_best_parser("IMG_9999.png", octane_items, None)
    assert p_oct.target_benchmark_id == "octane_benchmark"

    cb_items = [
        OCRItem(text="Cinebench 2024.1.0", box=(50, 50, 250, 30), confidence=0.98),
        OCRItem(text="CPU (Multi Core)", box=(50, 120, 200, 25), confidence=0.95),
        OCRItem(text="1242 pts", box=(50, 150, 100, 25), confidence=0.95)
    ]
    p_cb = parser_registry.find_best_parser("ciner24.png", cb_items, None)
    assert p_cb.id == "cinebench_parser"
