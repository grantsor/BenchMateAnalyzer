import re
from typing import Dict, List, Optional, Tuple
import numpy as np
from app.ocr.engine import OCRItem, OCREngine
from app.ocr.normalizer import NumberNormalizer
from app.parsers.base import BaseBenchmarkParser, ExtractedMetricResult, ParserExtractionResult

class ThreeDMarkStorageParser(BaseBenchmarkParser):
    id: str = "threedmark_storage_parser"
    name: str = "3DMark Storage Parser"
    version: str = "1.0"
    target_benchmark_id: str = "threedmark_storage"

    def can_parse(
        self,
        filename: str,
        ocr_items: List[OCRItem],
        image: np.ndarray
    ) -> float:
        fn_lower = filename.lower()
        full_text = " ".join(item.text.lower() for item in ocr_items)

        # Never claim OCCT screenshots
        if "occt" in fn_lower or "occt" in full_text:
            return 0.0

        if "storagebenchmark" in full_text or "storage benchmark" in full_text:
            return 0.99
        if "3dmark" in full_text and ("bandwidth" in full_text or "access time" in full_text or "storage" in full_text):
            return 0.98
        if ("3dm" in fn_lower or "3dmark" in fn_lower) and ("storage" in full_text or "storage" in fn_lower or "bandwidth" in full_text):
            return 0.98

        fn_match, _ = self.fuzzy_match_filename(filename, ["3dmark_storage", "3dm_storage", "threedmark_storage", "3dm", "3dmark"])
        if fn_match and ("bandwidth" in full_text or "access time" in full_text or "storage" in full_text):
            return 0.95

        text_match, _ = self.fuzzy_match_text(ocr_items, ["storage benchmark score", "storage benchmark"])
        if text_match and ("bandwidth" in full_text or "access time" in full_text or "score" in full_text):
            return 0.90

        return 0.0

    def extract_results(
        self,
        image: np.ndarray,
        ocr_items: List[OCRItem],
        ocr_engine: OCREngine
    ) -> ParserExtractionResult:
        metrics: Dict[str, ExtractedMetricResult] = {}

        # Look for Storage Benchmark Score (e.g. 1 260)
        # Prominent score header
        score_item = None
        for i, it in enumerate(ocr_items):
            t = it.text.strip().lower().replace(" ", "")
            if any(k in t for k in ["storagebenchmarkscore", "storagebenchmark", "yourscore"]):
                # Next item or nearby item is the score
                for next_it in ocr_items[i+1:min(len(ocr_items), i+6)]:
                    val, _, valid = NumberNormalizer.normalize_score_text(next_it.text)
                    if valid and val is not None and 100 <= val <= 30000:
                        score_item = (next_it, val)
                        break
                if score_item:
                    break

        # Fallback for score: check if any item is a 3-5 digit number under "your score"
        if not score_item:
            for i, it in enumerate(ocr_items):
                if "score" in it.text.lower():
                    for next_it in ocr_items[i+1:min(len(ocr_items), i+4)]:
                        val, _, valid = NumberNormalizer.normalize_score_text(next_it.text)
                        if valid and val is not None and 500 <= val <= 30000:
                            score_item = (next_it, val)
                            break
                    if score_item:
                        break

        if score_item:
            it, val = score_item
            metrics["storage_score"] = ExtractedMetricResult(
                metric_id="storage_score",
                raw_text=it.text,
                normalized_value=val,
                confidence=it.confidence,
                unit="pts",
                ocr_region=it.box,
                status="verified"
            )

        # Look for Bandwidth (MB/s) and Average access time (µs)
        for i, it in enumerate(ocr_items):
            t = it.text.strip().lower()
            t_compact = t.replace(" ", "")
            if "bandwidth" in t:
                # Find MB/s value nearby
                for next_it in ocr_items[max(0, i-2):min(len(ocr_items), i+6)]:
                    if "mb/s" in next_it.text.lower():
                        val, _, valid = NumberNormalizer.normalize_score_text(next_it.text)
                        if valid and val is not None:
                            metrics["bandwidth"] = ExtractedMetricResult(
                                metric_id="bandwidth",
                                raw_text=next_it.text,
                                normalized_value=val,
                                confidence=next_it.confidence,
                                unit="MB/s",
                                ocr_region=next_it.box,
                                status="verified"
                            )
                            break
            if "averageaccess" in t_compact or "accesstime" in t_compact or ("access" in t and "time" in t):
                # Find µs value nearby
                for next_it in ocr_items[max(0, i-2):min(len(ocr_items), i+8)]:
                    if next_it == it:
                        continue
                    next_lower = next_it.text.lower().replace('\u03bc', 'u').replace('µ', 'u').strip()
                    if "mb/s" in next_lower:
                        continue
                    if any(u in next_lower for u in ["us", "ms", "ns"]) or next_lower.isdigit():
                        val, _, valid = NumberNormalizer.normalize_score_text(next_it.text)
                        if valid and val is not None and val < 5000:
                            metrics["average_access_time"] = ExtractedMetricResult(
                                metric_id="average_access_time",
                                raw_text=next_it.text,
                                normalized_value=val,
                                confidence=next_it.confidence,
                                unit="µs",
                                ocr_region=next_it.box,
                                status="verified"
                            )
                            break

        # Spatial fallback for average access time on same row as bandwidth
        if "bandwidth" in metrics and "average_access_time" not in metrics:
            bw_box = metrics["bandwidth"].ocr_region
            if bw_box:
                bw_x, bw_y, bw_w, bw_h = bw_box
                for it in ocr_items:
                    if it.box:
                        ix, iy, iw, ih = it.box
                        if abs(iy - bw_y) <= 30 and ix > bw_x + 30:
                            clean_t = it.text.lower().replace('\u03bc', 'u').replace('µ', 'u')
                            val, _, valid = NumberNormalizer.normalize_score_text(clean_t)
                            if valid and val is not None and 5 <= val <= 2000:
                                metrics["average_access_time"] = ExtractedMetricResult(
                                    metric_id="average_access_time",
                                    raw_text=it.text,
                                    normalized_value=val,
                                    confidence=it.confidence,
                                    unit="µs",
                                    ocr_region=it.box,
                                    status="verified"
                                )
                                break

        conf = 0.95 if "storage_score" in metrics else 0.70

        return ParserExtractionResult(
            benchmark_id=self.target_benchmark_id,
            parser_id=self.id,
            parser_version=self.version,
            overall_confidence=conf,
            metrics=metrics,
            detected_benchmark_name="3DMark Storage Benchmark",
            status="verified" if conf >= 0.85 else "needs_review",
            raw_ocr_items=ocr_items
        )
