from typing import Dict, List, Optional
import numpy as np
from app.ocr.engine import OCRItem, OCREngine, ocr_engine
from app.parsers.base import BaseBenchmarkParser, ParserExtractionResult
from app.parsers.geekbench6 import Geekbench6Parser
from app.parsers.cinebench import CinebenchParser
from app.parsers.blender import BlenderParser
from app.parsers.corona import CoronaParser
from app.parsers.gbai import GeekbenchAIParser
from app.parsers.occt import OCCTParser
from app.parsers.octane import OctaneParser
from app.parsers.pcm10 import PCMark10Parser
from app.parsers.superpi import SuperPIParser
from app.parsers.vray import VRayParser
from app.parsers.wprime import WPrimeParser
from app.parsers.threedmark import ThreeDMarkParser
from app.parsers.crystaldiskmark import CrystalDiskMarkParser
from app.parsers.as_ssd import ASSSDParser
from app.parsers.as_ssd_copy import ASSSDCopyParser
from app.parsers.threedmark_storage import ThreeDMarkStorageParser
from app.parsers.pcmark10_storage import PCMark10StorageParser
from app.parsers.blackmagic import BlackmagicParser
from app.parsers.occt_storage import OCCTStorageParser
from app.parsers.crossmark import CrossMarkParser
from app.parsers.geekbench_compute import GeekbenchComputeParser
from app.parsers.procyon_ai import ProcyonAIParser
from app.parsers.generic import GenericOCRParser

class ParserRegistry:
    def __init__(self):
        self._parsers: Dict[str, BaseBenchmarkParser] = {}
        self._generic_parser = GenericOCRParser()
        self._register_default_parsers()

    def _register_default_parsers(self):
        self.register_parser(Geekbench6Parser())
        self.register_parser(GeekbenchComputeParser())
        self.register_parser(ProcyonAIParser())
        self.register_parser(CinebenchParser())
        self.register_parser(BlenderParser())
        self.register_parser(CoronaParser())
        self.register_parser(GeekbenchAIParser())
        self.register_parser(OCCTParser())
        self.register_parser(OctaneParser())
        self.register_parser(PCMark10Parser())
        self.register_parser(SuperPIParser())
        self.register_parser(VRayParser())
        self.register_parser(WPrimeParser())
        self.register_parser(ThreeDMarkParser())
        self.register_parser(CrystalDiskMarkParser())
        self.register_parser(ASSSDParser())
        self.register_parser(ASSSDCopyParser())
        self.register_parser(ThreeDMarkStorageParser())
        self.register_parser(PCMark10StorageParser())
        self.register_parser(BlackmagicParser())
        self.register_parser(OCCTStorageParser())
        self.register_parser(CrossMarkParser())

    def register_parser(self, parser: BaseBenchmarkParser):
        self._parsers[parser.id] = parser

    def get_parser(self, parser_id: str) -> Optional[BaseBenchmarkParser]:
        return self._parsers.get(parser_id)

    def find_best_parser(
        self,
        filename: str,
        ocr_items: List[OCRItem],
        image: np.ndarray,
        forced_benchmark_id: Optional[str] = None
    ) -> BaseBenchmarkParser:
        from app.core.identifier import benchmark_identifier
        from app.parsers.dynamic_template import DynamicTemplateParser

        # If forced to a specific benchmark
        if forced_benchmark_id:
            b_def = benchmark_identifier.benchmarks.get(forced_benchmark_id)
            if b_def and b_def.parser_id:
                for parser in self._parsers.values():
                    if parser.id == b_def.parser_id:
                        return parser

            for parser in self._parsers.values():
                supported = getattr(parser, "supported_benchmark_ids", {parser.target_benchmark_id})
                if forced_benchmark_id in supported or parser.target_benchmark_id == forced_benchmark_id:
                    return parser

            if b_def:
                return DynamicTemplateParser({
                    "id": b_def.id,
                    "name": b_def.name,
                    "version": b_def.version,
                    "category": b_def.category,
                    "keywords": b_def.keywords,
                    "aliases": b_def.aliases,
                    "metrics": b_def.metrics
                })

        # Score each registered built-in parser
        best_parser = None
        best_confidence = 0.0

        for parser in self._parsers.values():
            score = parser.can_parse(filename, ocr_items, image)
            if score > best_confidence:
                best_confidence = score
                best_parser = parser

        # Score all dynamic / custom benchmarks loaded from SQLite or JSON
        for b_id, b_def in benchmark_identifier.benchmarks.items():
            # Only test as dynamic if no built-in parser already claims this benchmark
            claimed = any(
                (b_id in getattr(p, "supported_benchmark_ids", {p.target_benchmark_id}) or p.target_benchmark_id == b_id)
                for p in self._parsers.values()
            )
            if not claimed:
                def_dict = {
                    "id": b_def.id,
                    "name": b_def.name,
                    "version": b_def.version,
                    "category": b_def.category,
                    "keywords": b_def.keywords,
                    "aliases": b_def.aliases,
                    "metrics": b_def.metrics
                }
                dyn_parser = DynamicTemplateParser(def_dict)
                score = dyn_parser.can_parse(filename, ocr_items, image)
                if score > best_confidence:
                    best_confidence = score
                    best_parser = dyn_parser

        # If highest confidence is above threshold (e.g. 0.40), use it
        if best_parser and best_confidence >= 0.40:
            return best_parser

        return self._generic_parser

    def parse_image(
        self,
        image: np.ndarray,
        filename: str,
        forced_benchmark_id: Optional[str] = None,
        custom_ocr_engine: Optional[OCREngine] = None
    ) -> ParserExtractionResult:
        engine = custom_ocr_engine or ocr_engine

        # Step 1: Run full OCR on image
        ocr_items = engine.ocr_image(image)

        # Step 2: Select best parser
        parser = self.find_best_parser(filename, ocr_items, image, forced_benchmark_id)

        # Step 3: Extract structured results
        try:
            # Check if parser accepts filename (e.g. ThreeDMarkParser)
            import inspect
            sig = inspect.signature(parser.extract_results)
            if "filename" in sig.parameters:
                eff_fn = forced_benchmark_id if forced_benchmark_id else filename
                result = parser.extract_results(image, ocr_items, engine, filename=eff_fn)
            else:
                result = parser.extract_results(image, ocr_items, engine)
        except Exception as e:
            print(f"[ParserRegistry] Error running {parser.id}: {e}")
            result = self._generic_parser.extract_results(image, ocr_items, engine)

        # If forced to a specific benchmark, ensure result reflects it
        if forced_benchmark_id:
            result.benchmark_id = forced_benchmark_id
            from app.core.identifier import benchmark_identifier
            b_def = benchmark_identifier.benchmarks.get(forced_benchmark_id)
            if b_def:
                result.detected_benchmark_name = b_def.name

        return result

parser_registry = ParserRegistry()
