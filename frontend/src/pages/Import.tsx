import React, { useState, useEffect, useRef } from "react";
import { useProjectStore } from "../stores/projectStore";
import { useImportStore } from "../stores/useImportStore";
import { api, ScanPreviewResult, Project } from "../api/client";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  CheckCircle2,
  Copy,
  Cpu,
  FileImage,
  FileJson,
  FileSpreadsheet,
  FolderCheck,
  FolderOpen,
  FolderSearch,
  FolderSync,
  HelpCircle,
  Loader2,
  Sparkles,
  UploadCloud,
  X
} from "lucide-react";

interface ImportPageProps {
  onNavigate: (tab: any) => void;
}

export const COMPONENT_CATEGORIES = [
  { id: "Laptop", label: "Laptop", icon: "💻", badgeBg: "bg-emerald-950/60 text-emerald-400 border-emerald-800/60" },
  { id: "Desktop", label: "Desktop / System", icon: "🖥️", badgeBg: "bg-sky-950/60 text-sky-400 border-sky-800/60" },
  { id: "CPU", label: "CPU / Processor", icon: "⚙️", badgeBg: "bg-rose-950/60 text-rose-400 border-rose-800/60" },
  { id: "GPU", label: "GPU / Graphics Card", icon: "🎮", badgeBg: "bg-purple-950/60 text-purple-400 border-purple-800/60" },
  { id: "Motherboard", label: "Motherboard", icon: "🎛️", badgeBg: "bg-indigo-950/60 text-indigo-400 border-indigo-800/60" },
  { id: "SSD", label: "SSD / Storage", icon: "💾", badgeBg: "bg-cyan-950/60 text-cyan-400 border-cyan-800/60" },
  { id: "RAM", label: "RAM / Memory", icon: "🧠", badgeBg: "bg-amber-950/60 text-amber-400 border-amber-800/60" },
  { id: "Other", label: "Other Hardware", icon: "📦", badgeBg: "bg-slate-800 text-slate-300 border-slate-700" }
];

