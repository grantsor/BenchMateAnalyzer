import re
from typing import Dict, List, Optional
import numpy as np
from app.ocr.engine import OCRItem, OCREngine
from app.ocr.normalizer import NumberNormalizer
from app.parsers.base import BaseBenchmarkParser, ExtractedMetricResult, ParserExtractionResult

class PCMark10Parser(BaseBenchmarkParser):
    id: str = "pcmark10_parser"
    name: str = "PCMark 10 Parser"
    version: str = "1.0"
    target_benchmark_id: str = "pcmark10"

    KEYWORDS = [
        "pcmark 10",
        "pcmark10",
        "pcmark 10 extended",
        "essentials",
        "productivity",
        "digital content creation"
    ]

    def can_parse(
        self,
        filename: str,
        ocr_items: List[OCRItem],
        image: np.ndarray
    ) -> float:
        fn_lower = filename.lower()
        full_text = " ".join(item.text.lower() for item in ocr_items)

        # Yield storage drive benchmarks to PCMark10StorageParser
        if any(w in full_text or w in fn_lower for w in ["data drive", "datadrive", "quick system", "quicksys"]):
            return 0.0

        fn_match, _ = self.fuzzy_match_filename(filename, ["pcmark", "pcmark10", "pcm10", "pcm"])
        if fn_match:
            return 0.95

        if "pcmark 10" in full_text or "pcmark1o" in full_text or "pcmark" in full_text:
            return 0.95
        if "essentials" in full_text and ("productivity" in full_text or "digital content" in full_text):
            return 0.90

        text_match, _ = self.fuzzy_match_text(ocr_items, ["pcmark 10", "essentials", "digital content creation"])
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

        # 1. Overall Score: prominent score near y ~ 580-660, typically x > 2000
        overall_item = None
        for item in ocr_items:
            lx, ly, lw, lh = item.box
            # Exclude computer info lines like "LAPTOP-..." or "Windows"
            txt = item.text.strip()
            if any(w in txt.lower() for w in ["laptop", "version", "edition", "windows", "amd", "intel"]):
                continue
            if 550 <= ly <= 660 and lx > 1800:
                val, _, _ = NumberNormalizer.normalize_score_text(txt)
                if val and 3000 <= val <= 25000:
                    overall_item = item
                    break

        # Fallback: look for "PCMARK 10 EXTENDED" and find the score on the same row or right after
        if not overall_item:
            for item in ocr_items:
                lx, ly, lw, lh = item.box
                txt = item.text.strip()
                if any(w in txt.lower() for w in ["laptop", "version", "edition", "windows", "amd", "intel"]):
                    continue
                if 550 <= ly <= 670:
                    val, _, _ = NumberNormalizer.normalize_score_text(txt)
                    if val and 4000 <= val <= 18000:
                        overall_item = item
                        break

        if overall_item:
            val, _, _ = NumberNormalizer.normalize_score_text(overall_item.text)
            metrics["overall_score"] = ExtractedMetricResult(
                metric_id="overall_score",
                raw_text=overall_item.text,
                normalized_value=val,
                confidence=round(overall_item.confidence, 2),
                unit="score",
                ocr_region=overall_item.box,
                status="verified" if overall_item.confidence >= 0.80 else "needs_review"
            )

        # 2. Sub-scores: Essentials, Productivity, Digital Content Creation, Gaming
        sub_scores = [
            ("essentials", ["essentials"]),
            ("productivity", ["productivity"]),
            ("digital_content_creation", ["digital content"]),
            ("gaming", ["gaming"])
        ]

        for m_id, kws in sub_scores:
            sub_item = self._find_sub_score(ocr_items, kws)
            if sub_item:
                val, _, _ = NumberNormalizer.normalize_score_text(sub_item.text)
                metrics[m_id] = ExtractedMetricResult(
                    metric_id=m_id,
                    raw_text=sub_item.text,
                    normalized_value=val,
                    confidence=round(sub_item.confidence, 2),
                    unit="score",
                    ocr_region=sub_item.box,
                    status="verified" if sub_item.confidence >= 0.80 else "needs_review"
                )

        confs = [m.confidence for m in metrics.values() if m.normalized_value is not None]
        overall_conf = round(sum(confs) / len(confs), 2) if confs else 0.0

        return ParserExtractionResult(
            benchmark_id=self.target_benchmark_id,
            parser_id=self.id,
            parser_version=self.version,
            overall_confidence=overall_conf,
            metrics=metrics,
            detected_benchmark_name="PCMark 10",
            status="verified" if overall_conf >= 0.80 else "needs_review",
            raw_ocr_items=ocr_items
        )

    def _find_sub_score(self, ocr_items: List[OCRItem], keywords: List[str]) -> Optional[OCRItem]:
        for item in ocr_items:
            lower = item.text.lower()
            if any(lower == kw or lower.startswith(kw) for kw in keywords):
                lx, ly, lw, lh = item.box
                l_cy = ly + lh / 2

                candidates = []
                for other in ocr_items:
                    if other == item:
                        continue
                    ox, oy, ow, oh = other.box
                    o_cy = oy + oh / 2

                    # Horizontal alignment on the header row (y within 35px), to the right (within 550px)
                    if abs(o_cy - l_cy) < 35 and 50 < (ox - lx) < 600:
                        txt = other.text.strip()
                        if any(w in txt.lower() for w in ["laptop", "score", "edition", "version"]):
                            continue
                        val, _, _ = NumberNormalizer.normalize_score_text(txt)
                        if val and 3000 <= val <= 25000:
                            candidates.append((ox, other))

                if candidates:
                    candidates.sort(key=lambda c: c[0])
                    return candidates[0][1]

        return None
