import os
import sys
import webbrowser
import threading
import time
import shutil
import copy
import traceback
from pathlib import Path

# Fix for Windows GUI / PyInstaller windowed mode (console=False)
# When console=False on Windows, sys.stdout and sys.stderr are None.
# This causes uvicorn's logging formatter to crash with:
# AttributeError: 'NoneType' object has no attribute 'isatty'
class StreamToLog:
    def __init__(self, file_handle=None):
        self.file_handle = file_handle

    def write(self, s):
        if self.file_handle:
            try:
                self.file_handle.write(s)
                self.file_handle.flush()
            except Exception:
                pass

    def flush(self):
        if self.file_handle:
            try:
                self.file_handle.flush()
            except Exception:
                pass

    def isatty(self):
        return False

# Setup app_dir and logging file early
if getattr(sys, "frozen", False):
    app_dir = Path(sys.executable).parent
    bundle_dir = Path(sys._MEIPASS) if hasattr(sys, "_MEIPASS") else app_dir / "_internal"

    # Detect if user launched directly from inside an unextracted zip
    app_dir_str = str(app_dir).lower()
    if ("appdata\\local\\temp" in app_dir_str or "temp1_" in app_dir_str or "\\temp\\" in app_dir_str) and not (bundle_dir / "app").exists():
        try:
            import ctypes
            ctypes.windll.user32.MessageBoxW(
                0,
                "It appears you are running BenchMate Analyzer directly from inside a compressed ZIP folder.\n\n"
                "Please EXTRACT all files from the ZIP archive (Right-click the ZIP -> Extract All) before launching BenchMate-Analyzer.exe.",
                "BenchMate Analyzer - Extraction Required",
                0x30 # MB_ICONWARNING
            )
        except Exception:
            pass
        sys.exit(1)

    sys.path.insert(0, str(bundle_dir))
else:
    app_dir = Path(__file__).resolve().parent
    bundle_dir = app_dir
    if (app_dir / "backend").exists():
        sys.path.insert(0, str(app_dir / "backend"))

# Ensure data directory exists
data_dir = app_dir / "data"
data_dir.mkdir(parents=True, exist_ok=True)
cfx_data_dir = data_dir / "capframex"
cfx_data_dir.mkdir(parents=True, exist_ok=True)

# If running without a console or stdout is None, pipe stdout/stderr to data/server.log
log_file_path = data_dir / "server.log"
try:
    log_fh = open(log_file_path, "a", encoding="utf-8")
except Exception:
    log_fh = None

if sys.stdout is None or not hasattr(sys.stdout, "write"):
    sys.stdout = StreamToLog(log_fh)
if sys.stderr is None or not hasattr(sys.stderr, "write"):
    sys.stderr = StreamToLog(log_fh)
if sys.stdin is None:
    try:
        sys.stdin = open(os.devnull, "r")
    except Exception:
        pass

# Ensure seeded database exists next to executable
if getattr(sys, "frozen", False):
    target_db = data_dir / "benchmark_analyzer.db"
    source_db = bundle_dir / "data" / "benchmark_analyzer.db"
    if not target_db.exists() and source_db.exists():
        try:
            shutil.copy2(source_db, target_db)
            print(f"Initialized database at {target_db}")
        except Exception as e:
            print(f"Notice copying seeded database: {e}")

    # Seed CapFrameX JSON files
    for fn in ["game_profiles.json", "custom_charts.json"]:
        target_json = cfx_data_dir / fn
        source_json = bundle_dir / "app" / "capframex" / "data" / fn
        if not target_json.exists() and source_json.exists():
            try:
                shutil.copy2(source_json, target_json)
            except Exception:
                pass

try:
    from app.config import settings
    from app.main import app
    import uvicorn
except Exception as init_err:
    err_msg = traceback.format_exc()
    if log_fh:
        log_fh.write(f"\n[FATAL STARTUP ERROR]\n{err_msg}\n")
        log_fh.flush()
    try:
        import ctypes
        ctypes.windll.user32.MessageBoxW(
            0,
            f"Failed to initialize BenchMate Analyzer:\n\n{init_err}\n\nSee data/server.log for details.",
            "BenchMate Analyzer - Startup Error",
            0x10
        )
    except Exception:
        pass
    sys.exit(1)

