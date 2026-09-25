import re
from typing import Dict, List, Optional, Tuple
import numpy as np
from app.ocr.engine import OCRItem, OCREngine
from app.ocr.normalizer import NumberNormalizer
from app.parsers.base import BaseBenchmarkParser, ExtractedMetricResult, ParserExtractionResult

class ThreeDMarkParser(BaseBenchmarkParser):
    id: str = "threedmark_parser"
    name: str = "3DMark Parser"
    version: str = "2.0"
    target_benchmark_id: str = "threedmark_timespy"
    supported_benchmark_ids = {
        "threedmark_timespy",
        "threedmark_firestrike",
        "threedmark_speedway",
        "threedmark_steelnomad",
        "threedmark_portroyal"
    }

    KEYWORDS = [
        "3dmark",
        "3dm",
        "time spy",
        "fire strike",
        "steel nomad",
        "speed way",
        "port royal",
        "graphics score",
        "cpu score",
        "physics score",
        "combined score",
        "graphics test"
    ]

    def can_parse(
        self,
        filename: str,
        ocr_items: List[OCRItem],
        image: np.ndarray
    ) -> float:
        fn_lower = filename.lower()
        full_text = " ".join(item.text.lower() for item in ocr_items)

        # Yield storage benchmarks to ThreeDMarkStorageParser
        if self.is_system_monitoring_image(filename):
            return 0.0
        if "storage" in full_text or "storage" in fn_lower:
            return 0.0
        if "occt" in fn_lower or "occt" in full_text:
            return 0.0

        # Filename checks
        if any(pat in fn_lower for pat in ["3dm", "3dmark", "timespy", "firestrike", "speedway", "steelnomad"]):
            return 0.95
        if re.search(r'\b(?:ts|fs|sw|ss|sn)\b', fn_lower):
            return 0.95

        fn_match, _ = self.fuzzy_match_filename(filename, ["3dmark", "3dm", "timespy", "firestrike", "speedway", "steelnomad"])
        if fn_match:
            return 0.95

        # Content checks
        if any(k in full_text for k in ["fire strike", "speed way", "steel nomad", "time spy", "port royal"]):
            return 0.95
        if "3dmark" in full_text:
            return 0.90
        if "graphics score" in full_text and ("cpu score" in full_text or "physics score" in full_text or "combined score" in full_text):
            return 0.90

        text_match, _ = self.fuzzy_match_text(ocr_items, ["fire strike", "speed way", "steel nomad", "time spy", "3dmark"])
        if text_match:
            return 0.85

        return 0.0

    def detect_variant(self, filename: str, full_text: str) -> Tuple[str, str]:
        fn_lower = filename.lower()
        padded_fn = f" {fn_lower} "

        # 0. Check direct match on benchmark id (e.g. from forced_benchmark_id or scanner)
        if "threedmark_timespy" in fn_lower:
            return "threedmark_timespy", "3DMark Time Spy"
        if "threedmark_firestrike" in fn_lower:
            return "threedmark_firestrike", "3DMark Fire Strike"
        if "threedmark_steelnomad" in fn_lower:
            return "threedmark_steelnomad", "3DMark Steel Nomad"
        if "threedmark_speedway" in fn_lower:
            return "threedmark_speedway", "3DMark Speed Way"
        if "threedmark_portroyal" in fn_lower:
            return "threedmark_portroyal", "3DMark Port Royal"

        # 1. Explicit Time Spy check
        ts_match, _ = self.fuzzy_match_text(full_text, ["time spy", "timespy"])
        if "time spy" in full_text or "timespy" in fn_lower or " ts" in padded_fn or "_ts" in fn_lower or "-ts" in fn_lower or "time_spy" in fn_lower or ts_match:
            return "threedmark_timespy", "3DMark Time Spy"

        # 2. Fire Strike
        fs_match, _ = self.fuzzy_match_text(full_text, ["fire strike", "firestrike"])
        if "fire strike" in full_text or "firestrike" in fn_lower or " fs" in padded_fn or "_fs" in fn_lower or "-fs" in fn_lower or fs_match:
            return "threedmark_firestrike", "3DMark Fire Strike"

        # 3. Steel Nomad
        sn_match, _ = self.fuzzy_match_text(full_text, ["steel nomad", "steelnomad"])
        if "steel nomad" in full_text or "steelnomad" in fn_lower or " sn" in padded_fn or "_sn" in fn_lower or "-sn" in fn_lower or sn_match:
            return "threedmark_steelnomad", "3DMark Steel Nomad"

        # 4. Speed Way
        sw_match, _ = self.fuzzy_match_text(full_text, ["speed way", "speedway"])
        if "speed way" in full_text or "speedway" in fn_lower or " sw" in padded_fn or " ss" in padded_fn or "_sw" in fn_lower or "-sw" in fn_lower or sw_match:
            return "threedmark_speedway", "3DMark Speed Way"

        # 5. Port Royal
        pr_match, _ = self.fuzzy_match_text(full_text, ["port royal", "portroyal"])
        if "port royal" in full_text or "portroyal" in fn_lower or " pr" in padded_fn or "_pr" in fn_lower or "-pr" in fn_lower or pr_match:
            return "threedmark_portroyal", "3DMark Port Royal"

        return "threedmark_timespy", "3DMark Time Spy"

    def extract_results(
        self,
        image: np.ndarray,
        ocr_items: List[OCRItem],
        ocr_engine: OCREngine,
        filename: str = ""
    ) -> ParserExtractionResult:
        metrics: Dict[str, ExtractedMetricResult] = {}
        full_text = " ".join(item.text.lower() for item in ocr_items)

        # 1. Determine specific 3DMark test
        benchmark_id, benchmark_name = self.detect_variant(filename, full_text)

        # 2. Extract Overall Score (large prominent number in left box / container: x < 450, 370 <= y <= 550)
        overall_item = self._find_overall_score(ocr_items)
        if overall_item:
            val, _, _ = NumberNormalizer.normalize_score_text(overall_item.text)
            metrics["overall_score"] = ExtractedMetricResult(
                metric_id="overall_score",
                raw_text=overall_item.text,
                normalized_value=val,
                confidence=round(overall_item.confidence, 2),
                unit="score",
                ocr_region=overall_item.box,
                status="verified" if overall_item.confidence >= 0.55 else "needs_review"
            )

        # 3. Extract sub-metrics per benchmark variant
        if benchmark_id == "threedmark_firestrike":
            graphics_item = self._find_subscore(ocr_items, ["graphics score"])
            physics_item = self._find_subscore(ocr_items, ["physics score"])
            combined_item = self._find_subscore(ocr_items, ["combined score"])

            if graphics_item:
                val, _, _ = NumberNormalizer.normalize_score_text(graphics_item.text)
                metrics["graphics_score"] = ExtractedMetricResult(
                    metric_id="graphics_score",
                    raw_text=graphics_item.text,
                    normalized_value=val,
                    confidence=round(graphics_item.confidence, 2),
                    unit="score",
                    ocr_region=graphics_item.box,
                    status="verified" if graphics_item.confidence >= 0.70 else "needs_review"
                )
            if physics_item:
                val, _, _ = NumberNormalizer.normalize_score_text(physics_item.text)
                metrics["physics_score"] = ExtractedMetricResult(
                    metric_id="physics_score",
                    raw_text=physics_item.text,
                    normalized_value=val,
                    confidence=round(physics_item.confidence, 2),
                    unit="score",
                    ocr_region=physics_item.box,
                    status="verified" if physics_item.confidence >= 0.70 else "needs_review"
                )
            if combined_item:
                val, _, _ = NumberNormalizer.normalize_score_text(combined_item.text)
                metrics["combined_score"] = ExtractedMetricResult(
                    metric_id="combined_score",
                    raw_text=combined_item.text,
                    normalized_value=val,
                    confidence=round(combined_item.confidence, 2),
                    unit="score",
                    ocr_region=combined_item.box,
                    status="verified" if combined_item.confidence >= 0.70 else "needs_review"
                )

        elif benchmark_id in ("threedmark_speedway", "threedmark_steelnomad", "threedmark_portroyal"):
            fps_item = self._find_subscore(ocr_items, ["graphics test", "frame rate", "fps"])
            if fps_item:
                val, _, _ = NumberNormalizer.normalize_score_text(fps_item.text)
                metrics["graphics_test"] = ExtractedMetricResult(
                    metric_id="graphics_test",
                    raw_text=fps_item.text,
                    normalized_value=val,
                    confidence=round(fps_item.confidence, 2),
                    unit="FPS",
                    ocr_region=fps_item.box,
                    status="verified" if fps_item.confidence >= 0.70 else "needs_review"
                )

        else:  # threedmark_timespy
            graphics_item = self._find_subscore(ocr_items, ["graphics score"])
            cpu_item = self._find_subscore(ocr_items, ["cpu score"])

            if graphics_item:
                val, _, _ = NumberNormalizer.normalize_score_text(graphics_item.text)
                metrics["graphics_score"] = ExtractedMetricResult(
                    metric_id="graphics_score",
                    raw_text=graphics_item.text,
                    normalized_value=val,
                    confidence=round(graphics_item.confidence, 2),
                    unit="score",
                    ocr_region=graphics_item.box,
                    status="verified" if graphics_item.confidence >= 0.70 else "needs_review"
                )
            if cpu_item:
                val, _, _ = NumberNormalizer.normalize_score_text(cpu_item.text)
                metrics["cpu_score"] = ExtractedMetricResult(
                    metric_id="cpu_score",
                    raw_text=cpu_item.text,
                    normalized_value=val,
                    confidence=round(cpu_item.confidence, 2),
                    unit="score",
                    ocr_region=cpu_item.box,
                    status="verified" if cpu_item.confidence >= 0.70 else "needs_review"
                )

        confs = [m.confidence for m in metrics.values() if m.normalized_value is not None]
        overall_conf = round(sum(confs) / len(confs), 2) if confs else 0.0

        all_verified = all(m.status == "verified" for m in metrics.values() if m.normalized_value is not None)
        has_scores = any(m.normalized_value is not None for m in metrics.values())
        overall_status = "verified" if all_verified and overall_conf >= 0.65 and has_scores else "needs_review"

        return ParserExtractionResult(
            benchmark_id=benchmark_id,
            parser_id=self.id,
            parser_version=self.version,
            overall_confidence=overall_conf,
            metrics=metrics,
            detected_benchmark_name=benchmark_name,
            status=overall_status,
            raw_ocr_items=ocr_items
        )

    def _find_overall_score(self, ocr_items: List[OCRItem]) -> Optional[OCRItem]:
        # Primary candidate: Large prominent number in left container
        candidates = []
        for it in ocr_items:
            # Reject logos and text labels with letters (e.g. "3DMARK", "Best 0")
            if re.search(r'[a-zA-Z]{2,}', it.text):
                continue
            x, y, w, h = it.box
            if x < 480 and 370 <= y <= 550 and (w >= 80 or h >= 35):
                val, _, _ = NumberNormalizer.normalize_score_text(it.text)
                if val is not None and val >= 100:
                    candidates.append((w * h, it))

        if candidates:
            candidates.sort(key=lambda c: c[0], reverse=True)
            return candidates[0][1]

        # Fallback: Look near "Your score" or "Score"
        for it in ocr_items:
            txt = it.text.lower()
            if "your score" in txt or "score" in txt:
                lx, ly, lw, lh = it.box
                for num_it in ocr_items:
                    if num_it == it or not re.search(r'\d', num_it.text) or re.search(r'[a-zA-Z]{2,}', num_it.text):
                        continue
                    nx, ny, nw, nh = num_it.box
                    if abs(nx - lx) < 150 and (ny >= ly) and (ny <= ly + 100):
                        val, _, _ = NumberNormalizer.normalize_score_text(num_it.text)
                        if val is not None and val >= 100:
                            return num_it

        return None

    def _find_subscore(self, ocr_items: List[OCRItem], label_keywords: List[str]) -> Optional[OCRItem]:
        for it in ocr_items:
            txt = it.text.lower()
            if any(kw in txt for kw in label_keywords):
                lx, ly, lw, lh = it.box
                candidates = []
                for num_it in ocr_items:
                    if num_it == it or not re.search(r'\d', num_it.text):
                        continue
                    nx, ny, nw, nh = num_it.box
                    # Situates below or beside on the right side of the dashboard
                    below = (ly <= ny <= ly + 85) and abs(nx - lx) < 250
                    beside = abs((ny + nh / 2) - (ly + lh / 2)) < 35 and (nx >= lx + lw - 20)
                    if (below or beside) and nx > 500:
                        val, _, _ = NumberNormalizer.normalize_score_text(num_it.text)
                        if val is not None:
                            dist = (nx - lx) ** 2 + (ny - ly) ** 2
                            candidates.append((dist, num_it))
                if candidates:
                    candidates.sort(key=lambda c: c[0])
                    return candidates[0][1]

        return None