import re
from typing import Dict, List, Optional, Tuple
import numpy as np
from app.ocr.engine import OCRItem, OCREngine
from app.ocr.normalizer import NumberNormalizer
from app.parsers.base import BaseBenchmarkParser, ExtractedMetricResult, ParserExtractionResult

class CrossMarkParser(BaseBenchmarkParser):
    id: str = "crossmark_parser"
    name: str = "CrossMark Parser"
    version: str = "1.0"
    target_benchmark_id: str = "crossmark"

    KEYWORDS = [
        "crossmark",
        "cross mark",
        "overall score",
        "productivity",
        "creativity",
        "responsiveness"
    ]

    def can_parse(
        self,
        filename: str,
        ocr_items: List[OCRItem],
        image: np.ndarray
    ) -> float:
        fn_match, _ = self.fuzzy_match_filename(filename, ["crossmark", "cross_mark", "cross", "bapcocrossmark"])
        if fn_match:
            return 0.95

        full_text = " ".join(item.text.lower() for item in ocr_items)
        if "crossmark" in full_text:
            return 0.95
        if "overall score" in full_text and ("productivity" in full_text or "creativity" in full_text):
            return 0.95
        if "productivity" in full_text and "creativity" in full_text and "responsiveness" in full_text:
            return 0.90

        text_match, _ = self.fuzzy_match_text(ocr_items, ["crossmark", "productivity", "creativity", "responsiveness"])
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

        targets = [
            ("overall_score", ["overall score", "overall"]),
            ("productivity", ["productivity"]),
            ("creativity", ["creativity"]),
            ("responsiveness", ["responsiveness"]),
        ]

        for m_id, kws in targets:
            score_item = self._find_card_score(ocr_items, kws)
            if score_item:
                val, _, conf_mod = NumberNormalizer.normalize_score_text(score_item.text)
                final_conf = score_item.confidence * conf_mod
                is_valid = NumberNormalizer.validate_range(val, 100, 20000)
                metrics[m_id] = ExtractedMetricResult(
                    metric_id=m_id,
                    raw_text=score_item.text,
                    normalized_value=val,
                    confidence=round(final_conf, 2),
                    unit="pts",
                    ocr_region=score_item.box,
                    status="verified" if (final_conf >= 0.65 and is_valid) else "needs_review"
                )
            else:
                metrics[m_id] = ExtractedMetricResult(
                    metric_id=m_id,
                    raw_text="",
                    normalized_value=None,
                    confidence=0.0,
                    unit="pts",
                    status="needs_review",
                    error_message=f"{m_id.replace('_', ' ').title()} score not found"
                )

        confs = [m.confidence for m in metrics.values() if m.normalized_value is not None]
        overall_conf = round(sum(confs) / len(confs), 2) if confs else 0.0

        all_verified = all(m.status == "verified" for m in metrics.values() if m.normalized_value is not None)
        has_scores = any(m.normalized_value is not None for m in metrics.values())
        overall_status = "verified" if all_verified and overall_conf >= 0.65 and has_scores else "needs_review"

        return ParserExtractionResult(
            benchmark_id=self.target_benchmark_id,
            parser_id=self.id,
            parser_version=self.version,
            overall_confidence=overall_conf,
            metrics=metrics,
            detected_benchmark_name="CrossMark",
            status=overall_status,
            raw_ocr_items=ocr_items
        )

    def _find_card_score(self, ocr_items: List[OCRItem], label_keywords: List[str]) -> Optional[OCRItem]:
        label_item = None
        for item in ocr_items:
            lower = item.text.lower()
            if any(kw in lower for kw in label_keywords):
                label_item = item
                break

        if not label_item:
            return None

        lx, ly, lw, lh = label_item.box
        candidates = []

        for item in ocr_items:
            if item == label_item:
                continue
            if not re.search(r'\d', item.text):
                continue

            ix, iy, iw, ih = item.box
            # In CrossMark, numbers are positioned directly above the label
            above_label = (iy < ly) and (ly - (iy + ih) <= 120)
            horizontally_aligned = abs((ix + iw / 2) - (lx + lw / 2)) < 120

            if above_label and horizontally_aligned:
                val, _, _ = NumberNormalizer.normalize_score_text(item.text)
                if val is not None and val >= 100:
                    dist = abs((ix + iw / 2) - (lx + lw / 2)) + abs(ly - (iy + ih))
                    candidates.append((dist, item))

        if candidates:
            candidates.sort(key=lambda x: x[0])
            return candidates[0][1]

        return None