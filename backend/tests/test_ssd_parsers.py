import numpy as np
import pytest
from app.ocr.engine import OCRItem, OCREngine
from app.parsers.crystaldiskmark import CrystalDiskMarkParser
from app.parsers.as_ssd import ASSSDParser
from app.parsers.as_ssd_copy import ASSSDCopyParser
from app.parsers.threedmark_storage import ThreeDMarkStorageParser
from app.parsers.pcmark10_storage import PCMark10StorageParser
from app.core.scanner import FolderScanner

dummy_img = np.zeros((100, 100, 3), dtype=np.uint8)

def test_crystaldiskmark_parser_1gb():
    parser = CrystalDiskMarkParser()
    ocr_items = [
        OCRItem(text="CrystalDiskMark 8.0.5 x64", confidence=0.95, polygon=[], box=(30, 10, 150, 20)),
        OCRItem(text="1GiB", confidence=0.90, polygon=[], box=(130, 60, 40, 20)),
        OCRItem(text="Read (MB/s)", confidence=0.92, polygon=[], box=(130, 90, 80, 20)),
        OCRItem(text="Write (MB/s)", confidence=0.92, polygon=[], box=(330, 90, 80, 20)),
        OCRItem(text="SEQ1M", confidence=0.90, polygon=[], box=(20, 120, 40, 15)),
        OCRItem(text="2096.81", confidence=0.94, polygon=[], box=(140, 120, 80, 25)),
        OCRItem(text="1824.45", confidence=0.93, polygon=[], box=(340, 120, 80, 25)),
        OCRItem(text="RND4K", confidence=0.90, polygon=[], box=(20, 220, 40, 15)),
        OCRItem(text="146.06", confidence=0.91, polygon=[], box=(160, 225, 80, 25)),
        OCRItem(text="171.31", confidence=0.91, polygon=[], box=(360, 225, 80, 25)),
    ]

    conf = parser.can_parse("CrystalDiskMark 1GB.png", ocr_items, dummy_img)
    assert conf >= 0.90

    res = parser.extract_results(dummy_img, ocr_items, None)
    assert res.benchmark_id == "crystaldiskmark_1gb"
    assert "seq_read" in res.metrics
    assert res.metrics["seq_read"].normalized_value == 2096.81
    assert "seq_write" in res.metrics
    assert res.metrics["seq_write"].normalized_value == 1824.45
    assert "rnd_4k_read" in res.metrics
    assert res.metrics["rnd_4k_read"].normalized_value == 146.06
    assert "rnd_4k_write" in res.metrics
    assert res.metrics["rnd_4k_write"].normalized_value == 171.31

def test_crystaldiskmark_parser_16gb():
    parser = CrystalDiskMarkParser()
    ocr_items = [
        OCRItem(text="CrystalDiskMark 8.0.5 x64", confidence=0.95, polygon=[], box=(30, 10, 150, 20)),
        OCRItem(text="16GiB", confidence=0.90, polygon=[], box=(130, 60, 50, 20)),
        OCRItem(text="2117.90", confidence=0.95, polygon=[], box=(140, 120, 80, 25)),
        OCRItem(text="1843.18", confidence=0.94, polygon=[], box=(340, 120, 80, 25)),
    ]

    res = parser.extract_results(dummy_img, ocr_items, None)
    assert res.benchmark_id == "crystaldiskmark_16gb"
    assert res.metrics["seq_read"].normalized_value == 2117.90
    assert res.metrics["seq_write"].normalized_value == 1843.18

