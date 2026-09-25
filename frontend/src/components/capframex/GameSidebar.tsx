import React, { useState } from "react";
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
        return <Thermometer className="w-3.5 h-3.5 text-red-400" />;
      case "power":
        return <Zap className="w-3.5 h-3.5 text-amber-400" />;
      case "battery":
        return <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <BarChart3 className="w-3.5 h-3.5 text-blue-400" />;
    }
  };

  return (
    <aside className="w-72 bg-[#09090b] border-r border-[#23232a] flex flex-col h-full select-none flex-shrink-0">
      {/* 1. Search Box */}
      <div className="p-3 border-b border-[#23232a] space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search games & charts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#121215] border border-[#23232a] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Filter Tab Chips */}
        <div className="grid grid-cols-3 gap-1 bg-[#121215] p-0.5 rounded-lg border border-[#23232a] text-[10.5px]">
          <button
            type="button"
            onClick={() => setFilterTab("all")}
            className={`py-1 rounded font-semibold transition ${
              filterTab === "all"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            All ({games.length + customCharts.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("games")}
            className={`py-1 rounded font-semibold transition ${
              filterTab === "games"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Games ({games.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("custom")}
            className={`py-1 rounded font-semibold transition ${
              filterTab === "custom"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Custom ({customCharts.length})
          </button>
        </div>
      </div>

      {/* 2. Scrollable Items Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        
        {/* SECTION A: SYSTEM & CUSTOM CHARTS */}
        {showCustom && (
          <div className="space-y-1">
            <div className="px-2 py-1 flex items-center justify-between text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
              <div className="flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
                <span>System & Custom Charts ({filteredCustomCharts.length})</span>
              </div>
              <button
                type="button"
                onClick={onAddNewCustomChart}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 hover:text-blue-300 text-[10px] font-bold transition"
                title="Add a new custom chart (temperatures, power draw, battery life, etc.)"
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
                  className={`group relative rounded-lg border text-xs transition-all flex items-center justify-between ${
                    isSelected
                      ? "bg-indigo-600/15 border-indigo-500 text-white font-semibold shadow-sm"
                      : "bg-[#121215]/60 border-transparent text-slate-300 hover:bg-[#18181b] hover:text-white"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectCustomChart(c)}
                    className="flex-1 text-left px-3 py-2 flex flex-col gap-0.5 min-w-0"
                  >
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(c.category)}
                      <span className="truncate">{c.name}</span>
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)] ml-auto" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono pl-5.5">
                      <span>{c.rows.length} {c.rows.length === 1 ? "model" : "models"}</span>
                      {c.unit && (
                        <>
                          <span>•</span>
                          <span className="text-slate-300 font-bold">{c.unit}</span>
                        </>
                      )}
                      <span>•</span>
                      <span className="text-slate-500">
                        {c.higher_is_better ? "Higher = Best" : "Lower = Best"}
                      </span>
                    </div>
                  </button>

                  {/* Edit Pencil Action */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditCustomChart(c);
                    }}
                    className="p-1.5 mr-2 rounded hover:bg-white/10 text-slate-500 hover:text-white transition"
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
                  className="text-blue-400 hover:underline font-semibold"
                >
                  + Add Temperatures, Power or Battery Chart
                </button>
              </div>
            )}
          </div>
        )}

        {/* SECTION B: GAME FPS BENCHMARKS */}
        {showGames && (
          <div className="space-y-1 pt-1 border-t border-[#18181f]">
            <div className="px-2 py-1 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Gamepad2 className="w-3.5 h-3.5 text-blue-400" />
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
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex flex-col gap-0.5 border ${
                    isSelected
                      ? "bg-blue-600/15 border-blue-500 text-white font-semibold shadow-sm"
                      : "bg-[#121215]/60 border-transparent text-slate-300 hover:bg-[#18181b] hover:text-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{g}</span>
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                    <Layers className="w-3 h-3 text-blue-400/80" />
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
