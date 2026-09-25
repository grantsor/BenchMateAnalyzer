import re
from typing import Optional, Tuple

class NumberNormalizer:
    """
    Normalizes numeric strings extracted from OCR into clean float/integer values.
    Handles thousand separators (commas, spaces), decimal points, units,
    and common OCR character substitution errors.
    """

    # Common OCR letter-to-digit confusions in numeric contexts
    OCR_SUBSTITUTIONS = {
        'O': '0', 'o': '0',
        'I': '1', 'l': '1', '|': '1', 'i': '1',
        'Z': '2', 'z': '2',
        'S': '5', 's': '5',
        'B': '8',
    }

    # Unit pattern
    UNIT_PATTERN = re.compile(
        r'\s*(pts|points|score|fps|frames/sec|mb/s|gb/s|kb/s|\u03bcs|µs|us|ms|ns|seconds|sec|s|°c|c|watts|watt|w|ghz|mhz|%)\b',
        re.IGNORECASE
    )

    @classmethod
    def normalize_score_text(cls, text: str) -> Tuple[Optional[float], Optional[str], float]:
        """
        Parses raw OCR text into (normalized_value, extracted_unit, confidence_modifier).
        Returns (None, None, 0.0) if text cannot be interpreted as a number.
        """
        if not text:
            return None, None, 0.0

        cleaned = text.strip()

        # 1. Extract unit if present
        unit = None
        unit_match = cls.UNIT_PATTERN.search(cleaned)
        if unit_match:
            unit = unit_match.group(1).lower()
            cleaned = cls.UNIT_PATTERN.sub('', cleaned).strip()

        # 2. Check if clean number directly
        # Remove currency or other non-numeric prefixes and suffixes (e.g. badges, checkmarks like "A" or "*")
        cleaned = re.sub(r'^[^\d\-+]+', '', cleaned)
        cleaned = re.sub(r'[^\d.]+$', '', cleaned).strip()

        # Handle thousand separators: "21,327" or "21 327"
        # If format is digits followed by comma/space and 3 digits: e.g. 21,327 -> 21327
        # Watch out for European decimal "21,5" vs thousand "21,327"
        confidence_mod = 1.0

        # Pattern: digits, comma, space or dot, exactly 3 digits (e.g. 21,327 or 8 032 or OCR-confused 34.500)
        match_3digit = re.search(r'^([1-9]\d{0,2})[,\s](\d{3})$', cleaned)
        if match_3digit:
            val = float(match_3digit.group(1) + match_3digit.group(2))
            return val, unit, 1.0

        # Pattern: multiple thousand groups, e.g. 1,234,567
        if re.search(r'^\d{1,3}(,\d{3})+(\.\d+)?$', cleaned):
            num_str = cleaned.replace(',', '')
            try:
                val = float(num_str)
                return val, unit, 1.0
            except ValueError:
                pass

        # Pattern: digits space 3 digits (e.g. 21 327)
        if re.search(r'^\d{1,3}(\s\d{3})+(\.\d+)?$', cleaned):
            num_str = cleaned.replace(' ', '')
            try:
                val = float(num_str)
                return val, unit, 1.0
            except ValueError:
                pass

        # Standard decimal number: "123.45" or "-3.2" or integer "21327"
        if re.search(r'^-?\d+(\.\d+)?$', cleaned):
            try:
                val = float(cleaned)
                return val, unit, 1.0
            except ValueError:
                pass

        # If it has letters that might be OCR substitutions (e.g. "2132T" or "21O45")
        # Test applying substitution
        substituted = ""
        sub_count = 0
        for ch in cleaned:
            if ch.isdigit() or ch in '.-':
                substituted += ch
            elif ch in cls.OCR_SUBSTITUTIONS:
                substituted += cls.OCR_SUBSTITUTIONS[ch]
                sub_count += 1
            elif ch in ', ':
                pass  # Skip separators
            else:
                # Unknown non-digit character
                substituted += ch

        # Try parsing substituted
        if re.search(r'^-?\d+(\.\d+)?$', substituted):
            try:
                val = float(substituted)
                # Penalize confidence based on number of substitutions
                confidence_penalty = 0.2 * sub_count
                return val, unit, max(0.4, 1.0 - confidence_penalty)
            except ValueError:
                pass

        # If still not parsed, try extracting first numeric block
        match = re.search(r'-?\d+(?:[.,]\d+)*', cleaned)
        if match:
            candidate = match.group(0).replace(',', '')
            try:
                val = float(candidate)
                return val, unit, 0.6
            except ValueError:
                pass

        return None, unit, 0.0

    @classmethod
    def validate_range(cls, value: Optional[float], min_val: Optional[float], max_val: Optional[float]) -> bool:
        if value is None:
            return False
        if min_val is not None and value < min_val:
            return False
        if max_val is not None and value > max_val:
            return False
        return True
