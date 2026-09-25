import re
from typing import Dict, List, Optional
import numpy as np
from app.ocr.engine import OCRItem, OCREngine
from app.ocr.normalizer import NumberNormalizer
from app.parsers.base import BaseBenchmarkParser, ExtractedMetricResult, ParserExtractionResult

class CoronaParser(BaseBenchmarkParser):
    id: str = "corona_parser"
    name: str = "Corona 10 Benchmark Parser"
    version: str = "1.0"
    target_benchmark_id: str = "corona_benchmark"

    KEYWORDS = [
        "corona 10 benchmark",
        "corona",
        "score (rays/s)",
        "rays/s",
        "performance score"
    ]

    def can_parse(
        self,
        filename: str,
        ocr_items: List[OCRItem],
        image: np.ndarray
    ) -> float:
        fn_match, _ = self.fuzzy_match_filename(filename, ["corona", "coronabenchmark", "corona10"])
        if fn_match:
            return 0.95

        full_text = " ".join(item.text.lower() for item in ocr_items)
        if "corona 10" in full_text or "score (rays/s)" in full_text or "corona" in full_text:
            return 0.95

        text_match, _ = self.fuzzy_match_text(ocr_items, ["corona 10 benchmark", "rays/s", "performance score"])
        if text_match:
            return 0.90

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
            if "score (rays/s)" in lower or "rays/s" in lower or "performance score" in lower:
                # Number is typically right after or below the label
                if i + 1 < len(ocr_items):
                    nxt = ocr_items[i + 1]
                    val, _, _ = NumberNormalizer.normalize_score_text(nxt.text)
                    if val and val > 1000:
                        score_item = nxt
                        break

        # Fallback: find large number formatted with commas (e.g. 4,977,282)
        if not score_item:
            for item in ocr_items:
                if re.search(r'^\d{1,3}(,\d{3}){2,}$', item.text.strip()):
                    score_item = item
                    break

        if score_item:
            val, _, _ = NumberNormalizer.normalize_score_text(score_item.text)
            metrics["rays_per_sec"] = ExtractedMetricResult(
                metric_id="rays_per_sec",
                raw_text=score_item.text,
                normalized_value=val,
                confidence=round(score_item.confidence, 2),
                unit="rays/s",
                ocr_region=score_item.box,
                status="verified" if score_item.confidence >= 0.80 else "needs_review"
            )

        overall_conf = metrics["rays_per_sec"].confidence if "rays_per_sec" in metrics else 0.0

        return ParserExtractionResult(
            benchmark_id=self.target_benchmark_id,
            parser_id=self.id,
            parser_version=self.version,
            overall_confidence=overall_conf,
            metrics=metrics,
            detected_benchmark_name="Corona 10 Benchmark",
            status="verified" if overall_conf >= 0.80 else "needs_review",
            raw_ocr_items=ocr_items
        )
