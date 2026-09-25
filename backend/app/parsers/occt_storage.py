import re
from typing import Dict, List, Optional, Tuple
import cv2
import numpy as np
from app.ocr.engine import OCRItem, OCREngine
from app.ocr.normalizer import NumberNormalizer
from app.parsers.base import BaseBenchmarkParser, ExtractedMetricResult, ParserExtractionResult

class OCCTStorageParser(BaseBenchmarkParser):
    id: str = "occt_storage_parser"
    name: str = "OCCT Storage Benchmark Parser"
    version: str = "1.0"
    target_benchmark_id: str = "occt_storage"
    supported_benchmark_ids = {"occt_storage"}

    KEYWORDS = [
        "storage benchmark",
        "storagebenchmark",
        "sequential read",
        "sequential write",
        "random read",
        "random write"
    ]

    def can_parse(
        self,
        filename: str,
        ocr_items: List[OCRItem],
        image: np.ndarray
    ) -> float:
        fn_lower = filename.lower()
        full_text = " ".join(item.text.lower() for item in ocr_items)

        # Reject immediately if CPU benchmark characteristics are present
        has_cpu_indicators = (
            "cpubenchmark" in full_text or
            "single thread" in full_text or
            "multiple threads" in full_text or
            ("avx" in full_text and "sse" in full_text)
        )
        if has_cpu_indicators:
            return 0.0

        fn_match, _ = self.fuzzy_match_filename(filename, ["occt_storage", "occt_disk", "occt_ssd"])
        is_occt = "occt" in fn_lower or "occt" in full_text

        has_storage_metrics = (
            "sequential read" in full_text or "seguential read" in full_text or
            "sequential write" in full_text or "seguential write" in full_text or
            "random read" in full_text or "random write" in full_text
        )

        if not has_storage_metrics:
            text_match, _ = self.fuzzy_match_text(ocr_items, ["sequential read", "sequential write", "random read", "random write"])
            has_storage_metrics = text_match

        if is_occt and has_storage_metrics:
            return 0.99
        if is_occt and ("storage" in fn_lower or "disk" in fn_lower or "ssd" in fn_lower):
            return 0.98
        if has_storage_metrics and ("storage benchmark" in full_text or "storagebenchmark" in full_text):
            return 0.95

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
                detected_benchmark_name="OCCT Storage Benchmark",
                status="needs_review",
                raw_ocr_items=ocr_items
            )

        h, w = image.shape[:2]

        # 1. Locate the 4 column anchors:
        # Sequential Read, Sequential Write, Random Read, Random Write
        anchors: Dict[str, Optional[OCRItem]] = {
            "seq_read": None,
            "seq_write": None,
            "rnd_read": None,
            "rnd_write": None
        }

        for it in ocr_items:
            t = it.text.lower().replace(" ", "").replace("seguential", "sequential")
            bx, by, bw, bh = it.box
            cy = by + bh / 2.0

            # Anchors typically appear in the upper-mid region y ~ [0.25*h, 0.55*h]
            if not (h * 0.20 <= cy <= h * 0.60):
                continue

            if "sequentialread" in t:
                anchors["seq_read"] = it
            elif "sequentialwrite" in t:
                anchors["seq_write"] = it
            elif "randomread" in t:
                anchors["rnd_read"] = it
            elif "randomwrite" in t:
                anchors["rnd_write"] = it

        # 2. Extract score directly above each anchor
        for metric_key, anchor in anchors.items():
            if not anchor:
                continue

            ax, ay, aw, ah = anchor.box
            acx = ax + aw / 2.0

            best_cand: Optional[Tuple[float, OCRItem]] = None
            best_diff = 999999.0

            for it in ocr_items:
                t = it.text.strip()
                bx, by, bw, bh = it.box
                cy = by + bh / 2.0
                cx = bx + bw / 2.0

                # Score appears directly above the label
                if not (ay - 90 <= cy <= ay - 10):
                    continue
                # Horizontally aligned with column anchor
                if abs(cx - acx) > (aw * 0.75 + 35):
                    continue

                clean_t = t.replace(" ", "").replace(",", ".")
                m = re.search(r"(\d+\.\d+)", clean_t)
                if m:
                    try:
                        val = float(m.group(1))
                        if val >= 50.0:
                            diff = abs(cx - acx)
                            if diff < best_diff:
                                best_diff = diff
                                best_cand = (val, it)
                    except ValueError:
                        pass

            # 3. Targeted crop fallback if full-page OCR failed or distorted (e.g. contrast inversion)
            if not best_cand:
                crop_y1 = max(0, int(ay - 65))
                crop_y2 = min(h, int(ay - 10))
                crop_x1 = max(0, int(ax - 20))
                crop_x2 = min(w, int(ax + aw + 20))
                sub = image[crop_y1:crop_y2, crop_x1:crop_x2]
                if sub.size > 0:
                    up = cv2.resize(sub, (0, 0), fx=3, fy=3, interpolation=cv2.INTER_CUBIC)
                    gray = cv2.cvtColor(up, cv2.COLOR_BGR2GRAY)
                    inv = cv2.bitwise_not(cv2.threshold(gray, 180, 255, cv2.THRESH_BINARY)[1])
                    sub_items = ocr_engine.ocr_image(inv)
                    if not sub_items:
                        sub_items = ocr_engine.ocr_image(up)
                    if sub_items:
                        sorted_sits = sorted(sub_items, key=lambda s: s.box[0])
                        joined_text = "".join(s.text for s in sorted_sits).replace(" ", "").replace(",", ".")
                        m = re.search(r"(\d+\.?\d*)", joined_text)
                        if m:
                            try:
                                val = float(m.group(1))
                                if val >= 50.0:
                                    avg_conf = sum(s.confidence for s in sorted_sits) / len(sorted_sits)
                                    best_cand = (val, OCRItem(
                                        text=joined_text,
                                        confidence=avg_conf,
                                        polygon=[],
                                        box=(crop_x1, crop_y1, crop_x2 - crop_x1, crop_y2 - crop_y1)
                                    ))
                            except ValueError:
                                pass

            if best_cand:
                val, it = best_cand
                metrics[metric_key] = ExtractedMetricResult(
                    metric_id=metric_key,
                    raw_text=it.text,
                    normalized_value=val,
                    confidence=round(it.confidence, 2),
                    unit="MB/s",
                    ocr_region=it.box,
                    status="verified" if it.confidence >= 0.70 else "needs_review"
                )

        confs = [m.confidence for m in metrics.values() if m.normalized_value is not None]
        overall_conf = round(sum(confs) / len(confs), 2) if confs else 0.0

        return ParserExtractionResult(
            benchmark_id=self.target_benchmark_id,
            parser_id=self.id,
            parser_version=self.version,
            overall_confidence=overall_conf,
            metrics=metrics,
            detected_benchmark_name="OCCT Storage Benchmark",
            status="verified" if (len(metrics) >= 3 and overall_conf >= 0.70) else "needs_review",
            raw_ocr_items=ocr_items
        )
