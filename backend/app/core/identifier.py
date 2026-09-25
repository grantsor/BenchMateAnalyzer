import difflib
import json
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from app.config import settings
from app.ocr.engine import OCRItem

class BenchmarkDefinition:
    def __init__(self, data: Dict[str, Any]):
        self.id = data["id"]
        self.name = data["name"]
        self.version = data.get("version", "")
        self.category = data.get("category", "")
        self.parser_id = data.get("parser_id", "generic_parser")
        self.file_patterns = [re.compile(p, re.IGNORECASE) for p in data.get("file_patterns", [])]
        self.aliases = [a.lower() for a in data.get("aliases", [])]
        self.keywords = [k.lower() for k in data.get("keywords", [])]
        self.metrics = data.get("metrics", [])

class BenchmarkIdentifier:
    def __init__(self):
        self.benchmarks: Dict[str, BenchmarkDefinition] = {}
        self.load_definitions()

    def load_definitions(self):
        self.benchmarks.clear()
        # 1. Built-in bundled definitions
        defs_dir = settings.DEFINITIONS_DIR
        if defs_dir.exists():
            for f in defs_dir.glob("*.json"):
                try:
                    with open(f, "r", encoding="utf-8-sig") as fp:
                        data = json.load(fp)
                        b_def = BenchmarkDefinition(data)
                        self.benchmarks[b_def.id] = b_def
                except Exception as e:
                    print(f"[BenchmarkIdentifier] Error loading {f}: {e}")

        # 2. External user/custom definitions (persisted outside frozen exe)
        custom_dir = settings.DATA_DIR / "benchmarks"
        if custom_dir.exists():
            for f in custom_dir.glob("*.json"):
                try:
                    with open(f, "r", encoding="utf-8-sig") as fp:
                        data = json.load(fp)
                        b_def = BenchmarkDefinition(data)
                        self.benchmarks[b_def.id] = b_def
                except Exception as e:
                    print(f"[BenchmarkIdentifier] Error loading custom definition {f}: {e}")

    def register_dynamic_benchmark(self, data: Dict[str, Any]):
        """Dynamically registers or updates a benchmark in memory and disk at runtime without recompiling."""
        b_def = BenchmarkDefinition(data)
        self.benchmarks[b_def.id] = b_def

        try:
            custom_dir = settings.DATA_DIR / "benchmarks"
            custom_dir.mkdir(parents=True, exist_ok=True)
            out_file = custom_dir / f"{b_def.id}.json"
            with open(out_file, "w", encoding="utf-8") as fp:
                json.dump(data, fp, indent=2)
        except Exception as e:
            print(f"[BenchmarkIdentifier] Error persisting custom benchmark {b_def.id}: {e}")

    def identify_by_filename(self, filename: str) -> Tuple[Optional[str], float]:
        """
        Tests filename against regex patterns and alias keywords.
        Returns (benchmark_id, confidence).
        """
        stem = Path(filename).stem.lower()

        # Specific storage disambiguation check before generic PCMark 10
        if "pcm" in stem or "pcmark" in stem:
            if any(k in stem for k in ["datadrive", "data drive", "data dive", "datadriver", "data"]):
                return "pcmark10_data_drive", 0.95
            if any(k in stem for k in ["quicksys", "quick system", "quick sys", "quicksystem", "quick"]):
                return "pcmark10_quick_system_drive", 0.95

        # 1. Test regex patterns
        for b_id, b_def in self.benchmarks.items():
            for pat in b_def.file_patterns:
                if pat.search(filename):
                    return b_id, 0.90

        # 2. Test exact aliases
        stem_padded = f" {stem} "
        for b_id, b_def in self.benchmarks.items():
            for alias in b_def.aliases:
                if alias == stem:
                    return b_id, 0.95
                if re.search(r'(?:^|[\s_\-\.])' + re.escape(alias) + r'(?:$|[\s_\-\.])', stem) or (alias in stem and len(alias) >= 5):
                    # If alias is occt but storage is in filename, yield to occt_storage
                    if alias == "occt" and ("storage" in stem or "disk" in stem or "ssd" in stem):
                        return "occt_storage", 0.90
                    return b_id, 0.85

        # 3. Fuzzy match stem & tokens against aliases/benchmarks (tolerating typos in any benchmark)
        GENERIC_TOKENS = {
            "benchmark", "benchmarks", "bench", "test", "tests", "run", "runs",
            "result", "results", "score", "scores", "profile", "config",
            "screen", "screenshot", "standard", "whisper", "performance",
            "storage", "disk", "ssd", "cpu", "gpu", "ram"
        }
        clean_stem = re.sub(r'[^a-z0-9]', '', stem)
        tokens = [re.sub(r'[^a-z0-9]', '', t) for t in re.split(r'[\s_\-\.]+', stem) if t]
        tokens = [t for t in tokens if len(t) >= 3 and t not in GENERIC_TOKENS]

        best_fuzzy_id = None
        best_fuzzy_ratio = 0.0

        for b_id, b_def in self.benchmarks.items():
            candidates = list(b_def.aliases) + [b_id, b_def.name.lower()]
            for cand in candidates:
                clean_cand = re.sub(r'[^a-z0-9]', '', cand)
                if len(clean_cand) < 3 or clean_cand in GENERIC_TOKENS:
                    continue

                # Full stem similarity
                r_full = difflib.SequenceMatcher(None, clean_stem, clean_cand).ratio()
                if r_full > best_fuzzy_ratio:
                    best_fuzzy_ratio = r_full
                    best_fuzzy_id = b_id

                # Token similarity
                for tok in tokens:
                    r_tok = difflib.SequenceMatcher(None, tok, clean_cand).ratio()
                    if r_tok > best_fuzzy_ratio:
                        best_fuzzy_ratio = r_tok
                        best_fuzzy_id = b_id

                    # Substring containment for long words
                    if len(tok) >= 4 and len(clean_cand) >= 4:
                        if tok in clean_cand or clean_cand in tok:
                            r_sub = len(min(tok, clean_cand, key=len)) / len(max(tok, clean_cand, key=len))
                            if r_sub > best_fuzzy_ratio:
                                best_fuzzy_ratio = r_sub
                                best_fuzzy_id = b_id

        if best_fuzzy_ratio >= 0.72 and best_fuzzy_id:
            return best_fuzzy_id, 0.88

        return None, 0.0

    def infer_context_from_path(self, file_path: str) -> Dict[str, Optional[str]]:
        """
        Infers Product/Device, Test Configuration/Mode, and Subsystem Category from directory path.
        e.g. 'N:/Reviews/RX 9070 GRE/Silent Mode/screenshot_01.jpg' ->
        {
            'product_name': 'RX 9070 GRE',
            'configuration_name': 'Silent Mode',
            'suggested_category': 'GPU'
        }
        """
        p = Path(file_path).resolve()
        parts = p.parts
        if len(parts) < 2:
            return {"product_name": None, "configuration_name": None, "suggested_category": None}

        # Parent directory is typically configuration (e.g. "Silent Mode", "Turbo", "Stock", "45W")
        parent_dir = parts[-2]
        grandparent_dir = parts[-3] if len(parts) >= 3 else None

        MODE_KEYWORDS = {
            "silent", "performance", "turbo", "balanced", "stock", "oc",
            "overclock", "eco", "quiet", "default", "45w", "65w", "54w", "35w", "custom"
        }
        is_mode_dir = any(mk in parent_dir.lower() for mk in MODE_KEYWORDS)

        config_name = parent_dir
        product_name = grandparent_dir if (is_mode_dir and grandparent_dir) else parent_dir

        path_str = str(p).lower()
        suggested_category = None
        if any(w in path_str for w in ["gpu", "graphics", "geforce", "radeon", "rtx", "rx 9", "rx 7", "rx 6", "arc"]):
            suggested_category = "GPU"
        elif any(w in path_str for w in ["ssd", "nvme", "storage", "m.2", "sata", "gen4", "gen5", "disk"]):
            suggested_category = "SSD"
        elif any(w in path_str for w in ["cpu", "processor", "ryzen", "core ultra", "intel core", "raptor"]):
            suggested_category = "CPU"
        elif any(w in path_str for w in ["ram", "ddr4", "ddr5", "memory"]):
            suggested_category = "RAM"
        elif any(w in path_str for w in ["laptop", "zenbook", "expertbook", "notebook", "thinkpad", "rog", "tuf", "vivobook"]):
            suggested_category = "Laptop"

        return {
            "product_name": product_name,
            "configuration_name": config_name,
            "suggested_category": suggested_category
        }

    def identify_by_content(
        self,
        filename: str,
        ocr_items: List[OCRItem]
    ) -> Tuple[str, float]:
        """
        Identifies benchmark using content-first visual text inspection with filename fallback.
        """
        ocr_text = " ".join(item.text.lower() for item in ocr_items)
        ocr_words = [w for w in re.split(r'[\s_\-\.:\(\),]+', ocr_text) if len(w) >= 3]

        # 1. High-Confidence Visual Disambiguation Rules (Visual content takes absolute priority)
        # 3DMark Tests
        if "speed way score" in ocr_text or ("speed way" in ocr_text and any(k in ocr_text for k in ["3dmark", "graphics test", "fps", "directx 12"])):
            return "threedmark_speedway", 0.99
        if "steel nomad score" in ocr_text or ("steel nomad" in ocr_text and any(k in ocr_text for k in ["3dmark", "graphics test", "fps"])):
            return "threedmark_steelnomad", 0.99
        if "time spy score" in ocr_text or ("time spy" in ocr_text and any(k in ocr_text for k in ["3dmark", "graphics score", "cpu score"])):
            return "threedmark_timespy", 0.99
        if "fire strike score" in ocr_text or ("fire strike" in ocr_text and any(k in ocr_text for k in ["3dmark", "physics score", "combined score"])):
            return "threedmark_firestrike", 0.99
        if "port royal score" in ocr_text or ("port royal" in ocr_text and "3dmark" in ocr_text):
            return "threedmark_portroyal", 0.99
        if "storagebenchmark" in ocr_text or "storage benchmark" in ocr_text or ("3dmark" in ocr_text and ("bandwidth" in ocr_text or "access time" in ocr_text or "storage" in ocr_text)):
            return "threedmark_storage", 0.99

        # Geekbench Suite
        if "opencl score" in ocr_text or ("opencl" in ocr_text and "geekbench" in ocr_text):
            return "geekbench6_opencl", 0.99
        if "vulkan score" in ocr_text or ("vulkan" in ocr_text and "geekbench" in ocr_text):
            return "geekbench6_vulkan", 0.99
        if "geekbench ai" in ocr_text or ("single precision" in ocr_text and "half precision" in ocr_text):
            return "geekbench_ai", 0.99
        if "single-core score" in ocr_text or "multi-core score" in ocr_text or ("geekbench 6" in ocr_text and "compute" not in ocr_text):
            return "geekbench6", 0.99

        # UL Procyon Suite
        if any(k in ocr_text for k in ["stable diffusion", "diffusion", "image generation", "unet", "s/image", "it/s", "amage geeaton", "stoble-diffus"]):
            if "procyon" in ocr_text or "inference" in ocr_text or "batch" in ocr_text:
                return "procyon_ai_image_gen", 0.99
        if any(k in ocr_text for k in ["computer vision", "mobilenet", "resnet", "deeplab", "yolo", "real-esrgan"]):
            if "procyon" in ocr_text or "inference device" in ocr_text:
                return "procyon_ai_vision", 0.99

        # Other Primary Benchmarks
        if "cinebench" in ocr_text:
            return "cinebench_r26", 0.99
        if "corona" in ocr_text and ("rays/sec" in ocr_text or "benchmark" in ocr_text):
            return "corona_benchmark", 0.99
        if "octane" in ocr_text and ("benchmark" in ocr_text or "score" in ocr_text or "chromium" in ocr_text):
            return "octane_benchmark", 0.99
        # PCMark 10 Storage Benchmarks (check before generic PCMark 10)
        if "data drive" in ocr_text or "datadrive" in ocr_text:
            if "pcmark" in ocr_text or "pcm" in ocr_text or "pcm10" in ocr_text:
                return "pcmark10_data_drive", 0.99
        if any(k in ocr_text for k in ["quick system drive", "quicksystem", "quick system", "quick sys"]):
            if "pcmark" in ocr_text or "pcm" in ocr_text or "pcm10" in ocr_text:
                return "pcmark10_quick_system_drive", 0.99

        if "pcmark 10" in ocr_text or ("pcmark" in ocr_text and any(k in ocr_text for k in ["essentials", "productivity", "digital content"])):
            return "pcmark10", 0.99
        if "super pi" in ocr_text or "superpi" in ocr_text or "calculate pi" in ocr_text:
            return "superpi_benchmark", 0.99
        if "wprime" in ocr_text:
            return "wprime_benchmark", 0.99
        if "v-ray" in ocr_text or "vray" in ocr_text or "vsamples" in ocr_text:
            return "vray_benchmark", 0.99
        if "blender" in ocr_text and any(k in ocr_text for k in ["monster", "junkshop", "classroom"]):
            return "blender_benchmark", 0.99
        if "crossmark" in ocr_text or ("bapco" in ocr_text and "creativity" in ocr_text):
            return "crossmark", 0.99

        # Storage Benchmarks
        if "crystaldiskmark" in ocr_text or ("seq1m" in ocr_text and "rnd4k" in ocr_text):
            return "crystaldiskmark_16gb" if "16gib" in ocr_text or "16gb" in ocr_text else "crystaldiskmark_1gb", 0.98
        if "as ssd" in ocr_text:
            if "copy benchmark" in ocr_text:
                return "as_ssd_copy", 0.98
            return "as_ssd_10gb" if "10 gb" in ocr_text or "10gb" in ocr_text else "as_ssd_1gb", 0.98
        if "blackmagic" in ocr_text or "disk speed test" in ocr_text:
            return "blackmagic_5gb" if "5 gb" in ocr_text or "5gb" in ocr_text else "blackmagic_1gb", 0.98

        # 2. Filename-based matching fallback
        fn_id, fn_conf = self.identify_by_filename(filename)
        if fn_conf >= 0.85 and fn_id:
            # Check if visual text directly contradicts filename
            if fn_id == "geekbench6" and ("opencl" in ocr_text or "vulkan" in ocr_text):
                pass
            else:
                return fn_id, fn_conf

        # 3. General Keyword hits in OCR text
        best_id = fn_id or "unknown"
        best_conf = fn_conf

        for b_id, b_def in self.benchmarks.items():
            hit_count = 0
            for kw in b_def.keywords:
                kw_lower = kw.lower()
                if kw_lower in ocr_text:
                    hit_count += 1
                else:
                    # Fuzzy keyword check against OCR words
                    kw_words = [w for w in re.split(r'[\s_\-\.:\(\),]+', kw_lower) if len(w) >= 4]
                    for kw_w in kw_words:
                        for ocr_w in ocr_words:
                            if abs(len(kw_w) - len(ocr_w)) <= 2:
                                if difflib.SequenceMatcher(None, kw_w, ocr_w).ratio() >= 0.80:
                                    hit_count += 0.8
                                    break

            if hit_count > 0:
                conf = min(0.98, 0.60 + hit_count * 0.15)
                if fn_id == b_id:
                    conf = min(0.99, conf + 0.15)

                if conf > best_conf:
                    best_conf = conf
                    best_id = b_id

        return best_id, best_conf

    def infer_hardware_and_category(
        self,
        ocr_items: List[OCRItem],
        file_path: str = ""
    ) -> Dict[str, Optional[str]]:
        """
        Inspects OCR text and directory path to extract hardware specs
        (GPU, CPU, Motherboard, Laptop) and determine primary component category.
        """
        ocr_text = " ".join(item.text for item in ocr_items)
        detected_gpu = None
        detected_cpu = None
        detected_motherboard = None
        detected_system = None

        # Detect GPU
        gpu_match = re.search(r'(?:NVIDIA\s+)?(GeForce\s+RTX\s+[0-9]{4}(?:\s*Ti|\s*Super|\s*Laptop\s*GPU)?)|(AMD\s+Radeon\s+(?:RX\s+)?[0-9]{4}(?:\s*XTX|\s*XT|\s*GRE)?)|(Intel\s+Arc\s+[A-Z][0-9]{3})', ocr_text, re.IGNORECASE)
        if gpu_match:
            detected_gpu = gpu_match.group(0).strip()

        # Detect CPU
        cpu_match = re.search(r'(AMD\s+Ryzen\s+[0-9]+\s+[0-9]{4}[A-Z0-9]*)|(Intel\s+(?:Core\s+)?(?:Ultra\s+[0-9]+\s+[0-9]{3}[A-Z]*|[0-9]+th\s+Gen\s+Core\s+i[0-9]-[0-9]{5}[A-Z]*|i[0-9]-[0-9]{5}[A-Z]*))', ocr_text, re.IGNORECASE)
        if cpu_match:
            detected_cpu = cpu_match.group(0).strip()

        # Detect Motherboard
        mobo_match = re.search(r'(?:Gigabyte|ASUS|MSI|ASRock).*?(?:X870E|X870|X670E|X670|B650|Z890|Z790|B760)[A-Z0-9\s]*', ocr_text, re.IGNORECASE)
        if mobo_match:
            detected_motherboard = mobo_match.group(0).strip()

        # Detect Laptop / OEM System
        laptop_match = re.search(r'(OMEN\s+by\s+HP\s+Laptop\s*[0-9]*|ASUS\s+Zenbook\s*[A-Z0-9\s]*|Lenovo\s+Legion\s*[A-Z0-9\s]*|ROG\s+Zephyrus\s*[A-Z0-9\s]*)', ocr_text, re.IGNORECASE)
        if laptop_match:
            detected_system = laptop_match.group(0).strip()

        # Fallback to path hints
        path_hints = self.infer_context_from_path(file_path) if file_path else {}
        suggested_category = path_hints.get("suggested_category")

        if not suggested_category:
            if detected_system:
                suggested_category = "Laptop"
            elif detected_gpu and ("opencl" in ocr_text.lower() or "vulkan" in ocr_text.lower() or "3dmark" in ocr_text.lower() or "procyon" in ocr_text.lower()):
                suggested_category = "GPU"
            elif detected_cpu:
                suggested_category = "CPU"
            elif detected_motherboard:
                suggested_category = "Motherboard"

        return {
            "gpu": detected_gpu,
            "cpu": detected_cpu,
            "motherboard": detected_motherboard,
            "system": detected_system,
            "suggested_category": suggested_category or "Other",
            "suggested_product_name": detected_system or detected_gpu or detected_cpu or path_hints.get("product_name")
        }

benchmark_identifier = BenchmarkIdentifier()