export const ImportPage: React.FC<ImportPageProps> = ({ onNavigate }) => {
  const { currentProject, projects, refreshCurrentProject, fetchProjects, selectProject } = useProjectStore();

  // Mode switcher: "screenshots" (Folder OCR) | "data_file" (Direct CSV / JSON)
  const [importMode, setImportMode] = useState<"screenshots" | "data_file">("screenshots");

  // Data File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileProjectName, setFileProjectName] = useState<string>("");
  const [isImportingFile, setIsImportingFile] = useState(false);
  const [fileImportError, setFileImportError] = useState<string | null>(null);
  const [fileImportSuccess, setFileImportSuccess] = useState<{
    project_id: string;
    project_name: string;
    product_name?: string;
    product_category?: string;
    configuration_count: number;
    result_count: number;
    metric_count: number;
    format: string;
  } | null>(null);

  const {
    folderPath,
    productName,
    productCategory,
    isPreviewing,
    isBrowsingFolder,
    previewResult,
    previewError,
    isImporting,
    importProgress,
    activeProjectId,
    autoExtract,
    setFolderPath,
    setProductName,
    setProductCategory,
    setIsPreviewing,
    setIsBrowsingFolder,
    setPreviewResult,
    setPreviewError,
    setIsImporting,
    setImportProgress,
    setActiveProjectId,
    setAutoExtract,
    startPolling,
    stopPolling,
    clearState
  } = useImportStore();

  // Auto-detect component category and default product name from folder
  const autoDetectCategory = (pathOrName: string) => {
    const lower = pathOrName.toLowerCase();
    if (lower.includes("zenbook") || lower.includes("omen") || lower.includes("laptop") || lower.includes("legion") || lower.includes("vivobook") || lower.includes("macbook") || lower.includes("thinkpad") || lower.includes("rog zephyrus") || lower.includes("blade")) {
      return "Laptop";
    }
    if (lower.includes("ryzen") || lower.includes("core i") || lower.includes("intel ultra") || lower.includes("processor") || lower.includes("9950x") || lower.includes("14900k") || lower.includes("9800x3d") || lower.includes("cpu")) {
      return "CPU";
    }
    if (lower.includes("rtx") || lower.includes("radeon") || lower.includes("geforce") || lower.includes("4090") || lower.includes("4080") || lower.includes("7900 xt") || lower.includes("gpu")) {
      return "GPU";
    }
    if (lower.includes("ssd") || lower.includes("nvme") || lower.includes("samsung 990") || lower.includes("crucial t") || lower.includes("sn850") || lower.includes("storage")) {
      return "SSD";
    }
    if (lower.includes("motherboard") || lower.includes("mobo") || lower.includes("z790") || lower.includes("x670") || lower.includes("b650") || lower.includes("b760")) {
      return "Motherboard";
    }
    if (lower.includes("ddr5") || lower.includes("ddr4") || lower.includes("cl30") || lower.includes("dominator") || lower.includes("trident") || lower.includes("ram")) {
      return "RAM";
    }
    if (lower.includes("desktop") || lower.includes("prebuilt") || lower.includes("nuc") || lower.includes("mini pc")) {
      return "Desktop";
    }
    return "Laptop";
  };

  const toggleAutoExtract = (val: boolean) => {
    setAutoExtract(val);
  };

  // Re-connect to active import polling on mount if still processing
  useEffect(() => {
    if (activeProjectId && isImporting) {
      startPolling(activeProjectId, async () => {
        await refreshCurrentProject();
        await fetchProjects();
      });
    }
  }, [activeProjectId, isImporting]);

  const executeExtraction = async (
    targetProjectId: string,
    targetFolder: string,
    pName?: string,
    pCat?: string,
    totalImages?: number
  ) => {
    setActiveProjectId(targetProjectId);
    setIsImporting(true);
    setImportProgress({
      status: "processing",
      current: 0,
      total: totalImages || previewResult?.total_images || 0
    });

    try {
      await api.startImport(
        targetProjectId,
        targetFolder.trim(),
        pName?.trim() || undefined,
        pCat || undefined
      );

      startPolling(targetProjectId, async () => {
        await refreshCurrentProject();
        await fetchProjects();
      });
    } catch (err: any) {
      setPreviewError("Extraction failed: " + err.message);
      setIsImporting(false);
    }
  };

  const [duplicateProjectPrompt, setDuplicateProjectPrompt] = useState<{
    existingProject: Project;
    targetPath: string;
    finalName: string;
    finalCat: string;
    totalImages: number;
  } | null>(null);
  const [detectedDuplicateProject, setDetectedDuplicateProject] = useState<Project | null>(null);

  const handleConfirmRescanDuplicate = async () => {
    if (!duplicateProjectPrompt) return;
    const { existingProject, targetPath, finalName, finalCat, totalImages } = duplicateProjectPrompt;
    setDuplicateProjectPrompt(null);
    setDetectedDuplicateProject(null);
    await selectProject(existingProject.id);
    await executeExtraction(
      existingProject.id,
      targetPath,
      finalName,
      finalCat,
      totalImages
    );
  };

  const handleOpenExistingProject = async () => {
    if (!duplicateProjectPrompt) return;
    const { existingProject } = duplicateProjectPrompt;
    setDuplicateProjectPrompt(null);
    setDetectedDuplicateProject(null);
    await selectProject(existingProject.id);
    onNavigate("results");
  };

  const handleCancelDuplicateModal = () => {
    setDuplicateProjectPrompt(null);
  };

  const handleForceCreateDuplicate = async () => {
    if (!duplicateProjectPrompt) return;
    const { targetPath, finalName, finalCat, totalImages } = duplicateProjectPrompt;
    setDuplicateProjectPrompt(null);
    setDetectedDuplicateProject(null);
    try {
      const created = await api.createProject({
        name: `${finalName} (New)`,
        product_name: finalName,
        product_category: finalCat,
        root_folder_path: targetPath
      });
      await fetchProjects();
      await selectProject(created.id);
      await executeExtraction(
        created.id,
        targetPath,
        finalName,
        finalCat,
        totalImages
      );
    } catch (err: any) {
      setPreviewError("Failed to create separate project: " + err.message);
    }
  };

  const processAndExtractFolder = async (
    pathOverride?: string,
    forceExtract: boolean = autoExtract,
    skipDuplicatePrompt: boolean = false
  ) => {
    const targetPath = (pathOverride || folderPath).trim();
    if (!targetPath) return;
    setIsPreviewing(true);
    setPreviewError(null);
    try {
      const res = await api.previewFolder(targetPath);
      setPreviewResult(res);

      // Auto populate product name and category if empty
      const baseName = targetPath.replace(/[\\/]+$/, "").split(/[\\/]/).pop() || "";
      const finalName = (productName.trim() || baseName || "Benchmark Review").trim();
      const finalCat = productCategory || (baseName ? autoDetectCategory(baseName) : "Laptop");

      if (!productName.trim() && baseName) {
        setProductName(baseName);
      }
      setProductCategory(finalCat);

      // Check if folder or name already exists in database
      let duplicateProject: Project | null = null;
      try {
        const dupCheck = await api.checkDuplicateProject(targetPath, finalName);
        if (dupCheck.is_duplicate && dupCheck.project) {
          duplicateProject = dupCheck.project;
          setDetectedDuplicateProject(dupCheck.project);
        } else {
          setDetectedDuplicateProject(null);
        }
      } catch (e) {
        console.warn("Could not check for duplicate project:", e);
      }

      // If auto-extract is enabled and screenshots were found:
      if (forceExtract && res.total_images > 0) {
        // If a duplicate exists and is NOT already the active project, prompt the user!
        if (duplicateProject && !skipDuplicatePrompt && (!currentProject || currentProject.id !== duplicateProject.id)) {
          setDuplicateProjectPrompt({
            existingProject: duplicateProject,
            targetPath,
            finalName,
            finalCat,
            totalImages: res.total_images
          });
          return;
        }

        let activeProj = currentProject;
        if (!activeProj) {
          if (duplicateProject) {
            activeProj = duplicateProject;
            await selectProject(duplicateProject.id);
          } else {
            const existing = projects.find(
              (p) => p.name.toLowerCase() === finalName.toLowerCase()
            );
            if (existing) {
              activeProj = existing;
              await selectProject(existing.id);
            } else {
              const created = await api.createProject({
                name: finalName,
                product_name: finalName,
                product_category: finalCat,
                root_folder_path: targetPath
              });
              await fetchProjects();
              await selectProject(created.id);
              activeProj = created;
            }
          }
        }

        if (activeProj) {
          await executeExtraction(
            activeProj.id,
            targetPath,
            finalName,
            finalCat,
            res.total_images
          );
        }
      }
    } catch (err: any) {
      setPreviewError(err.message);
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleBrowseFolder = async () => {
    setIsBrowsingFolder(true);
    setPreviewError(null);
    try {
      const res = await api.browseFolder(folderPath || undefined);
      if (!res.cancelled && res.folder_path) {
        setFolderPath(res.folder_path);

        const base = res.folder_path.trim().replace(/[\\/]+$/, "").split(/[\\/]/).pop() || "";
        if (base) {
          setProductName(base);
          setProductCategory(autoDetectCategory(base));
        }

        // Auto-run preview scan and auto-extract immediately with picked folder!
        await processAndExtractFolder(res.folder_path, autoExtract);
      }
    } catch (err: any) {
      setPreviewError("Could not open folder picker: " + err.message);
    } finally {
      setIsBrowsingFolder(false);
    }
  };

  const handleStartImport = async () => {
    await processAndExtractFolder(folderPath, true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setFileImportError(null);
      setFileImportSuccess(null);
      const nameGuess = file.name
        .replace(/\.(csv|json)$/i, "")
        .replace(/_benchmark_(results|backup)$/i, "")
        .replace(/_/g, " ");
      setFileProjectName(nameGuess);
    }
  };

  const handleExecuteFileImport = async () => {
    if (!selectedFile) return;
    setIsImportingFile(true);
    setFileImportError(null);
    try {
      const res = await api.importDataFile(selectedFile, fileProjectName.trim() || undefined);
      setFileImportSuccess(res);
      await fetchProjects();
      await selectProject(res.project_id);
    } catch (err: any) {
      setFileImportError(err.message || "Failed to import data file");
    } finally {
      setIsImportingFile(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-white">Import Benchmark Data</h2>
        <p className="text-xs text-slate-400 mt-1">
          Ingest review benchmarks from screenshot folders via offline OCR or import directly from CSV / JSON data backups.
        </p>
      </div>

      {/* Import Mode Switcher Tabs */}
      <div className="flex items-center space-x-2 border-b border-brand-border pb-4">
        <button
          type="button"
          onClick={() => setImportMode("screenshots")}
          className={`flex items-center space-x-2 py-2.5 px-5 rounded-xl text-xs font-bold transition ${
            importMode === "screenshots"
              ? "bg-brand-red text-white shadow-lg shadow-rose-900/40"
              : "bg-brand-card text-slate-400 hover:text-white border border-brand-border/80 hover:border-slate-500"
          }`}
        >
          <FolderSearch className="w-4 h-4" />
          <span>📁 Scan Review Screenshots (Folder OCR)</span>
        </button>
        <button
          type="button"
          onClick={() => setImportMode("data_file")}
          className={`flex items-center space-x-2 py-2.5 px-5 rounded-xl text-xs font-bold transition ${
            importMode === "data_file"
              ? "bg-brand-red text-white shadow-lg shadow-rose-900/40"
              : "bg-brand-card text-slate-400 hover:text-white border border-brand-border/80 hover:border-slate-500"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>📄 Import Data File (CSV / JSON Backup)</span>
        </button>
      </div>

      {importMode === "screenshots" ? (
        <>
          {/* Folder Selection Bar */}
          <div className="bg-brand-card rounded-2xl border border-brand-border p-6 shadow-xl space-y-5">
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Review Root Folder
          </label>

          {/* Interactive Folder Selection Card */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div
              onClick={handleBrowseFolder}
              className={`md:col-span-8 p-5 rounded-2xl border-2 border-dashed transition cursor-pointer flex items-center space-x-4 group ${
                folderPath
                  ? "border-emerald-500/50 bg-emerald-950/20 hover:border-emerald-400 hover:bg-emerald-950/30"
                  : "border-brand-border/80 bg-brand-surface/60 hover:border-brand-red/70 hover:bg-brand-surface"
              }`}
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-lg transition-transform group-hover:scale-105 ${
                  folderPath ? "bg-emerald-600/30 text-emerald-400" : "bg-brand-red/20 text-brand-red"
                }`}
              >
                {isBrowsingFolder ? (
                  <Loader2 className="w-6 h-6 animate-spin text-brand-red" />
                ) : folderPath ? (
                  <FolderCheck className="w-6 h-6 text-emerald-400" />
                ) : (
                  <FolderSearch className="w-6 h-6" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold text-white">
                    {folderPath ? "Selected Review Folder" : "Choose Review Folder"}
                  </span>
                  {folderPath && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-900/60 text-emerald-300 border border-emerald-700/60">
                      Loaded
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 truncate mt-0.5 font-mono">
                  {folderPath || "Click to open file explorer popup and select your folder"}
                </p>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleBrowseFolder();
                }}
                disabled={isBrowsingFolder || isImporting}
                className="px-4 py-2.5 rounded-xl bg-brand-red hover:bg-rose-600 text-white font-semibold text-xs transition active:scale-95 shrink-0 shadow-md shadow-rose-900/30 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                {isBrowsingFolder ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FolderOpen className="w-3.5 h-3.5" />
                )}
                <span>{folderPath ? "Change Folder" : "Browse Folder..."}</span>
              </button>
            </div>

            {/* Re-Scan / Extraction Action */}
            <div className="md:col-span-4 flex flex-col justify-center space-y-2">
              <button
                onClick={() => {
                  if (!folderPath.trim()) {
                    handleBrowseFolder();
                    return;
                  }
                  processAndExtractFolder(folderPath, autoExtract);
                }}
                disabled={isPreviewing || isImporting || isBrowsingFolder}
                className="w-full flex items-center justify-center space-x-2 px-5 py-3.5 rounded-xl bg-gradient-to-r from-brand-red to-rose-600 hover:from-rose-600 hover:to-rose-500 text-white font-bold text-xs transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-lg shadow-rose-900/30"
              >
                {isPreviewing || isImporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : autoExtract ? (
                  <Sparkles className="w-4 h-4" />
                ) : (
                  <FolderSync className="w-4 h-4" />
                )}
                <span>
                  {isImporting
                    ? "Extracting Scores..."
                    : isPreviewing
                    ? "Scanning Folder..."
                    : autoExtract
                    ? "Scan & Auto-Extract Scores"
                    : "Scan Folder"}
                </span>
              </button>

              {/* Auto-Extract Setting Toggle */}
              <label className="flex items-center justify-center space-x-2 cursor-pointer text-[11px] font-semibold text-slate-300 select-none pt-0.5">
                <input
                  type="checkbox"
                  checked={autoExtract}
                  onChange={(e) => toggleAutoExtract(e.target.checked)}
                  className="rounded border-brand-border text-brand-red focus:ring-brand-red w-3.5 h-3.5 bg-brand-surface cursor-pointer"
                />
                <span>Auto-preload charts (extract immediately)</span>
              </label>
            </div>
          </div>

          {/* Direct Folder Path Input Bar */}
          <div className="pt-3 border-t border-brand-border/40">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <FolderOpen className="w-3.5 h-3.5 text-brand-red" />
                <span>Review Folder Path (Type, Paste, or Browse)</span>
              </span>
              {folderPath && (
                <button
                  type="button"
                  onClick={() => {
                    setFolderPath("");
                    setPreviewResult(null);
                  }}
                  className="text-[10px] text-slate-400 hover:text-rose-400 transition cursor-pointer"
                >
                  Clear Path
                </button>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="e.g. N:\BenchMarkTool\Zenbook S16 2026 or C:\Reviews\Ryzen 9 9950X"
                  value={folderPath}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFolderPath(val);
                    const base = val.trim().replace(/[\\/]+$/, "").split(/[\\/]/).pop() || "";
                    if (base) {
                      setProductName(base);
                      setProductCategory(autoDetectCategory(base));
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && folderPath.trim()) {
                      processAndExtractFolder(folderPath, autoExtract);
                    }
                  }}
                  className="w-full bg-brand-surface border border-brand-border rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-red font-mono"
                />
                <FolderOpen className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              </div>
              <button
                type="button"
                onClick={handleBrowseFolder}
                disabled={isBrowsingFolder || isImporting}
                className="px-4 py-2.5 rounded-xl bg-brand-surface hover:bg-slate-700 text-white font-semibold text-xs border border-brand-border transition active:scale-95 shrink-0 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                title="Open Windows folder explorer"
              >
                {isBrowsingFolder ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-red" />
                ) : (
                  <FolderSearch className="w-3.5 h-3.5 text-brand-red" />
                )}
                <span>Browse...</span>
              </button>
            </div>
          </div>
        </div>

        {/* Hardware Classification & Product Identity */}
        <div className="pt-4 border-t border-brand-border/60 grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
          <div className="md:col-span-4 space-y-1.5">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Product / Review Name
            </label>
            <input
              type="text"
              placeholder="e.g. ASUS Zenbook S16 2026 or AMD Ryzen 9 9950X"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full bg-brand-surface border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-red font-semibold"
            />
            <p className="text-[10px] text-slate-500">
              Used in chart titles, subtitle labels, and batch export image filenames.
            </p>
          </div>

          <div className="md:col-span-8 space-y-1.5">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Hardware Component Classification
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COMPONENT_CATEGORIES.map((cat) => {
                const isSelected = productCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setProductCategory(cat.id)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition active:scale-95 cursor-pointer ${
                      isSelected
                        ? "bg-brand-red text-white border-brand-red shadow-md shadow-rose-900/40"
                        : "bg-brand-surface text-slate-300 border-brand-border/80 hover:border-slate-500 hover:text-white"
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-500">
              Categorizes this review across the app, groups comparison charts, and tags export files.
            </p>
          </div>
        </div>

        {detectedDuplicateProject && (!currentProject || currentProject.id !== detectedDuplicateProject.id) && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-amber-950/40 border border-amber-800/60 rounded-2xl text-xs text-amber-200 animate-in fade-in">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <div className="font-bold text-white">
                  Folder Already Linked to Project: "{detectedDuplicateProject.name}"
                </div>
                <div className="text-[11px] text-amber-200/80">
                  This folder already has {detectedDuplicateProject.result_count || 0} benchmark results saved in your library.
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  setDuplicateProjectPrompt({
                    existingProject: detectedDuplicateProject,
                    targetPath: (folderPath || detectedDuplicateProject.root_folder_path || "").trim(),
                    finalName: productName || detectedDuplicateProject.name,
                    finalCat: productCategory || detectedDuplicateProject.product_category || "Laptop",
                    totalImages: previewResult?.total_images || 0
                  });
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 text-xs font-semibold cursor-pointer transition"
              >
                Rescan or Open Options
              </button>
            </div>
          </div>
        )}

        {previewError && (
          <div className="flex items-center space-x-2 p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{previewError}</span>
          </div>
        )}
      </div>

      {/* Ingestion Progress Active Banner */}
      {isImporting && (
        <div className="bg-brand-card border border-brand-red/60 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Loader2 className="w-6 h-6 text-brand-red animate-spin" />
              <div>
                <h3 className="text-base font-bold text-white">Ingesting & Extracting Scores...</h3>
                <p className="text-xs text-slate-400">
                  {importProgress?.current_file
                    ? `Processing: ${importProgress.current_file}`
                    : "Running region-based RapidOCR on screenshots..."}
                </p>
              </div>
            </div>
            <span className="text-sm font-bold text-brand-red font-mono">
              {importProgress?.current || 0} / {importProgress?.total || 0}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-brand-surface h-2.5 rounded-full overflow-hidden border border-brand-border/80">
            <div
              className="bg-brand-red h-full transition-all duration-300 rounded-full"
              style={{
                width: `${
                  importProgress?.total
                    ? Math.round(((importProgress.current || 0) / importProgress.total) * 100)
                    : 10
                }%`
              }}
            ></div>
          </div>
        </div>
      )}

      {/* Failed Banner */}
      {importProgress?.status === "failed" && !isImporting && (
        <div className="bg-rose-950/40 border border-rose-800/80 rounded-2xl p-6 space-y-3 shadow-xl animate-in fade-in">
          <div className="flex items-center space-x-3.5 text-rose-300">
            <AlertCircle className="w-8 h-8 text-brand-red shrink-0" />
            <div>
              <h3 className="text-base font-bold text-white">Extraction Failed</h3>
              <p className="text-xs text-rose-200/90 mt-0.5">
                {importProgress.error || "An unexpected error occurred during score extraction."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Completed Banner */}
      {importProgress?.status === "completed" && !isImporting && (
        <div className="bg-emerald-950/40 border border-emerald-800/80 rounded-2xl p-6 space-y-4 shadow-xl animate-in fade-in">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <CheckCircle2 className="w-9 h-9 text-emerald-400 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-white">Import & Scan Complete!</h3>
                <p className="text-xs text-emerald-200/90">
                  All screenshots were scanned and extracted into your library. Follow the methodical workflow to review before generating charts.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => onNavigate("ocr_review")}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-950/40 flex items-center space-x-2 active:scale-95 transition cursor-pointer"
              >
                <span>Step 3: Review Benchmarks (OCR Review)</span>
                <span>→</span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (activeProjectId) {
                    await selectProject(activeProjectId);
                  }
                  onNavigate("compare");
                }}
                className="px-4 py-2.5 rounded-xl bg-brand-card hover:bg-brand-border border border-brand-border text-xs font-semibold text-slate-200 hover:text-white transition cursor-pointer"
              >
                <span>Step 4: Generate Charts Directly</span>
              </button>
            </div>
          </div>

          {/* Workflow Stepper Indicator */}
          <div className="pt-3 border-t border-emerald-900/60 flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mr-1">Recommended Workflow:</span>
            <span className="px-2.5 py-0.5 rounded-md bg-emerald-900/40 text-emerald-300 border border-emerald-700/60 font-semibold">
              1. Project Created ✓
            </span>
            <span className="text-slate-500 font-bold">→</span>
            <span className="px-2.5 py-0.5 rounded-md bg-emerald-900/40 text-emerald-300 border border-emerald-700/60 font-semibold">
              2. Import & Scan Done ✓
            </span>
            <span className="text-slate-500 font-bold">→</span>
            <span className="px-2.5 py-0.5 rounded-md bg-brand-red text-white font-bold shadow-sm shadow-rose-900/30">
              3. OCR Review (Verify Scores)
            </span>
            <span className="text-slate-500 font-bold">→</span>
            <span className="px-2.5 py-0.5 rounded-md bg-brand-surface text-slate-400 border border-brand-border/60">
              4. Comparison Charts
            </span>
          </div>
        </div>
      )}

      {/* Preview Summary Cards */}
      {previewResult && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-brand-card rounded-2xl p-4 border border-brand-border">
              <span className="text-xs text-slate-400 font-medium">Configurations Found</span>
              <div className="text-2xl font-bold text-white mt-1">
                {previewResult.configurations.length}
              </div>
            </div>
            <div className="bg-brand-card rounded-2xl p-4 border border-brand-border">
              <span className="text-xs text-slate-400 font-medium">Screenshots Indexed</span>
              <div className="text-2xl font-bold text-sky-400 mt-1">
                {previewResult.total_images}
              </div>
            </div>
            <div className="bg-brand-card rounded-2xl p-4 border border-brand-border">
              <span className="text-xs text-slate-400 font-medium">Recognized Benchmarks</span>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                {previewResult.recognized_benchmarks_count}
              </div>
            </div>
            <div className="bg-brand-card rounded-2xl p-4 border border-brand-border">
              <span className="text-xs text-slate-400 font-medium">Unknown / Duplicates</span>
              <div className="text-2xl font-bold text-amber-400 mt-1">
                {previewResult.unknown_images_count + previewResult.duplicate_count}
              </div>
            </div>
          </div>

          {/* Target Project Callout & Prominent Extraction Action */}
          <div className={`p-4 rounded-2xl border shadow-xl flex flex-wrap items-center justify-between gap-4 ${
            importProgress?.status === "completed" && !isImporting
              ? "bg-emerald-950/30 border-emerald-800/60"
              : "bg-gradient-to-r from-brand-card to-slate-900 border-brand-red/40"
          }`}>
            <div className="flex items-center space-x-3.5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                importProgress?.status === "completed" && !isImporting
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                  : "bg-brand-red/20 border-brand-red/40 text-brand-red"
              }`}>
                {importProgress?.status === "completed" && !isImporting ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Cpu className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-400 font-medium">Target Active Project:</span>
                  <span className="text-sm font-bold text-white">
                    {currentProject?.name || "No Project Selected"}
                  </span>
                  {currentProject?.product_name && (
                    <span className="text-xs text-slate-400">({currentProject.product_name})</span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {importProgress?.status === "completed" && !isImporting
                    ? `Scores successfully extracted for all ${previewResult.total_images} screenshots. You can generate comparison charts now!`
                    : `Clicking "Extract Scores" will run OCR on all ${previewResult.total_images} screenshots and populate Comparison Charts.`}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {projects.length > 1 && importProgress?.status !== "completed" && (
                <select
                  value={currentProject?.id || ""}
                  onChange={(e) => selectProject(e.target.value)}
                  className="bg-brand-surface border border-brand-border rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-brand-red cursor-pointer"
                  title="Change target project"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      Target: {p.name}
                    </option>
                  ))}
                </select>
              )}

              {importProgress?.status === "completed" && !isImporting ? (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleStartImport}
                    disabled={isImporting || !currentProject}
                    className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-brand-surface hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-brand-border transition active:scale-95 cursor-pointer disabled:opacity-50"
                    title="Re-run OCR extraction on all screenshots"
                  >
                    <FolderSync className="w-3.5 h-3.5 text-slate-400" />
                    <span>Re-Extract</span>
                  </button>
                  <button
                    onClick={async () => {
                      if (activeProjectId) {
                        await selectProject(activeProjectId);
                      } else if (currentProject?.id) {
                        await selectProject(currentProject.id);
                      }
                      onNavigate("compare");
                    }}
                    className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/40 transition active:scale-95 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Chart Now</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleStartImport}
                  disabled={isImporting || !currentProject}
                  className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-red to-rose-600 hover:from-rose-600 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-900/40 transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Extract Scores into "{currentProject?.name || "Project"}"</span>
                </button>
              )}
            </div>
          </div>

          {/* Configuration Folders Breakdown */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">Discovered Test Configurations</h3>
                {productCategory && (
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${COMPONENT_CATEGORIES.find(c => c.id === productCategory)?.badgeBg || "bg-brand-border text-slate-300"}`}>
                    {COMPONENT_CATEGORIES.find(c => c.id === productCategory)?.icon} {productCategory}
                  </span>
                )}
                {productName && (
                  <span className="text-xs text-slate-400 font-medium">({productName})</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {previewResult.configurations.map((cfg) => (
                <div
                  key={cfg.folder_name}
                  className="bg-brand-card rounded-2xl border border-brand-border p-5 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
                    <div>
                      <h4 className="font-bold text-sm text-white">{cfg.folder_name}</h4>
                      <span className="text-[11px] text-slate-400">
                        {cfg.image_count} screenshots found
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-brand-border text-slate-300">
                      Configuration
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {cfg.images.map((img) => (
                      <div
                        key={img.file_path}
                        className="flex items-center justify-between py-1 px-2 rounded-lg bg-brand-surface/60 text-xs"
                      >
                        <div className="flex items-center space-x-2 truncate pr-2">
                          <FileImage className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate text-slate-200">{img.file_name}</span>
                        </div>
                        {img.identified_benchmark_id ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 uppercase shrink-0">
                            {img.identified_benchmark_id}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950/60 text-amber-400 border border-amber-800/50 uppercase shrink-0">
                            Unknown
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  ) : (
    /* Data File Import UI (CSV / JSON Backup) */
    <div className="bg-brand-card rounded-2xl border border-brand-border p-6 shadow-xl space-y-6">
      <div>
        <h3 className="text-base font-bold text-white flex items-center space-x-2">
          <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
          <span>Import Benchmark Data File (CSV / JSON Backup)</span>
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Upload a previously exported CSV dataset or full JSON project backup to populate configurations, benchmarks, and scores directly into the database without requiring screenshot images.
        </p>
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv,.json"
        className="hidden"
      />

      {/* Drag & Drop / Click Zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className={`p-8 rounded-2xl border-2 border-dashed transition cursor-pointer flex flex-col items-center justify-center text-center space-y-3 group ${
          selectedFile
            ? "border-emerald-500/50 bg-emerald-950/20 hover:border-emerald-400"
            : "border-brand-border/80 bg-brand-surface/60 hover:border-brand-red/70 hover:bg-brand-surface"
        }`}
      >
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-105 ${
            selectedFile ? "bg-emerald-600/30 text-emerald-400" : "bg-brand-red/20 text-brand-red"
          }`}
        >
          {selectedFile ? (
            selectedFile.name.toLowerCase().endsWith(".json") ? (
              <FileJson className="w-7 h-7" />
            ) : (
              <FileSpreadsheet className="w-7 h-7" />
            )
          ) : (
            <UploadCloud className="w-7 h-7" />
          )}
        </div>

        <div>
          <span className="text-sm font-bold text-white">
            {selectedFile ? selectedFile.name : "Choose CSV or JSON Benchmark File"}
          </span>
          <p className="text-xs text-slate-400 mt-1">
            {selectedFile
              ? `${(selectedFile.size / 1024).toFixed(1)} KB • Click to choose a different file`
              : "Click to browse or drag and drop your .csv or .json benchmark file here"}
          </p>
        </div>

        {selectedFile && (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Ready to Import ({selectedFile.name.toLowerCase().endsWith(".json") ? "JSON Backup" : "Tabular CSV"})</span>
          </span>
        )}
      </div>

      {/* Project Name Customizer & Submit */}
      {selectedFile && (
        <div className="bg-brand-surface rounded-xl border border-brand-border p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Review / Product Name
              </label>
              <input
                type="text"
                value={fileProjectName}
                onChange={(e) => setFileProjectName(e.target.value)}
                placeholder="e.g. AMD Ryzen 9 9950X Review"
                className="w-full bg-brand-card border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-red"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Leave blank to automatically inherit the product name from the file.
              </p>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleExecuteFileImport}
                disabled={isImportingFile}
                className="w-full flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-brand-red hover:bg-rose-600 text-white text-xs font-bold shadow-lg shadow-rose-900/30 transition disabled:opacity-50 cursor-pointer"
              >
                {isImportingFile ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Ingesting Data into Database...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Import Benchmark Data Into Database</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {fileImportError && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-start space-x-3 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 text-brand-red shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Import Failed</span>
            <span>{fileImportError}</span>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {fileImportSuccess && (
        <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-800/80 space-y-3">
          <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>Successfully Imported "{fileImportSuccess.project_name}"!</span>
          </div>
          <p className="text-xs text-slate-300">
            Created <strong>{fileImportSuccess.configuration_count}</strong> test configurations,{" "}
            <strong>{fileImportSuccess.result_count}</strong> benchmark result sets, and{" "}
            <strong>{fileImportSuccess.metric_count}</strong> numeric scores saved directly to SQLite database.
          </p>
          <div className="flex items-center space-x-3 pt-1">
            <button
              type="button"
              onClick={() => onNavigate("results")}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold shadow transition cursor-pointer"
            >
              <span>View Grouped Results</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={async () => {
              if (activeProjectId) {
                await selectProject(activeProjectId);
              }
              onNavigate("compare");
            }}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-brand-border hover:bg-slate-700 text-white text-xs font-semibold shadow transition cursor-pointer"
            >
              <span>Open Comparison Charts</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Educational / Feature Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <div className="p-4 rounded-xl bg-brand-surface/60 border border-brand-border/60 space-y-1.5">
          <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Self-Contained Database Backup</span>
          </span>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            The database stores configurations and scores permanently. You don't need to keep original screenshots on your disk once your dataset is imported.
          </p>
        </div>
        <div className="p-4 rounded-xl bg-brand-surface/60 border border-brand-border/60 space-y-1.5">
          <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
            <FolderSync className="w-3.5 h-3.5 text-sky-400" />
            <span>Cross-Machine Portability</span>
          </span>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Export your project as CSV or JSON from the Results tab and easily import it onto any review machine or share it with collaborators.
          </p>
        </div>
      </div>
    </div>
  )}

    {/* Duplicate Project Alert & Options Modal */}
    {duplicateProjectPrompt && (
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-brand-surface border border-brand-border rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">
                  Existing Project Detected
                </h3>
                <p className="text-xs text-slate-400">
                  This folder is already imported in your library
                </p>
              </div>
            </div>
            <button
              onClick={handleCancelDuplicateModal}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-brand-border cursor-pointer transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-brand-card/90 border border-brand-border rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Existing Match:</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-red/20 text-rose-300 border border-brand-red/40">
                {duplicateProjectPrompt.existingProject.product_category || "Hardware"}
              </span>
            </div>
            <div>
              <div className="text-base font-extrabold text-white">
                {duplicateProjectPrompt.existingProject.name}
              </div>
              {duplicateProjectPrompt.existingProject.root_folder_path && (
                <div className="text-[11px] font-mono text-slate-400 truncate mt-1">
                  📁 {duplicateProjectPrompt.existingProject.root_folder_path}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-3 pt-2 text-xs text-slate-400 border-t border-brand-border/60">
              <span className="font-semibold text-slate-300">
                {duplicateProjectPrompt.existingProject.config_count || 0} Configurations
              </span>
              <span>•</span>
              <span className="font-semibold text-slate-300">
                {duplicateProjectPrompt.existingProject.result_count || 0} Saved Results
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            To keep your data clean and prevent duplicate projects, would you like to <strong>rescan this folder for any changes</strong> (adding new or updated screenshots to the existing project) or open it directly?
          </p>

          <div className="space-y-2 pt-2">
            <button
              onClick={handleConfirmRescanDuplicate}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-gradient-to-r from-brand-red to-rose-600 hover:from-rose-600 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-900/40 transition active:scale-95 cursor-pointer"
            >
              <FolderSync className="w-4 h-4" />
              <span>Rescan Folder for Changes (Recommended)</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleOpenExistingProject}
                className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-brand-card hover:bg-brand-border border border-brand-border text-slate-200 hover:text-white font-semibold text-xs transition cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Open Existing</span>
              </button>
              <button
                onClick={handleCancelDuplicateModal}
                className="py-2.5 px-3 rounded-xl bg-transparent hover:bg-brand-card border border-brand-border/60 text-slate-400 hover:text-white font-semibold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="pt-2 text-center">
              <button
                onClick={handleForceCreateDuplicate}
                className="text-[11px] text-slate-500 hover:text-slate-300 underline underline-offset-2 cursor-pointer"
              >
                Create as separate duplicate project anyway
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
);
};
