import React, { useState, useEffect, useRef } from "react";
import { RefreshCw, Folder, FolderOpen, Sun, Moon, Cpu, Layers, Table, Laptop, Files, Gamepad2, Palette } from "lucide-react";
import { BenchmarkMode } from "../../types/capframex";
import { UITheme } from "../../stores/themeStore";

interface HeaderProps {
  folder: string;
  runsCount: number;
  gamesCount: number;
  isScanning: boolean;
  onScan: (folderPath?: string) => void;
  onBrowse: (folderPath?: string) => void;
  onSelectFiles: (files: FileList | File[]) => void;
  uiTheme: UITheme;
  onToggleUiTheme: () => void;
  onOpenRunsModal: () => void;
  onOpenGpuHierarchyModal?: () => void;
  gpuHierarchyCount?: number;
  onOpenGameProfilesModal?: () => void;
  gameProfilesCount?: number;
  benchmarkMode?: BenchmarkMode;
  onToggleBenchmarkMode?: (mode: BenchmarkMode) => void;
}

export const Header: React.FC<HeaderProps> = ({
  folder,
  runsCount,
  gamesCount,
  isScanning,
  onScan,
  onBrowse,
  onSelectFiles,
  uiTheme,
  onToggleUiTheme,
  onOpenRunsModal,
  onOpenGpuHierarchyModal,
  gpuHierarchyCount,
  onOpenGameProfilesModal,
  gameProfilesCount,
  benchmarkMode = "pc",
  onToggleBenchmarkMode
}) => {
  const [inputFolder, setInputFolder] = useState(folder);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputFolder(folder);
  }, [folder]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onScan(inputFolder);
    }
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesSnapshot = Array.from(e.target.files);
      e.target.value = "";
      onSelectFiles(filesSnapshot);
    }
  };

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesSnapshot = Array.from(e.target.files);
      e.target.value = "";
      onSelectFiles(filesSnapshot);
    }
  };

  return (
    <header className="bg-[#121215] border-b border-[#23232a] px-6 py-3 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Hidden browser file/folder pickers for instant, foolproof native selection */}
      <input
        type="file"
        ref={folderInputRef}
        // @ts-expect-error webkitdirectory is standard in Chromium/Firefox/Safari
        webkitdirectory=""
        directory=""
        multiple
        className="hidden"
        onChange={handleFolderChange}
      />
      <input
        type="file"
        ref={filesInputRef}
        multiple
        accept=".json"
        className="hidden"
        onChange={handleFilesChange}
      />

      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#161820] border border-[#2b2e3e] flex items-center justify-center p-1.5 shadow-sm shadow-black/40">
          <img
            src="/capframex-icon.png"
            alt="CapFrameX Logo"
            className="w-full h-full object-contain filter drop-shadow(0 1px 2px rgba(0,0,0,0.6))"
          />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-white tracking-wide">
              CapFrameX Analyzer
            </h1>
            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border transition-colors ${
              benchmarkMode === "laptop"
                ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                : "bg-blue-500/20 text-blue-400 border-blue-500/30"
            }`}>
              {benchmarkMode === "laptop" ? "Laptop Profiles" : "Tri-Res v1.1"}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            {benchmarkMode === "laptop"
              ? "Laptop Power Profile Benchmarks & Chart Generator"
              : "Automated Game FPS Benchmarking & Chart Generator"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Mode Switcher Toggle */}
        {onToggleBenchmarkMode && (
          <div className="flex items-center bg-[#18181b] border border-[#23232a] rounded-lg p-0.5 mr-1">
            <button
              type="button"
              onClick={() => onToggleBenchmarkMode("pc")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                benchmarkMode === "pc"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="PC Components Mode (Desktop GPUs & CPUs)"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>PC Components</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleBenchmarkMode("laptop")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                benchmarkMode === "laptop"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Laptop Mode (Laptop Name - Power Profile)"
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>Laptop (Profiles)</span>
            </button>
          </div>
        )}

        {/* Folder Input + Browse Button Group */}
        <div className="flex items-center bg-[#18181b] border border-[#23232a] rounded-lg overflow-hidden focus-within:border-blue-500">
          <div className="pl-3 pr-2 text-blue-400 flex items-center">
            <Folder className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={inputFolder}
            onChange={(e) => setInputFolder(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Path to CapFrameX JSON files..."
            className="bg-transparent text-xs text-slate-200 font-mono py-1.5 w-64 focus:outline-none placeholder-slate-500"
            title={inputFolder}
          />
          {/* Instant folder selection */}
          <button
            type="button"
            onClick={() => folderInputRef.current?.click()}
            disabled={isScanning}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#23232a] hover:bg-[#2c2c35] text-slate-300 text-xs font-semibold border-l border-[#23232a] transition-colors disabled:opacity-60"
            title="Select benchmark folder directly via native OS popup"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>Browse...</span>
          </button>
          {/* Direct files selection option */}
          <button
            type="button"
            onClick={() => filesInputRef.current?.click()}
            disabled={isScanning}
            className="flex items-center gap-1 px-2 py-1.5 bg-[#23232a] hover:bg-[#2c2c35] text-slate-400 hover:text-slate-200 text-xs font-semibold border-l border-[#202028] transition-colors disabled:opacity-60"
            title="Select specific CapFrameX JSON files directly"
          >
            <Files className="w-3.5 h-3.5 text-emerald-400" />
            <span>Files</span>
          </button>
        </div>

        {/* Scan local path */}
        <button
          onClick={() => onScan(inputFolder)}
          disabled={isScanning}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow transition-colors disabled:opacity-50"
          title="Rescan CapFrameX JSON files from entered path"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? "animate-spin" : ""}`} />
          <span>{isScanning ? "Scanning..." : "Scan"}</span>
        </button>

        <button
          type="button"
          onClick={onOpenRunsModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18181b] hover:bg-[#23232a] border border-[#23232a] text-xs text-slate-300 font-medium transition-colors"
          title="Open CapFrameX JSON Table & Metadata Editor"
        >
          <Table className="w-3.5 h-3.5 text-blue-400" />
          <span>CX Table & Editor</span>
          <span className="px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-mono font-bold">
            {runsCount}
          </span>
        </button>

        {onOpenGpuHierarchyModal && (
          <button
            type="button"
            onClick={onOpenGpuHierarchyModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18181b] hover:bg-[#23232a] border border-[#23232a] text-xs text-slate-300 font-medium transition-colors"
            title="Configure GPU Model Hierarchy Priority & Rankings"
          >
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>GPU Hierarchy</span>
            {gpuHierarchyCount !== undefined && (
              <span className="px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-mono font-bold">
                {gpuHierarchyCount}
              </span>
            )}
          </button>
        )}

        {onOpenGameProfilesModal && (
          <button
            type="button"
            onClick={onOpenGameProfilesModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18181b] hover:bg-[#23232a] border border-[#23232a] text-xs text-slate-300 font-medium transition-colors"
            title="Configure Game Chart Titles, Presets & Notes (Editable with Notepad)"
          >
            <Gamepad2 className="w-3.5 h-3.5 text-purple-400" />
            <span>Game Profiles</span>
            {gameProfilesCount !== undefined && gameProfilesCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-mono font-bold">
                {gameProfilesCount}
              </span>
            )}
          </button>
        )}

        {/* Multi-Theme UI Toggle */}
        <button
          type="button"
          onClick={onToggleUiTheme}
          className="p-2 rounded-lg bg-[#18181b] hover:bg-[#23232a] border border-[#23232a] text-slate-300 transition-colors"
          title={`Active Theme: ${uiTheme}. Click to cycle themes (Dark, Light, OLED, Midnight).`}
        >
          {uiTheme === "light" ? (
            <Sun className="w-4 h-4 text-amber-500" />
          ) : uiTheme === "oled" ? (
            <Moon className="w-4 h-4 text-zinc-400" />
          ) : uiTheme === "midnight" ? (
            <Moon className="w-4 h-4 text-sky-400" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-400" />
          )}
        </button>
      </div>
    </header>
  );
};
