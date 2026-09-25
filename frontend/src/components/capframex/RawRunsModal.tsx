import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  RefreshCw,
  FileText,
  Check,
  Search,
  CheckSquare,
  Square,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Layers,
  Save,
  Filter,
  AlertCircle
} from "lucide-react";
import { api } from "../../api/capframexClient";

interface RawRunsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedGame: string;
  onRunsUpdated?: () => void;
  benchmarkMode?: "pc" | "laptop";
}

type SortField =
  | "game_name"
  | "raw_comment"
  | "creation_date"
  | "cpu"
  | "gpu"
  | "motherboard"
  | "system_ram"
  | "laptop_name"
  | "power_profile"
  | "avg_fps"
  | "p1_fps";
type SortDirection = "asc" | "desc";

// Standalone instant-editable cell component
interface EditableCellProps {
  initialValue: string;
  onSave: (newValue: string) => Promise<void>;
  className?: string;
  placeholder?: string;
}

const EditableCell: React.FC<EditableCellProps> = ({
  initialValue,
  onSave,
  className = "",
  placeholder = "-"
}) => {
  const [val, setVal] = useState(initialValue || "");
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    setVal(initialValue || "");
  }, [initialValue]);

  const handleBlur = async () => {
    setIsFocused(false);
    const trimmed = val.trim();
    const origTrimmed = (initialValue || "").trim();
    if (trimmed !== origTrimmed) {
      await onSave(trimmed);
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      setVal(initialValue || "");
      e.currentTarget.blur();
    }
  };

  return (
    <input
      type="text"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onFocus={() => setIsFocused(true)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={`w-full bg-transparent px-2 py-1 rounded transition-colors text-xs font-sans truncate ${
        isFocused
          ? "bg-[#181a24] border border-blue-500 text-white outline-none ring-1 ring-blue-500/40 shadow-sm"
          : "border border-transparent hover:border-[#2d303e] hover:bg-[#161822] cursor-text"
      } ${className}`}
      title={val || placeholder}
    />
  );
};