def test_as_ssd_parser():
    parser = ASSSDParser()
    ocr_items = [
        OCRItem(text="AS SSD Benchmark 2.0.7316", confidence=0.95, polygon=[], box=(30, 10, 180, 20)),
        OCRItem(text="1 GB", confidence=0.90, polygon=[], box=(240, 60, 30, 20)),
        OCRItem(text="Seq", confidence=0.90, polygon=[], box=(35, 185, 40, 20)),
        OCRItem(text="1925.03MB/s", confidence=0.92, polygon=[], box=(180, 188, 100, 20)),
        OCRItem(text="1518.26MB/s", confidence=0.91, polygon=[], box=(340, 188, 100, 20)),
        OCRItem(text="4K", confidence=0.90, polygon=[], box=(35, 225, 30, 20)),
        OCRItem(text="25.66MB/s", confidence=0.88, polygon=[], box=(190, 228, 90, 20)),
        OCRItem(text="54.14MB/s", confidence=0.89, polygon=[], box=(350, 228, 90, 20)),
        OCRItem(text="Acc.time", confidence=0.88, polygon=[], box=(35, 300, 70, 20)),
        OCRItem(text="0.056 ms", confidence=0.90, polygon=[], box=(200, 300, 80, 20)),
        OCRItem(text="0.097ms", confidence=0.90, polygon=[], box=(360, 300, 80, 20)),
        OCRItem(text="Score:", confidence=0.90, polygon=[], box=(20, 340, 60, 20)),
        OCRItem(text="1331", confidence=0.95, polygon=[], box=(300, 380, 50, 25)),
    ]

    conf = parser.can_parse("as 1g.png", ocr_items, dummy_img)
    assert conf >= 0.90

    # Test that copy and compression are excluded
    assert parser.can_parse("as ssd copy.png", ocr_items, dummy_img) == 0.0
    assert parser.can_parse("as ssd compre 1.png", ocr_items, dummy_img) == 0.0

    res = parser.extract_results(dummy_img, ocr_items, None)
    assert res.benchmark_id == "as_ssd_1gb"
    assert res.metrics["seq_read"].normalized_value == 1925.03
    assert res.metrics["seq_write"].normalized_value == 1518.26
    assert res.metrics["four_k_read"].normalized_value == 25.66
    assert res.metrics["four_k_write"].normalized_value == 54.14
    assert res.metrics["acc_time_read"].normalized_value == 0.056
    assert res.metrics["score"].normalized_value == 1331.0

def test_as_ssd_copy_parser():
    parser = ASSSDCopyParser()
    ocr_items = [
        OCRItem(text="AS SSD Copy-Benchmark 2.0", confidence=0.96, polygon=[], box=(30, 10, 200, 20)),
        OCRItem(text="ISO", confidence=0.92, polygon=[], box=(35, 160, 35, 20)),
        OCRItem(text="1072.02MB/s", confidence=0.94, polygon=[], box=(185, 165, 100, 20)),
        OCRItem(text="3.57 s", confidence=0.91, polygon=[], box=(375, 165, 60, 20)),
        OCRItem(text="Program", confidence=0.92, polygon=[], box=(35, 205, 70, 20)),
        OCRItem(text="72.80MB/s", confidence=0.93, polygon=[], box=(195, 208, 90, 20)),
        OCRItem(text="193.40s", confidence=0.92, polygon=[], box=(365, 208, 70, 20)),
        OCRItem(text="Game", confidence=0.91, polygon=[], box=(35, 245, 50, 20)),
        OCRItem(text="427.04MB/s", confidence=0.93, polygon=[], box=(190, 250, 95, 20)),
        OCRItem(text="32.36 s", confidence=0.90, polygon=[], box=(370, 250, 65, 20)),
    ]

    conf = parser.can_parse("as ssd copy.png", ocr_items, dummy_img)
    assert conf >= 0.90

    res = parser.extract_results(dummy_img, ocr_items, None)
    assert res.benchmark_id == "as_ssd_copy"
    assert res.metrics["iso_speed"].normalized_value == 1072.02
    assert res.metrics["iso_duration"].normalized_value == 3.57
    assert res.metrics["program_speed"].normalized_value == 72.80
    assert res.metrics["program_duration"].normalized_value == 193.40
    assert res.metrics["game_speed"].normalized_value == 427.04
    assert res.metrics["game_duration"].normalized_value == 32.36

