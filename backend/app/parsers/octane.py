import re
from typing import Dict, List, Optional
import numpy as np
from app.ocr.engine import OCRItem, OCREngine
from app.ocr.normalizer import NumberNormalizer
from app.parsers.base import BaseBenchmarkParser, ExtractedMetricResult, ParserExtractionResult

class OctaneParser(BaseBenchmarkParser):
    id: str = "octane_parser"
    name: str = "Octane 2.0 Parser"
    version: str = "1.0"
    target_benchmark_id: str = "octane_benchmark"

    KEYWORDS = [
        "octane",
        "octane 2.0",
        "octane.webmarks.info",
        "single core score",
        "multi core score"
    ]

    def can_parse(
        self,
        filename: str,
        ocr_items: List[OCRItem],
        image: np.ndarray
    ) -> float:
        fn_match, _ = self.fuzzy_match_filename(filename, ["octane", "octanebench", "octn"])
        if fn_match:
            return 0.95

        full_text = " ".join(item.text.lower() for item in ocr_items)
        if "octane" in full_text or "google octane" in full_text:
            return 0.95
        if "single core score" in full_text and "multi core score" in full_text:
            return 0.90

        text_match, _ = self.fuzzy_match_text(ocr_items, ["octane", "octanebench", "google octane"])
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

        # Look for Single Core Score and Multi Core Score
        sc_item = None
        mc_item = None

        for item in ocr_items:
            lower = item.text.lower()
            # E.g. "Single Core Score 107,150"
            m_sc = re.search(r'single\s*core\s*score\s*[:\-]?\s*([\d,]+)', lower)
            if m_sc:
                sc_item = (m_sc.group(1), item)

        for i, item in enumerate(ocr_items):
            lower = item.text.lower()
            # E.g. '755,184' followed by 'Multi Core Score'
            if "multi core score" in lower:
                if i > 0:
                    prev = ocr_items[i - 1]
                    val, _, _ = NumberNormalizer.normalize_score_text(prev.text)
                    if val and val > 10000:
                        mc_item = (prev.text, prev)

        # Fallback search if combined text didn't extract
        if not sc_item:
            for item in ocr_items:
                val, _, _ = NumberNormalizer.normalize_score_text(item.text)
                if val and 50000 <= val <= 250000:
                    sc_item = (item.text, item)
                    break

        if not mc_item:
            for item in ocr_items:
                val, _, _ = NumberNormalizer.normalize_score_text(item.text)
                if val and val >= 300000:
                    mc_item = (item.text, item)
                    break

        if sc_item:
            val, _, _ = NumberNormalizer.normalize_score_text(sc_item[0])
            metrics["single_core"] = ExtractedMetricResult(
                metric_id="single_core",
                raw_text=sc_item[0],
                normalized_value=val,
                confidence=round(sc_item[1].confidence, 2),
                unit="score",
                ocr_region=sc_item[1].box,
                status="verified" if sc_item[1].confidence >= 0.80 else "needs_review"
            )

        if mc_item:
            val, _, _ = NumberNormalizer.normalize_score_text(mc_item[0])
            metrics["multi_core"] = ExtractedMetricResult(
                metric_id="multi_core",
                raw_text=mc_item[0],
                normalized_value=val,
                confidence=round(mc_item[1].confidence, 2),
                unit="score",
                ocr_region=mc_item[1].box,
                status="verified" if mc_item[1].confidence >= 0.80 else "needs_review"
            )

        confs = [m.confidence for m in metrics.values() if m.normalized_value is not None]
        overall_conf = round(sum(confs) / len(confs), 2) if confs else 0.0

        return ParserExtractionResult(
            benchmark_id=self.target_benchmark_id,
            parser_id=self.id,
            parser_version=self.version,
            overall_confidence=overall_conf,
            metrics=metrics,
            detected_benchmark_name="Octane 2.0 Benchmark",
            status="verified" if overall_conf >= 0.80 else "needs_review",
            raw_ocr_items=ocr_items
        )
