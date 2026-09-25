import re
from typing import Dict, List, Optional
import numpy as np
from app.ocr.engine import OCRItem, OCREngine
from app.ocr.normalizer import NumberNormalizer
from app.parsers.base import BaseBenchmarkParser, ExtractedMetricResult, ParserExtractionResult

class BlenderParser(BaseBenchmarkParser):
    id: str = "blender_parser"
    name: str = "Blender Benchmark Parser"
    version: str = "1.0"
    target_benchmark_id: str = "blender_benchmark"

    KEYWORDS = [
        "blenderbenchmarklauncher",
        "opendata.blender.org",
        "samples per minute",
        "monster",
        "junkshop",
        "classroom",
        "blender"
    ]

    def can_parse(
        self,
        filename: str,
        ocr_items: List[OCRItem],
        image: np.ndarray
    ) -> float:
        fn_match, _ = self.fuzzy_match_filename(filename, ["blender", "blenderbenchmark", "blndr", "blend"])
        if fn_match:
            return 0.95

        full_text = " ".join(item.text.lower() for item in ocr_items)
        if "blender" in full_text or "monster:" in full_text or "junkshop:" in full_text:
            return 0.95
        if "samples per minute" in full_text:
            return 0.90

        text_match, _ = self.fuzzy_match_text(ocr_items, ["blender benchmark", "monster", "junkshop", "classroom"])
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

        # Look for monster, junkshop, classroom
        scenes = [
            ("monster", ["monster:", "monster"]),
            ("junkshop", ["junkshop:", "junkshop"]),
            ("classroom", ["classroom:", "classroom"])
        ]

        for metric_id, kws in scenes:
            score_item = self._find_scene_score(ocr_items, kws)
            if score_item:
                val, _, _ = NumberNormalizer.normalize_score_text(score_item.text)
                metrics[metric_id] = ExtractedMetricResult(
                    metric_id=metric_id,
                    raw_text=score_item.text,
                    normalized_value=val,
                    confidence=round(score_item.confidence, 2),
                    unit="samples/min",
                    ocr_region=score_item.box,
                    status="verified" if score_item.confidence >= 0.80 else "needs_review"
                )

        confs = [m.confidence for m in metrics.values() if m.normalized_value is not None]
        overall_conf = round(sum(confs) / len(confs), 2) if confs else 0.0

        return ParserExtractionResult(
            benchmark_id=self.target_benchmark_id,
            parser_id=self.id,
            parser_version=self.version,
            overall_confidence=overall_conf,
            metrics=metrics,
            detected_benchmark_name="Blender Benchmark",
            status="verified" if overall_conf >= 0.80 else "needs_review",
            raw_ocr_items=ocr_items
        )

    def _find_scene_score(self, ocr_items: List[OCRItem], keywords: List[str]) -> Optional[OCRItem]:
        for item in ocr_items:
            lower = item.text.lower().strip()
            if any(lower == kw or lower.startswith(kw) for kw in keywords):
                lx, ly, lw, lh = item.box
                l_cy = ly + lh / 2

                candidates = []
                for other in ocr_items:
                    if other == item:
                        continue
                    ox, oy, ow, oh = other.box
                    o_cy = oy + oh / 2

                    # Must be roughly on the same horizontal line (within 25px vertically) and to the right
                    if abs(o_cy - l_cy) < 25 and ox > lx:
                        # Must be a clean number (e.g. 99.576815 or 76.114427)
                        cleaned = other.text.strip()
                        if re.match(r'^\d+(\.\d+)?$', cleaned):
                            candidates.append((ox, other))

                if candidates:
                    # Pick the closest one to the right
                    candidates.sort(key=lambda c: c[0])
                    return candidates[0][1]

        return None
