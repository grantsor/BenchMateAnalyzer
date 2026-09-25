import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Set
from PIL import Image
from app.core.identifier import benchmark_identifier
from app.ocr.preprocessor import ImagePreprocessor

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff"}

IGNORED_FILENAME_PATTERNS = [
    re.compile(r"compr", re.IGNORECASE),
    re.compile(r"compression", re.IGNORECASE),
    re.compile(r"hwinfo", re.IGNORECASE),
    re.compile(r"^hiwnfo", re.IGNORECASE),
    re.compile(r"^hw\d*", re.IGNORECASE),
    re.compile(r"^battlife", re.IGNORECASE),
    re.compile(r"^temps?(\.png|\.jpg|\.jpeg)?$", re.IGNORECASE),
    re.compile(r"^com\d+(\.png|\.jpg|\.jpeg)?$", re.IGNORECASE),
    re.compile(r"nvidia.*rtx.*ai", re.IGNORECASE),
    re.compile(r"^black\.(png|jpg|jpeg)$", re.IGNORECASE),
    re.compile(r"^sony.*", re.IGNORECASE),
]

@dataclass
class ScannedImage:
    file_path: str
    file_name: str
    configuration_name: str
    file_size: int
    sha256: str
    dhash: Optional[str]
    width: int
    height: int
    identified_benchmark_id: Optional[str]
    identification_confidence: float
    is_duplicate: bool = False
    duplicate_of: Optional[str] = None

@dataclass
class ScannedConfiguration:
    folder_name: str
    display_name: str
    folder_path: str
    images: List[ScannedImage] = field(default_factory=list)

@dataclass
class DuplicateInfo:
    original_path: str
    duplicate_path: str
    sha256: str
    configuration_name: str

@dataclass
class ScanReport:
    root_folder: str
    total_files_scanned: int
    total_images_found: int
    configurations: List[ScannedConfiguration] = field(default_factory=list)
    recognized_benchmarks_count: int = 0
    unknown_images_count: int = 0
    duplicate_count: int = 0
    duplicates: List[DuplicateInfo] = field(default_factory=list)

