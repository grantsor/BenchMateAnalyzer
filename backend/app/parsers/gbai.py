import re
from typing import Dict, List, Optional
import numpy as np
from app.ocr.engine import OCRItem, OCREngine
from app.ocr.normalizer import NumberNormalizer
from app.parsers.base import BaseBenchmarkParser, ExtractedMetricResult, ParserExtractionResult

class GeekbenchAIParser(BaseBenchmarkParser):
    id: str = "gbai_parser"
    name: str = "Geekbench AI Parser"
    version: str = "1.0"
    target_benchmark_id: str = "geekbench_ai"

    KEYWORDS = [
        "geekbench ai",
        "geekbench al",
        "single precision",
        "half precision",
        "quantized score",
        "browser.geekbench.com/ai"
    ]

    def can_parse(
        self,
        filename: str,
        ocr_items: List[OCRItem],
        image: np.ndarray
    ) -> float:
        fn_lower = filename.lower()
        full_text = " ".join(item.text.lower() for item in ocr_items)

        # AI marker must be present in either filename or OCR text
        has_ai_signal = (
            "ai" in fn_lower or "gbai" in fn_lower or
            "ai" in full_text or "al" in full_text or "quantized" in full_text
        )
        if not has_ai_signal:
            return 0.0

        fn_match, _ = self.fuzzy_match_filename(filename, ["gbai", "geekbench_ai", "geekbenchai"])
        if fn_match:
            return 0.95

        full_text = " ".join(item.text.lower() for item in ocr_items)
        if "geekbench ai" in full_text or "geekbench al" in full_text or "browser.geekbench.com/ai" in full_text:
            return 0.95
        if "single precision" in full_text and "quantized score" in full_text:
            return 0.90

        text_match, _ = self.fuzzy_match_text(ocr_items, ["geekbench ai", "single precision", "quantized score"])
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

        specs = [
            ("single_precision", ["single precision score", "single precision"]),
            ("half_precision", ["half precision score", "half precision"]),
            ("quantized", ["quantized score", "quantized"])
        ]

        for metric_id, kws in specs:
            score_item = self._find_score(ocr_items, kws)
            if score_item:
                val, _, _ = NumberNormalizer.normalize_score_text(score_item.text)
                metrics[metric_id] = ExtractedMetricResult(
                    metric_id=metric_id,
                    raw_text=score_item.text,
                    normalized_value=val,
                    confidence=round(score_item.confidence, 2),
                    unit="score",
                    ocr_region=score_item.box,
                    status="verified" if score_item.confidence >= 0.80 else "needs_review"
                )

        confs = [m.confidence for m in metrics.values() if m.normalized_value is not None]
        overall_conf = round(sum(confs) / len(confs), 2) if confs else 0.0

        return ParserExtractionResult(
            benchmark_id="geekbench_ai",
            parser_id=self.id,
            parser_version=self.version,
            overall_confidence=overall_conf,
            metrics=metrics,
            detected_benchmark_name="Geekbench AI",
            status="verified" if overall_conf >= 0.80 else "needs_review",
            raw_ocr_items=ocr_items
        )

    def _find_score(self, ocr_items: List[OCRItem], keywords: List[str]) -> Optional[OCRItem]:
        # In Geekbench AI results, the numbers often appear immediately before the labels:
        # e.g.:
        # '3319'
        # '1663'
        # '6718'
        # 'Single Precision Score'
        # 'Half Precision Score'
        # 'Quantized Score'
        for i, item in enumerate(ocr_items):
            lower = item.text.lower()
            if any(kw in lower for kw in keywords):
                lx, ly, lw, lh = item.box
                # Search numbers vertically above the label (within 150px)
                for other in ocr_items:
                    if other == item:
                        continue
                    ox, oy, ow, oh = other.box
                    is_above = (oy + oh <= ly + 20) and (oy >= ly - 140) and abs(ox - lx) < 150
                    if is_above:
                        val, _, _ = NumberNormalizer.normalize_score_text(other.text)
                        if val and val > 100:
                            return other

                # Check numbers to the right
                for other in ocr_items:
                    if other == item:
                        continue
                    ox, oy, ow, oh = other.box
                    is_right = abs((oy + oh/2) - (ly + lh/2)) < 30 and (ox >= lx + lw - 10) and (ox <= lx + lw + 200)
                    if is_right:
                        val, _, _ = NumberNormalizer.normalize_score_text(other.text)
                        if val and val > 100:
                            return other
        return None
