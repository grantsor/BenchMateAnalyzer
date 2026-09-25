import re
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
from app.ocr.engine import OCRItem, OCREngine
from app.ocr.normalizer import NumberNormalizer
from app.parsers.base import BaseBenchmarkParser, ExtractedMetricResult, ParserExtractionResult

class DynamicTemplateParser(BaseBenchmarkParser):
    """
    A universal, data-driven benchmark parser that operates on any dynamically
    defined benchmark schema in SQLite or JSON without hardcoded code changes.
    """
    def __init__(self, definition_data: Dict[str, Any]):
        self.b_data = definition_data
        self.id = f"dynamic_{definition_data.get('id', 'custom')}"
        self.name = f"Dynamic Parser - {definition_data.get('name', 'Custom')}"
        self.version = "1.0"
        self.target_benchmark_id = definition_data.get("id", "custom")
        self.keywords = [k.lower() for k in definition_data.get("keywords", [])]
        self.aliases = [a.lower() for a in definition_data.get("aliases", [])]
        self.metrics_def = definition_data.get("metrics", [])

    def can_parse(
        self,
        filename: str,
        ocr_items: List[OCRItem],
        image: np.ndarray
    ) -> float:
        if not ocr_items:
            return 0.0

        full_text = " ".join(item.text.lower() for item in ocr_items)
        fn_lower = filename.lower()

        # Check exact name or ID
        b_name = self.b_data.get("name", "").lower()
        b_id = self.target_benchmark_id.lower()

        if b_name and b_name in full_text:
            return 0.96
        if b_name and b_name in fn_lower:
            return 0.90

        # Count keyword hits
        hit_count = 0
        for kw in self.keywords:
            if kw and kw in full_text:
                hit_count += 1
            elif kw and kw in fn_lower:
                hit_count += 0.8

        for alias in self.aliases:
            if alias and alias in full_text:
                hit_count += 1
            elif alias and alias in fn_lower:
                hit_count += 0.8

        if hit_count > 0:
            return min(0.97, 0.65 + hit_count * 0.12)

        return 0.0

    def extract_results(
        self,
        image: np.ndarray,
        ocr_items: List[OCRItem],
        ocr_engine: OCREngine
    ) -> ParserExtractionResult:
        metrics: Dict[str, ExtractedMetricResult] = {}
        used_item_indices = set()

        for m_def in self.metrics_def:
            m_id = m_def["id"]
            m_name = m_def.get("name", m_id)
            m_display = m_def.get("display_name", m_name)
            unit = m_def.get("unit", "score")
            decimals = m_def.get("decimal_places", 0)
            range_min = m_def.get("range_min")
            range_max = m_def.get("range_max")

            # Candidate anchor labels for this metric
            anchors = [m_name.lower(), m_display.lower(), m_id.lower()]
            if "anchor_labels" in m_def:
                anchors.extend([str(a).lower() for a in m_def["anchor_labels"]])

            # Step 1: Find anchor box in OCR items
            anchor_idx = None
            anchor_box = None
            for idx, item in enumerate(ocr_items):
                t_lower = item.text.lower()
                if any(re.search(r'\b' + re.escape(a) + r'\b', t_lower) or a in t_lower for a in anchors if len(a) >= 3):
                    anchor_idx = idx
                    anchor_box = item.box
                    break

            score_val = None
            score_box = None
            raw_text = ""
            confidence = 0.80

            if anchor_box:
                ax, ay, aw, ah = anchor_box
                a_cx = ax + aw / 2.0
                a_cy = ay + ah / 2.0

                best_dist = 99999.0
                best_item = None

                # Search candidates: (1) Right, (2) Below, (3) Above
                for idx, item in enumerate(ocr_items):
                    if idx == anchor_idx or idx in used_item_indices:
                        continue

                    val, _, _ = NumberNormalizer.normalize_score_text(item.text)
                    if val is None:
                        continue

                    # Validate bounds if specified
                    if range_min is not None and val < range_min:
                        continue
                    if range_max is not None and val > range_max:
                        continue

                    # Check if token is primarily numeric or contains excessive words
                    is_pure_num = bool(re.match(r'^\s*[\$€£]?\s*[\d,]+(?:\.\d+)?(?:\s*[a-zA-Z/%]+)?\s*$', item.text.strip()))
                    if not is_pure_num and len(item.text.strip().split()) > 2:
                        continue

                    ix, iy, iw, ih = item.box
                    i_cx = ix + iw / 2.0
                    i_cy = iy + ih / 2.0

                    # 1. Right of anchor (horizontal label -> score layout)
                    is_right = (ix >= ax) and (abs(i_cy - a_cy) < max(40.0, ah * 1.6)) and (ix - (ax + aw) < 550)
                    # 2. Below anchor (column/card label above score)
                    is_below = (iy >= ay) and (abs(i_cx - a_cx) < max(120.0, aw * 1.5)) and (iy - (ay + ah) < 180)
                    # 3. Above anchor (score above label)
                    is_above = (iy < ay) and is_pure_num and (abs(i_cx - a_cx) < max(120.0, aw * 1.5)) and (ay - (iy + ih) < 140)

                    if is_right or is_below or is_above:
                        dist = np.hypot(i_cx - a_cx, i_cy - a_cy)
                        # Preference factor: Right is primary, then below, pure numbers get high priority
                        if is_right:
                            dist *= 0.5
                        elif is_below:
                            dist *= 0.8
                        elif is_above:
                            dist *= 1.2

                        if is_pure_num:
                            dist *= 0.7

                        if dist < best_dist:
                            best_dist = dist
                            best_item = (idx, item, val)

                if best_item:
                    idx, item, val = best_item
                    used_item_indices.add(idx)
                    score_val = round(val, decimals) if decimals > 0 else round(val)
                    score_box = item.box
                    raw_text = item.text
                    confidence = min(0.98, item.confidence * 1.05)

            # Fallback if no anchor found: check if single-metric benchmark and find lone large score
            if score_val is None and len(self.metrics_def) == 1:
                for idx, item in enumerate(ocr_items):
                    if idx in used_item_indices:
                        continue
                    val, _, _ = NumberNormalizer.normalize_score_text(item.text)
                    if val is not None:
                        if (range_min is None or val >= range_min) and (range_max is None or val <= range_max):
                            score_val = round(val, decimals) if decimals > 0 else round(val)
                            score_box = item.box
                            raw_text = item.text
                            confidence = 0.78
                            used_item_indices.add(idx)
                            break

            if score_val is not None:
                metrics[m_id] = ExtractedMetricResult(
                    metric_id=m_id,
                    raw_text=raw_text,
                    normalized_value=score_val,
                    confidence=round(confidence, 2),
                    unit=unit,
                    ocr_region=score_box,
                    status="verified" if confidence >= 0.85 else "needs_review"
                )

        confs = [m.confidence for m in metrics.values()]
        overall_conf = round(sum(confs) / len(confs), 2) if confs else 0.0

        return ParserExtractionResult(
            benchmark_id=self.target_benchmark_id,
            parser_id=self.id,
            parser_version=self.version,
            overall_confidence=overall_conf,
            metrics=metrics,
            detected_benchmark_name=self.b_data.get("name", "Custom Benchmark"),
            status="verified" if metrics else "needs_review",
            raw_ocr_items=ocr_items
        )
