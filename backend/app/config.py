import os
import sys
from pathlib import Path
from pydantic import BaseModel

def get_bundle_dir() -> Path:
    if getattr(sys, "frozen", False):
        meipass = getattr(sys, "_MEIPASS", None)
        if meipass:
            return Path(meipass)
        return Path(sys.executable).parent / "_internal"
    return Path(__file__).resolve().parent.parent

def get_app_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent
    return Path(__file__).resolve().parent.parent

class Settings(BaseModel):
    PROJECT_NAME: str = "BenchMate Analyzer API"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    HOST: str = "127.0.0.1"
    PORT: int = 8742

    # Paths
    BASE_DIR: Path = get_bundle_dir()
    APP_DIR: Path = get_app_dir()
    DATA_DIR: Path = get_app_dir() / "data"
    DB_PATH: Path = get_app_dir() / "data" / "benchmark_analyzer.db"
    DEFINITIONS_DIR: Path = get_bundle_dir() / "app" / "benchmark_registry" / "definitions"
    UPLOADS_DIR: Path = get_app_dir() / "data" / "uploads"
    EXPORTS_DIR: Path = get_app_dir() / "data" / "exports"
    CAPFRAMEX_DATA_DIR: Path = get_app_dir() / "data" / "capframex"
    CAPFRAMEX_DEFAULT_DIR: str = r"N:\BenchMarkTool\Sample CapframeX Data"
    DEFAULT_DATA_DIR: str = r"N:\BenchMarkTool\Sample CapframeX Data"

    @property
    def DATABASE_URL(self) -> str:
        return f"sqlite+aiosqlite:///{self.DB_PATH.as_posix()}"

    def ensure_dirs(self):
        self.DATA_DIR.mkdir(parents=True, exist_ok=True)
        self.UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
        self.EXPORTS_DIR.mkdir(parents=True, exist_ok=True)
        self.CAPFRAMEX_DATA_DIR.mkdir(parents=True, exist_ok=True)

settings = Settings()
settings.ensure_dirs()
