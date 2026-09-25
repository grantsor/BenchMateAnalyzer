import re
from typing import Dict, List, Optional, Tuple
import numpy as np
from app.ocr.engine import OCRItem, OCREngine
from app.ocr.normalizer import NumberNormalizer
from app.parsers.base import BaseBenchmarkParser, ExtractedMetricResult, ParserExtractionResult

class BlackmagicParser(BaseBenchmarkParser):
    id: str = "blackmagic_parser"
    name: str = "Blackmagic Disk Speed Test Parser"
    version: str = "1.0"
    target_benchmark_id: str = "blackmagic_1gb"
    supported_benchmark_ids = {"blackmagic", "blackmagic_1gb", "blackmagic_5gb", "blackmagic_16g", "blackmagic_ssd_1gb"}

    def can_parse(
        self,
        filename: str,
        ocr_items: List[OCRItem],
        image: np.ndarray
    ) -> float:
        self._current_filename = filename
        fn_lower = filename.lower()
        full_text = " ".join(item.text.lower() for item in ocr_items)

        # High confidence filename matches
        if re.search(r"blackmagic.*(1g|5g|16g)", fn_lower) or "blackmagic" in fn_lower or "black_magic" in fn_lower:
            return 0.98

        fn_match, _ = self.fuzzy_match_filename(filename, ["blackmagic", "black_magic", "blackmagicspeedtest", "diskspeedtest"])
        if fn_match:
            return 0.95

        # OCR text matches
        if "blackmagicdesign" in full_text or "blackmagic" in full_text:
            return 0.98
        if "disk speed test" in full_text or "diskspeed test" in full_text:
            return 0.95
        if "how fast?" in full_text and "will it work?" in full_text:
            return 0.92

        text_match, _ = self.fuzzy_match_text(ocr_items, ["blackmagic", "disk speed test", "how fast", "will it work"])
        if text_match:
            return 0.88

        return 0.0

    def extract_results(
        self,
        image: np.ndarray,
        ocr_items: List[OCRItem],
        ocr_engine: OCREngine
    ) -> ParserExtractionResult:
        h, w = (image.shape[0], image.shape[1]) if image is not None else (720, 700)
        full_text = " ".join(item.text.lower() for item in ocr_items)

        # 1. Determine benchmark ID & variant (1GB vs 5GB vs 16GB)
        target_b_id = "blackmagic_1gb"
        b_name = "Blackmagic Disk Speed Test 1GB"

        # Check OCR items and signals
        fn_lower = getattr(self, "_current_filename", "").lower()
        all_signals = f"{fn_lower} {full_text}"

        if re.search(r"(?:5|16)\s*g", all_signals):
            target_b_id = "blackmagic_5gb"
            b_name = "Blackmagic Disk Speed Test 5GB"
        elif re.search(r"1\s*g", all_signals):
            target_b_id = "blackmagic_1gb"
            b_name = "Blackmagic Disk Speed Test 1GB"
        else:
            # Default to 1GB when ambiguous
            target_b_id = "blackmagic_1gb"
            b_name = "Blackmagic Disk Speed Test 1GB"

        metrics: Dict[str, ExtractedMetricResult] = {}

        # 2. Extract gauge scores: WRITE (left gauge) and READ (right gauge)
        mid_x = w / 2.0
        y_min = h * 0.15
        y_max = h * 0.48

        write_candidate: Optional[Tuple[float, OCRItem]] = None
        read_candidate: Optional[Tuple[float, OCRItem]] = None

        for item in ocr_items:
            bx, by, bw, bh = item.box
            cy = by + bh / 2.0
            cx = bx + bw / 2.0

            if cy < y_min or cy > y_max:
                continue

            text_clean = item.text.strip().replace(",", "")
            m = re.search(r"(\d+(?:\.\d+)?)", text_clean)
            if not m:
                continue

            try:
                val = float(m.group(1))
            except ValueError:
                continue

            if val < 5.0 or val > 50000.0:
                continue

            if cx < mid_x:
                dist = abs(cy - h * 0.33) + abs(cx - w * 0.22)
                if write_candidate is None or dist < write_candidate[0]:
                    write_candidate = (dist, item)
            else:
                dist = abs(cy - h * 0.33) + abs(cx - w * 0.78)
                if read_candidate is None or dist < read_candidate[0]:
                    read_candidate = (dist, item)

        if write_candidate:
            _, w_item = write_candidate
            val_clean = re.search(r"(\d+(?:\.\d+)?)", w_item.text.replace(",", ""))
            val_float = float(val_clean.group(1)) if val_clean else 0.0
            metrics["write_speed"] = ExtractedMetricResult(
                metric_id="write_speed",
                raw_text=w_item.text,
                normalized_value=val_float,
                confidence=round(w_item.confidence, 2),
                unit="MB/s",
                ocr_region=w_item.box,
                status="valid" if w_item.confidence >= 0.7 else "needs_review"
            )

        if read_candidate:
            _, r_item = read_candidate
            val_clean = re.search(r"(\d+(?:\.\d+)?)", r_item.text.replace(",", ""))
            val_float = float(val_clean.group(1)) if val_clean else 0.0
            metrics["read_speed"] = ExtractedMetricResult(
                metric_id="read_speed",
                raw_text=r_item.text,
                normalized_value=val_float,
                confidence=round(r_item.confidence, 2),
                unit="MB/s",
                ocr_region=r_item.box,
                status="valid" if r_item.confidence >= 0.7 else "needs_review"
            )

        confs = [m.confidence for m in metrics.values()]
        overall_conf = round(sum(confs) / len(confs), 2) if confs else 0.0

        return ParserExtractionResult(
            benchmark_id=target_b_id,
            parser_id=self.id,
            parser_version=self.version,
            overall_confidence=overall_conf,
            metrics=metrics,
            detected_benchmark_name=b_name,
            status="valid" if (len(metrics) >= 2 and overall_conf >= 0.75) else "needs_review",
            raw_ocr_items=ocr_items
        )
