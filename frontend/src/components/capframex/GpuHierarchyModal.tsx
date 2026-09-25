import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Save,
  Search,
  ListOrdered,
  FileCode2,
  Layers,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { DEFAULT_GPU_HIERARCHY } from "../../utils/capframex/gpuHierarchy";
import { api } from "../../api/capframexClient";

interface GpuHierarchyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentHierarchy: string[];
  onHierarchySaved: (newHierarchy: string[]) => void;
}

export const GpuHierarchyModal: React.FC<GpuHierarchyModalProps> = ({
  isOpen,
  onClose,
  currentHierarchy,
  onHierarchySaved
}) => {
  const [activeTab, setActiveTab] = useState<"list" | "text">("list");
  const [hierarchy, setHierarchy] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [newModelInput, setNewModelInput] = useState("");
  const [rawText, setRawText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const initial = currentHierarchy && currentHierarchy.length > 0 ? currentHierarchy : DEFAULT_GPU_HIERARCHY;
      setHierarchy(initial);
      setRawText(initial.join("\n"));
      setStatusMessage(null);
      setSearchQuery("");
      setNewModelInput("");
    }
  }, [isOpen, currentHierarchy]);

  if (!isOpen) return null;

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const updated = [...hierarchy];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    setHierarchy(updated);
    setRawText(updated.join("\n"));
  };

  const handleMoveDown = (index: number) => {
    if (index >= hierarchy.length - 1) return;
    const updated = [...hierarchy];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    setHierarchy(updated);
    setRawText(updated.join("\n"));
  };

  const handleRemove = (index: number) => {
    const updated = hierarchy.filter((_, i) => i !== index);
    setHierarchy(updated);
    setRawText(updated.join("\n"));
  };

  const handleAddModel = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newModelInput.trim();
    if (!trimmed) return;

    if (hierarchy.some((m) => m.toLowerCase() === trimmed.toLowerCase())) {
      setStatusMessage({ type: "error", text: `"${trimmed}" already exists in the hierarchy.` });
      return;
    }

    const updated = [trimmed, ...hierarchy]; // Insert at top or append
    setHierarchy(updated);
    setRawText(updated.join("\n"));
    setNewModelInput("");
    setStatusMessage({ type: "success", text: `Added "${trimmed}" to hierarchy.` });
  };

  const handleSyncFromText = () => {
    const lines = rawText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    setHierarchy(lines);
    setStatusMessage({ type: "success", text: `Updated ${lines.length} models from text editor.` });
  };

  const handleResetDefault = async () => {
    if (window.confirm("Reset GPU hierarchy back to standard default ranking (28 models)?")) {
      try {
        setIsSaving(true);
        const res = await api.resetGpuHierarchy();
        const resetList = res.hierarchy || DEFAULT_GPU_HIERARCHY;
        setHierarchy(resetList);
        setRawText(resetList.join("\n"));
        onHierarchySaved(resetList);
        setStatusMessage({ type: "success", text: "Successfully reset to default hierarchy." });
      } catch (err: any) {
        setStatusMessage({ type: "error", text: `Reset failed: ${err.message}` });
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      let listToSave = hierarchy;
      if (activeTab === "text") {
        listToSave = rawText
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.length > 0);
        setHierarchy(listToSave);
      }

      if (listToSave.length === 0) {
        setStatusMessage({ type: "error", text: "Hierarchy list cannot be empty." });
        setIsSaving(false);
        return;
      }

      const res = await api.saveGpuHierarchy(listToSave);
      const saved = res.hierarchy || listToSave;
      onHierarchySaved(saved);
      setStatusMessage({ type: "success", text: "Hierarchy ranking saved successfully!" });
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      setStatusMessage({ type: "error", text: `Save failed: ${err.message}` });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredHierarchyWithIndices = hierarchy
    .map((model, idx) => ({ model, originalIndex: idx }))
    .filter((item) =>
      searchQuery ? item.model.toLowerCase().includes(searchQuery.toLowerCase().trim()) : true
    );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#121215] border border-[#2a2a32] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#23232a] bg-[#18181c]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>GPU Model Hierarchy Ranking</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-mono font-semibold">
                  {hierarchy.length} Models
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Determines the tier sorting priority for GPU benchmark graphs (Rank #1 appears at the top)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher & Quick Add Toolbar */}
        <div className="px-6 py-3 border-b border-[#23232a] bg-[#141418] flex flex-wrap items-center justify-between gap-3">
          <div className="flex bg-[#0d0d10] p-1 rounded-xl border border-[#23232a]">
            <button
              type="button"
              onClick={() => {
                if (activeTab === "text") handleSyncFromText();
                setActiveTab("list");
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "list"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Interactive List</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRawText(hierarchy.join("\n"));
                setActiveTab("text");
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "text"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>Text / Config Editor</span>
            </button>
          </div>

          {activeTab === "list" && (
            <div className="flex items-center space-x-2 flex-1 max-w-sm ml-auto">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter models..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0d0d10] border border-[#23232a] rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div
            className={`mx-6 mt-3 px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
              statusMessage.type === "success"
                ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/15 border border-rose-500/30 text-rose-300"
            }`}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {activeTab === "list" ? (
            <>
              {/* Add New Model Form */}
              <form onSubmit={handleAddModel} className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Enter new GPU model (e.g. RTX 5050, RX 9060, Arc B580)..."
                  value={newModelInput}
                  onChange={(e) => setNewModelInput(e.target.value)}
                  className="flex-1 bg-[#18181c] border border-[#2a2a32] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="flex items-center space-x-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Tier</span>
                </button>
              </form>

              {/* Ranked Models List */}
              <div className="space-y-1.5 pr-1 max-h-[380px] overflow-y-auto">
                {filteredHierarchyWithIndices.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    No matching GPU models found.
                  </div>
                ) : (
                  filteredHierarchyWithIndices.map((item) => {
                    const idx = item.originalIndex;
                    const isFirst = idx === 0;
                    const isLast = idx === hierarchy.length - 1;

                    return (
                      <div
                        key={`${item.model}-${idx}`}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-[#18181c] border border-[#23232a] hover:border-slate-600 transition text-xs group"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <span className="w-8 text-center px-1 py-0.5 rounded bg-[#0d0d10] text-blue-400 font-mono font-bold text-[11px] border border-blue-500/20 shrink-0">
                            #{idx + 1}
                          </span>
                          <span className="font-semibold text-slate-200 truncate" title={item.model}>
                            {item.model}
                          </span>
                        </div>

                        <div className="flex items-center space-x-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoveUp(idx)}
                            disabled={isFirst}
                            className={`p-1 rounded-lg transition ${
                              isFirst
                                ? "text-slate-600 cursor-not-allowed"
                                : "text-slate-400 hover:text-white hover:bg-slate-800"
                            }`}
                            title="Move Up in Priority (Higher on chart)"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveDown(idx)}
                            disabled={isLast}
                            className={`p-1 rounded-lg transition ${
                              isLast
                                ? "text-slate-600 cursor-not-allowed"
                                : "text-slate-400 hover:text-white hover:bg-slate-800"
                            }`}
                            title="Move Down in Priority (Lower on chart)"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemove(idx)}
                            className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition ml-1"
                            title="Remove from hierarchy"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            /* Text / Config Editor View */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Edit models directly (one GPU model per line, highest rank at top):</span>
                <span className="font-mono text-[11px] text-blue-400">backend/gpu_hierarchy.json</span>
              </div>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={14}
                className="w-full bg-[#0d0d10] border border-[#2a2a32] rounded-xl p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-blue-500 leading-relaxed resize-none"
                placeholder="RTX 5090&#10;RTX 5080&#10;RTX 5070 Ti..."
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSyncFromText}
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold underline"
                >
                  Apply text changes to interactive list
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-[#23232a] bg-[#141418] flex items-center justify-between">
          <button
            type="button"
            onClick={handleResetDefault}
            disabled={isSaving}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-[#2a2a32] bg-[#18181c] text-slate-300 hover:text-white hover:border-slate-500 text-xs font-semibold transition"
            title="Reset to initial 28 GPU models"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Reset to Default</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-1.5 rounded-xl border border-[#2a2a32] bg-[#18181c] text-slate-400 hover:text-white text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg shadow-blue-600/20 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? "Saving..." : "Save & Apply"}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
