import React, { useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { APP_VERSION_LABEL } from "../../constants/version";
import { Activity, Cpu, FolderOpen, Power, RefreshCw, FolderSync } from "lucide-react";
import { api } from "../../api/client";

interface NavbarProps {
  onOpenProjects: () => void;
  onOpenImport: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenProjects, onOpenImport }) => {
  const { currentProject, projects, selectProject, refreshCurrentProject, isLoading } = useProjectStore();
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
      <header className="h-14 bg-brand-surface/90 backdrop-blur-md border-b border-brand-border px-5 flex items-center justify-between z-10 select-none font-['Geist',sans-serif]">
        {/* Brand & App Name */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-400/25 flex items-center justify-center shadow-sm">
            <Activity className="w-4 h-4 text-[#3d8bff]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-semibold text-sm text-white tracking-tight">Benchmark Analyzer</h1>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-white/[0.05] text-slate-300 border border-brand-border">
                {APP_VERSION_LABEL}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-none mt-0.5">Automated Reviewer Suite</p>
          </div>
        </div>

        {/* Center: Current Project Switcher (Clean BrewedOps Segmented Pill) */}
        <div className="flex items-center space-x-2.5 bg-white/[0.03] border border-brand-border px-3 py-1 rounded-lg shadow-sm hover:border-brand-border/80 transition-colors">
          <Cpu className="w-3.5 h-3.5 text-[#3d8bff]" />
          <span className="text-[11px] text-slate-400 font-medium">Project:</span>

          {projects.length > 0 ? (
            <select
              value={currentProject?.id || ""}
              onChange={(e) => selectProject(e.target.value)}
              className="bg-transparent text-xs font-medium text-white focus:outline-none cursor-pointer pr-1"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-brand-card text-white">
                  {p.name} {p.product_name ? `(${p.product_name})` : ""}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-xs text-slate-500 italic">No project active</span>
          )}

          {currentProject && (
            <button
              onClick={() => refreshCurrentProject()}
              title="Refresh active project"
              className="p-1 hover:bg-white/[0.08] rounded text-slate-400 hover:text-white transition cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin text-[#3d8bff]" : ""}`} />
            </button>
          )}
        </div>

        {/* Right Quick Actions */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={onOpenProjects}
            className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-brand-border text-xs font-medium text-slate-300 hover:text-white transition active:scale-95 cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
            <span>Projects</span>
          </button>

          <button
            onClick={onOpenImport}
            className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-blue-600/90 hover:bg-blue-500 text-xs font-medium text-white shadow-sm shadow-blue-500/20 transition active:scale-95 cursor-pointer"
          >
            <FolderSync className="w-3.5 h-3.5" />
            <span>Scan Folder</span>
          </button>

          <button
            onClick={() => setShowExitModal(true)}
            title="Stop server & Exit Application"
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-xs font-medium text-rose-300 hover:text-rose-200 transition cursor-pointer"
          >
            <Power className="w-3.5 h-3.5 text-rose-400" />
            <span>Exit</span>
          </button>
        </div>
      </header>

      {/* Exit Confirmation Modal */}
      {showExitModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a0e17] border border-white/[0.1] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 font-['Geist',sans-serif]">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center text-rose-400">
                <Power className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Exit Benchmark Analyzer?</h3>
                <p className="text-xs text-slate-400">Stop the background application server</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This will cleanly shut down the local background server and release all system ports and resources. You can then safely close this browser window.
            </p>

            <div className="flex items-center justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                disabled={isShuttingDown}
                className="px-3.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.09] text-slate-300 text-xs font-medium transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmExit}
                disabled={isShuttingDown}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition flex items-center space-x-1.5 shadow-sm shadow-rose-900/40 cursor-pointer"
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
        <div className="fixed inset-0 bg-[#0a0e17]/95 z-50 flex flex-col items-center justify-center p-6 text-center backdrop-blur-md font-['Geist',sans-serif]">
          <div className="w-14 h-14 rounded-2xl bg-[#111827] border border-white/[0.08] flex items-center justify-center text-slate-400 mb-4 shadow-xl">
            <Power className="w-6 h-6 text-rose-500" />
          </div>
          <h2 className="text-base font-semibold text-white mb-1.5">Benchmark Analyzer has shut down</h2>
          <p className="text-slate-400 text-xs max-w-md">
            The local background server has stopped cleanly and freed all system resources. You can now safely close this browser tab.
          </p>
        </div>
      )}
    </>
  );
};