def test_threedmark_storage_parser():
    parser = ThreeDMarkStorageParser()
    ocr_items = [
        OCRItem(text="3DMARK", confidence=0.95, polygon=[], box=(10, 10, 100, 25)),
        OCRItem(text="StorageBenchmarkScore", confidence=0.92, polygon=[], box=(20, 50, 180, 25)),
        OCRItem(text="1 260", confidence=0.95, polygon=[], box=(20, 80, 70, 30)),
        OCRItem(text="Bandwidth", confidence=0.90, polygon=[], box=(20, 120, 80, 20)),
        OCRItem(text="201.67 MB/s", confidence=0.93, polygon=[], box=(120, 120, 100, 20)),
        OCRItem(text="Average access time", confidence=0.90, polygon=[], box=(20, 150, 140, 20)),
        OCRItem(text="133 us", confidence=0.88, polygon=[], box=(170, 150, 60, 20)),
    ]

    conf = parser.can_parse("3dm storage.png", ocr_items, dummy_img)
    assert conf >= 0.90

    # Also test generic 3dm.png and 3dm .png
    assert parser.can_parse("3dm.png", ocr_items, dummy_img) >= 0.90
    assert parser.can_parse("3dm .png", ocr_items, dummy_img) >= 0.90

    res = parser.extract_results(dummy_img, ocr_items, None)
    assert res.benchmark_id == "threedmark_storage"
    assert res.metrics["storage_score"].normalized_value == 1260.0
    assert res.metrics["bandwidth"].normalized_value == 201.67
    assert res.metrics["average_access_time"].normalized_value == 133.0

    # Test identifier identification
    from app.core.identifier import benchmark_identifier
    fn_id, fn_conf = benchmark_identifier.identify_by_filename("3dm.png")
    assert fn_id == "threedmark_storage"
    assert fn_conf >= 0.85
    fn_id2, fn_conf2 = benchmark_identifier.identify_by_filename("3dm .png")
    assert fn_id2 == "threedmark_storage"
    assert fn_conf2 >= 0.85

    c_id, c_conf = benchmark_identifier.identify_by_content("3dm.png", ocr_items)
    assert c_id == "threedmark_storage"
    assert c_conf >= 0.95

def test_pcmark10_storage_parser():
    parser = PCMark10StorageParser()
    ocr_items_data = [
        OCRItem(text="PCMARK 10", confidence=0.95, polygon=[], box=(10, 10, 100, 30)),
        OCRItem(text="Data Drive Benchmark", confidence=0.94, polygon=[], box=(20, 50, 200, 25)),
        OCRItem(text="1393 A", confidence=0.90, polygon=[], box=(20, 80, 80, 30)),
        OCRItem(text="217.25 MB/s", confidence=0.92, polygon=[], box=(20, 120, 100, 20)),
    ]
    res_data = parser.extract_results(dummy_img, ocr_items_data, None)
    assert res_data.benchmark_id == "pcmark10_data_drive"
    assert res_data.metrics["score"].normalized_value == 1393.0
    assert res_data.metrics["bandwidth"].normalized_value == 217.25

    ocr_items_quick = [
        OCRItem(text="PCMARK 10", confidence=0.95, polygon=[], box=(10, 10, 100, 30)),
        OCRItem(text="Quick System Drive Benchmark", confidence=0.94, polygon=[], box=(20, 50, 240, 25)),
        OCRItem(text="1 148", confidence=0.91, polygon=[], box=(20, 80, 80, 30)),
        OCRItem(text="150.84 MB/s", confidence=0.93, polygon=[], box=(20, 120, 100, 20)),
    ]
    res_quick = parser.extract_results(dummy_img, ocr_items_quick, None)
    assert res_quick.benchmark_id == "pcmark10_quick_system_drive"
    assert res_quick.metrics["score"].normalized_value == 1148.0
    assert res_quick.metrics["bandwidth"].normalized_value == 150.84

def test_scanner_ignored_files():
    assert FolderScanner._is_ignored_file("as ssd compre 1.png") is True
    assert FolderScanner._is_ignored_file("as-compr-bench ADATA.png") is True
    assert FolderScanner._is_ignored_file("AS SSD COMPRESSION.png") is True
    assert FolderScanner._is_ignored_file("hwinfo.png") is True
    assert FolderScanner._is_ignored_file("temps.png") is True
    assert FolderScanner._is_ignored_file("com1.png") is True

    # Valid benchmarks should NOT be ignored
    assert FolderScanner._is_ignored_file("CrystalDiskMark 1GB.png") is False
    assert FolderScanner._is_ignored_file("as 1g.png") is False
    assert FolderScanner._is_ignored_file("as ssd copy.png") is False
    assert FolderScanner._is_ignored_file("3dm storage.png") is False
    assert FolderScanner._is_ignored_file("pcm10 datadrive.png") is False
