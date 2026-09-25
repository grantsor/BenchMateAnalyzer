import re
from typing import Dict, List, Optional
import numpy as np
from app.ocr.engine import OCRItem, OCREngine
from app.ocr.normalizer import NumberNormalizer
from app.parsers.base import BaseBenchmarkParser, ExtractedMetricResult, ParserExtractionResult

class VRayParser(BaseBenchmarkParser):
    id: str = "vray_parser"
    name: str = "V-Ray Benchmark Parser"
    version: str = "1.0"
    target_benchmark_id: str = "vray_benchmark"

    KEYWORDS = [
        "v-ray benchmark",
        "v-ray score",
        "vsamples",
        "v-ray",
        "vray"
    ]

    def can_parse(
        self,
        filename: str,
        ocr_items: List[OCRItem],
        image: np.ndarray
    ) -> float:
        fn_match, _ = self.fuzzy_match_filename(filename, ["vray", "v-ray", "vraybenchmark"])
        if fn_match:
            return 0.95

        full_text = " ".join(item.text.lower() for item in ocr_items)
        if "v-ray benchmark" in full_text or "vsamples" in full_text or "v-ray score" in full_text:
            return 0.95

        text_match, _ = self.fuzzy_match_text(ocr_items, ["v-ray benchmark", "vsamples", "vpath"])
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

        for i, item in enumerate(ocr_items):
            lower = item.text.lower()
            if "v-ray score" in lower or "score" == lower.strip():
                # Score is often the next item
                if i + 1 < len(ocr_items):
                    nxt = ocr_items[i + 1]
                    val, _, _ = NumberNormalizer.normalize_score_text(nxt.text)
                    if val and val > 100:
                        score_item = nxt
                        break

        # Fallback: check item before vsamples
        if not score_item:
            for i, item in enumerate(ocr_items):
                if "vsamples" in item.text.lower() and i > 0:
                    prev = ocr_items[i - 1]
                    val, _, _ = NumberNormalizer.normalize_score_text(prev.text)
                    if val and val > 100:
                        score_item = prev
                        break

        if score_item:
            val, _, _ = NumberNormalizer.normalize_score_text(score_item.text)
            metrics["vray_score"] = ExtractedMetricResult(
                metric_id="vray_score",
                raw_text=score_item.text,
                normalized_value=val,
                confidence=round(score_item.confidence, 2),
                unit="vsamples",
                ocr_region=score_item.box,
                status="verified" if score_item.confidence >= 0.75 else "needs_review"
            )

        overall_conf = metrics["vray_score"].confidence if "vray_score" in metrics else 0.0

        return ParserExtractionResult(
            benchmark_id=self.target_benchmark_id,
            parser_id=self.id,
            parser_version=self.version,
            overall_confidence=overall_conf,
            metrics=metrics,
            detected_benchmark_name="V-Ray Benchmark",
            status="verified" if overall_conf >= 0.75 else "needs_review",
            raw_ocr_items=ocr_items
        )
