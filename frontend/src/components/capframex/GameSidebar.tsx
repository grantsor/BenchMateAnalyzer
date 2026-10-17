import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Gamepad2,
  Layers,
  Thermometer,
  Zap,
  BatteryCharging,
  BarChart3,
  Plus,
  Edit2
} from "lucide-react";
import { CustomChart, BenchmarkMode } from "../../types/capframex";

interface GameSidebarProps {
  games: string[];
  selectedGame: string;
  onSelectGame: (game: string) => void;
  customCharts: CustomChart[];
  selectedCustomChartId: string | null;
  onSelectCustomChart: (chart: CustomChart) => void;
  onAddNewCustomChart: () => void;
  onEditCustomChart: (chart: CustomChart) => void;
  benchmarkMode?: BenchmarkMode;
  gameResolutionsMap?: Record<string, string[]>;
}

export const GameSidebar: React.FC<GameSidebarProps> = ({
  games,
  selectedGame,
  onSelectGame,
  customCharts = [],
  selectedCustomChartId,
  onSelectCustomChart,
  onAddNewCustomChart,
  onEditCustomChart,
  benchmarkMode = "pc"
}) => {
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "games" | "custom">("all");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search when pressing "/"
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea" || target.isContentEditable) return;
      }
      if (e.key === "/") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const q = search.toLowerCase();

  const filteredGames = games.filter((g) =>
    g.toLowerCase().includes(q)
  );

  const filteredCustomCharts = customCharts.filter((c) =>
    c.name.toLowerCase().includes(q) ||
    c.title.toLowerCase().includes(q) ||
    (c.unit && c.unit.toLowerCase().includes(q))
  );

  const showGames = filterTab === "all" || filterTab === "games";
  const showCustom = filterTab === "all" || filterTab === "custom";

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "temperatures":
        return <Thermometer className="w-3.5 h-3.5 text-rose-400" />;
      case "power":
        return <Zap className="w-3.5 h-3.5 text-amber-400" />;
      case "battery":
        return <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <BarChart3 className="w-3.5 h-3.5 text-[#3d8bff]" />;
    }
  };

  return (
    <aside className="w-72 bg-[#0a0e17] border-r border-white/[0.08] flex flex-col h-full select-none flex-shrink-0 font-['Geist',sans-serif]">
      {/* 1. BrewedOps Search with <kbd>/</kbd> Cap */}
      <div className="p-3 border-b border-white/[0.06] space-y-2">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search games & telemetry..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-8 py-1.5 bg-white/[0.03] border border-white/[0.08] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#3d8bff]/60 focus:bg-white/[0.05] transition-colors"
          />
          <kbd className="absolute right-2.5 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-white/[0.06] border border-white/[0.08] pointer-events-none">
            /
          </kbd>
        </div>

        {/* BrewedOps Segmented Filter Tab Chips */}
        <div className="grid grid-cols-3 gap-1 bg-white/[0.02] p-0.5 rounded-lg border border-white/[0.06] text-[10.5px]">
          <button
            type="button"
            onClick={() => setFilterTab("all")}
            className={`py-1 rounded-md font-medium transition cursor-pointer ${
              filterTab === "all"
                ? "bg-blue-600/90 text-white shadow-sm shadow-blue-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            All ({games.length + customCharts.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("games")}
            className={`py-1 rounded-md font-medium transition cursor-pointer ${
              filterTab === "games"
                ? "bg-blue-600/90 text-white shadow-sm shadow-blue-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Games ({games.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("custom")}
            className={`py-1 rounded-md font-medium transition cursor-pointer ${
              filterTab === "custom"
                ? "bg-blue-600/90 text-white shadow-sm shadow-blue-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Custom ({customCharts.length})
          </button>
        </div>
      </div>

      {/* 2. Scrollable Telemetry Titles Area */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-3">
        {/* SECTION A: SYSTEM & CUSTOM CHARTS */}
        {showCustom && (
          <div className="space-y-1">
            <div className="px-2 py-1 flex items-center justify-between text-[10px] font-semibold text-slate-500 uppercase tracking-[0.08em]">
              <div className="flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
                <span>Custom Charts ({filteredCustomCharts.length})</span>
              </div>
              <button
                type="button"
                onClick={onAddNewCustomChart}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-500/15 hover:bg-blue-500/25 text-[#3d8bff] text-[10px] font-medium transition cursor-pointer border border-blue-400/20"
                title="Add a new custom chart"
              >
                <Plus className="w-3 h-3" />
                <span>New</span>
              </button>
            </div>

            {filteredCustomCharts.map((c) => {
              const isSelected = selectedCustomChartId === c.id;
              return (
                <div
                  key={c.id}
                  className={`group relative rounded-xl border text-xs transition-all flex items-center justify-between ${
                    isSelected
                      ? "bg-blue-500/12 border-blue-400/30 text-white font-medium shadow-sm"
                      : "bg-white/[0.02] border-white/[0.04] text-slate-300 hover:bg-white/[0.04] hover:text-white hover:border-white/[0.08]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectCustomChart(c)}
                    className="flex-1 text-left px-3 py-2 flex flex-col gap-0.5 min-w-0 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(c.category)}
                      <span className="truncate">{c.name}</span>
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#3d8bff] shadow-[0_0_8px_rgba(61,139,255,0.8)] ml-auto" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono pl-5.5">
                      <span>{c.rows.length} {c.rows.length === 1 ? "entry" : "entries"}</span>
                      {c.unit && (
                        <>
                          <span>•</span>
                          <span className="text-slate-300 font-semibold">{c.unit}</span>
                        </>
                      )}
                      <span>•</span>
                      <span className="text-slate-500">
                        {c.higher_is_better ? "Higher = Best" : "Lower = Best"}
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditCustomChart(c);
                    }}
                    className="p-1.5 mr-2 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition cursor-pointer"
                    title={`Edit ${c.name} data & values`}
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}

            {filteredCustomCharts.length === 0 && filterTab === "custom" && (
              <div className="text-center py-6 text-xs text-slate-500 space-y-1">
                <p>No custom charts created yet.</p>
                <button
                  type="button"
                  onClick={onAddNewCustomChart}
                  className="text-[#3d8bff] hover:underline font-medium cursor-pointer"
                >
                  + Add Temperatures, Power or Battery Chart
                </button>
              </div>
            )}
          </div>
        )}

        {/* SECTION B: GAME FPS BENCHMARKS */}
        {showGames && (
          <div className="space-y-1 pt-1 border-t border-white/[0.06]">
            <div className="px-2 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-[0.08em] flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Gamepad2 className="w-3.5 h-3.5 text-[#3d8bff]" />
                <span>Game FPS Titles ({filteredGames.length})</span>
              </div>
            </div>

            {filteredGames.map((g) => {
              const isSelected = selectedGame === g && !selectedCustomChartId;
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => onSelectGame(g)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex flex-col gap-0.5 border cursor-pointer ${
                    isSelected
                      ? "bg-blue-500/12 border-blue-400/30 text-white font-medium shadow-sm"
                      : "bg-white/[0.02] border-white/[0.04] text-slate-300 hover:bg-white/[0.04] hover:text-white hover:border-white/[0.08]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{g}</span>
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3d8bff] shadow-[0_0_8px_rgba(61,139,255,0.8)]" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                    <Layers className="w-3 h-3 text-[#3d8bff]/80" />
                    <span>
                      {benchmarkMode === "laptop" ? "Power Profiles" : "1080p • 1440p • 4K"}
                    </span>
                  </div>
                </button>
              );
            })}

            {filteredGames.length === 0 && filterTab === "games" && (
              <div className="text-center py-6 text-xs text-slate-500">
                No games match "{search}"
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
