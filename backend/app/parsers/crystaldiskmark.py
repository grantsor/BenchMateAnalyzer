import re
from typing import Dict, List, Optional, Tuple
import numpy as np
from app.ocr.engine import OCRItem, OCREngine
from app.ocr.normalizer import NumberNormalizer
from app.parsers.base import BaseBenchmarkParser, ExtractedMetricResult, ParserExtractionResult

class CrystalDiskMarkParser(BaseBenchmarkParser):
    id: str = "crystaldiskmark_parser"
    name: str = "CrystalDiskMark Parser"
    version: str = "1.0"
    target_benchmark_id: str = "crystaldiskmark_1gb"
    supported_benchmark_ids = {
        "crystaldiskmark",
        "crystaldiskmark_1gb",
        "crystaldiskmark_16gb",
        "crystaldiskmark_4gb",
        "crystaldiskmark_8gb",
        "crystaldiskmark_32gb",
        "crystaldiskmark_64gb"
    }

    def can_parse(
        self,
        filename: str,
        ocr_items: List[OCRItem],
        image: np.ndarray
    ) -> float:
        fn_lower = filename.lower()
        full_text = " ".join(item.text.lower() for item in ocr_items)

        fn_match, _ = self.fuzzy_match_filename(filename, ["crystaldiskmark", "crystaldisk", "cdm", "crystal"])
        if fn_match:
            return 0.95

        if "crystaldiskmark" in full_text or "crystaldiskmark" in fn_lower:
            return 0.98
        if "seq1m" in full_text and ("rnd4k" in full_text or "q8t1" in full_text):
            return 0.95
        if re.search(r"\b(cdm|crystal)\b", fn_lower) and ("read" in full_text or "write" in full_text or "seq1m" in full_text):
            return 0.90

        text_match, _ = self.fuzzy_match_text(ocr_items, ["crystaldiskmark", "seq1m", "rnd4k"])
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

        # 1. Determine test size: 16GB vs 1GB
        is_16gb = False
        if "16gib" in full_text or "16 gb" in full_text or "16gb" in full_text:
            is_16gb = True

        target_b_id = "crystaldiskmark_16gb" if is_16gb else "crystaldiskmark_1gb"
        benchmark_name = "CrystalDiskMark 16GB" if is_16gb else "CrystalDiskMark 1GB"

        metrics: Dict[str, ExtractedMetricResult] = {}

        # 2. Extract numeric candidate rows
        score_candidates: List[Tuple[OCRItem, float]] = []
        for it in ocr_items:
            clean = it.text.strip().replace(",", "")
            if any(h in clean.upper() for h in ["SEQ", "RND", "GIB", "MIB", "ADMIN", "ALL", "READ", "WRITE", "MB/S", "GB/S"]):
                continue
            if re.search(r'[A-Za-z]', clean):
                continue
            if clean in ["0%", "8.0.5", "64", "1", "16", "5", "9"]:
                continue
            val, _, valid = NumberNormalizer.normalize_score_text(it.text)
            if valid and val is not None and 5.0 <= val <= 35000.0:
                score_candidates.append((it, val))

        # Group candidates by approximate vertical Y-coordinate (rows)
        rows_by_y: Dict[int, List[Tuple[OCRItem, float]]] = {}
        for it, val in score_candidates:
            y_mid = it.box[1] + it.box[3] // 2
            matched_bucket = None
            for b_y in rows_by_y:
                if abs(b_y - y_mid) <= 22:
                    matched_bucket = b_y
                    break
            if matched_bucket is not None:
                rows_by_y[matched_bucket].append((it, val))
            else:
                rows_by_y[y_mid] = [(it, val)]

        sorted_row_ys = sorted(rows_by_y.keys())

        # Row 0 is SEQ1M Q8T1 (top-most test row)
        if len(sorted_row_ys) >= 1:
            row0 = sorted(rows_by_y[sorted_row_ys[0]], key=lambda pair: pair[0].box[0])
            if len(row0) >= 1:
                it, val = row0[0]
                metrics["seq_read"] = ExtractedMetricResult(
                    metric_id="seq_read",
                    raw_text=it.text,
                    normalized_value=val,
                    confidence=it.confidence,
                    unit="MB/s",
                    ocr_region=it.box,
                    status="verified"
                )
            if len(row0) >= 2:
                it, val = row0[1]
                metrics["seq_write"] = ExtractedMetricResult(
                    metric_id="seq_write",
                    raw_text=it.text,
                    normalized_value=val,
                    confidence=it.confidence,
                    unit="MB/s",
                    ocr_region=it.box,
                    status="verified"
                )

        # Row 2 (or second or third row) is RND4K
        rnd_row_idx = 2 if len(sorted_row_ys) >= 3 else (1 if len(sorted_row_ys) >= 2 else None)
        if rnd_row_idx is not None:
            rnd_row = sorted(rows_by_y[sorted_row_ys[rnd_row_idx]], key=lambda pair: pair[0].box[0])
            if len(rnd_row) >= 1:
                it, val = rnd_row[0]
                metrics["rnd_4k_read"] = ExtractedMetricResult(
                    metric_id="rnd_4k_read",
                    raw_text=it.text,
                    normalized_value=val,
                    confidence=it.confidence,
                    unit="MB/s",
                    ocr_region=it.box,
                    status="verified"
                )
            if len(rnd_row) >= 2:
                it, val = rnd_row[1]
                metrics["rnd_4k_write"] = ExtractedMetricResult(
                    metric_id="rnd_4k_write",
                    raw_text=it.text,
                    normalized_value=val,
                    confidence=it.confidence,
                    unit="MB/s",
                    ocr_region=it.box,
                    status="verified"
                )

        conf = 0.95 if ("seq_read" in metrics and "seq_write" in metrics) else 0.70

        return ParserExtractionResult(
            benchmark_id=target_b_id,
            parser_id=self.id,
            parser_version=self.version,
            overall_confidence=conf,
            metrics=metrics,
            detected_benchmark_name=benchmark_name,
            status="verified" if conf >= 0.85 else "needs_review",
            raw_ocr_items=ocr_items
        )
