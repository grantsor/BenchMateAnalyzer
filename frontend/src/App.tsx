import React, { useState, useEffect, useCallback } from "react";
import { OcrApp } from "./apps/OcrApp";
import { CapFrameXApp } from "./apps/CapFrameXApp";
import { Camera, Gamepad2, ExternalLink, Layers, Settings, FolderSearch } from "lucide-react";
import { SettingsModal } from "./components/settings/SettingsModal";
import { useShortcutStore, isShortcutMatch, formatCombo } from "./stores/shortcutStore";
import { useThemeStore } from "./stores/themeStore";
import { useImportStore } from "./stores/useImportStore";
import { useProjectStore } from "./stores/projectStore";
import { SUITE_VERSION_LABEL } from "./constants/version";
import { ExportToastContainer } from "./components/common/ExportToastContainer";

type ActiveApp = "ocr" | "capframex";

const STORAGE_KEY_ACTIVE_APP = "benchmate_active_app_v1";

export function App() {
  const [activeApp, setActiveApp] = useState<ActiveApp>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const appParam = params.get("app");
      if (appParam === "capframex" || appParam === "ocr") {
        return appParam as ActiveApp;
      }
      const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_APP);
      if (saved === "capframex" || saved === "ocr") {
        return saved as ActiveApp;
      }
    } catch (e) {
      console.warn("Could not read stored active app:", e);
    }
    // Default main app is OCR App
    return "ocr";
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { shortcuts } = useShortcutStore();
  const { cycleTheme } = useThemeStore();

  const isStandalone = (() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("standalone") === "1";
    } catch {
      return false;
    }
  })();

  // Persist active app choice
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_APP, activeApp);
    } catch (e) {
      console.warn("Could not persist active app:", e);
    }
  }, [activeApp]);

  const handleOpenImportFolder = useCallback(async () => {
    let targetPath = "";
    if (activeApp === "ocr") {
      targetPath =
        useImportStore.getState().folderPath ||
        useProjectStore.getState().currentProject?.root_folder_path ||
        "";
      if (!targetPath) {
        try {
          targetPath = localStorage.getItem("gp_import_folder_path") || "";
        } catch (e) {}
      }
    } else {
      try {
        targetPath = localStorage.getItem("cx_import_folder_path") || "";
        if (!targetPath) {
          const raw = localStorage.getItem("cx_benchmark_chart_preferences_v2");
          if (raw) {
            const parsed = JSON.parse(raw);
            targetPath = parsed.folder || "";
          }
        }
      } catch (e) {}
    }

    try {
      await fetch("/api/system/open-import-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: targetPath, app_type: activeApp })
      });
    } catch (e) {
      console.error("Could not open import folder:", e);
    }
  }, [activeApp]);

  // Global customizable keyboard shortcuts listener with input guard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Guard: do not trigger hotkeys if user is currently typing in an input
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea" || target.isContentEditable) {
          return;
        }
      }

      if (shortcuts.switch_ocr && isShortcutMatch(shortcuts.switch_ocr.combo, e)) {
        e.preventDefault();
        setActiveApp("ocr");
      } else if (shortcuts.switch_capframex && isShortcutMatch(shortcuts.switch_capframex.combo, e)) {
        e.preventDefault();
        setActiveApp("capframex");
      } else if (shortcuts.open_settings && isShortcutMatch(shortcuts.open_settings.combo, e)) {
        e.preventDefault();
        setIsSettingsOpen((prev) => !prev);
      } else if (shortcuts.toggle_theme && isShortcutMatch(shortcuts.toggle_theme.combo, e)) {
        e.preventDefault();
        cycleTheme();
      } else if (shortcuts.open_data && isShortcutMatch(shortcuts.open_data.combo, e)) {
        e.preventDefault();
        fetch("/api/system/open-data-folder", { method: "POST" }).catch(() => {});
      } else if (shortcuts.open_import_folder && isShortcutMatch(shortcuts.open_import_folder.combo, e)) {
        e.preventDefault();
        handleOpenImportFolder();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts, cycleTheme, handleOpenImportFolder]);

  const handlePopOut = () => {
    const url = `${window.location.origin}${window.location.pathname}?app=${activeApp}&standalone=1`;
    window.open(url, `_blank_${activeApp}`, "width=1440,height=900,menubar=no,toolbar=no,location=no,status=no");
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0a0e17] text-slate-100 select-none font-['Geist',sans-serif]">
      {/* Master BenchMate Header (hidden if standalone popout window) */}
      {!isStandalone && (
        <header className="h-11 min-h-[44px] bg-[#0a0e17] border-b border-white/[0.08] flex items-center justify-between px-3.5 z-50">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-400/20 text-[#3d8bff]">
              <Layers className="w-3.5 h-3.5" />
              <span className="font-semibold text-xs tracking-tight text-white">
                Bench<span className="text-[#3d8bff]">Mate</span>
              </span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Suite</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.04] text-slate-400 border border-white/[0.06] font-mono">
              {SUITE_VERSION_LABEL}
            </span>
          </div>

          {/* Dual App Switcher (BrewedOps Clean Segmented Pill) */}
          <div className="flex items-center bg-white/[0.03] p-0.5 rounded-lg border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setActiveApp("ocr")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all duration-150 cursor-pointer ${
                activeApp === "ocr"
                  ? "bg-blue-600/90 text-white shadow-sm shadow-blue-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
              }`}
            >
              <Camera className="w-3.5 h-3.5 text-[#3d8bff]" />
              <span>Benchmark OCR Analyzer</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveApp("capframex")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all duration-150 cursor-pointer ${
                activeApp === "capframex"
                  ? "bg-blue-600/90 text-white shadow-sm shadow-blue-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5 text-[#3d8bff]" />
              <span>CapFrameX Analyzer</span>
            </button>
          </div>

          {/* Right Action Tools: Import Folder + Settings + Pop Out */}
          <div className="flex items-center gap-1.5">
            {/* Open Active Import Folder Button */}
            <button
              type="button"
              onClick={handleOpenImportFolder}
              title={`Open ${activeApp === "ocr" ? "OCR Screenshots" : "CapFrameX Captures"} Import Folder in Windows Explorer (${formatCombo(shortcuts.open_import_folder?.combo || { key: "i", ctrl: true })})`}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] text-slate-300 hover:text-white border border-white/[0.08] text-xs font-medium transition active:scale-95 cursor-pointer"
            >
              <FolderSearch className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Import Folder</span>
            </button>

            {/* Dedicated Settings Button */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              title="Open BenchMate Settings & Changelogs (Ctrl+,)"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] text-slate-300 hover:text-white border border-white/[0.08] text-xs font-medium transition active:scale-95 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-[#3d8bff]" />
              <span>Settings</span>
            </button>

            {/* Pop-out to Separate Window for Dual-Monitor Setup */}
            <button
              type="button"
              onClick={handlePopOut}
              title={`Pop out ${activeApp === "ocr" ? "OCR Analyzer" : "CapFrameX Analyzer"} into a dedicated window for dual monitors`}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] text-slate-400 hover:text-white border border-white/[0.08] text-xs transition active:scale-95 cursor-pointer"
            >
              <ExternalLink className="w-3 h-3 text-slate-400" />
              <span className="hidden md:inline">Pop Out</span>
            </button>
          </div>
        </header>
      )}

      {/* Concurrent Workspace Container */}
      {/* Both applications remain mounted simultaneously in DOM to guarantee 100% independent memory and caching */}
      <main className="flex-1 w-full overflow-hidden relative">
        <div
          className={`h-full w-full ${activeApp === "ocr" ? "flex flex-col" : "hidden"}`}
          style={{ display: activeApp === "ocr" ? "flex" : "none" }}
        >
          <OcrApp />
        </div>

        <div
          className={`h-full w-full ${activeApp === "capframex" ? "flex flex-col" : "hidden"}`}
          style={{ display: activeApp === "capframex" ? "flex" : "none" }}
        >
          <CapFrameXApp />
        </div>
      </main>

      {/* Unified Settings & Changelogs Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Global Export Delivery Toast Notification */}
      <ExportToastContainer />
    </div>
  );
}

export default App;
