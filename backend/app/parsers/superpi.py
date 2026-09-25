import difflib
import re
from typing import Dict, List, Optional
import numpy as np
from app.ocr.engine import OCRItem, OCREngine
from app.parsers.base import BaseBenchmarkParser, ExtractedMetricResult, ParserExtractionResult

class SuperPIParser(BaseBenchmarkParser):
    id: str = "superpi_parser"
    name: str = "Super PI Mod Parser"
    version: str = "1.0"
    target_benchmark_id: str = "superpi_benchmark"

    KEYWORDS = [
        "super pi",
        "super pi mod",
        "calculate(c)",
        "not calculated",
        "32m",
        "1m",
        "calculation time"
    ]

    def can_parse(
        self,
        filename: str,
        ocr_items: List[OCRItem],
        image: np.ndarray
    ) -> float:
        fn_match, _ = self.fuzzy_match_filename(filename, ["superpi", "super_pi", "spi", "superpi32m", "superpimod"])
        if fn_match:
            return 0.95

        full_text = " ".join(item.text.lower() for item in ocr_items)
        if "super pi" in full_text or "super pi mod" in full_text:
            return 0.95
        if "not calculated" in full_text and ("calculate(c)" in full_text or "32m" in full_text or "16m" in full_text):
            return 0.90

        # Structural detection: presence of 32M/16M/1M calculation size AND time format (Xm Ys) AND window indicator
        has_calc_size = any(size in full_text for size in ["32m", "16m", "8m", "4m", "2m", "1m"])
        has_time_format = bool(re.search(r'\d+m\s*[\d.]+s', full_text))
        has_pi_window = any(k in full_text for k in ["results", "hardware information", "calculate(c)"])
        if has_calc_size and has_time_format and has_pi_window:
            return 0.95

        return 0.0

    def extract_results(
        self,
        image: np.ndarray,
        ocr_items: List[OCRItem],
        ocr_engine: OCREngine
    ) -> ParserExtractionResult:
        metrics: Dict[str, ExtractedMetricResult] = {}
        score_item = None
        calc_seconds = None

        # Look for time formats like 000h 09m 14s, 6m 53.157s, 09m 14s, or 06:53.157
        time_regex_hms = re.compile(r'(\d+)h\s*(\d+)m\s*([\d.]+)s', re.IGNORECASE)
        time_regex_ms = re.compile(r'(\d+)m\s*([\d.]+)s', re.IGNORECASE)
        time_regex_colon_hms = re.compile(r'(\d+):(\d{2}):(\d{2}(?:\.\d+)?)')
        time_regex_colon_ms = re.compile(r'(\d+):(\d{2}(?:\.\d+)?)')

        for item in ocr_items:
            txt = item.text.strip()
            # Try HMS first
            m_hms = time_regex_hms.search(txt)
            if m_hms:
                h = int(m_hms.group(1))
                m = int(m_hms.group(2))
                s = float(m_hms.group(3))
                calc_seconds = round(h * 3600 + m * 60 + s, 3)
                score_item = item
                break

            # Try Colon HMS (e.g. 00:06:53.157)
            m_chms = time_regex_colon_hms.search(txt)
            if m_chms:
                h = int(m_chms.group(1))
                m = int(m_chms.group(2))
                s = float(m_chms.group(3))
                calc_seconds = round(h * 3600 + m * 60 + s, 3)
                score_item = item
                break

            # Try MS
            m_ms = time_regex_ms.search(txt)
            if m_ms:
                m = int(m_ms.group(1))
                s = float(m_ms.group(2))
                calc_seconds = round(m * 60 + s, 3)
                score_item = item
                break

            # Try Colon MS (e.g. 06:53.157 or 09:14)
            m_cms = time_regex_colon_ms.search(txt)
            if m_cms:
                m = int(m_cms.group(1))
                s = float(m_cms.group(2))
                calc_seconds = round(m * 60 + s, 3)
                score_item = item
                break

        if score_item and calc_seconds is not None:
            metrics["time_seconds"] = ExtractedMetricResult(
                metric_id="time_seconds",
                raw_text=score_item.text,
                normalized_value=calc_seconds,
                confidence=round(score_item.confidence, 2),
                unit="s",
                ocr_region=score_item.box,
                status="verified" if score_item.confidence >= 0.70 else "needs_review"
            )

        overall_conf = metrics["time_seconds"].confidence if "time_seconds" in metrics else 0.0

        return ParserExtractionResult(
            benchmark_id=self.target_benchmark_id,
            parser_id=self.id,
            parser_version=self.version,
            overall_confidence=overall_conf,
            metrics=metrics,
            detected_benchmark_name="Super PI Mod",
            status="verified" if overall_conf >= 0.70 else "needs_review",
            raw_ocr_items=ocr_items
        )
