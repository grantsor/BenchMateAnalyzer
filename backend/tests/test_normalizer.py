import pytest
from app.ocr.normalizer import NumberNormalizer

def test_number_normalizer_basic_numbers():
    val, unit, conf = NumberNormalizer.normalize_score_text("21327")
    assert val == 21327.0
    assert conf == 1.0

def test_number_normalizer_comma_separator():
    val, unit, conf = NumberNormalizer.normalize_score_text("21,327")
    assert val == 21327.0
    assert conf == 1.0

def test_number_normalizer_space_separator():
    val, unit, conf = NumberNormalizer.normalize_score_text("21 327")
    assert val == 21327.0
    assert conf == 1.0

def test_number_normalizer_decimal():
    val, unit, conf = NumberNormalizer.normalize_score_text("123.45")
    assert val == 123.45
    assert conf == 1.0

def test_number_normalizer_units():
    val, unit, conf = NumberNormalizer.normalize_score_text("21,327 pts")
    assert val == 21327.0
    assert unit == "pts"

    val, unit, conf = NumberNormalizer.normalize_score_text("145.2 FPS")
    assert val == 145.2
    assert unit == "fps"

def test_number_normalizer_ocr_substitution():
    # 'O' substituted for '0'
    val, unit, conf = NumberNormalizer.normalize_score_text("21O45")
    assert val == 21045.0
    assert conf < 1.0

    # 'l' substituted for '1'
    val, unit, conf = NumberNormalizer.normalize_score_text("3Ol3")
    assert val == 3013.0

def test_number_normalizer_range_validation():
    assert NumberNormalizer.validate_range(3013, 500, 6000) is True
    assert NumberNormalizer.validate_range(250, 500, 6000) is False
    assert NumberNormalizer.validate_range(8000, 500, 6000) is False
