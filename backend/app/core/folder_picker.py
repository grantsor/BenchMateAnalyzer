import os
import sys
import subprocess
import base64
import logging

logger = logging.getLogger(__name__)

def pick_folder_ifiledialog(title: str = "Select Benchmark Review Folder", initial: str = "") -> tuple[bool, str]:
    """Uses native Windows modern IFileOpenDialog (Windows Vista+ / 10 / 11).
    This opens the standard, modern Windows File Explorer Folder Picker dialog with
    Quick Access, drive letters, address bar, and search.
    Returns (handled, path_or_empty).
    """
    import ctypes
    from ctypes import wintypes

    class GUID(ctypes.Structure):
        _fields_ = [
            ("Data1", wintypes.DWORD),
            ("Data2", wintypes.WORD),
            ("Data3", wintypes.WORD),
            ("Data4", wintypes.BYTE * 8)
        ]

    CLSID_FileOpenDialog = GUID(0xDC1C5A9C, 0xE88A, 0x4DDE, (wintypes.BYTE * 8)(0xA5, 0xA1, 0x60, 0xF8, 0x2A, 0x20, 0xAE, 0xF7))
    IID_IFileOpenDialog = GUID(0x42F85136, 0xDB7E, 0x439C, (wintypes.BYTE * 8)(0x85, 0xF1, 0xE4, 0x07, 0x5D, 0x13, 0x5F, 0xC8))
    IID_IShellItem = GUID(0x43826D1E, 0xE718, 0x42EE, (wintypes.BYTE * 8)(0xBC, 0x55, 0xA1, 0xE2, 0x61, 0xC3, 0x7B, 0xFE))

    FOS_PICKFOLDERS = 0x00000020
    FOS_FORCEFILESYSTEM = 0x00000040
    SIGDN_FILESYSPATH = 0x80058000
    ERROR_CANCELLED = 0x800704C7

    ole32 = ctypes.windll.ole32
    shell32 = ctypes.windll.shell32
    user32 = ctypes.windll.user32

    try:
        ole32.CoInitialize(None)
    except Exception:
        pass

    p_dialog = ctypes.c_void_p()
    hr = ole32.CoCreateInstance(
        ctypes.byref(CLSID_FileOpenDialog),
        None,
        1,  # CLSCTX_INPROC_SERVER
        ctypes.byref(IID_IFileOpenDialog),
        ctypes.byref(p_dialog)
    )
    if hr != 0 or not p_dialog.value:
        return False, ""

    vtable = ctypes.cast(p_dialog, ctypes.POINTER(ctypes.POINTER(ctypes.c_void_p))).contents
    release_dialog = ctypes.WINFUNCTYPE(wintypes.ULONG, ctypes.c_void_p)(vtable[2])

    try:
        get_options = ctypes.WINFUNCTYPE(ctypes.HRESULT, ctypes.c_void_p, ctypes.POINTER(wintypes.DWORD))(vtable[10])
        set_options = ctypes.WINFUNCTYPE(ctypes.HRESULT, ctypes.c_void_p, wintypes.DWORD)(vtable[9])
        set_title = ctypes.WINFUNCTYPE(ctypes.HRESULT, ctypes.c_void_p, wintypes.LPCWSTR)(vtable[17])
        set_folder = ctypes.WINFUNCTYPE(ctypes.HRESULT, ctypes.c_void_p, ctypes.c_void_p)(vtable[12])
        show = ctypes.WINFUNCTYPE(ctypes.HRESULT, ctypes.c_void_p, wintypes.HWND)(vtable[3])
        get_result = ctypes.WINFUNCTYPE(ctypes.HRESULT, ctypes.c_void_p, ctypes.POINTER(ctypes.c_void_p))(vtable[20])

        options = wintypes.DWORD(0)
        get_options(p_dialog, ctypes.byref(options))
        set_options(p_dialog, options.value | FOS_PICKFOLDERS | FOS_FORCEFILESYSTEM)

        if title:
            set_title(p_dialog, title)

        if initial and os.path.isdir(initial):
            p_initial_item = ctypes.c_void_p()
            hr_item = shell32.SHCreateItemFromParsingName(
                wintypes.LPCWSTR(initial),
                None,
                ctypes.byref(IID_IShellItem),
                ctypes.byref(p_initial_item)
            )
            if hr_item == 0 and p_initial_item.value:
                set_folder(p_dialog, p_initial_item)
                item_vtable = ctypes.cast(p_initial_item, ctypes.POINTER(ctypes.POINTER(ctypes.c_void_p))).contents
                ctypes.WINFUNCTYPE(wintypes.ULONG, ctypes.c_void_p)(item_vtable[2])(p_initial_item)

        hwnd_owner = user32.GetForegroundWindow() or 0
        hr_show = show(p_dialog, hwnd_owner)

        # User clicked Cancel or closed the dialog
        if (hr_show & 0xFFFFFFFF) == ERROR_CANCELLED or hr_show == -2147023673:
            return True, ""

        if hr_show != 0:
            return False, ""

        p_result_item = ctypes.c_void_p()
        hr_res = get_result(p_dialog, ctypes.byref(p_result_item))
        if hr_res != 0 or not p_result_item.value:
            return True, ""

        res_vtable = ctypes.cast(p_result_item, ctypes.POINTER(ctypes.POINTER(ctypes.c_void_p))).contents
        get_display_name = ctypes.WINFUNCTYPE(ctypes.HRESULT, ctypes.c_void_p, wintypes.DWORD, ctypes.POINTER(wintypes.LPWSTR))(res_vtable[5])
        release_item = ctypes.WINFUNCTYPE(wintypes.ULONG, ctypes.c_void_p)(res_vtable[2])

        psz_path = wintypes.LPWSTR()
        hr_name = get_display_name(p_result_item, SIGDN_FILESYSPATH, ctypes.byref(psz_path))
        folder_path = ""
        if hr_name == 0 and psz_path.value:
            folder_path = os.path.normpath(psz_path.value)
            ole32.CoTaskMemFree(psz_path)

        release_item(p_result_item)
        return True, folder_path
    except Exception as e:
        logger.warning(f"IFileOpenDialog error: {e}")
        return False, ""
    finally:
        release_dialog(p_dialog)


