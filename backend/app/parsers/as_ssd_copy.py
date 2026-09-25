import re
from typing import Dict, List, Optional, Tuple
import numpy as np
from app.ocr.engine import OCRItem, OCREngine
from app.ocr.normalizer import NumberNormalizer
from app.parsers.base import BaseBenchmarkParser, ExtractedMetricResult, ParserExtractionResult

class ASSSDCopyParser(BaseBenchmarkParser):
    id: str = "as_ssd_copy_parser"
    name: str = "AS SSD Copy Benchmark Parser"
    version: str = "1.0"
    target_benchmark_id: str = "as_ssd_copy"

    def can_parse(
        self,
        filename: str,
        ocr_items: List[OCRItem],
        image: np.ndarray
    ) -> float:
        fn_lower = filename.lower()
        full_text = " ".join(item.text.lower() for item in ocr_items)

        if "copy-benchmark" in full_text or "copy benchmark" in full_text:
            return 0.98
        if "as ssd" in full_text and ("speed:" in full_text or "duration:" in full_text) and "iso" in full_text:
            return 0.98
        if "copy" in fn_lower and ("as" in fn_lower or "asssd" in fn_lower):
            return 0.90

        fn_match, _ = self.fuzzy_match_filename(filename, ["as_ssd_copy", "asssd_copy", "as_copy"])
        if fn_match:
            return 0.90

        text_match, _ = self.fuzzy_match_text(ocr_items, ["copy-benchmark", "iso", "program", "game"])
        if text_match and ("speed" in full_text or "duration" in full_text):
            return 0.85

        return 0.0

    def extract_results(
        self,
        image: np.ndarray,
        ocr_items: List[OCRItem],
        ocr_engine: OCREngine
    ) -> ParserExtractionResult:
        metrics: Dict[str, ExtractedMetricResult] = {}

        # Look for ISO, Program, Game rows
        row_labels = {}
        for it in ocr_items:
            t = it.text.strip().lower()
            if t == "iso":
                row_labels["iso"] = it
            elif t == "program":
                row_labels["program"] = it
            elif t == "game":
                row_labels["game"] = it

        def get_row_metrics(label_item: OCRItem, row_key: str):
            y_mid = label_item.box[1] + label_item.box[3] // 2
            row_items: List[OCRItem] = []
            for it in ocr_items:
                if it == label_item or it.box[0] < label_item.box[0] + label_item.box[2]:
                    continue
                it_ymid = it.box[1] + it.box[3] // 2
                if abs(it_ymid - y_mid) <= 20:
                    row_items.append(it)
            row_items.sort(key=lambda x: x.box[0])

            # In AS SSD Copy: Speed (MB/s) is first column, Duration (s) is second column
            for idx, item in enumerate(row_items[:2]):
                val, _, valid = NumberNormalizer.normalize_score_text(item.text)
                if not valid or val is None:
                    continue
                # If idx == 0, it is Speed (MB/s)
                if idx == 0 or "mb/s" in item.text.lower():
                    metrics[f"{row_key}_speed"] = ExtractedMetricResult(
                        metric_id=f"{row_key}_speed",
                        raw_text=item.text,
                        normalized_value=val,
                        confidence=item.confidence,
                        unit="MB/s",
                        ocr_region=item.box,
                        status="verified"
                    )
                else:
                    metrics[f"{row_key}_duration"] = ExtractedMetricResult(
                        metric_id=f"{row_key}_duration",
                        raw_text=item.text,
                        normalized_value=val,
                        confidence=item.confidence,
                        unit="s",
                        ocr_region=item.box,
                        status="verified"
                    )

        for key in ["iso", "program", "game"]:
            if key in row_labels:
                get_row_metrics(row_labels[key], key)

        conf = 0.95 if len(metrics) >= 3 else 0.70

        return ParserExtractionResult(
            benchmark_id=self.target_benchmark_id,
            parser_id=self.id,
            parser_version=self.version,
            overall_confidence=conf,
            metrics=metrics,
            detected_benchmark_name="AS SSD Copy Benchmark",
            status="verified" if conf >= 0.85 else "needs_review",
            raw_ocr_items=ocr_items
        )
