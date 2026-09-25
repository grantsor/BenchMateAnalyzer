import re
from typing import Dict, List, Optional, Tuple
import numpy as np
from app.ocr.engine import OCRItem, OCREngine
from app.ocr.normalizer import NumberNormalizer
from app.parsers.base import BaseBenchmarkParser, ExtractedMetricResult, ParserExtractionResult

class CinebenchParser(BaseBenchmarkParser):
    id: str = "cinebench_parser"
    name: str = "Cinebench Parser"
    version: str = "1.0"
    target_benchmark_id: str = "cinebench_r26"
    supported_benchmark_ids = {"cinebench", "cinebench_r26", "cinebench_2024", "cinebench_r23", "cinebench_r20"}

    FILENAME_PATTERNS = [
        re.compile(r'cine.*r26', re.IGNORECASE),
        re.compile(r'cb26', re.IGNORECASE),
        re.compile(r'cinebench.*2026', re.IGNORECASE),
        re.compile(r'cine.*2024', re.IGNORECASE),
        re.compile(r'cb2024|cb24', re.IGNORECASE),
        re.compile(r'cine.*r23', re.IGNORECASE),
        re.compile(r'cb23', re.IGNORECASE),
        re.compile(r'cinebench', re.IGNORECASE),
    ]

    KEYWORDS = [
        "cinebench",
        "cpu (multi core)",
        "cpu (single core)",
        "multi core",
        "single core",
        "pts"
    ]

    def can_parse(
        self,
        filename: str,
        ocr_items: List[OCRItem],
        image: np.ndarray
    ) -> float:
        if self.is_system_monitoring_image(filename):
            return 0.0

        confidence = 0.0

        for pat in self.FILENAME_PATTERNS:
            if pat.search(filename):
                confidence = max(confidence, 0.75)
                break

        fn_match, _ = self.fuzzy_match_filename(filename, [
            "cinebench", "ciner26", "cinerr26", "ciner24", "ciner23", "cb26", "cb24", "cb23", "cinebench2026", "cinebench2024"
        ])
        if fn_match:
            confidence = max(confidence, 0.85)

        full_text = " ".join(item.text.lower() for item in ocr_items)
        if "cinebench" in full_text:
            confidence = max(confidence, 0.95)
        elif "cpu (multi core)" in full_text or "cpu (single core)" in full_text:
            confidence = max(confidence, 0.90)
        elif "pts" in full_text and ("multi core" in full_text or "single core" in full_text):
            confidence = max(confidence, 0.80)
        else:
            text_match, _ = self.fuzzy_match_text(ocr_items, ["cinebench", "cpu (multi core)", "cpu (single core)", "cpu (multiple threads)", "cpu (single thread)"])
            if text_match:
                confidence = max(confidence, 0.85)

        return confidence

    def detect_version(self, filename: str, ocr_items: List[OCRItem]) -> Tuple[str, str]:
        """
        Determines whether screenshot is Cinebench R26, 2024, or R23.
        Returns (benchmark_id, display_name).
        """
        full_text = " ".join(item.text.lower() for item in ocr_items)
        fn_lower = filename.lower()

        if "2024" in full_text or "2024" in fn_lower or "cb24" in fn_lower:
            return "cinebench_2024", "Cinebench 2024"
        elif "r23" in full_text or "r23" in fn_lower or "cb23" in fn_lower:
            return "cinebench_r23", "Cinebench R23"
        elif "r26" in full_text or "2026" in full_text or "r26" in fn_lower or "cb26" in fn_lower:
            return "cinebench_r26", "Cinebench 2026"
        else:
            return "cinebench_r26", "Cinebench 2026"

    def extract_results(
        self,
        image: np.ndarray,
        ocr_items: List[OCRItem],
        ocr_engine: OCREngine
    ) -> ParserExtractionResult:
        metrics: Dict[str, ExtractedMetricResult] = {}

        # 1. Determine benchmark version
        benchmark_id, benchmark_name = self.detect_version("", ocr_items)

        # 2. Extract Multi-Core and Single-Core
        multi_item, multi_box = self._find_cinebench_score(
            ocr_items, ["cpu (multiple threads)", "multiple threads", "cpu (multi core)", "multi core", "multi-core", "multi"], image, ocr_engine
        )
        single_item, single_box = self._find_cinebench_score(
            ocr_items, ["cpu (single thread)", "single thread", "cpu (single core)", "single core", "single-core", "single"], image, ocr_engine
        )

        # Range bounds based on version
        if benchmark_id == "cinebench_2024":
            mc_min, mc_max = 50, 15000
            sc_min, sc_max = 10, 800
        else:
            mc_min, mc_max = 500, 150000
            sc_min, sc_max = 200, 10000

        if multi_item:
            val, unit, conf_mod = NumberNormalizer.normalize_score_text(multi_item.text)
            final_conf = multi_item.confidence * conf_mod
            is_valid = NumberNormalizer.validate_range(val, mc_min, mc_max)
            metrics["multi_core"] = ExtractedMetricResult(
                metric_id="multi_core",
                raw_text=multi_item.text,
                normalized_value=val,
                confidence=round(final_conf, 2),
                unit=unit or "pts",
                ocr_region=multi_box or multi_item.box,
                status="verified" if (final_conf >= 0.75 and is_valid) else "needs_review"
            )
        else:
            metrics["multi_core"] = ExtractedMetricResult(
                metric_id="multi_core",
                raw_text="",
                normalized_value=None,
                confidence=0.0,
                unit="pts",
                status="needs_review",
                error_message="Multi-Core score not found"
            )

        if single_item:
            val, unit, conf_mod = NumberNormalizer.normalize_score_text(single_item.text)
            final_conf = single_item.confidence * conf_mod
            is_valid = NumberNormalizer.validate_range(val, sc_min, sc_max)
            metrics["single_core"] = ExtractedMetricResult(
                metric_id="single_core",
                raw_text=single_item.text,
                normalized_value=val,
                confidence=round(final_conf, 2),
                unit=unit or "pts",
                ocr_region=single_box or single_item.box,
                status="verified" if (final_conf >= 0.75 and is_valid) else "needs_review"
            )
        else:
            metrics["single_core"] = ExtractedMetricResult(
                metric_id="single_core",
                raw_text="",
                normalized_value=None,
                confidence=0.0,
                unit="pts",
                status="needs_review",
                error_message="Single-Core score not found"
            )

        # Cross-validation
        sc_val = metrics["single_core"].normalized_value
        mc_val = metrics["multi_core"].normalized_value
        if sc_val is not None and mc_val is not None:
            if mc_val <= sc_val:
                metrics["multi_core"].status = "needs_review"
                metrics["multi_core"].error_message = "Multi-Core score should be greater than Single-Core score."

        confs = [m.confidence for m in metrics.values() if m.normalized_value is not None]
        overall_conf = round(sum(confs) / len(confs), 2) if confs else 0.0

        all_verified = all(m.status == "verified" for m in metrics.values())
        overall_status = "verified" if all_verified and overall_conf >= 0.75 else "needs_review"

        return ParserExtractionResult(
            benchmark_id=benchmark_id,
            parser_id=self.id,
            parser_version=self.version,
            overall_confidence=overall_conf,
            metrics=metrics,
            detected_benchmark_name=benchmark_name,
            status=overall_status,
            raw_ocr_items=ocr_items
        )

    def _find_cinebench_score(
        self,
        ocr_items: List[OCRItem],
        label_keywords: List[str],
        image: np.ndarray,
        ocr_engine: OCREngine
    ) -> Tuple[Optional[OCRItem], Optional[Tuple[int, int, int, int]]]:
        """
        Finds score next to CPU (Multiple Threads / Multi Core) or CPU (Single Thread / Single Core).
        In Cinebench, score is on the same row, often followed by 'pts'.
        """
        matching_labels = []
        for item in ocr_items:
            lower = item.text.lower()
            for idx, kw in enumerate(label_keywords):
                if kw in lower:
                    matching_labels.append((idx, item))
                    break

        matching_labels.sort(key=lambda x: x[0])

        for _, target_label_item in matching_labels:
            lx, ly, lw, lh = target_label_item.box

            # Search candidates in the same horizontal row (y +/- 25px) and to the right
            candidates = []
            for item in ocr_items:
                if item == target_label_item:
                    continue
                if not re.search(r'\d', item.text):
                    continue

                ix, iy, iw, ih = item.box
                same_row = abs((iy + ih/2) - (ly + lh/2)) <= 25
                to_the_right = ix >= lx + lw - 30

                # Score numbers are located in the left result panel (x < 600)
                if same_row and to_the_right and ix < 600:
                    val, _, _ = NumberNormalizer.normalize_score_text(item.text)
                    if val is not None:
                        dist = abs(ix - (lx + lw))
                        candidates.append((dist, item))

            if candidates:
                candidates.sort(key=lambda x: x[0])
                best_item = candidates[0][1]
                return best_item, best_item.box

            # Try cropping the right portion of the row
            if image is not None:
                img_h, img_w = image.shape[:2]
                crop_y1 = max(0, ly - 15)
                crop_y2 = min(img_h, ly + lh + 15)
                crop_x1 = max(0, lx + lw)
                crop_x2 = min(img_w, min(600, lx + lw + 350))

                if crop_x2 > crop_x1 and crop_y2 > crop_y1:
                    sub_items = ocr_engine.ocr_region(
                        image, (crop_x1, crop_y1, crop_x2 - crop_x1, crop_y2 - crop_y1)
                    )
                    for item in sub_items:
                        val, _, _ = NumberNormalizer.normalize_score_text(item.text)
                        if val is not None:
                            return item, item.box

        return None, None