def pick_folder_powershell(title: str = "Select Benchmark Review Folder", initial: str = "") -> tuple[bool, str]:
    """Fallback using Windows PowerShell with Windows Forms FolderBrowserDialog.
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


def pick_folder_tkinter(title: str = "Select Benchmark Review Folder", initial: str = "") -> tuple[bool, str]:
    """Fallback using standard Tkinter filedialog if available.
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


def pick_folder(title: str = "Select Benchmark Review Folder", initial_dir: str = "") -> str:
    """Multi-tiered native folder picker for Windows.
    1. Native Windows modern IFileOpenDialog (the modern Windows Explorer folder picker).
    2. PowerShell Windows Forms fallback.
    3. Tkinter askdirectory fallback.
    Guarantees immediate single-click termination when cancelled by user.
    """
    if sys.platform == "win32":
        # 1. Native Windows modern IFileOpenDialog (Primary)
        try:
            handled, path = pick_folder_ifiledialog(title, initial_dir)
            if handled:
                return path
        except Exception as e:
            logger.warning(f"Native IFileOpenDialog error: {e}")

        # 2. PowerShell with TopMost form (Fallback)
        try:
            handled, path = pick_folder_powershell(title, initial_dir)
            if handled:
                return path
        except Exception as e:
            logger.warning(f"PowerShell folder picker error: {e}")

    # 3. Tkinter (cross-platform fallback)
    try:
        handled, path = pick_folder_tkinter(title, initial_dir)
        if handled:
            return path
    except Exception as e:
        logger.warning(f"Tkinter folder picker error: {e}")

    return ""


def main():
    initial = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] else ""
    folder = pick_folder("Select Benchmark Review Folder", initial)
    if folder:
        sys.stdout.write(folder)
        sys.stdout.flush()


if __name__ == "__main__":
    main()
