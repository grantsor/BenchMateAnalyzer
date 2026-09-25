import pytest
from app.core.identifier import benchmark_identifier

def test_identify_geekbench_filenames():
    b_id, conf = benchmark_identifier.identify_by_filename("geekbench6.jpg")
    assert b_id == "geekbench6"
    assert conf >= 0.80

    b_id2, conf2 = benchmark_identifier.identify_by_filename("gb6_test.png")
    assert b_id2 == "geekbench6"
    assert conf2 >= 0.80

def test_identify_cinebench_filenames():
    b_id, conf = benchmark_identifier.identify_by_filename("ciner26.jpg")
    assert b_id == "cinebench_r26"
    assert conf >= 0.80

    b_id2, conf2 = benchmark_identifier.identify_by_filename("cb2024.png")
    assert b_id2 == "cinebench_2024"
    assert conf2 >= 0.80

def test_identify_unknown_filename():
    b_id, conf = benchmark_identifier.identify_by_filename("random_photo.jpg")
    assert b_id is None
    assert conf == 0.0
