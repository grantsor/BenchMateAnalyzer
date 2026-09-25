import React, { useState, useEffect } from "react";
import { OcrApp } from "./apps/OcrApp";
import { CapFrameXApp } from "./apps/CapFrameXApp";
import { Camera, Gamepad2, ExternalLink, Layers, Settings } from "lucide-react";
import { SettingsModal } from "./components/settings/SettingsModal";
import { useShortcutStore, isShortcutMatch } from "./stores/shortcutStore";
import { useThemeStore } from "./stores/themeStore";

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
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts, cycleTheme]);

  const handlePopOut = () => {
    const url = `${window.location.origin}${window.location.pathname}?app=${activeApp}&standalone=1`;
    window.open(url, `_blank_${activeApp}`, "width=1440,height=900,menubar=no,toolbar=no,location=no,status=no");
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#09090b] text-slate-100 select-none">
      {/* Master BenchMate Header (hidden if standalone popout window) */}
      {!isStandalone && (
        <header className="h-11 min-h-[44px] bg-[#0c0c0e] border-b border-[#23232a] flex items-center justify-between px-3 z-50 shadow-md">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-600/10 border border-blue-500/20 text-blue-400">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-extrabold text-xs tracking-wider text-white">
                BENCH<span className="text-red-500">MATE</span>
              </span>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Analyzer</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700/60 font-mono">
              v1.1.0
            </span>
          </div>

          {/* Dual App Switcher (Clean, without Main/Dedicated badges) */}
          <div className="flex items-center bg-[#18181b] p-0.5 rounded-lg border border-[#27272a] shadow-inner">
            <button
              type="button"
              onClick={() => setActiveApp("ocr")}
              className={`flex items-center gap-2 px-3.5 py-1 rounded-md text-xs font-semibold transition-all duration-150 cursor-pointer ${
                activeApp === "ocr"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-900/50"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#23232a]"
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Benchmark OCR Analyzer</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveApp("capframex")}
              className={`flex items-center gap-2 px-3.5 py-1 rounded-md text-xs font-semibold transition-all duration-150 cursor-pointer ${
                activeApp === "capframex"
                  ? "bg-emerald-600 text-white shadow-sm shadow-emerald-900/50"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#23232a]"
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>CapFrameX Analyzer</span>
            </button>
          </div>

          {/* Right Action Tools: Settings + Pop Out */}
          <div className="flex items-center gap-2.5">
            {/* Dedicated Settings Button (Replaced Dual Engines Online) */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              title="Open BenchMate Settings & Changelogs (Ctrl+,)"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#18181b] hover:bg-[#23232a] text-slate-300 hover:text-white border border-[#27272a] text-xs font-semibold transition cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-blue-400" />
              <span>Settings</span>
            </button>

            {/* Pop-out to Separate Window for Dual-Monitor Setup */}
            <button
              type="button"
              onClick={handlePopOut}
              title={`Pop out ${activeApp === "ocr" ? "OCR Analyzer" : "CapFrameX Analyzer"} into a dedicated window for dual monitors`}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#18181b] hover:bg-[#23232a] text-slate-300 hover:text-white border border-[#27272a] text-xs transition cursor-pointer"
            >
              <ExternalLink className="w-3 h-3 text-slate-400" />
              <span className="hidden md:inline">Pop Out Window</span>
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
    </div>
  );
}

export default App;
