import re
from typing import Dict, List, Optional
import numpy as np
from app.ocr.engine import OCRItem, OCREngine
from app.ocr.normalizer import NumberNormalizer
from app.parsers.base import BaseBenchmarkParser, ExtractedMetricResult, ParserExtractionResult

class WPrimeParser(BaseBenchmarkParser):
    id: str = "wprime_parser"
    name: str = "wPrime Benchmark Parser"
    version: str = "1.0"
    target_benchmark_id: str = "wprime_benchmark"

    KEYWORDS = [
        "wprime",
        "wprimebenchmark",
        "1024m",
        "32m",
        "sec"
    ]

    def can_parse(
        self,
        filename: str,
        ocr_items: List[OCRItem],
        image: np.ndarray
    ) -> float:
        fn_match, _ = self.fuzzy_match_filename(filename, ["wprime", "w_prime", "wprimebenchmark"])
        if fn_match:
            return 0.95

        full_text = " ".join(item.text.lower() for item in ocr_items)
        if "wprime" in full_text or "wprimebenchmark" in full_text:
            return 0.95
        if "1024m" in full_text and "sec" in full_text:
            return 0.90

        text_match, _ = self.fuzzy_match_text(ocr_items, ["wprime", "1024m", "wprime benchmark"])
        if text_match:
            return 0.85

        return 0.0

    def extract_results(
        self,
        image: np.ndarray,
        ocr_items: List[OCRItem],
        ocr_engine: OCREngine
    ) -> ParserExtractionResult:
        metrics: Dict[str, ExtractedMetricResult] = {}
        score_item = None
        time_val = None

        pattern_1024 = re.compile(r'1024M\s*[-–—]\s*([\d.]+)\s*sec', re.IGNORECASE)
        pattern_sec = re.compile(r'([\d.]+)\s*sec', re.IGNORECASE)

        for item in ocr_items:
            txt = item.text.strip()
            m = pattern_1024.search(txt)
            if m:
                try:
                    time_val = float(m.group(1))
                    score_item = item
                    break
                except ValueError:
                    pass

        # Fallback: look for 1024m item, then next item with sec
        if not score_item:
            for i, item in enumerate(ocr_items):
                if "1024m" in item.text.lower():
                    # check this item or adjacent
                    for offset in [0, 1]:
                        idx = i + offset
                        if idx < len(ocr_items):
                            m = pattern_sec.search(ocr_items[idx].text)
                            if m:
                                try:
                                    time_val = float(m.group(1))
                                    score_item = ocr_items[idx]
                                    break
                                except ValueError:
                                    pass
                    if score_item:
                        break

        if score_item and time_val is not None:
            metrics["time_1024m"] = ExtractedMetricResult(
                metric_id="time_1024m",
                raw_text=score_item.text,
                normalized_value=time_val,
                confidence=round(score_item.confidence, 2),
                unit="s",
                ocr_region=score_item.box,
                status="verified" if score_item.confidence >= 0.75 else "needs_review"
            )

        overall_conf = metrics["time_1024m"].confidence if "time_1024m" in metrics else 0.0

        return ParserExtractionResult(
            benchmark_id=self.target_benchmark_id,
            parser_id=self.id,
            parser_version=self.version,
            overall_confidence=overall_conf,
            metrics=metrics,
            detected_benchmark_name="wPrime Benchmark",
            status="verified" if overall_conf >= 0.75 else "needs_review",
            raw_ocr_items=ocr_items
        )
