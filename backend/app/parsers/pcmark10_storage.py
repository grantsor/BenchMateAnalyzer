import re
from typing import Dict, List, Optional, Tuple
import numpy as np
from app.ocr.engine import OCRItem, OCREngine
from app.ocr.normalizer import NumberNormalizer
from app.parsers.base import BaseBenchmarkParser, ExtractedMetricResult, ParserExtractionResult

class PCMark10StorageParser(BaseBenchmarkParser):
    id: str = "pcmark10_storage_parser"
    name: str = "PCMark 10 Storage Parser"
    version: str = "1.0"
    target_benchmark_id: str = "pcmark10_data_drive"

    def can_parse(
        self,
        filename: str,
        ocr_items: List[OCRItem],
        image: np.ndarray
    ) -> float:
        fn_lower = filename.lower()
        full_text = " ".join(item.text.lower() for item in ocr_items)

        if "data drive benchmark" in full_text or "datadrive" in fn_lower or "data drive" in fn_lower:
            return 0.98
        if "quick system drive" in full_text or "quicksys" in fn_lower or "quick sys" in fn_lower:
            return 0.98

        fn_match, _ = self.fuzzy_match_filename(filename, ["pcmark_storage", "pcm_storage", "datadrive", "quicksystem", "quicksys"])
        if fn_match:
            return 0.95

        if "pcmark" in full_text and ("storage" in full_text or "drive benchmark" in full_text):
            return 0.95

        text_match, _ = self.fuzzy_match_text(ocr_items, ["data drive benchmark", "quick system drive", "drive benchmark"])
        if text_match:
            return 0.90

        return 0.0

    def extract_results(
        self,
        image: np.ndarray,
        ocr_items: List[OCRItem],
        ocr_engine: OCREngine
    ) -> ParserExtractionResult:
        full_text = " ".join(item.text.lower() for item in ocr_items)
        fn_lower = ""

        is_quick = "quick system" in full_text or "quicksys" in full_text
        target_b_id = "pcmark10_quick_system_drive" if is_quick else "pcmark10_data_drive"
        b_name = "PCMark 10 Quick System Drive" if is_quick else "PCMark 10 Data Drive"

        metrics: Dict[str, ExtractedMetricResult] = {}

        # 1. Main Score (usually prominent number following benchmark title, e.g. 1393 or 1 148)
        score_candidates = []
        for it in ocr_items:
            # PCMark scores often look like "1393 A" or "1 148 A"
            clean = re.sub(r"[^0-9\s]", "", it.text).strip()
            val, _, valid = NumberNormalizer.normalize_score_text(clean)
            if valid and val is not None and 300 <= val <= 25000:
                score_candidates.append((it, val))

        # 2. Bandwidth (MB/s) and Access Time (µs)
        for i, it in enumerate(ocr_items):
            t = it.text.strip().lower().replace('\u03bc', 'u').replace('µ', 'u')
            if "mb/s" in t:
                val, _, valid = NumberNormalizer.normalize_score_text(it.text)
                if valid and val is not None:
                    metrics["bandwidth"] = ExtractedMetricResult(
                        metric_id="bandwidth",
                        raw_text=it.text,
                        normalized_value=val,
                        confidence=it.confidence,
                        unit="MB/s",
                        ocr_region=it.box,
                        status="verified"
                    )
            if any(u in t for u in ["µs", "us"]) or "access time" in t:
                val, _, valid = NumberNormalizer.normalize_score_text(it.text)
                if valid and val is not None and val < 5000:
                    metrics["access_time"] = ExtractedMetricResult(
                        metric_id="access_time",
                        raw_text=it.text,
                        normalized_value=val,
                        confidence=it.confidence,
                        unit="µs",
                        ocr_region=it.box,
                        status="verified"
                    )

        if score_candidates and "score" not in metrics:
            # The score is typically located before the bandwidth
            metrics["score"] = ExtractedMetricResult(
                metric_id="score",
                raw_text=score_candidates[0][0].text,
                normalized_value=score_candidates[0][1],
                confidence=score_candidates[0][0].confidence,
                unit="pts",
                ocr_region=score_candidates[0][0].box,
                status="verified"
            )

        conf = 0.95 if "score" in metrics else 0.70

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
