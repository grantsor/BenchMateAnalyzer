import re
from typing import Dict, List, Optional
import numpy as np
from app.ocr.engine import OCRItem, OCREngine
from app.ocr.normalizer import NumberNormalizer
from app.parsers.base import BaseBenchmarkParser, ExtractedMetricResult, ParserExtractionResult

class OCCTParser(BaseBenchmarkParser):
    id: str = "occt_parser"
    name: str = "OCCT Benchmark Parser"
    version: str = "1.0"
    target_benchmark_id: str = "occt_benchmark"
    supported_benchmark_ids = {"occt_benchmark", "occt", "occt_cpu"}

    KEYWORDS = [
        "occt",
        "cpubenchmark",
        "single thread - avx",
        "multiple threads - avx",
        "single thread - sse",
        "multiple threads - sse"
    ]

    def can_parse(
        self,
        filename: str,
        ocr_items: List[OCRItem],
        image: np.ndarray
    ) -> float:
        fn_lower = filename.lower()
        full_text = " ".join(item.text.lower() for item in ocr_items)

        # Yield storage benchmarks to OCCTStorageParser
        has_storage_metrics = (
            "sequential read" in full_text or "seguential read" in full_text or
            "sequential write" in full_text or "seguential write" in full_text or
            "random read" in full_text or "random write" in full_text
        )
        if has_storage_metrics or "storage" in fn_lower or "disk" in fn_lower or "ssd" in fn_lower:
            return 0.0

        if "cpubenchmark" in full_text or "cpubenchmark configuration" in full_text:
            return 0.99
        if ("single thread" in full_text and "avx" in full_text) or ("single thread" in full_text and "sse" in full_text):
            return 0.98
        if "single thread" in full_text or "multiple threads" in full_text:
            return 0.96
        if "avx" in full_text and "sse" in full_text:
            return 0.95

        fn_match, _ = self.fuzzy_match_filename(filename, ["occt", "occtbenchmark", "occt_cpu"])
        if fn_match:
            return 0.92
        if "occt" in full_text:
            return 0.90

        text_match, _ = self.fuzzy_match_text(ocr_items, ["cpubenchmark", "single thread - avx", "multiple threads - avx", "single thread - sse"])
        if text_match:
            return 0.88

        return 0.0

    def extract_results(
        self,
        image: np.ndarray,
        ocr_items: List[OCRItem],
        ocr_engine: OCREngine
    ) -> ParserExtractionResult:
        metrics: Dict[str, ExtractedMetricResult] = {}
        if image is None:
            return ParserExtractionResult(
                benchmark_id=self.target_benchmark_id,
                parser_id=self.id,
                parser_version=self.version,
                overall_confidence=0.0,
                metrics={},
                detected_benchmark_name="OCCT Benchmark",
                status="needs_review",
                raw_ocr_items=ocr_items
            )

        h, w = image.shape[:2]

        # In OCCT CPU Benchmark screenshots:
        # Results appear in a dedicated row below CPUBENCHMARK CONFIGURATION:
        # y is roughly 0.28*h .. 0.48*h (well below the top telemetry bar y < 0.25*h).
        # The 4 benchmark columns horizontally correspond to:
        #   1. Single Thread SSE:   x ≈ 0.28..0.42 * w
        #   2. Multiple Threads SSE: x ≈ 0.42..0.56 * w
        #   3. Single Thread AVX:   x ≈ 0.56..0.72 * w
        #   4. Multiple Threads AVX: x ≈ 0.72..0.92 * w

        col_assignments: Dict[str, Tuple[float, OCRItem]] = {}
        candidate_items = []

        for item in ocr_items:
            bx, by, bw, bh = item.box
            cy = (by + bh / 2.0) / h
            cx = (bx + bw / 2.0) / w

            # Filter to the benchmark score row: between 0.28*h and 0.48*h
            if 0.28 <= cy <= 0.48 and cx >= 0.25:
                # Exclude units or non-score texts
                t_lower = item.text.lower()
                if any(unit_w in t_lower for unit_w in ["mhz", "mb", "%", "℃", "°c", "config", "thread", "single", "multiple", "sse", "avx"]):
                    continue

                val, _, _ = NumberNormalizer.normalize_score_text(item.text)
                if val is not None and ('.' in item.text or ',' in item.text or val > 10.0):
                    candidate_items.append((cx, cy, val, item))

        for cx, cy, val, item in candidate_items:
            if 0.28 <= cx < 0.42 and "single_sse" not in col_assignments:
                col_assignments["single_sse"] = (val, item)
            elif 0.42 <= cx < 0.56 and "multi_sse" not in col_assignments:
                col_assignments["multi_sse"] = (val, item)
            elif 0.56 <= cx < 0.72 and "single_avx" not in col_assignments:
                col_assignments["single_avx"] = (val, item)
            elif 0.72 <= cx < 0.92 and "multi_avx" not in col_assignments:
                col_assignments["multi_avx"] = (val, item)

        # Fallback: if coordinate bands missed items (e.g. cropped image), sort left-to-right by x
        if not col_assignments and candidate_items:
            sorted_by_x = sorted(candidate_items, key=lambda x: x[0])
            keys = ["single_sse", "multi_sse", "single_avx", "multi_avx"]
            for idx, (_, _, val, item) in enumerate(sorted_by_x[:4]):
                col_assignments[keys[idx]] = (val, item)

        for m_id, (val, it) in col_assignments.items():
            metrics[m_id] = ExtractedMetricResult(
                metric_id=m_id,
                raw_text=it.text,
                normalized_value=val,
                confidence=round(it.confidence, 2),
                unit="pts",
                ocr_region=it.box,
                status="verified" if it.confidence >= 0.75 else "needs_review"
            )

        confs = [m.confidence for m in metrics.values() if m.normalized_value is not None]
        overall_conf = round(sum(confs) / len(confs), 2) if confs else 0.0

        return ParserExtractionResult(
            benchmark_id=self.target_benchmark_id,
            parser_id=self.id,
            parser_version=self.version,
            overall_confidence=overall_conf,
            metrics=metrics,
            detected_benchmark_name="OCCT Benchmark",
            status="verified" if overall_conf >= 0.75 else "needs_review",
            raw_ocr_items=ocr_items
        )
