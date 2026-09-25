import os
import sys
import subprocess
import base64
import logging

logger = logging.getLogger(__name__)

def pick_folder_powershell(title: str = "Select CapFrameX Capture Folder", initial: str = "") -> tuple[bool, str]:
    """Uses Windows PowerShell with Windows Forms FolderBrowserDialog and a TopMost owner form.
    Guarantees the dialog pops up in front of all open windows (including web browsers).
    Returns (handled, path_or_empty).
    """
    clean_initial = initial.replace("'", "''").replace("\\", "\\\\") if initial else ""
    clean_title = title.replace("'", "''")

    ps_code = f"""
[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null
[System.Reflection.Assembly]::LoadWithPartialName('System.Drawing') | Out-Null

$fbd = New-Object System.Windows.Forms.FolderBrowserDialog
$fbd.Description = '{clean_title}'
$fbd.ShowNewFolderButton = $true

if ('{clean_initial}' -ne '' -and (Test-Path '{clean_initial}')) {{
    $fbd.SelectedPath = '{clean_initial}'
}}

$form = New-Object System.Windows.Forms.Form
$form.TopMost = $true
$form.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen
$form.Size = New-Object System.Drawing.Size(1, 1)
$form.Opacity = 0
$form.ShowInTaskbar = $false
$form.Show()
$form.BringToFront()
$form.Activate()

$res = $fbd.ShowDialog($form)
$form.Dispose()

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
if ($res -eq [System.Windows.Forms.DialogResult]::OK -and $fbd.SelectedPath) {{
    [Console]::WriteLine("SELECTED:" + $fbd.SelectedPath)
}} else {{
    [Console]::WriteLine("CANCELLED")
}}
"""
    try:
        enc = base64.b64encode(ps_code.encode("utf-16le")).decode("ascii")
        p = subprocess.run(
            ["powershell.exe", "-NoProfile", "-Sta", "-EncodedCommand", enc],
            capture_output=True,
            text=True,
            timeout=180,
        )
        if p.returncode == 0 and p.stdout:
            for line in p.stdout.splitlines():
                line = line.strip()
                if line.startswith("SELECTED:"):
                    path = line[len("SELECTED:"):].strip()
                    if path and os.path.isdir(path):
                        return True, os.path.normpath(path)
                elif line == "CANCELLED":
                    return True, ""
    except Exception as e:
        logger.warning(f"PowerShell folder picker failed: {e}")

    return False, ""


