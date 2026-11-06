import os
import sys
import logging

logger = logging.getLogger(__name__)

def pick_folder_shbrowse(title: str = "Select Benchmark Review Folder", initial: str = "") -> tuple[bool, str]:
    """Native Windows 'Browse For Folder' dialog via shell32.SHBrowseForFolderW.
    Matches the user-preferred folder tree dialog with 'Make New Folder', OK, and Cancel.
    Runs 100% in-process without spawning cmd/powershell windows, and terminates immediately
    on Cancel or [X] with zero secondary popups.
    """
    import ctypes
    from ctypes import wintypes

    class BROWSEINFOW(ctypes.Structure):
        _fields_ = [
            ("hwndOwner", wintypes.HWND),
            ("pidlRoot", ctypes.c_void_p),
            ("pszDisplayName", wintypes.LPWSTR),
            ("lpszTitle", wintypes.LPCWSTR),
            ("ulFlags", wintypes.UINT),
            ("lpfn", ctypes.c_void_p),
            ("lParam", wintypes.LPARAM),
            ("iImage", ctypes.c_int)
        ]

    BIF_RETURNONLYFSDIRS = 0x00000001
    BIF_NEWDIALOGSTYLE = 0x00000040

    BFFCALLBACK = ctypes.WINFUNCTYPE(ctypes.c_int, wintypes.HWND, wintypes.UINT, wintypes.LPARAM, wintypes.LPARAM)

    shell32 = ctypes.windll.shell32
    ole32 = ctypes.windll.ole32
    user32 = ctypes.windll.user32

    try:
        ole32.CoInitialize(None)
    except Exception:
        pass

    cb = None
    initial_buf = None
    if initial and os.path.isdir(initial):
        norm_initial = os.path.normpath(initial)
        initial_buf = ctypes.create_unicode_buffer(norm_initial)

        @BFFCALLBACK
        def _cb(hwnd, uMsg, lParam, lpData):
            # uMsg == 1 is BFFM_INITIALIZED
            if uMsg == 1 and lpData:
                # 0x0400 + 103 is BFFM_SETSELECTIONW; wParam = 1 for Unicode string
                user32.SendMessageW(hwnd, 0x0400 + 103, 1, lpData)
            return 0

        cb = _cb

    display_name = ctypes.create_unicode_buffer(260)
    bi = BROWSEINFOW()
    bi.hwndOwner = user32.GetForegroundWindow() or 0
    bi.pidlRoot = None
    bi.pszDisplayName = ctypes.cast(display_name, wintypes.LPWSTR)
    bi.lpszTitle = title
    bi.ulFlags = BIF_RETURNONLYFSDIRS | BIF_NEWDIALOGSTYLE
    if cb and initial_buf:
        bi.lpfn = ctypes.cast(cb, ctypes.c_void_p)
        bi.lParam = ctypes.addressof(initial_buf)
    else:
        bi.lpfn = None
        bi.lParam = 0
    bi.iImage = 0

    try:
        pidl = shell32.SHBrowseForFolderW(ctypes.byref(bi))
        if not pidl:
            # User clicked Cancel or [X] -> immediately return handled with empty path
            return True, ""

        path_buffer = ctypes.create_unicode_buffer(1024)
        success = shell32.SHGetPathFromIDListW(pidl, path_buffer)
        ole32.CoTaskMemFree(pidl)

        if success and path_buffer.value:
            return True, os.path.normpath(path_buffer.value)
        return True, ""
    except Exception as e:
        logger.warning(f"SHBrowseForFolderW error: {e}")
        return False, ""

def pick_folder_tkinter(title: str = "Select Benchmark Review Folder", initial: str = "") -> tuple[bool, str]:
    """Fallback for non-Windows systems using Tkinter askdirectory."""
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
    """Native folder picker with zero console windows and single-click cancel.
    Primary: Native Windows 'Browse For Folder' dialog (SHBrowseForFolderW).
    Fallback: Tkinter askdirectory.
    """
    if sys.platform == "win32":
        try:
            handled, path = pick_folder_shbrowse(title, initial_dir)
            if handled:
                return path
        except Exception as e:
            logger.warning(f"Native SHBrowseForFolderW error: {e}")

    # Fallback (non-Windows or exceptional Windows failure)
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
