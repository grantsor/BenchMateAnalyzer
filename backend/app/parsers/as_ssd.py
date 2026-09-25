import re
from typing import Dict, List, Optional, Tuple
import numpy as np
from app.ocr.engine import OCRItem, OCREngine
from app.ocr.normalizer import NumberNormalizer
from app.parsers.base import BaseBenchmarkParser, ExtractedMetricResult, ParserExtractionResult

class ASSSDParser(BaseBenchmarkParser):
    id: str = "as_ssd_parser"
    name: str = "AS SSD Benchmark Parser"
    version: str = "1.0"
    target_benchmark_id: str = "as_ssd_1gb"
    supported_benchmark_ids = {"as_ssd", "as_ssd_1gb", "as_ssd_10gb"}

    def can_parse(
        self,
        filename: str,
        ocr_items: List[OCRItem],
        image: np.ndarray
    ) -> float:
        fn_lower = filename.lower()
        full_text = " ".join(item.text.lower() for item in ocr_items)

        # Do NOT intercept copy benchmark or compression curves
        if "copy" in fn_lower or "copy-benchmark" in full_text:
            return 0.0
        if "compre" in fn_lower or "compression" in full_text:
            return 0.0

        if "as ssd benchmark" in full_text:
            return 0.98
        if "uaspstor" in full_text and ("4k-64thrd" in full_text or "acc.time" in full_text):
            return 0.95
        if re.search(r"\bas[\s_]*ssd\b", fn_lower) or re.search(r"\basssd\b", fn_lower):
            return 0.90

        fn_match, _ = self.fuzzy_match_filename(filename, ["as_ssd", "asssd"])
        if fn_match:
            return 0.90

        text_match, _ = self.fuzzy_match_text(ocr_items, ["as ssd benchmark", "4k-64thrd", "seq read", "seq write"])
        if text_match:
            return 0.85

        return 0.0

    def extract_results(
        self,
        image: np.ndarray,
        ocr_items: List[OCRItem],
        ocr_engine: OCREngine
    ) -> ParserExtractionResult:
        full_text = " ".join(item.text.lower() for item in ocr_items)

        # 1. Determine size: 10GB vs 1GB
        is_10gb = False
        if "10 gb" in full_text or "10gb" in full_text:
            is_10gb = True

        target_b_id = "as_ssd_10gb" if is_10gb else "as_ssd_1gb"
        b_name = "AS SSD 10GB" if is_10gb else "AS SSD 1GB"

        metrics: Dict[str, ExtractedMetricResult] = {}

        # Look for explicit row keys in AS SSD:
        # Row 1: Seq (e.g. 1925.03MB/s, 1518.26MB/s)
        # Row 2: 4K (e.g. 25.66MB/s, 54.14MB/s)
        # Row 3: 4K-64Thrd (e.g. 287.25MB/s, 374.21MB/s)
        # Row 4: Acc.time (e.g. 0.056 ms, 0.097ms)
        # Row 5: Score (e.g. Read 505, Write 580, Total 1331)

        # We can map rows by finding items aligned horizontally with 'Seq', '4K', '4K-64Thrd', 'Acc.time', 'Score'
        label_map: Dict[str, OCRItem] = {}
        for it in ocr_items:
            t = it.text.strip().lower()
            if t in ["seq", "seq."]:
                label_map["seq"] = it
            elif t in ["4k"]:
                label_map["4k"] = it
            elif "4k-64" in t or "4k-64thrd" in t:
                label_map["4k_64"] = it
            elif "acc.time" in t or "acc. time" in t:
                label_map["acc_time"] = it
            elif "score:" in t or t == "score":
                label_map["score"] = it

        def get_row_values(label_item: OCRItem) -> List[Tuple[OCRItem, float]]:
            y_mid = label_item.box[1] + label_item.box[3] // 2
            row_items: List[Tuple[OCRItem, float]] = []
            for it in ocr_items:
                if it == label_item or it.box[0] < label_item.box[0] + label_item.box[2]:
                    continue
                it_ymid = it.box[1] + it.box[3] // 2
                if abs(it_ymid - y_mid) <= 18:
                    val, _, valid = NumberNormalizer.normalize_score_text(it.text)
                    if valid and val is not None:
                        row_items.append((it, val))
            return sorted(row_items, key=lambda x: x[0].box[0])

        if "seq" in label_map:
            vals = get_row_values(label_map["seq"])
            if len(vals) >= 1:
                metrics["seq_read"] = ExtractedMetricResult(metric_id="seq_read", raw_text=vals[0][0].text, normalized_value=vals[0][1], confidence=vals[0][0].confidence, unit="MB/s", ocr_region=vals[0][0].box, status="verified")
            if len(vals) >= 2:
                metrics["seq_write"] = ExtractedMetricResult(metric_id="seq_write", raw_text=vals[1][0].text, normalized_value=vals[1][1], confidence=vals[1][0].confidence, unit="MB/s", ocr_region=vals[1][0].box, status="verified")

        if "4k" in label_map:
            vals = get_row_values(label_map["4k"])
            if len(vals) >= 1:
                metrics["four_k_read"] = ExtractedMetricResult(metric_id="four_k_read", raw_text=vals[0][0].text, normalized_value=vals[0][1], confidence=vals[0][0].confidence, unit="MB/s", ocr_region=vals[0][0].box, status="verified")
            if len(vals) >= 2:
                metrics["four_k_write"] = ExtractedMetricResult(metric_id="four_k_write", raw_text=vals[1][0].text, normalized_value=vals[1][1], confidence=vals[1][0].confidence, unit="MB/s", ocr_region=vals[1][0].box, status="verified")

        if "4k_64" in label_map:
            vals = get_row_values(label_map["4k_64"])
            if len(vals) >= 1:
                metrics["four_k_64_read"] = ExtractedMetricResult(metric_id="four_k_64_read", raw_text=vals[0][0].text, normalized_value=vals[0][1], confidence=vals[0][0].confidence, unit="MB/s", ocr_region=vals[0][0].box, status="verified")
            if len(vals) >= 2:
                metrics["four_k_64_write"] = ExtractedMetricResult(metric_id="four_k_64_write", raw_text=vals[1][0].text, normalized_value=vals[1][1], confidence=vals[1][0].confidence, unit="MB/s", ocr_region=vals[1][0].box, status="verified")

        if "acc_time" in label_map:
            vals = get_row_values(label_map["acc_time"])
            if len(vals) >= 1:
                metrics["acc_time_read"] = ExtractedMetricResult(metric_id="acc_time_read", raw_text=vals[0][0].text, normalized_value=vals[0][1], confidence=vals[0][0].confidence, unit="ms", ocr_region=vals[0][0].box, status="verified")
            if len(vals) >= 2:
                metrics["acc_time_write"] = ExtractedMetricResult(metric_id="acc_time_write", raw_text=vals[1][0].text, normalized_value=vals[1][1], confidence=vals[1][0].confidence, unit="ms", ocr_region=vals[1][0].box, status="verified")

        # Total score is usually at the bottom center
        if "score" in label_map:
            score_y = label_map["score"].box[1]
            score_candidates = []
            for it in ocr_items:
                if it.box[1] >= score_y:
                    val, _, valid = NumberNormalizer.normalize_score_text(it.text)
                    if valid and val is not None and val >= 100:
                        score_candidates.append((it, val))
            if score_candidates:
                # Total score is usually the bottom-most / largest score
                best_score = max(score_candidates, key=lambda x: x[0].box[1])
                metrics["score"] = ExtractedMetricResult(metric_id="score", raw_text=best_score[0].text, normalized_value=best_score[1], confidence=best_score[0].confidence, unit="pts", ocr_region=best_score[0].box, status="verified")

        conf = 0.95 if ("seq_read" in metrics and "seq_write" in metrics) else 0.70

        return ParserExtractionResult(
            benchmark_id=target_b_id,
            parser_id=self.id,
            parser_version=self.version,
            overall_confidence=conf,
            metrics=metrics,
            detected_benchmark_name=b_name,
            status="verified" if conf >= 0.85 else "needs_review",
            raw_ocr_items=ocr_items
        )
