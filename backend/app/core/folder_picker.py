import os
import sys

def pick_folder_ctypes(title: str = "Select Benchmark Review Folder", initial: str = "") -> str:
    """Uses native Windows Shell API (SHBrowseForFolderW) via ctypes.
    Requires no subprocess, no external modules, and runs instantly on any Windows version."""
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
        bi.hwndOwner = user32.GetForegroundWindow()
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
                    return norm
        return ""
    finally:
        try:
            ole32.CoUninitialize()
        except Exception:
            pass


def pick_folder_powershell(title: str = "Select Benchmark Review Folder", initial: str = "") -> str:
    """Fallback using Windows PowerShell FolderBrowserDialog."""
    import subprocess
    import base64

    clean_initial = initial.replace("'", "''") if initial else ""
    clean_title = title.replace("'", "''")

    ps_code = f"""
[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null
$fbd = New-Object System.Windows.Forms.FolderBrowserDialog
$fbd.Description = '{clean_title}'
$fbd.ShowNewFolderButton = $true
if ('{clean_initial}' -ne '' -and (Test-Path '{clean_initial}')) {{
    $fbd.SelectedPath = '{clean_initial}'
}}
$form = New-Object System.Windows.Forms.Form
$form.TopMost = $true
$form.WindowState = [System.Windows.Forms.FormWindowState]::Minimized
$form.Show()
$form.BringToFront()
$res = $fbd.ShowDialog($form)
$form.Dispose()
if ($res -eq [System.Windows.Forms.DialogResult]::OK) {{
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    [Console]::WriteLine($fbd.SelectedPath)
}}
"""
    try:
        enc = base64.b64encode(ps_code.encode("utf-16le")).decode("ascii")
        p = subprocess.run(
            ["powershell.exe", "-NoProfile", "-NonInteractive", "-Sta", "-EncodedCommand", enc],
            capture_output=True,
            text=True,
            timeout=300,
        )
        if p.returncode == 0 and p.stdout:
            for line in p.stdout.splitlines():
                line = line.strip()
                if line and os.path.isdir(line):
                    return os.path.normpath(line)
    except Exception:
        pass
    return ""


def pick_folder_tkinter(title: str = "Select Benchmark Review Folder", initial: str = "") -> str:
    """Fallback using standard Tkinter filedialog if available."""
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
            return os.path.normpath(chosen)
    except Exception:
        pass
    return ""


def pick_folder(title: str = "Select Benchmark Review Folder", initial_dir: str = "") -> str:
    """Multi-tiered native folder picker for Windows.
    Tries native ctypes Shell API first, falls back to PowerShell, then Tkinter."""
    if sys.platform == "win32":
        # 1. Native ctypes Win32 Shell API
        try:
            folder = pick_folder_ctypes(title, initial_dir)
            if folder:
                return folder
        except Exception:
            pass

        # 2. PowerShell Windows Forms
        try:
            folder = pick_folder_powershell(title, initial_dir)
            if folder:
                return folder
        except Exception:
            pass

    # 3. Tkinter (cross-platform fallback)
    try:
        folder = pick_folder_tkinter(title, initial_dir)
        if folder:
            return folder
    except Exception:
        pass

    return ""


def main():
    initial = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] else ""
    folder = pick_folder("Select Benchmark Review Folder", initial)
    if folder:
        sys.stdout.write(folder)
        sys.stdout.flush()


if __name__ == "__main__":
    main()