def check_and_recover_port(host: str, port: int) -> bool:
    """
    Checks if an instance is already running or if the port is blocked.
    1. If a healthy running instance is found, returns False (indicating server already up).
    2. If the port is held by an unresponsive / zombie process, terminates it to free the port.
    3. If port is free, returns True.
    """
    import socket
    import urllib.request
    import subprocess

    url = f"http://{host}:{port}"
    health_url = f"{url}/api/health"

    # 1. Test if port is currently in use
    is_in_use = False
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.6)
        if s.connect_ex((host, port)) == 0:
            is_in_use = True

    if not is_in_use:
        return True  # Port is free, proceed with normal server launch

    print(f"[Startup] Port {port} is in use. Checking if BenchMate Analyzer is already active...")
    # 2. Check if it is a healthy running instance of BenchMate Analyzer
    try:
        req = urllib.request.Request(health_url, headers={"User-Agent": "HealthCheck"})
        with urllib.request.urlopen(req, timeout=1.5) as resp:
            if resp.status == 200:
                print(f"[Startup] Active instance detected on port {port}! Attaching desktop GUI window...")
                return False  # Server already running, skip starting duplicate uvicorn
    except Exception:
        pass

    # 3. If port is in use but NOT responding to health check, it's an orphaned / zombie process!
    print(f"[Startup] Port {port} is occupied by an unresponsive process. Cleaning up...")
    try:
        my_pid = os.getpid()
        output = subprocess.check_output(f'netstat -ano | findstr :{port}', shell=True).decode("utf-8", errors="ignore")
        pids = set()
        for line in output.strip().splitlines():
            parts = line.strip().split()
            if len(parts) >= 5 and "LISTENING" in parts:
                try:
                    pid = int(parts[-1])
                    if pid > 0 and pid != my_pid:
                        pids.add(pid)
                except ValueError:
                    pass

        for pid in pids:
            try:
                subprocess.run(f"taskkill /F /PID {pid}", shell=True, check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                print(f"[Startup] Terminated zombie process PID {pid}")
            except Exception:
                pass

        time.sleep(1.0)
    except Exception as cleanup_err:
        print(f"[Startup] Port recovery warning: {cleanup_err}")

    return True

def wait_for_server(host: str, port: int, timeout: float = 15.0) -> bool:
    import urllib.request
    health_url = f"http://{host}:{port}/api/health"
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            req = urllib.request.Request(health_url, headers={"User-Agent": "HealthCheck"})
            with urllib.request.urlopen(req, timeout=1.0) as resp:
                if resp.status == 200:
                    return True
        except Exception:
            time.sleep(0.2)
    return False

def run_uvicorn_server():
    uvicorn_log_config = copy.deepcopy(uvicorn.config.LOGGING_CONFIG)
    if "formatters" in uvicorn_log_config:
        if "default" in uvicorn_log_config["formatters"]:
            uvicorn_log_config["formatters"]["default"]["use_colors"] = False
        if "access" in uvicorn_log_config["formatters"]:
            uvicorn_log_config["formatters"]["access"]["use_colors"] = False

    uvicorn.run(
        app,
        host=settings.HOST,
        port=settings.PORT,
        log_level="info",
        log_config=uvicorn_log_config
    )

if __name__ == "__main__":
    try:
        print("========================================================")
        print(f"            BENCHMATE ANALYZER v{settings.VERSION}             ")
        print("         DUAL DESKTOP GUI (OCR + CAPFRAMEX)             ")
        print("========================================================")

        # Verify port availability and auto-recover or attach if already running
        needs_server = check_and_recover_port(settings.HOST, settings.PORT)

        if needs_server:
            print(f"Starting local server on http://{settings.HOST}:{settings.PORT}...")
            server_thread = threading.Thread(target=run_uvicorn_server, daemon=True)
            server_thread.start()

            # Block until backend responds healthy
            if not wait_for_server(settings.HOST, settings.PORT):
                raise RuntimeError(f"Server did not start within timeout on {settings.HOST}:{settings.PORT}")

        app_url = f"http://{settings.HOST}:{settings.PORT}"
        print(f"Opening native desktop GUI window at {app_url}...")

        import webview

        window = webview.create_window(
            title=f"BenchMate Analyzer v{settings.VERSION} (OCR & CapFrameX)",
            url=app_url,
            width=1480,
            height=940,
            min_size=(1080, 720),
            resizable=True,
            text_select=True,
            background_color="#09090B",
        )

        def on_closed():
            os._exit(0)

        window.events.closed += on_closed
        webview.start(gui="edgechromium", debug=False)
        os._exit(0)

    except Exception as run_err:
        err_msg = traceback.format_exc()
        if log_fh:
            log_fh.write(f"\n[DESKTOP RUNTIME ERROR]\n{err_msg}\n")
            log_fh.flush()
        try:
            import ctypes
            ctypes.windll.user32.MessageBoxW(
                0,
                f"Error running BenchMate Analyzer Desktop GUI:\n\n{run_err}\n\nSee data/server.log for details.",
                "BenchMate Analyzer - Desktop Error",
                0x10
            )
        except Exception:
            pass
        sys.exit(1)
