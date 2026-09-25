import re
from typing import Dict, List, Optional, Tuple
import numpy as np
from app.ocr.engine import OCRItem, OCREngine
from app.ocr.normalizer import NumberNormalizer
from app.parsers.base import BaseBenchmarkParser, ExtractedMetricResult, ParserExtractionResult

class Geekbench6Parser(BaseBenchmarkParser):
    id: str = "geekbench6_parser"
    name: str = "Geekbench 6 Parser"
    version: str = "1.0"
    target_benchmark_id: str = "geekbench6"

    FILENAME_PATTERNS = [
        re.compile(r'geekbench.*6', re.IGNORECASE),
        re.compile(r'\bgb6\b', re.IGNORECASE),
        re.compile(r'geekbench', re.IGNORECASE),
    ]

    KEYWORDS = [
        "geekbench 6",
        "single-core score",
        "multi-core score",
        "single-core",
        "multi-core",
        "geekbench"
    ]

    def can_parse(
        self,
        filename: str,
        ocr_items: List[OCRItem],
        image: np.ndarray
    ) -> float:
        confidence = 0.0

        # Filename signal
        for pat in self.FILENAME_PATTERNS:
            if pat.search(filename):
                confidence = max(confidence, 0.75)
                break

        fn_match, _ = self.fuzzy_match_filename(filename, ["geekbench", "geekbench6", "gb6"])
        if fn_match:
            confidence = max(confidence, 0.85)

        # Disambiguation: Yield to GeekbenchComputeParser if OpenCL or Vulkan is present
        full_text = " ".join(item.text.lower() for item in ocr_items)
        fn_lower = filename.lower()
        if "opencl" in full_text or "vulkan" in full_text or "opencl" in fn_lower or "vulkan" in fn_lower:
            return 0.0

        if "geekbench 6" in full_text:
            confidence = max(confidence, 0.95)
        elif "single-core score" in full_text or "multi-core score" in full_text:
            confidence = max(confidence, 0.90)
        elif "geekbench" in full_text:
            confidence = max(confidence, 0.70)
        else:
            text_match, _ = self.fuzzy_match_text(ocr_items, ["geekbench 6", "single-core score", "multi-core score"])
            if text_match:
                confidence = max(confidence, 0.85)

        return confidence

    def extract_results(
        self,
        image: np.ndarray,
        ocr_items: List[OCRItem],
        ocr_engine: OCREngine
    ) -> ParserExtractionResult:
        metrics: Dict[str, ExtractedMetricResult] = {}

        # Look for Single-Core Score and Multi-Core Score
        single_item, single_box = self._find_metric_score(
            ocr_items, ["single-core score", "single-core", "single core"], image, ocr_engine
        )
        multi_item, multi_box = self._find_metric_score(
            ocr_items, ["multi-core score", "multi-core", "multi core"], image, ocr_engine
        )

        if single_item:
            val, unit, conf_mod = NumberNormalizer.normalize_score_text(single_item.text)
            final_conf = single_item.confidence * conf_mod
            is_valid = NumberNormalizer.validate_range(val, 300, 7000)
            metrics["single_core"] = ExtractedMetricResult(
                metric_id="single_core",
                raw_text=single_item.text,
                normalized_value=val,
                confidence=round(final_conf, 2),
                unit=unit or "score",
                ocr_region=single_box or single_item.box,
                status="verified" if (final_conf >= 0.85 and is_valid) else "needs_review"
            )
        else:
            metrics["single_core"] = ExtractedMetricResult(
                metric_id="single_core",
                raw_text="",
                normalized_value=None,
                confidence=0.0,
                unit="score",
                status="needs_review",
                error_message="Single-Core score not found"
            )

        if multi_item:
            val, unit, conf_mod = NumberNormalizer.normalize_score_text(multi_item.text)
            final_conf = multi_item.confidence * conf_mod
            is_valid = NumberNormalizer.validate_range(val, 800, 80000)
            metrics["multi_core"] = ExtractedMetricResult(
                metric_id="multi_core",
                raw_text=multi_item.text,
                normalized_value=val,
                confidence=round(final_conf, 2),
                unit=unit or "score",
                ocr_region=multi_box or multi_item.box,
                status="verified" if (final_conf >= 0.85 and is_valid) else "needs_review"
            )
        else:
            metrics["multi_core"] = ExtractedMetricResult(
                metric_id="multi_core",
                raw_text="",
                normalized_value=None,
                confidence=0.0,
                unit="score",
                status="needs_review",
                error_message="Multi-Core score not found"
            )

        # Cross-field validation: multi-core should normally be > single-core
        sc_val = metrics["single_core"].normalized_value
        mc_val = metrics["multi_core"].normalized_value
        if sc_val is not None and mc_val is not None:
            if mc_val <= sc_val:
                metrics["multi_core"].status = "needs_review"
                metrics["multi_core"].error_message = "Multi-Core score should be greater than Single-Core score."

        # Overall confidence
        confs = [m.confidence for m in metrics.values() if m.normalized_value is not None]
        overall_conf = round(sum(confs) / len(confs), 2) if confs else 0.0

        all_verified = all(m.status == "verified" for m in metrics.values())
        overall_status = "verified" if all_verified and overall_conf >= 0.85 else "needs_review"

        return ParserExtractionResult(
            benchmark_id=self.target_benchmark_id,
            parser_id=self.id,
            parser_version=self.version,
            overall_confidence=overall_conf,
            metrics=metrics,
            detected_benchmark_name="Geekbench 6",
            status=overall_status,
            raw_ocr_items=ocr_items
        )

    def _find_metric_score(
        self,
        ocr_items: List[OCRItem],
        label_keywords: List[str],
        image: np.ndarray,
        ocr_engine: OCREngine
    ) -> Tuple[Optional[OCRItem], Optional[Tuple[int, int, int, int]]]:
        """
        Locates the label and finds the associated number by spatial proximity.
        """
        target_label_item: Optional[OCRItem] = None
        for item in ocr_items:
            lower = item.text.lower()
            if any(kw in lower for kw in label_keywords):
                target_label_item = item
                break

        if not target_label_item:
            # Fallback: check if an item itself contains "Single-Core 3013"
            for item in ocr_items:
                for kw in label_keywords:
                    match = re.search(rf'{kw}\s*[:\-]?\s*(\d[\d,\s]*)', item.text, re.IGNORECASE)
                    if match:
                        return OCRItem(
                            text=match.group(1),
                            confidence=item.confidence,
                            polygon=item.polygon,
                            box=item.box
                        ), item.box
            return None, None

        lx, ly, lw, lh = target_label_item.box

        # Look for numbers situated nearby:
        # Either directly above, below (within 250px), or immediately to the right (within 300px)
        candidates = []
        for item in ocr_items:
            if item == target_label_item:
                continue
            # Check if item text has digits
            if not re.search(r'\d', item.text):
                continue

            ix, iy, iw, ih = item.box

            # Spatial relationship
            # Case A: Below the label (typical Geekbench layout has score below "Single-Core Score")
            is_below = (iy >= ly) and (iy <= ly + lh + 250) and (abs(ix - lx) < 250 or abs((ix + iw/2) - (lx + lw/2)) < 200)
            # Case B: Above the label (some versions show large number above label)
            is_above = (iy + ih <= ly + 50) and (iy >= ly - 200) and (abs(ix - lx) < 250)
            # Case C: To the right of the label on roughly same vertical line
            is_right = (ix >= lx + lw - 20) and (ix <= lx + lw + 300) and (abs(iy - ly) < 60)

            if is_below or is_above or is_right:
                val, _, _ = NumberNormalizer.normalize_score_text(item.text)
                if val is not None:
                    # Distance from center
                    dist = ((ix + iw/2) - (lx + lw/2))**2 + ((iy + ih/2) - (ly + lh/2))**2
                    candidates.append((dist, item))

        if candidates:
            candidates.sort(key=lambda x: x[0])
            best_item = candidates[0][1]
            return best_item, best_item.box

        # If not found in existing OCR items, try cropping a region around label
        # In Geekbench 6, score is typically centered right below or above the label
        img_h, img_w = image.shape[:2]
        crop_y1 = max(0, ly - 150)
        crop_y2 = min(img_h, ly + lh + 180)
        crop_x1 = max(0, lx - 80)
        crop_x2 = min(img_w, lx + lw + 80)

        sub_items = ocr_engine.ocr_region(
            image, (crop_x1, crop_y1, crop_x2 - crop_x1, crop_y2 - crop_y1)
        )
        for item in sub_items:
            val, _, _ = NumberNormalizer.normalize_score_text(item.text)
            if val is not None and not any(kw in item.text.lower() for kw in label_keywords):
                return item, item.box

        return None, None