def pick_folder_ctypes(title: str = "Select CapFrameX Capture Folder", initial: str = "") -> tuple[bool, str]:
    """Uses native Windows Shell API (SHBrowseForFolderW) via ctypes.
    Runs instantly on any Windows version without external process dependencies.
    Returns (handled, path_or_empty).
    """
    import ctypes
    from ctypes import wintypes

    ole32 = ctypes.windll.ole32
    shell32 = ctypes.windll.shell32
    user32 = ctypes.windll.user32

    BIF_RETURNONLYFSDIRS = 0x0001
    BIF_NEWDIALOGSTYLE = 0x0040
    BIF_EDITBOX = 0x0010
    BIF_USENEWUI = BIF_NEWDIALOGSTYLE | BIF_EDITBOX

    BFFM_INITIALIZED = 1
    BFFM_SETSELECTIONW = 0x0400 + 103

    BROWSEINFO_CALLBACK = ctypes.WINFUNCTYPE(
        ctypes.c_int, wintypes.HWND, wintypes.UINT, wintypes.LPARAM, wintypes.LPARAM
    )

    class BROWSEINFO(ctypes.Structure):
        _fields_ = [
            ("hwndOwner", wintypes.HWND),
            ("pidlRoot", ctypes.c_void_p),
            ("pszDisplayName", wintypes.LPWSTR),
            ("lpszTitle", wintypes.LPCWSTR),
            ("ulFlags", wintypes.UINT),
            ("lpfn", BROWSEINFO_CALLBACK),
            ("lParam", wintypes.LPARAM),
            ("iImage", ctypes.c_int),
        ]

    shell32.SHBrowseForFolderW.argtypes = [ctypes.POINTER(BROWSEINFO)]
    shell32.SHBrowseForFolderW.restype = ctypes.c_void_p
    shell32.SHGetPathFromIDListW.argtypes = [ctypes.c_void_p, wintypes.LPWSTR]
    shell32.SHGetPathFromIDListW.restype = wintypes.BOOL
    ole32.CoTaskMemFree.argtypes = [ctypes.c_void_p]
    ole32.CoTaskMemFree.restype = None

    try:
        ole32.CoInitialize(None)
    except Exception:
        pass

    try:
        @BROWSEINFO_CALLBACK
        def callback(hwnd, uMsg, lParam, lpData):
            if uMsg == BFFM_INITIALIZED and initial and os.path.isdir(initial):
                user32.SendMessageW(hwnd, BFFM_SETSELECTIONW, 1, initial)
            return 0

        buf = ctypes.create_unicode_buffer(260)
        bi = BROWSEINFO()
        bi.hwndOwner = user32.GetForegroundWindow() or 0
        bi.pidlRoot = None
        bi.pszDisplayName = ctypes.cast(buf, wintypes.LPWSTR)
        bi.lpszTitle = title
        bi.ulFlags = BIF_RETURNONLYFSDIRS | BIF_USENEWUI
        bi.lpfn = callback
        bi.lParam = 0
        bi.iImage = 0

        pidl = shell32.SHBrowseForFolderW(ctypes.byref(bi))
        if pidl:
            path_buf = ctypes.create_unicode_buffer(1024)
            success = shell32.SHGetPathFromIDListW(pidl, path_buf)
            ole32.CoTaskMemFree(pidl)
            if success and path_buf.value:
                norm = os.path.normpath(path_buf.value)
                if os.path.isdir(norm):
                    return True, norm
        # Dialog opened and was cancelled by user
        return True, ""
    except Exception as e:
        logger.warning(f"Win32 ctypes folder picker failed: {e}")
        return False, ""
    finally:
        try:
            ole32.CoUninitialize()
        except Exception:
            pass


def pick_folder_tkinter(title: str = "Select CapFrameX Capture Folder", initial: str = "") -> tuple[bool, str]:
    """Fallback using Tkinter with proper topmost parent and window message pump.
    Returns (handled, path_or_empty).
    """
    try:
        import tkinter as tk
        from tkinter import filedialog

        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        root.update()
        root.lift()
        root.focus_force()

        chosen = filedialog.askdirectory(
            title=title,
            initialdir=initial if initial and os.path.isdir(initial) else None,
            parent=root,
        )
        root.destroy()
        if chosen and os.path.isdir(chosen):
            return True, os.path.normpath(chosen)
        return True, ""
    except Exception as e:
        logger.warning(f"Tkinter folder picker failed: {e}")
        return False, ""


def pick_folder(title: str = "Select CapFrameX Capture Folder", initial_dir: str = "") -> str:
    """Multi-tiered native folder picker for Windows.
    1. PowerShell Windows Forms with TopMost owner form (guaranteed front popup).
    2. Native Win32 Shell SHBrowseForFolderW via ctypes.
    3. Tkinter askdirectory with topmost root.
    """
    if sys.platform == "win32":
        # 1. PowerShell with TopMost form (safest on modern Windows)
        try:
            handled, path = pick_folder_powershell(title, initial_dir)
            if handled:
                return path
        except Exception:
            pass

        # 2. Native Win32 Shell API
        try:
            handled, path = pick_folder_ctypes(title, initial_dir)
            if handled:
                return path
        except Exception:
            pass

    # 3. Tkinter fallback
    try:
        handled, path = pick_folder_tkinter(title, initial_dir)
        if handled:
            return path
    except Exception:
        pass

    return ""
