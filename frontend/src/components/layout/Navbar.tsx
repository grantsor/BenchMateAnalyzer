import React, { useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { useThemeStore, THEME_OPTIONS } from "../../stores/themeStore";
import { APP_VERSION_LABEL } from "../../constants/version";
import { Activity, Cpu, FolderOpen, Moon, Power, RefreshCw } from "lucide-react";
import { api } from "../../api/client";

interface NavbarProps {
  onOpenProjects: () => void;
  onOpenImport: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenProjects, onOpenImport }) => {
  const { currentProject, projects, selectProject, refreshCurrentProject, isLoading } = useProjectStore();
  const { theme, setTheme } = useThemeStore();
  const [showExitModal, setShowExitModal] = useState(false);
  const [isShuttingDown, setIsShuttingDown] = useState(false);
  const [isShutdown, setIsShutdown] = useState(false);

  const handleConfirmExit = async () => {
    setIsShuttingDown(true);
    try {
      await api.shutdownApp();
    } catch {
      // Server may terminate socket before response completes
    }
    setShowExitModal(false);
    setIsShutdown(true);
  };

  return (
    <>
      <header className="h-16 bg-brand-surface border-b border-brand-border px-6 flex items-center justify-between z-10 select-none">
        {/* Brand & App Name */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-red to-rose-600 flex items-center justify-center shadow-lg shadow-rose-900/30">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-bold text-lg text-white tracking-tight">Benchmark Analyzer</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-brand-border text-emerald-400 uppercase tracking-wider border border-emerald-500/30">
                Offline {APP_VERSION_LABEL}
              </span>
            </div>
            <p className="text-xs text-slate-400">Reviewer Automated Data & Chart Engine</p>
          </div>
        </div>

        {/* Center: Current Project Switcher */}
        <div className="flex items-center space-x-3 bg-brand-card/80 border border-brand-border px-4 py-1.5 rounded-lg shadow-inner">
          <Cpu className="w-4 h-4 text-brand-red" />
          <span className="text-xs text-slate-400 font-medium">Active Project:</span>

          {projects.length > 0 ? (
            <select
              value={currentProject?.id || ""}
              onChange={(e) => selectProject(e.target.value)}
              className="bg-transparent text-sm font-semibold text-white focus:outline-none cursor-pointer pr-2"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-brand-card text-white">
                  {p.name} {p.product_name ? `(${p.product_name})` : ""}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-sm text-slate-400 italic">No project active</span>
          )}

          {currentProject && (
            <button
              onClick={() => refreshCurrentProject()}
              title="Refresh active project"
              className="p-1 hover:bg-brand-border rounded text-slate-400 hover:text-white transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-brand-red" : ""}`} />
            </button>
          )}
        </div>

        {/* Right Quick Actions & Theme Selector */}
        <div className="flex items-center space-x-3">
          {/* UI Theme Switcher */}
          <div className="flex items-center bg-brand-card hover:bg-brand-border/60 border border-brand-border px-2.5 py-1.5 rounded-lg transition" title="Change UI Theme">
            <Moon className="w-3.5 h-3.5 text-brand-red mr-1.5 shrink-0" />
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as any)}
              className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer pr-1"
            >
              {THEME_OPTIONS.map((t) => (
                <option key={t.id} value={t.id} className="bg-brand-card text-white">
                  {t.icon} {t.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={onOpenProjects}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-brand-card hover:bg-brand-border border border-brand-border text-xs font-medium text-slate-200 transition cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Projects</span>
          </button>

          <button
            onClick={onOpenImport}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-brand-red hover:bg-rose-600 text-xs font-semibold text-white shadow-md shadow-rose-900/30 transition active:scale-95 cursor-pointer"
          >
            <span>Scan Folder</span>
          </button>

          <button
            onClick={() => setShowExitModal(true)}
            title="Stop server & Exit Application"
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-xs font-medium text-rose-300 hover:text-rose-200 transition cursor-pointer ml-1"
          >
            <Power className="w-3.5 h-3.5 text-rose-400" />
            <span>Exit</span>
          </button>
        </div>
      </header>

      {/* Exit Confirmation Modal */}
      {showExitModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-brand-surface border border-brand-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Power className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Exit Benchmark Analyzer?</h3>
                <p className="text-xs text-slate-400">Stop the background application server</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This will cleanly shut down the local background server and release all system ports and resources. You can then safely close this browser window.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                disabled={isShuttingDown}
                className="px-4 py-2 rounded-xl bg-brand-card hover:bg-brand-border text-slate-300 text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmExit}
                disabled={isShuttingDown}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-lg shadow-rose-900/30"
              >
                <Power className="w-3.5 h-3.5" />
                <span>{isShuttingDown ? "Shutting Down..." : "Exit App"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Server Shutdown Screen */}
      {isShutdown && (
        <div className="fixed inset-0 bg-slate-950/95 z-50 flex flex-col items-center justify-center p-6 text-center backdrop-blur-md">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400 mb-4 shadow-2xl">
            <Power className="w-8 h-8 text-rose-500" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Benchmark Analyzer has shut down</h2>
          <p className="text-slate-400 text-sm max-w-md mb-6">
            The local background server has stopped cleanly and freed all system resources. You can now safely close this browser tab.
          </p>
        </div>
      )}
    </>
  );
};
