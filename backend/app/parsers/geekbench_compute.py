import re
from typing import Dict, List, Optional, Tuple
import numpy as np
from app.ocr.engine import OCRItem, OCREngine
from app.ocr.normalizer import NumberNormalizer
from app.parsers.base import BaseBenchmarkParser, ExtractedMetricResult, ParserExtractionResult

class GeekbenchComputeParser(BaseBenchmarkParser):
    id: str = "geekbench_compute_parser"
    name: str = "Geekbench 6 Compute Parser (OpenCL / Vulkan)"
    version: str = "1.0"
    target_benchmark_id: str = "geekbench6_opencl"
    supported_benchmark_ids = {
        "geekbench6_opencl",
        "geekbench6_vulkan"
    }

    def can_parse(
        self,
        filename: str,
        ocr_items: List[OCRItem],
        image: np.ndarray
    ) -> float:
        full_text = " ".join(item.text.lower() for item in ocr_items)
        fn_lower = filename.lower()

        # Definite signals
        if "opencl score" in full_text or "vulkan score" in full_text:
            return 0.99
        if "opencl" in full_text and ("geekbench" in full_text or "score" in full_text):
            return 0.96
        if "vulkan" in full_text and ("geekbench" in full_text or "score" in full_text):
            return 0.96
        if "opencl" in fn_lower or "vulkan" in fn_lower:
            if "geekbench" in full_text or "gb6" in fn_lower or "geekbench" in fn_lower:
                return 0.95

        return 0.0

    def extract_results(
        self,
        image: np.ndarray,
        ocr_items: List[OCRItem],
        ocr_engine: OCREngine
    ) -> ParserExtractionResult:
        full_text = " ".join(item.text.lower() for item in ocr_items)
        is_vulkan = "vulkan" in full_text

        if is_vulkan:
            target_b_id = "geekbench6_vulkan"
            metric_id = "vulkan_score"
            metric_name = "Vulkan Score"
            anchor_keywords = ["vulkan score", "vulkan"]
        else:
            target_b_id = "geekbench6_opencl"
            metric_id = "opencl_score"
            metric_name = "OpenCL Score"
            anchor_keywords = ["opencl score", "opencl"]

        # Step 1: Find anchor item
        anchor_item = None
        for item in ocr_items:
            t_lower = item.text.lower()
            if any(ak in t_lower for ak in anchor_keywords):
                anchor_item = item
                break

        score_val = None
        score_box = None
        raw_text = ""
        confidence = 0.85

        if anchor_item:
            ax, ay, aw, ah = anchor_item.box
            a_center_x = ax + aw / 2

            # Find number directly above anchor (within 120px above)
            best_dist = 9999
            for item in ocr_items:
                ix, iy, iw, ih = item.box
                i_center_x = ix + iw / 2

                # Must be above anchor
                if ay - 140 <= iy < ay and abs(i_center_x - a_center_x) < 160:
                    val, _, _ = NumberNormalizer.normalize_score_text(item.text)
                    if val is not None and val >= 1000:
                        dist = ay - (iy + ih)
                        if 0 <= dist < best_dist:
                            best_dist = dist
                            score_val = val
                            score_box = item.box
                            raw_text = item.text
                            confidence = min(0.98, item.confidence * 1.05)

        # Fallback if spatial search failed
        if score_val is None:
            # Look for large numbers (> 5000) that aren't dates/IDs
            for item in ocr_items:
                val, _, _ = NumberNormalizer.normalize_score_text(item.text)
                if val is not None and 5000 <= val <= 600000:
                    # Ignore timestamps or 2026/2025/2024 dates
                    if val in [2024, 2025, 2026] or val > 9000000:
                        continue
                    score_val = val
                    score_box = item.box
                    raw_text = item.text
                    confidence = 0.80
                    break

        metrics: Dict[str, ExtractedMetricResult] = {}
        if score_val is not None:
            metrics[metric_id] = ExtractedMetricResult(
                metric_id=metric_id,
                raw_text=raw_text,
                normalized_value=score_val,
                confidence=round(confidence, 2),
                unit="score",
                ocr_region=score_box,
                status="verified" if confidence >= 0.85 else "needs_review"
            )

        status = "verified" if metrics and confidence >= 0.85 else "needs_review"
        return ParserExtractionResult(
            benchmark_id=target_b_id,
            parser_id=self.id,
            parser_version=self.version,
            overall_confidence=round(confidence, 2) if score_val else 0.0,
            metrics=metrics,
            detected_benchmark_name=f"Geekbench 6 - {'Vulkan' if is_vulkan else 'OpenCL'}",
            status=status,
            raw_ocr_items=ocr_items
        )
