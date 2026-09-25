import React, { useState, useEffect } from "react";
import { OcrApp } from "./apps/OcrApp";
import { CapFrameXApp } from "./apps/CapFrameXApp";
import { Camera, Gamepad2, ExternalLink, Activity, Layers } from "lucide-react";

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
              v1.0.0
            </span>
          </div>

          {/* Dedicated Dual App Switcher */}
          <div className="flex items-center bg-[#18181b] p-0.5 rounded-lg border border-[#27272a] shadow-inner">
            <button
              type="button"
              onClick={() => setActiveApp("ocr")}
              className={`flex items-center gap-2 px-3 py-1 rounded-md text-xs font-semibold transition-all duration-150 ${
                activeApp === "ocr"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-900/50"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#23232a]"
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Benchmark OCR Analyzer</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-normal transition-colors ${
                activeApp === "ocr" ? "bg-blue-700 text-blue-100" : "bg-[#27272a] text-slate-400"
              }`}>
                Main App
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveApp("capframex")}
              className={`flex items-center gap-2 px-3 py-1 rounded-md text-xs font-semibold transition-all duration-150 ${
                activeApp === "capframex"
                  ? "bg-emerald-600 text-white shadow-sm shadow-emerald-900/50"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#23232a]"
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>CapFrameX Analyzer</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-normal transition-colors ${
                activeApp === "capframex" ? "bg-emerald-700 text-emerald-100" : "bg-[#27272a] text-slate-400"
              }`}>
                Dedicated App
              </span>
            </button>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-3">
            {/* Live Dual Engine Indicator */}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="hidden sm:inline">Dual Engines Online</span>
            </div>

            {/* Pop-out to Separate Window for Dual-Monitor Setup */}
            <button
              type="button"
              onClick={handlePopOut}
              title={`Pop out ${activeApp === "ocr" ? "OCR Analyzer" : "CapFrameX Analyzer"} into a dedicated window for dual monitors`}
              className="flex items-center gap-1 px-2 py-1 rounded bg-[#18181b] hover:bg-[#23232a] text-slate-300 hover:text-white border border-[#27272a] text-xs transition-colors"
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
    </div>
  );
}

export default App;