export const RawRunsModal: React.FC<RawRunsModalProps> = ({
  isOpen,
  onClose,
  selectedGame,
  onRunsUpdated,
  benchmarkMode
}) => {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGame, setFilterGame] = useState<string>("ALL");

  // Selection for batch editing
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());

  // Per-run sync status: "saving" | "saved" | "error"
  const [savingRunMap, setSavingRunMap] = useState<Record<string, "saving" | "saved" | "error">>({});

  // Batch editing modal state
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchFields, setBatchFields] = useState({
    updateComment: false,
    comment: "",
    updateCpu: false,
    cpu: "",
    updateGpu: false,
    gpu: "",
    updateMotherboard: false,
    motherboard: "",
    updateRam: false,
    ram: ""
  });
  const [isBatchSaving, setIsBatchSaving] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<SortField>("creation_date");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  // Global toast status message
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchRuns = async () => {
    setLoading(true);
    try {
      const data = await api.getRuns(undefined, benchmarkMode);
      setRuns(data.runs || []);
    } catch (e) {
      console.error("Failed to fetch runs:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRuns();
    } else {
      setSelectedPaths(new Set());
      setStatusMessage(null);
    }
  }, [isOpen, benchmarkMode]);

  // Distinct games for the filter dropdown
  const distinctGames = useMemo(() => {
    const set = new Set<string>();
    runs.forEach((r) => {
      if (r.game_name) set.add(r.game_name);
    });
    return Array.from(set).sort();
  }, [runs]);

  // Initialize or safely reset filterGame when modal opens or runs change
  useEffect(() => {
    if (isOpen) {
      if (selectedGame && runs.some((r) => r.game_name?.toLowerCase() === selectedGame.toLowerCase())) {
        setFilterGame(selectedGame);
      } else if (filterGame !== "ALL" && distinctGames.length > 0 && !distinctGames.includes(filterGame)) {
        setFilterGame("ALL");
      }
    }
  }, [isOpen, selectedGame, runs, distinctGames]);

  // Keyboard shortcut: close on Escape
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isBatchModalOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isOpen, isBatchModalOpen, onClose]);

  // Filtering and searching
  const filteredRuns = useMemo(() => {
    let list = [...runs];

    if (filterGame && filterGame !== "ALL") {
      list = list.filter((r) => r.game_name?.toLowerCase() === filterGame.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.game_name?.toLowerCase().includes(q) ||
          r.raw_comment?.toLowerCase().includes(q) ||
          r.gpu?.toLowerCase().includes(q) ||
          r.raw_gpu?.toLowerCase().includes(q) ||
          r.cpu?.toLowerCase().includes(q) ||
          r.raw_cpu?.toLowerCase().includes(q) ||
          r.motherboard?.toLowerCase().includes(q) ||
          r.system_ram?.toLowerCase().includes(q) ||
          r.laptop_name?.toLowerCase().includes(q) ||
          r.power_profile?.toLowerCase().includes(q) ||
          r.file_name?.toLowerCase().includes(q)
      );
    }

    // Sorting
    list.sort((a, b) => {
      let valA: any = "";
      let valB: any = "";

      switch (sortField) {
        case "game_name":
          valA = a.game_name || "";
          valB = b.game_name || "";
          break;
        case "raw_comment":
          valA = a.raw_comment || "";
          valB = b.raw_comment || "";
          break;
        case "creation_date":
          valA = a.creation_date || "";
          valB = b.creation_date || "";
          break;
        case "cpu":
          valA = a.raw_cpu || a.cpu || "";
          valB = b.raw_cpu || b.cpu || "";
          break;
        case "gpu":
          valA = a.raw_gpu || a.gpu || "";
          valB = b.raw_gpu || b.gpu || "";
          break;
        case "motherboard":
          valA = a.motherboard || "";
          valB = b.motherboard || "";
          break;
        case "system_ram":
          valA = a.system_ram || "";
          valB = b.system_ram || "";
          break;
        case "laptop_name":
          valA = a.laptop_name || "";
          valB = b.laptop_name || "";
          break;
        case "power_profile":
          valA = a.power_profile || "";
          valB = b.power_profile || "";
          break;
        case "avg_fps":
          valA = a.metrics?.average_fps || 0;
          valB = b.metrics?.average_fps || 0;
          break;
        case "p1_fps":
          valA = a.metrics?.p1_fps || 0;
          valB = b.metrics?.p1_fps || 0;
          break;
      }

      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [runs, filterGame, searchQuery, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  // Selection handlers
  const handleToggleSelect = (filePath: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(filePath)) {
        next.delete(filePath);
      } else {
        next.add(filePath);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedPaths.size === filteredRuns.length && filteredRuns.length > 0) {
      setSelectedPaths(new Set());
    } else {
      setSelectedPaths(new Set(filteredRuns.map((r) => r.file_path)));
    }
  };

  // Direct cell save handler
  const handleSaveField = async (
    run: any,
    field: "comment" | "cpu" | "gpu" | "motherboard" | "ram",
    newVal: string
  ) => {
    setSavingRunMap((prev) => ({ ...prev, [run.file_path]: "saving" }));
    try {
      const payload = {
        file_path: run.file_path,
        comment: field === "comment" ? newVal : run.raw_comment || run.resolution || "",
        cpu: field === "cpu" ? newVal : run.raw_cpu || run.cpu || "",
        gpu: field === "gpu" ? newVal : run.raw_gpu || run.gpu || "",
        motherboard: field === "motherboard" ? newVal : run.motherboard || "",
        ram: field === "ram" ? newVal : run.system_ram || ""
      };

      const res = await api.updateRun(payload);
      if (res.status === "success") {
        setRuns((prev) =>
          prev.map((item) => (item.file_path === run.file_path ? res.run : item))
        );
        setSavingRunMap((prev) => ({ ...prev, [run.file_path]: "saved" }));
        setTimeout(() => {
          setSavingRunMap((prev) => {
            const next = { ...prev };
            delete next[run.file_path];
            return next;
          });
        }, 2200);
        showToast("Changes saved to disk!");
        onRunsUpdated?.();
      }
    } catch (err) {
      console.error("Failed to update run:", err);
      setSavingRunMap((prev) => ({ ...prev, [run.file_path]: "error" }));
      alert("Failed to save changes. Please ensure the JSON file is not locked by another process.");
    }
  };

  // Batch edit submission
  const handleSaveBatch = async () => {
    if (selectedPaths.size === 0) return;
    setIsBatchSaving(true);
    try {
      const payload: any = {
        file_paths: Array.from(selectedPaths)
      };
      if (batchFields.updateComment) payload.comment = batchFields.comment;
      if (batchFields.updateCpu) payload.cpu = batchFields.cpu;
      if (batchFields.updateGpu) payload.gpu = batchFields.gpu;
      if (batchFields.updateMotherboard) payload.motherboard = batchFields.motherboard;
      if (batchFields.updateRam) payload.ram = batchFields.ram;

      const res = await api.batchUpdateRuns(payload);
      if (res.status === "success") {
        await fetchRuns();
        setIsBatchModalOpen(false);
        showToast(`Successfully updated ${res.updated_count} capture files on disk!`);
        onRunsUpdated?.();
      }
    } catch (e) {
      console.error("Failed to batch update runs:", e);
      alert("Failed to execute batch update. Please verify file permissions.");
    } finally {
      setIsBatchSaving(false);
    }
  };

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => {
      setStatusMessage(null);
    }, 3500);
  };

  const formatDateTime = (raw?: string) => {
    if (!raw) return "-";
    return raw.replace("T", " ").replace(/\.\d+Z?$/, "").replace("Z", "");
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#111216] border border-[#262832] rounded-xl w-full max-w-[96vw] h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* CapFrameX Style Header (Removed dummy CAPTURE, ANALYSIS, AGGREGATION tabs) */}
        <div className="bg-[#0b0c0f] border-b border-[#20222a] px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* CX Logo */}
            <div className="w-7 h-7 rounded bg-[#161820] border border-[#2b2e3e] flex items-center justify-center p-1 shadow-sm">
              <img
                src="/capframex-icon.png"
                alt="CapFrameX"
                className="w-full h-full object-contain filter drop-shadow(0 1px 2px rgba(0,0,0,0.5))"
              />
            </div>
            <span className="text-sm font-bold text-white tracking-wide">
              CapFrameX
            </span>
            <span className="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              INFO / RECORDS
            </span>
          </div>

          <div className="flex items-center gap-3">
            {statusMessage && (
              <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
                <Check className="w-3.5 h-3.5" />
                {statusMessage}
              </span>
            )}

            <button
              onClick={fetchRuns}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a1b22] transition-colors"
              title="Reload files from disk"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a1b22] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-Header Controls: Filter, Search, Batch Actions */}
        <div className="px-5 py-2.5 border-b border-[#20222a] bg-[#14161c] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Game Filter Dropdown */}
            <div className="flex items-center bg-[#1b1d24] border border-[#2a2c36] rounded-lg px-2.5 py-1.5 text-xs text-slate-300">
              <Filter className="w-3.5 h-3.5 text-blue-400 mr-2" />
              <select
                value={filterGame}
                onChange={(e) => setFilterGame(e.target.value)}
                className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer pr-1"
              >
                <option value="ALL" className="bg-[#1b1d24] text-slate-200">
                  All Games ({runs.length} runs)
                </option>
                {distinctGames.map((g) => (
                  <option key={g} value={g} className="bg-[#1b1d24] text-slate-200">
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input (CX Style) */}
            <div className="flex items-center bg-[#1b1d24] border border-[#2a2c36] rounded-lg px-3 py-1.5 w-72 focus-within:border-blue-500 transition-colors">
              <Search className="w-3.5 h-3.5 text-slate-400 mr-2 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search game, comment, CPU, GPU, RAM, profile..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none w-full"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-slate-500 hover:text-slate-300 ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <span className="text-xs text-slate-400 font-mono">
              Showing <span className="text-white font-bold">{filteredRuns.length}</span> of{" "}
              <span className="text-slate-300">{runs.length}</span> JSON records
            </span>
          </div>

          {/* Batch Edit Action Bar */}
          <div className="flex items-center gap-2.5">
            {selectedPaths.size > 0 && (
              <div className="flex items-center gap-2 bg-blue-600/10 border border-blue-500/30 rounded-lg px-3 py-1">
                <span className="text-xs font-semibold text-blue-400">
                  {selectedPaths.size} selected
                </span>
                <button
                  onClick={() => setIsBatchModalOpen(true)}
                  className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white font-semibold px-2.5 py-1 rounded shadow transition-colors"
                >
                  <Layers className="w-3.5 h-3.5" />
                  Batch Edit Selected
                </button>
                <button
                  onClick={() => setSelectedPaths(new Set())}
                  className="text-xs text-slate-400 hover:text-slate-200 px-1"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto bg-[#101115]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-500 mb-2" />
              Loading CapFrameX JSON files...
            </div>
          ) : filteredRuns.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 text-xs space-y-3">
              <FileText className="w-8 h-8 opacity-40 text-slate-500" />
              <p className="text-slate-300">
                {filterGame !== "ALL"
                  ? `No capture records matched filter "${filterGame}".`
                  : searchQuery
                  ? `No capture records matched search query "${searchQuery}".`
                  : "No CapFrameX capture files found in current session."}
              </p>
              {(filterGame !== "ALL" || searchQuery) && runs.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterGame("ALL");
                    setSearchQuery("");
                  }}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow transition-colors"
                >
                  Show All {runs.length} Records
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="border-b border-[#23252f] text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-[#14161d] sticky top-0 z-10 select-none">
                  {/* Select All Checkbox */}
                  <th className="p-2.5 w-10 text-center">
                    <button
                      onClick={handleSelectAll}
                      className="text-slate-400 hover:text-white"
                      title="Select / Deselect all"
                    >
                      {selectedPaths.size === filteredRuns.length && filteredRuns.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-blue-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500" />
                      )}
                    </button>
                  </th>

                  {/* Game Title */}
                  <th
                    className="p-2.5 cursor-pointer hover:text-white transition-colors w-44"
                    onClick={() => handleSort("game_name")}
                  >
                    <div className="flex items-center gap-1 font-sans">
                      <span>Game</span>
                      {sortField === "game_name" ? (
                        sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30" />
                      )}
                    </div>
                  </th>

                  {/* Comment (Editable directly on click) */}
                  <th
                    className="p-2.5 cursor-pointer hover:text-white transition-colors w-28"
                    onClick={() => handleSort("raw_comment")}
                  >
                    <div className="flex items-center gap-1 font-sans">
                      <span>Comment</span>
                      {sortField === "raw_comment" ? (
                        sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30" />
                      )}
                    </div>
                  </th>

                  {/* Date / Time */}
                  <th
                    className="p-2.5 cursor-pointer hover:text-white transition-colors w-36"
                    onClick={() => handleSort("creation_date")}
                  >
                    <div className="flex items-center gap-1 font-sans">
                      <span>Date / Time</span>
                      {sortField === "creation_date" ? (
                        sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30" />
                      )}
                    </div>
                  </th>

                  {/* CPU (Editable directly on click) */}
                  <th
                    className="p-2.5 cursor-pointer hover:text-white transition-colors min-w-[180px] w-52"
                    onClick={() => handleSort("cpu")}
                  >
                    <div className="flex items-center gap-1 font-sans">
                      <span>CPU</span>
                      {sortField === "cpu" ? (
                        sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30" />
                      )}
                    </div>
                  </th>

                  {/* GPU (Editable directly on click) */}
                  <th
                    className="p-2.5 cursor-pointer hover:text-white transition-colors min-w-[220px] w-64"
                    onClick={() => handleSort("gpu")}
                  >
                    <div className="flex items-center gap-1 font-sans">
                      <span>GPU</span>
                      {sortField === "gpu" ? (
                        sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30" />
                      )}
                    </div>
                  </th>

                  {benchmarkMode === "laptop" ? (
                    <>
                      {/* Laptop Model */}
                      <th
                        className="p-2.5 cursor-pointer hover:text-white transition-colors min-w-[160px] w-48"
                        onClick={() => handleSort("laptop_name")}
                      >
                        <div className="flex items-center gap-1 font-sans">
                          <span>Laptop Model</span>
                          {sortField === "laptop_name" ? (
                            sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-30" />
                          )}
                        </div>
                      </th>

                      {/* Power Profile */}
                      <th
                        className="p-2.5 cursor-pointer hover:text-white transition-colors min-w-[120px] w-36"
                        onClick={() => handleSort("power_profile")}
                      >
                        <div className="flex items-center gap-1 font-sans">
                          <span>Power Profile</span>
                          {sortField === "power_profile" ? (
                            sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-30" />
                          )}
                        </div>
                      </th>
                    </>
                  ) : (
                    <>
                      {/* Motherboard (Editable directly on click) */}
                      <th
                        className="p-2.5 cursor-pointer hover:text-white transition-colors min-w-[200px] w-56"
                        onClick={() => handleSort("motherboard")}
                      >
                        <div className="flex items-center gap-1 font-sans">
                          <span>Motherboard</span>
                          {sortField === "motherboard" ? (
                            sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-30" />
                          )}
                        </div>
                      </th>

                      {/* RAM (Editable directly on click) */}
                      <th
                        className="p-2.5 cursor-pointer hover:text-white transition-colors min-w-[160px] w-48"
                        onClick={() => handleSort("system_ram")}
                      >
                        <div className="flex items-center gap-1 font-sans">
                          <span>RAM</span>
                          {sortField === "system_ram" ? (
                            sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-30" />
                          )}
                        </div>
                      </th>
                    </>
                  )}

                  {/* Avg FPS */}
                  <th
                    className="p-2.5 text-right cursor-pointer hover:text-white transition-colors w-20"
                    onClick={() => handleSort("avg_fps")}
                  >
                    <div className="flex items-center justify-end gap-1 font-sans">
                      <span>Avg FPS</span>
                      {sortField === "avg_fps" ? (
                        sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30" />
                      )}
                    </div>
                  </th>

                  {/* 1% Low */}
                  <th
                    className="p-2.5 text-right cursor-pointer hover:text-white transition-colors w-20"
                    onClick={() => handleSort("p1_fps")}
                  >
                    <div className="flex items-center justify-end gap-1 font-sans">
                      <span>1% Low</span>
                      {sortField === "p1_fps" ? (
                        sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30" />
                      )}
                    </div>
                  </th>

                  {/* Status */}
                  <th className="p-2.5 text-center font-sans w-16">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#1d1f28]">
                {filteredRuns.map((r) => {
                  const isSelected = selectedPaths.has(r.file_path);
                  const syncStatus = savingRunMap[r.file_path];

                  return (
                    <tr
                      key={r.file_path}
                      className={`hover:bg-[#15171f] transition-colors text-[11px] ${
                        isSelected ? "bg-blue-950/20" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-2 text-center">
                        <button
                          onClick={() => handleToggleSelect(r.file_path)}
                          className="text-slate-400 hover:text-white"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-slate-600" />
                          )}
                        </button>
                      </td>

                      {/* Game */}
                      <td className="p-2 font-sans font-medium text-slate-200 truncate max-w-[170px]" title={r.game_name}>
                        {r.game_name}
                      </td>

                      {/* Comment (Click to edit directly) */}
                      <td className="p-1">
                        <EditableCell
                          initialValue={r.raw_comment || r.resolution || ""}
                          placeholder="e.g. 1080p"
                          className="text-blue-400 font-bold font-mono text-[11px]"
                          onSave={(val) => handleSaveField(r, "comment", val)}
                        />
                      </td>

                      {/* Date / Time */}
                      <td className="p-2 text-slate-400 whitespace-nowrap text-[10px]">
                        {formatDateTime(r.creation_date)}
                      </td>

                      {/* CPU (Click to edit directly) */}
                      <td className="p-1">
                        <EditableCell
                          initialValue={r.raw_cpu || r.cpu || ""}
                          placeholder="CPU Processor"
                          className="text-slate-300 font-sans"
                          onSave={(val) => handleSaveField(r, "cpu", val)}
                        />
                      </td>

                      {/* GPU (Click to edit directly) */}
                      <td className="p-1">
                        <EditableCell
                          initialValue={r.raw_gpu || r.gpu || ""}
                          placeholder="GPU Model"
                          className="text-emerald-300 font-sans font-medium"
                          onSave={(val) => handleSaveField(r, "gpu", val)}
                        />
                      </td>

                      {benchmarkMode === "laptop" ? (
                        <>
                          <td className="p-2 font-sans text-slate-300 truncate max-w-[160px]" title={r.laptop_name}>
                            {r.laptop_name || "-"}
                          </td>
                          <td className="p-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                              {r.power_profile || "Default"}
                            </span>
                          </td>
                        </>
                      ) : (
                        <>
                          {/* Motherboard (Click to edit directly) */}
                          <td className="p-1">
                            <EditableCell
                              initialValue={r.motherboard || ""}
                              placeholder="Motherboard"
                              className="text-slate-400 font-sans"
                              onSave={(val) => handleSaveField(r, "motherboard", val)}
                            />
                          </td>

                          {/* RAM (Click to edit directly) */}
                          <td className="p-1">
                            <EditableCell
                              initialValue={r.system_ram || ""}
                              placeholder="System RAM"
                              className="text-slate-400 font-sans"
                              onSave={(val) => handleSaveField(r, "ram", val)}
                            />
                          </td>
                        </>
                      )}

                      {/* Avg FPS */}
                      <td className="p-2 text-right font-bold text-blue-400">
                        {typeof r.metrics?.average_fps === "number"
                          ? r.metrics.average_fps.toFixed(1)
                          : r.metrics?.average_fps || "-"}
                      </td>

                      {/* 1% Low */}
                      <td className="p-2 text-right text-indigo-300">
                        {typeof r.metrics?.p1_fps === "number"
                          ? r.metrics.p1_fps.toFixed(1)
                          : r.metrics?.p1_fps || "-"}
                      </td>

                      {/* Status Icon */}
                      <td className="p-2 text-center">
                        {syncStatus === "saving" ? (
                          <span title="Saving to JSON file...">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400 mx-auto" />
                          </span>
                        ) : syncStatus === "saved" ? (
                          <span title="Saved to disk">
                            <Check className="w-3.5 h-3.5 text-emerald-400 mx-auto" />
                          </span>
                        ) : syncStatus === "error" ? (
                          <span title="Error saving to disk">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-400 mx-auto" />
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-600 select-none">•</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-5 py-2.5 bg-[#0e0f14] border-t border-[#20222a] flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            <span>Click any text (Comment, CPU, GPU, Motherboard, RAM) to edit directly. Auto-saves to JSON on Enter or clicking away.</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Encoding: UTF-8 BOM • Synced directly to JSON files</span>
          </div>
        </div>
      </div>

      {/* Batch Edit Modal */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#181a22] border border-[#2b2e3c] rounded-xl w-full max-w-lg shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#2b2e3c] pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-400" />
                  Batch Edit {selectedPaths.size} Selected Runs
                </h3>
                <p className="text-xs text-slate-400">
                  Select which fields to update across all checked JSON files.
                </p>
              </div>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Comment field */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="batchComment"
                  checked={batchFields.updateComment}
                  onChange={(e) =>
                    setBatchFields((p) => ({ ...p, updateComment: e.target.checked }))
                  }
                  className="rounded bg-[#232530] border-slate-600 text-blue-600"
                />
                <label htmlFor="batchComment" className="w-28 text-slate-300 font-semibold cursor-pointer">
                  Comment:
                </label>
                <input
                  type="text"
                  disabled={!batchFields.updateComment}
                  value={batchFields.comment}
                  onChange={(e) => setBatchFields((p) => ({ ...p, comment: e.target.value }))}
                  placeholder="e.g. 1080p, 1440p, 4k"
                  className="flex-1 bg-[#12131a] border border-[#2b2e3c] rounded px-2.5 py-1.5 text-white disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* CPU field */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="batchCpu"
                  checked={batchFields.updateCpu}
                  onChange={(e) =>
                    setBatchFields((p) => ({ ...p, updateCpu: e.target.checked }))
                  }
                  className="rounded bg-[#232530] border-slate-600 text-blue-600"
                />
                <label htmlFor="batchCpu" className="w-28 text-slate-300 font-semibold cursor-pointer">
                  CPU (Processor):
                </label>
                <input
                  type="text"
                  disabled={!batchFields.updateCpu}
                  value={batchFields.cpu}
                  onChange={(e) => setBatchFields((p) => ({ ...p, cpu: e.target.value }))}
                  placeholder="e.g. AMD Ryzen 7 9800X3D"
                  className="flex-1 bg-[#12131a] border border-[#2b2e3c] rounded px-2.5 py-1.5 text-white disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* GPU field */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="batchGpu"
                  checked={batchFields.updateGpu}
                  onChange={(e) =>
                    setBatchFields((p) => ({ ...p, updateGpu: e.target.checked }))
                  }
                  className="rounded bg-[#232530] border-slate-600 text-blue-600"
                />
                <label htmlFor="batchGpu" className="w-28 text-slate-300 font-semibold cursor-pointer">
                  GPU:
                </label>
                <input
                  type="text"
                  disabled={!batchFields.updateGpu}
                  value={batchFields.gpu}
                  onChange={(e) => setBatchFields((p) => ({ ...p, gpu: e.target.value }))}
                  placeholder="e.g. COLORFUL iGAME RTX 5060 Ti ULTRA OC 8GB"
                  className="flex-1 bg-[#12131a] border border-[#2b2e3c] rounded px-2.5 py-1.5 text-white disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Motherboard field */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="batchMb"
                  checked={batchFields.updateMotherboard}
                  onChange={(e) =>
                    setBatchFields((p) => ({ ...p, updateMotherboard: e.target.checked }))
                  }
                  className="rounded bg-[#232530] border-slate-600 text-blue-600"
                />
                <label htmlFor="batchMb" className="w-28 text-slate-300 font-semibold cursor-pointer">
                  Motherboard:
                </label>
                <input
                  type="text"
                  disabled={!batchFields.updateMotherboard}
                  value={batchFields.motherboard}
                  onChange={(e) =>
                    setBatchFields((p) => ({ ...p, motherboard: e.target.value }))
                  }
                  placeholder="e.g. Gigabyte X870E AORUS MASTER"
                  className="flex-1 bg-[#12131a] border border-[#2b2e3c] rounded px-2.5 py-1.5 text-white disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* RAM field */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="batchRam"
                  checked={batchFields.updateRam}
                  onChange={(e) =>
                    setBatchFields((p) => ({ ...p, updateRam: e.target.checked }))
                  }
                  className="rounded bg-[#232530] border-slate-600 text-blue-600"
                />
                <label htmlFor="batchRam" className="w-28 text-slate-300 font-semibold cursor-pointer">
                  System RAM:
                </label>
                <input
                  type="text"
                  disabled={!batchFields.updateRam}
                  value={batchFields.ram}
                  onChange={(e) => setBatchFields((p) => ({ ...p, ram: e.target.value }))}
                  placeholder="e.g. 32GB (2x16GB) 6000MT/s"
                  className="flex-1 bg-[#12131a] border border-[#2b2e3c] rounded px-2.5 py-1.5 text-white disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#2b2e3c]">
              <button
                onClick={() => setIsBatchModalOpen(false)}
                disabled={isBatchSaving}
                className="px-3 py-1.5 rounded-lg bg-[#232530] hover:bg-[#2e3140] text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBatch}
                disabled={isBatchSaving}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow transition-colors disabled:opacity-50"
              >
                {isBatchSaving ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>Apply to {selectedPaths.size} Files</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RawRunsModal;
