import React, { useState, useEffect } from "react";
import {
  X,
  Palette,
  History,
  Tag,
  Keyboard,
  FileText,
  Database,
  CheckCircle2,
  FolderOpen,
  RotateCcw,
  Search,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  Sliders,
  Image as ImageIcon,
  CheckSquare,
  FolderSearch
} from "lucide-react";
import { useThemeStore, THEME_OPTIONS, UITheme } from "../../stores/themeStore";
import { useBrandingDefaultsStore } from "../../stores/brandingDefaultsStore";
import { useShortcutStore, formatCombo } from "../../stores/shortcutStore";
import {
  BENCHMATE_CHANGELOG,
  OCR_CHANGELOG,
  CAPFRAMEX_CHANGELOG,
  ReleaseItem
} from "../../data/changelogData";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "appearance" | "changelogs" | "branding" | "shortcuts" | "naming" | "data";
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = "appearance"
}) => {
  const [activeTab, setActiveTab] = useState<
    "appearance" | "changelogs" | "branding" | "shortcuts" | "naming" | "data"
  >(initialTab);

  const { theme, setTheme } = useThemeStore();
  const branding = useBrandingDefaultsStore();
  const { shortcuts, updateShortcut, resetShortcuts } = useShortcutStore();

  // Changelog sub-tab state
  const [changelogSource, setChangelogSource] = useState<"benchmate" | "ocr" | "capframex">("benchmate");
  const [changelogSearch, setChangelogSearch] = useState("");
  const [copiedChangelog, setCopiedChangelog] = useState(false);

  // Shortcut recording state
  const [recordingId, setRecordingId] = useState<string | null>(null);

  // Action status state
  const [folderOpenStatus, setFolderOpenStatus] = useState<string | null>(null);
  const [importFolderOpenStatus, setImportFolderOpenStatus] = useState<string | null>(null);
  const [resetStatus, setResetStatus] = useState<string | null>(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  // Key recording listener
  useEffect(() => {
    if (!recordingId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Ignore bare modifiers
      if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) return;

      const newCombo = {
        key: e.key.length === 1 ? e.key.toLowerCase() : e.key,
        ctrl: e.ctrlKey || e.metaKey,
        shift: e.shiftKey,
        alt: e.altKey
      };

      updateShortcut(recordingId, newCombo);
      setRecordingId(null);
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [recordingId, updateShortcut]);

  if (!isOpen) return null;

  // Active Changelog Data
  const getActiveChangelog = (): ReleaseItem[] => {
    if (changelogSource === "benchmate") return BENCHMATE_CHANGELOG;
    if (changelogSource === "ocr") return OCR_CHANGELOG;
    return CAPFRAMEX_CHANGELOG;
  };

  const filteredChangelog = getActiveChangelog().filter((item) => {
    if (!changelogSearch.trim()) return true;
    const q = changelogSearch.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.version.toLowerCase().includes(q) ||
      item.tags.some((t) => t.toLowerCase().includes(q)) ||
      item.highlights.some((h) => h.toLowerCase().includes(q))
    );
  });

  const handleCopyChangelog = () => {
    const list = getActiveChangelog();
    const text = list
      .map(
        (r) =>
          `## [${r.version}] - ${r.date}\n### ${r.title}\n` +
          r.highlights.map((h) => `- ${h}`).join("\n")
      )
      .join("\n\n");
    navigator.clipboard.writeText(text);
    setCopiedChangelog(true);
    setTimeout(() => setCopiedChangelog(false), 2000);
  };

  const handleOpenDataFolder = async () => {
    try {
      setFolderOpenStatus("Opening...");
      const res = await fetch("/api/system/open-data-folder", { method: "POST" });
      if (res.ok) {
        setFolderOpenStatus("Folder opened!");
      } else {
        setFolderOpenStatus("Could not open automatically");
      }
    } catch {
      setFolderOpenStatus("Error reaching backend");
    }
    setTimeout(() => setFolderOpenStatus(null), 3000);
  };

  const handleOpenImportFolder = async () => {
    let targetPath = "";
    let activeApp = "ocr";
    try {
      activeApp = localStorage.getItem("benchmate_active_app_v1") || "ocr";
      if (activeApp === "ocr") {
        targetPath = localStorage.getItem("gp_import_folder_path") || "";
      } else {
        targetPath = localStorage.getItem("cx_import_folder_path") || "";
      }
    } catch (e) {}

    try {
      setImportFolderOpenStatus("Opening...");
      const res = await fetch("/api/system/open-import-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: targetPath, app_type: activeApp })
      });
      if (res.ok) {
        setImportFolderOpenStatus("Folder opened!");
      } else {
        setImportFolderOpenStatus("Could not open automatically");
      }
    } catch {
      setImportFolderOpenStatus("Error reaching backend");
    }
    setTimeout(() => setImportFolderOpenStatus(null), 3000);
  };

  const handleResetOcrPreferences = () => {
    if (confirm("Reset Benchmark OCR Analyzer design preferences to defaults? Your project data will NOT be deleted.")) {
      localStorage.removeItem("gp_benchmark_chart_preferences_v1");
      setResetStatus("OCR preferences reset. Reloading...");
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  const handleResetCapframexPreferences = () => {
    if (confirm("Reset CapFrameX Analyzer design preferences to defaults? Your JSON files will NOT be deleted.")) {
      localStorage.removeItem("cx_benchmark_chart_preferences_v2");
      setResetStatus("CapFrameX preferences reset. Reloading...");
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#121215] border border-[#23232a] w-full max-w-4xl h-[88vh] max-h-[820px] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#23232a] flex items-center justify-between bg-[#161820]/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>BenchMate Analyzer Settings</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  v1.1.0
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Configure global themes, changelogs, customizable shortcuts, and publication defaults
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#23232a] transition-colors cursor-pointer"
            title="Close Settings (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Sidebar Tabs + Content Viewport */}
        <div className="flex flex-1 overflow-hidden">
          {/* Settings Sidebar Tabs */}
          <aside className="w-56 bg-[#0e0e11] border-r border-[#23232a] p-3 space-y-1 shrink-0 overflow-y-auto">
            <button
              type="button"
              onClick={() => setActiveTab("appearance")}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "appearance"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#18181b]"
              }`}
            >
              <Palette className="w-4 h-4 shrink-0" />
              <span>Appearance & Theme</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("changelogs")}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "changelogs"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#18181b]"
              }`}
            >
              <History className="w-4 h-4 shrink-0" />
              <span>Changelogs Hub</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("branding")}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "branding"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#18181b]"
              }`}
            >
              <Tag className="w-4 h-4 shrink-0" />
              <span>Branding & Smart 9:16</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("shortcuts")}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "shortcuts"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#18181b]"
              }`}
            >
              <Keyboard className="w-4 h-4 shrink-0" />
              <span>Custom Shortcuts</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("naming")}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "naming"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#18181b]"
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>Export File Naming</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("data")}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "data"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#18181b]"
              }`}
            >
              <Database className="w-4 h-4 shrink-0" />
              <span>Data & Storage</span>
            </button>
          </aside>

          {/* Active Content Area */}
          <main className="flex-1 p-6 overflow-y-auto space-y-6">
            {/* ========================================================= */}
            {/* TAB: APPEARANCE & THEMES                                  */}
            {/* ========================================================= */}
            {activeTab === "appearance" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Unified Theme Engine
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Select your preferred workspace aesthetic. The selected theme automatically applies across both
                    Benchmark OCR Analyzer and CapFrameX Analyzer.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {THEME_OPTIONS.map((t) => {
                    const isSelected = theme === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => setTheme(t.id)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                          isSelected
                            ? "bg-[#18181b] border-blue-500 ring-2 ring-blue-500/30 shadow-lg shadow-blue-900/20"
                            : "bg-[#161820]/60 border-[#23232a] hover:border-slate-500 hover:bg-[#18181b]"
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-base">{t.icon}</span>
                              <span className="text-xs font-bold text-white">{t.name}</span>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            {t.description}
                          </p>
                        </div>

                        {/* Swatches */}
                        <div className="pt-2 border-t border-[#23232a] flex items-center justify-between">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                            {t.badge}
                          </span>
                          <div className="flex items-center space-x-1.5">
                            <div
                              className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                              style={{ backgroundColor: t.surfaceColor }}
                              title={`Surface: ${t.surfaceColor}`}
                            />
                            <div
                              className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                              style={{ backgroundColor: t.cardColor }}
                              title={`Card: ${t.cardColor}`}
                            />
                            <div
                              className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                              style={{ backgroundColor: t.borderColor }}
                              title={`Border: ${t.borderColor}`}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB: CHANGELOGS HUB                                       */}
            {/* ========================================================= */}
            {activeTab === "changelogs" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      Version History & Evolution
                    </h3>
                    <p className="text-xs text-slate-400">
                      Explore changelogs for the unified suite or inspect each app individually
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyChangelog}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18181b] hover:bg-[#23232a] text-slate-300 hover:text-white border border-[#27272a] text-xs font-semibold transition cursor-pointer self-start sm:self-auto"
                  >
                    {copiedChangelog ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copy Markdown</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Sub-Tabs: Unified vs OCR vs CapFrameX */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center bg-[#18181b] p-1 rounded-xl border border-[#23232a]">
                    <button
                      type="button"
                      onClick={() => setChangelogSource("benchmate")}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        changelogSource === "benchmate"
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      🌐 BenchMate Unified
                    </button>
                    <button
                      type="button"
                      onClick={() => setChangelogSource("ocr")}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        changelogSource === "ocr"
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      📷 Benchmark OCR
                    </button>
                    <button
                      type="button"
                      onClick={() => setChangelogSource("capframex")}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        changelogSource === "capframex"
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      🎮 CapFrameX
                    </button>
                  </div>

                  <div className="relative min-w-[220px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={changelogSearch}
                      onChange={(e) => setChangelogSearch(e.target.value)}
                      placeholder="Filter changelogs..."
                      className="w-full bg-[#18181b] border border-[#23232a] rounded-xl pl-8 pr-3 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500 placeholder-slate-500"
                    />
                  </div>
                </div>

                {/* Changelog Entries List */}
                <div className="space-y-4 pt-2">
                  {filteredChangelog.map((rel) => (
                    <div
                      key={rel.version}
                      className="bg-[#18181b]/70 border border-[#23232a] rounded-xl p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-mono font-bold">
                            {rel.version}
                          </span>
                          {rel.isLatest && (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                              LATEST
                            </span>
                          )}
                          <span className="text-xs text-slate-400 font-mono">{rel.date}</span>
                        </div>
                      </div>

                      <h4 className="text-xs font-bold text-white">{rel.title}</h4>

                      {rel.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {rel.tags.map((t) => (
                            <span
                              key={t}
                              className="text-[10px] px-2 py-0.5 rounded bg-[#23232a] text-slate-300 border border-[#2c2c35]"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}

                      <ul className="space-y-1.5 text-xs text-slate-300 pl-4 list-disc">
                        {rel.highlights.map((h, i) => (
                          <li key={i} className="leading-relaxed">
                            {h}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}

                  {filteredChangelog.length === 0 && (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      No changelog entries matched your search filter.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB: BRANDING & SMART 9:16                                */}
            {/* ========================================================= */}
            {activeTab === "branding" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Publication Branding & Intelligent Scaling
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Set global publication defaults for logos, export resolution, and auto-switching to vertical 9:16.
                  </p>
                </div>

                {/* Default Publication Name & Logo Card */}
                <div className="bg-[#18181b]/70 border border-[#23232a] rounded-xl p-4 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-200">
                      Default Publication Name
                    </label>
                    <input
                      type="text"
                      value={branding.publicationName}
                      onChange={(e) => branding.setPublicationName(e.target.value)}
                      placeholder="e.g. GADGET PILIPINAS"
                      className="w-full bg-[#121215] border border-[#23232a] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-200">
                      Default Official Logo (Gadget Pilipinas)
                    </label>
                    <div className="flex items-center gap-4 bg-[#121215] p-3 rounded-lg border border-[#23232a]">
                      <div className="h-10 w-28 bg-white/5 rounded border border-white/10 flex items-center justify-center p-1 overflow-hidden">
                        <img
                          src={branding.logoUrl || "/Full Logo Horizontal Colored.png"}
                          alt="Publication Logo"
                          className="h-full object-contain"
                        />
                      </div>
                      <div className="flex-1 text-xs space-y-0.5">
                        <div className="font-semibold text-white">Full Logo Horizontal Colored</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          Aspect Ratio: {branding.logoAspectRatio} (12500x4500)
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => branding.setLogoUrl("/Full Logo Horizontal Colored.png", 2.7778)}
                        className="px-3 py-1.5 rounded-lg bg-[#23232a] hover:bg-[#2c2c35] text-xs font-semibold text-slate-200 transition"
                      >
                        Reset to Official Logo
                      </button>
                    </div>
                  </div>
                </div>

                {/* Smart Auto-Switch to 9:16 Card */}
                <div className="bg-[#18181b]/70 border border-[#23232a] rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-2">
                        <span>Smart Auto-Switch to 9:16 Vertical Ratio</span>
                        <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                          SMART LAYOUT
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Automatically switches chart orientation to 9:16 vertical when datasets exceed a product threshold
                      </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={branding.autoSwitchVerticalEnabled}
                        onChange={(e) => branding.setAutoSwitchVerticalEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {branding.autoSwitchVerticalEnabled && (
                    <div className="pt-3 border-t border-[#23232a] flex items-center justify-between gap-4">
                      <div className="text-xs text-slate-300">
                        <span>Auto-switch threshold: </span>
                        <span className="font-bold text-blue-400">
                          &gt; {branding.autoSwitchThreshold} products
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Datasets with {branding.autoSwitchThreshold} or fewer products use 16:9 horizontal; larger sets switch to 9:16.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <input
                          type="range"
                          min="4"
                          max="16"
                          value={branding.autoSwitchThreshold}
                          onChange={(e) => branding.setAutoSwitchThreshold(parseInt(e.target.value, 10))}
                          className="w-28 accent-blue-500"
                        />
                        <span className="text-xs font-mono font-bold text-white w-6 text-right">
                          {branding.autoSwitchThreshold}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Overall Export Defaults */}
                <div className="bg-[#18181b]/70 border border-[#23232a] rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-white">Default Export Format & Resolution</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">Default Aspect Ratio</label>
                      <select
                        value={branding.defaultAspectRatio}
                        onChange={(e) => branding.setDefaultAspectRatio(e.target.value as any)}
                        className="w-full bg-[#121215] border border-[#23232a] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="16:9">16:9 Horizontal (Standard)</option>
                        <option value="9:16">9:16 Vertical (Mobile / Reels)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">Default Resolution</label>
                      <select
                        value={branding.defaultResolution}
                        onChange={(e) => branding.setDefaultResolution(e.target.value as any)}
                        className="w-full bg-[#121215] border border-[#23232a] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="720p">720p HD (Fast & Compact)</option>
                        <option value="1080p">1080p FHD (Recommended)</option>
                        <option value="4k">4K UHD (Ultra High-Res)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">Default Format</label>
                      <select
                        value={branding.defaultFormat}
                        onChange={(e) => branding.setDefaultFormat(e.target.value as any)}
                        className="w-full bg-[#121215] border border-[#23232a] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="webp">WebP (Optimized)</option>
                        <option value="png">PNG (Lossless)</option>
                        <option value="jpeg">JPEG (Universal)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB: CUSTOMIZABLE KEYBOARD SHORTCUTS                      */}
            {/* ========================================================= */}
            {activeTab === "shortcuts" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      Customizable Keyboard Shortcuts
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Click any shortcut to record your custom keystroke combination.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={resetShortcuts}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18181b] hover:bg-[#23232a] text-slate-300 text-xs font-semibold border border-[#27272a] transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Shortcuts</span>
                  </button>
                </div>

                <div className="divide-y divide-[#23232a] border border-[#23232a] rounded-xl overflow-hidden bg-[#18181b]/50">
                  {Object.values(shortcuts).map((sc) => {
                    const isRecording = recordingId === sc.id;
                    return (
                      <div
                        key={sc.id}
                        className="p-3.5 flex items-center justify-between hover:bg-[#18181b] transition-colors"
                      >
                        <div className="space-y-0.5 pr-4">
                          <div className="text-xs font-bold text-white">{sc.label}</div>
                          <div className="text-[11px] text-slate-400">{sc.description}</div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isRecording ? (
                            <span className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold animate-pulse">
                              Press key combo...
                            </span>
                          ) : (
                            <kbd className="px-2.5 py-1.5 rounded-lg bg-[#121215] border border-[#2c2c35] text-xs font-mono font-semibold text-slate-200 shadow-inner">
                              {formatCombo(sc.combo)}
                            </kbd>
                          )}

                          <button
                            type="button"
                            onClick={() => setRecordingId(isRecording ? null : sc.id)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                              isRecording
                                ? "bg-red-600 text-white"
                                : "bg-[#23232a] hover:bg-[#2c2c35] text-slate-300"
                            }`}
                          >
                            {isRecording ? "Cancel" : "Change"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB: EXPORT FILE NAMING                                   */}
            {/* ========================================================= */}
            {activeTab === "naming" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Export File Naming & Automation
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Control how chart filenames are generated during individual and batch exports.
                  </p>
                </div>

                <div className="bg-[#18181b]/70 border border-[#23232a] rounded-xl p-4 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-200">
                      Export Naming Formula
                    </label>
                    <input
                      type="text"
                      value={branding.exportNamingTemplate}
                      onChange={(e) => branding.setExportNamingTemplate(e.target.value)}
                      placeholder="e.g. [product] - [benchmark] - [resolution]"
                      className="w-full bg-[#121215] border border-[#23232a] rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                    <p className="text-[11px] text-slate-500">
                      Supported tokens: [product], [benchmark], [resolution], [preset], [date]
                    </p>
                  </div>

                  <div className="p-3 bg-[#121215] rounded-lg border border-[#23232a] space-y-1">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                      Generated Sample Preview:
                    </span>
                    <div className="text-xs font-mono text-emerald-400">
                      {branding.exportNamingTemplate
                        .replace(/\[product\]/gi, "ROG Zephyrus G16")
                        .replace(/\[benchmark\]/gi, "Cyberpunk 2077")
                        .replace(/\[resolution\]/gi, "1440p")
                        .replace(/\[preset\]/gi, "Ultra")
                        .replace(/\[date\]/gi, "2026-09-26")}
                      .webp
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-[#23232a]">
                    <label className="text-xs font-semibold text-slate-200">
                      Batch Export Packaging Mode
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex items-center gap-2 p-3 bg-[#121215] rounded-lg border border-[#23232a] cursor-pointer">
                        <input
                          type="radio"
                          name="batchMode"
                          checked={branding.defaultBatchMode === "individual"}
                          onChange={() => branding.setDefaultBatchMode("individual")}
                          className="accent-blue-500"
                        />
                        <div className="text-xs">
                          <div className="font-semibold text-white">Separate Images</div>
                          <div className="text-[10px] text-slate-400">Exports individual PNG/WebP files directly</div>
                        </div>
                      </label>

                      <label className="flex items-center gap-2 p-3 bg-[#121215] rounded-lg border border-[#23232a] cursor-pointer">
                        <input
                          type="radio"
                          name="batchMode"
                          checked={branding.defaultBatchMode === "zip"}
                          onChange={() => branding.setDefaultBatchMode("zip")}
                          className="accent-blue-500"
                        />
                        <div className="text-xs">
                          <div className="font-semibold text-white">ZIP Archive</div>
                          <div className="text-[10px] text-slate-400">Packs all images into a single zip file</div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB: DATA & STORAGE                                       */}
            {/* ========================================================= */}
            {activeTab === "data" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Data & Storage Management
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Manage local project databases, cache storage, and file directories.
                  </p>
                </div>

                {/* Local Folder Explorer */}
                <div className="bg-[#18181b]/70 border border-[#23232a] rounded-xl p-4 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-blue-400" />
                      <span>Open Local Data Folder</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Launches Windows File Explorer pointing to the BenchMate data, exports, and project databases.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenDataFolder}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow shrink-0 cursor-pointer"
                  >
                    {folderOpenStatus || "Open Data Folder"}
                  </button>
                </div>

                {/* Active Import Folder Explorer */}
                <div className="bg-[#18181b]/70 border border-[#23232a] rounded-xl p-4 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <FolderSearch className="w-4 h-4 text-amber-400" />
                      <span>Open Active App Import Folder</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Launches Windows File Explorer pointing to the import directory for whichever app is active (OCR screenshots or CapFrameX captures).
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenImportFolder}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition shadow shrink-0 cursor-pointer"
                  >
                    {importFolderOpenStatus || "Open Import Folder"}
                  </button>
                </div>

                {/* Reset Preferences Card */}
                <div className="bg-[#18181b]/70 border border-[#23232a] rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-white">Reset App Preferences</h4>
                  <p className="text-[11px] text-slate-400">
                    If chart styles or controls become misconfigured, reset them safely without deleting imported review data.
                  </p>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleResetOcrPreferences}
                      className="px-3 py-2 rounded-lg bg-[#23232a] hover:bg-[#2c2c35] text-xs font-semibold text-slate-200 transition cursor-pointer"
                    >
                      Reset Benchmark OCR Preferences
                    </button>
                    <button
                      type="button"
                      onClick={handleResetCapframexPreferences}
                      className="px-3 py-2 rounded-lg bg-[#23232a] hover:bg-[#2c2c35] text-xs font-semibold text-slate-200 transition cursor-pointer"
                    >
                      Reset CapFrameX Preferences
                    </button>
                  </div>

                  {resetStatus && (
                    <div className="p-2 rounded bg-amber-500/20 text-amber-300 text-xs font-mono font-semibold">
                      {resetStatus}
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