class FolderScanner:
    """
    Recursively scans a root review folder, discovers configuration directories,
    indexes screenshot images, detects duplicates using hashes, and matches benchmarks.
    """

    @classmethod
    def scan_root_folder(cls, root_folder_path: str) -> ScanReport:
        root = Path(root_folder_path).resolve()
        if not root.exists() or not root.is_dir():
            raise ValueError(f"Directory does not exist: {root_folder_path}")

        total_files = 0
        total_images = 0
        configs_dict: Dict[str, ScannedConfiguration] = {}
        seen_hashes: Dict[str, str] = {}  # sha256 -> original file_path
        duplicates: List[DuplicateInfo] = []

        # Find direct subdirectories (each is a Test Configuration)
        subdirs = [p for p in root.iterdir() if p.is_dir()]

        # If there are subdirectories, treat each as a configuration folder
        if subdirs:
            for subdir in sorted(subdirs, key=lambda p: p.name.lower()):
                cfg_name = subdir.name
                cfg = ScannedConfiguration(
                    folder_name=cfg_name,
                    display_name=cfg_name,
                    folder_path=str(subdir)
                )
                configs_dict[cfg_name] = cfg

                # Scan files within this configuration directory
                for entry in os.walk(subdir):
                    dirpath, _, filenames = entry
                    for fname in sorted(filenames):
                        total_files += 1
                        if cls._is_ignored_file(fname):
                            continue
                        ext = os.path.splitext(fname)[1].lower()
                        if ext in IMAGE_EXTENSIONS:
                            fpath = os.path.join(dirpath, fname)
                            scanned_img = cls._process_image(fpath, fname, cfg_name, seen_hashes, duplicates)
                            if scanned_img:
                                total_images += 1
                                cfg.images.append(scanned_img)
        else:
            # Flat folder: images are directly in root
            cfg_name = root.name
            cfg = ScannedConfiguration(
                folder_name=cfg_name,
                display_name=cfg_name,
                folder_path=str(root)
            )
            configs_dict[cfg_name] = cfg

            for fname in sorted(os.listdir(root)):
                fpath = root / fname
                if fpath.is_file():
                    total_files += 1
                    if cls._is_ignored_file(fname):
                        continue
                    if fpath.suffix.lower() in IMAGE_EXTENSIONS:
                        scanned_img = cls._process_image(str(fpath), fname, cfg_name, seen_hashes, duplicates)
                        if scanned_img:
                            total_images += 1
                            cfg.images.append(scanned_img)

        # Count recognized vs unknown
        recognized_count = 0
        unknown_count = 0
        for cfg in configs_dict.values():
            for img in cfg.images:
                if img.identified_benchmark_id:
                    recognized_count += 1
                else:
                    unknown_count += 1

        return ScanReport(
            root_folder=str(root),
            total_files_scanned=total_files,
            total_images_found=total_images,
            configurations=list(configs_dict.values()),
            recognized_benchmarks_count=recognized_count,
            unknown_images_count=unknown_count,
            duplicate_count=len(duplicates),
            duplicates=duplicates
        )

    @classmethod
    def _is_ignored_file(cls, filename: str) -> bool:
        stem = Path(filename).stem.lower()
        for pat in IGNORED_FILENAME_PATTERNS:
            if pat.search(filename) or pat.search(stem):
                return True
        return False

    @classmethod
    def _process_image(
        cls,
        file_path: str,
        file_name: str,
        configuration_name: str,
        seen_hashes: Dict[str, str],
        duplicates: List[DuplicateInfo]
    ) -> Optional[ScannedImage]:
        try:
            stat = os.stat(file_path)
            file_size = stat.st_size

            # Compute SHA256
            sha256 = ImagePreprocessor.compute_sha256(file_path)

            # Check duplicate
            is_dup = False
            dup_of = None
            if sha256 in seen_hashes:
                is_dup = True
                dup_of = seen_hashes[sha256]
                duplicates.append(DuplicateInfo(
                    original_path=dup_of,
                    duplicate_path=file_path,
                    sha256=sha256,
                    configuration_name=configuration_name
                ))
            else:
                seen_hashes[sha256] = file_path

            # Read dimensions quickly with PIL
            width, height = 0, 0
            dhash = None
            try:
                with Image.open(file_path) as im:
                    width, height = im.size
            except Exception:
                pass

            # Initial benchmark identification from filename
            b_id, conf = benchmark_identifier.identify_by_filename(file_name)

            # Check path context for SSD / Storage disambiguation (e.g. 3dm.png in SSD folder)
            path_lower = file_path.lower()
            is_ssd_path = any(w in path_lower for w in ["ssd", "storage", "m.2", "nvme", "gen4", "gen5", "disk"])
            if (not b_id or conf < 0.60) and is_ssd_path:
                stem = Path(file_name).stem.lower().strip()
                if stem in ("3dm", "3dmark", "3dm_storage", "3dm storage"):
                    b_id, conf = "threedmark_storage", 0.95

            # If benchmark is unassigned or confidence is low, run visual content inspection
            if not b_id or conf < 0.60:
                try:
                    from app.ocr.engine import ocr_engine
                    cv_img = ImagePreprocessor.load_image(file_path)
                    if cv_img is not None:
                        ocr_items = ocr_engine.ocr_image(cv_img)
                        if ocr_items:
                            c_id, c_conf = benchmark_identifier.identify_by_content(file_name, ocr_items)
                            if c_id and c_id != "unknown" and c_conf >= 0.65:
                                b_id, conf = c_id, c_conf
                except Exception as err:
                    print(f"[FolderScanner] Visual preview identification error for {file_name}: {err}")

            return ScannedImage(
                file_path=file_path,
                file_name=file_name,
                configuration_name=configuration_name,
                file_size=file_size,
                sha256=sha256,
                dhash=dhash,
                width=width,
                height=height,
                identified_benchmark_id=b_id,
                identification_confidence=conf,
                is_duplicate=is_dup,
                duplicate_of=dup_of
            )
        except Exception as e:
            print(f"[FolderScanner] Error processing image {file_path}: {e}")
            return None
