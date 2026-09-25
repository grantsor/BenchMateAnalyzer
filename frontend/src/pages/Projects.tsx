import React, { useState } from "react";
import { useProjectStore } from "../stores/projectStore";
import { api, Project } from "../api/client";
import { useImportStore } from "../stores/useImportStore";
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  CheckCircle,
  Cpu,
  Edit2,
  FolderOpen,
  FolderSync,
  Layers,
  Plus,
  Trash2,
  X
} from "lucide-react";

interface ProjectsPageProps {
  onNavigate: (tab: any) => void;
}

import { COMPONENT_CATEGORIES } from "./Import";

export const ProjectsPage: React.FC<ProjectsPageProps> = ({ onNavigate }) => {
  const { projects, currentProject, selectProject, fetchProjects, refreshCurrentProject } = useProjectStore();
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("All");

  // New Project Form
  const [formData, setFormData] = useState({
    name: "",
    product_name: "",
    product_category: "Laptop",
    cpu: "",
    gpu: "",
    motherboard: "",
    ram: "",
    storage: "",
    os: "Windows 11",
    bios_version: "",
    driver_version: "",
    reviewer: "",
    notes: ""
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await api.createProject(formData);
      await fetchProjects();
      await selectProject(created.id);
      setShowModal(false);
      setFormData({
        name: "",
        product_name: "",
        product_category: "Laptop",
        cpu: "",
        gpu: "",
        motherboard: "",
        ram: "",
        storage: "",
        os: "Windows 11",
        bios_version: "",
        driver_version: "",
        reviewer: "",
        notes: ""
      });
    } catch (err: any) {
      alert("Failed to create project: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete project "${name}"?`)) return;
    try {
      await api.deleteProject(id);
      if (currentProject?.id === id) {
        useImportStore.getState().clearState();
      }
      await fetchProjects();
    } catch (err: any) {
      alert("Failed to delete project: " + err.message);
    }
  };

  // Edit Project / Product State
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStartEdit = (p: Project) => {
    setEditingProject(p);
    setEditFormData({
      name: p.name || "",
      product_name: p.product_name || "",
      product_category: p.product_category || "Laptop",
      cpu: p.cpu || "",
      gpu: p.gpu || "",
      motherboard: p.motherboard || "",
      ram: p.ram || "",
      storage: p.storage || "",
      os: p.os || "Windows 11",
      notes: p.notes || ""
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    if (!editFormData.name?.trim()) {
      alert("Project name cannot be empty");
      return;
    }
    setIsUpdating(true);
    try {
      await api.updateProject(editingProject.id, editFormData);
      await fetchProjects();
      if (currentProject?.id === editingProject.id) {
        await refreshCurrentProject();
      }
      setEditingProject(null);
    } catch (err: any) {
      alert("Failed to update project: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleQuickChangeCategory = async (projectId: string, newCategory: string) => {
    try {
      await api.updateProject(projectId, { product_category: newCategory });
      await fetchProjects();
      if (currentProject?.id === projectId) {
        await refreshCurrentProject();
      }
    } catch (err: any) {
      alert("Failed to update category: " + err.message);
    }
  };

  const normalizePath = (p?: string | null) => {
    if (!p) return "";
    return p.trim().toLowerCase().replace(/[\\/]+$/, "").replace(/\\/g, "/");
  };

  const duplicatePathGroups = React.useMemo(() => {
    const map = new Map<string, Project[]>();
    for (const p of projects) {
      if (p.root_folder_path) {
        const np = normalizePath(p.root_folder_path);
        if (!map.has(np)) map.set(np, []);
        map.get(np)!.push(p);
      }
    }
    // Sort each group so oldest / highest results is first
    for (const group of map.values()) {
      group.sort((a, b) => {
        const resDiff = (b.result_count || 0) - (a.result_count || 0);
        if (resDiff !== 0) return resDiff;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
    }
    return map;
  }, [projects]);

  const hasAnyDuplicates = React.useMemo(() => {
    for (const group of duplicatePathGroups.values()) {
      if (group.length > 1) return true;
    }
    return false;
  }, [duplicatePathGroups]);

  const handleRescanProject = async (p: Project) => {
    if (!p.root_folder_path) return;
    await selectProject(p.id);
    const importStore = useImportStore.getState();
    importStore.setFolderPath(p.root_folder_path);
    if (p.product_name || p.name) {
      importStore.setProductName(p.product_name || p.name);
    }
    if (p.product_category) {
      importStore.setProductCategory(p.product_category);
    }
    onNavigate("import");
  };

  const filteredProjects = projects.filter((p) => {
    if (selectedCategoryFilter === "All") return true;
    return (p.product_category || "Other").toLowerCase() === selectedCategoryFilter.toLowerCase();
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-white">Review Projects</h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage your hardware review projects and benchmark test runs categorized by PC component type.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-red hover:bg-rose-600 text-white text-xs font-semibold shadow-lg shadow-rose-900/30 transition active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {/* Duplicate Projects Warning Banner */}
      {hasAnyDuplicates && (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-800/60 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-200 shadow-xl animate-in fade-in">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Duplicate Projects Detected</h4>
              <p className="text-xs text-amber-200/80 mt-0.5">
                Some review projects in your library share the exact same folder path. You can safely remove the redundant duplicate entries or rescan folders below.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Component Category Filter Pills Bar */}
      <div className="flex flex-wrap items-center gap-1.5 bg-brand-card p-2 rounded-2xl border border-brand-border">
        <button
          onClick={() => setSelectedCategoryFilter("All")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            selectedCategoryFilter === "All"
              ? "bg-brand-red text-white shadow"
              : "text-slate-400 hover:text-white"
          }`}
        >
          All ({projects.length})
        </button>
        {COMPONENT_CATEGORIES.map((cat) => {
          const count = projects.filter(
            (p) => (p.product_category || "Other").toLowerCase() === cat.id.toLowerCase()
          ).length;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryFilter(cat.id)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedCategoryFilter === cat.id
                  ? "bg-brand-red text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
              {count > 0 && (
                <span className="text-[10px] opacity-75 font-mono px-1.5 py-0.2 rounded-full bg-black/20">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Projects List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map((p) => {
          const isSelected = currentProject?.id === p.id;
          const currentCatObj = COMPONENT_CATEGORIES.find(
            (c) => c.id.toLowerCase() === (p.product_category || "Other").toLowerCase()
          );

          const pathDups = p.root_folder_path
            ? (duplicatePathGroups.get(normalizePath(p.root_folder_path)) || []).filter((item) => item.id !== p.id)
            : [];
          const isPathDuplicate = pathDups.length > 0;
          const pathGroup = p.root_folder_path ? (duplicatePathGroups.get(normalizePath(p.root_folder_path)) || []) : [];
          const isSecondaryDuplicate = isPathDuplicate && pathGroup.length > 1 && pathGroup[0].id !== p.id;

          return (
            <div
              key={p.id}
              onClick={() => selectProject(p.id)}
              className={`rounded-2xl border p-6 flex flex-col justify-between transition-all shadow-xl cursor-pointer ${
                isSelected
                  ? "bg-brand-card border-brand-red ring-2 ring-brand-red/30 shadow-brand-red/10"
                  : "bg-brand-card/70 border-brand-border hover:border-slate-500 hover:bg-brand-card/90"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  {/* Category Pill with Quick Reassign Selector */}
                  <div className="relative group" onClick={(e) => e.stopPropagation()}>
                    <span
                      className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                        currentCatObj?.badgeBg || "bg-brand-border text-slate-300 border-brand-border"
                      }`}
                    >
                      <span>{currentCatObj?.icon || "📦"}</span>
                      <span>{p.product_category || "Hardware"}</span>
                    </span>

                    {/* Quick Category Select Dropdown */}
                    <select
                      value={p.product_category || "Laptop"}
                      onChange={(e) => handleQuickChangeCategory(p.id, e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      title="Change component type"
                    >
                      {COMPONENT_CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.icon} {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {isPathDuplicate && (
                      <span
                        className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-amber-300 bg-amber-950/60 border border-amber-800/60"
                        title={`Shares folder path with ${pathDups.map((d) => d.name).join(", ")}`}
                      >
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        <span>Duplicate</span>
                      </span>
                    )}

                    {isSelected ? (
                      <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/50">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500 font-medium opacity-0 group-hover:opacity-100 hover:text-slate-300">
                        Activate
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">{p.name}</h3>
                  {p.product_name && (
                    <p className="text-xs text-slate-300 font-medium mt-0.5">{p.product_name}</p>
                  )}
                  {p.root_folder_path && (
                    <div className="flex items-center justify-between gap-2 mt-1.5 pt-0.5">
                      <div
                        className="text-[11px] font-mono text-slate-400 truncate flex items-center space-x-1 min-w-0"
                        title={p.root_folder_path}
                      >
                        <span className="text-slate-500 shrink-0">📁</span>
                        <span className="truncate">{p.root_folder_path}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRescanProject(p);
                        }}
                        className="shrink-0 px-2 py-0.5 rounded-md bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 hover:text-amber-200 border border-amber-500/30 text-[10px] font-semibold transition flex items-center space-x-1 cursor-pointer"
                        title="Rescan this folder for newly added screenshots"
                      >
                        <FolderSync className="w-3 h-3 text-amber-400" />
                        <span>Rescan</span>
                      </button>
                    </div>
                  )}
                  <div className="flex items-center space-x-3 text-[11px] text-slate-400 pt-1.5">
                    <span>{p.config_count ?? 0} Configurations</span>
                    <span>•</span>
                    <span className="text-slate-300 font-semibold">
                      {p.result_count ?? 0} Results
                    </span>
                  </div>
                </div>

                {/* Duplicate Alert Box & Delete Action */}
                {isPathDuplicate && (
                  <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-800/60 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-amber-300 font-bold text-[11px]">
                      <span className="flex items-center space-x-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        <span>Shares Folder Path</span>
                      </span>
                      {isSecondaryDuplicate ? (
                        <span className="text-[10px] text-rose-300 bg-rose-950/60 border border-rose-800/60 px-1.5 py-0.5 rounded font-mono">
                          Duplicate Entry
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-300 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.5 rounded font-mono">
                          Primary
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-300 leading-snug">
                      Same folder as "{pathDups[0]?.name}" ({pathDups[0]?.result_count || 0} results).
                    </p>
                    {isSecondaryDuplicate && (
                      <div className="pt-1 flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleDelete(p.id, p.name)}
                          className="px-2.5 py-1 rounded-lg bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-500/50 text-[11px] font-semibold flex items-center space-x-1 transition cursor-pointer"
                          title="Safely remove this duplicate entry without deleting the original project"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete Duplicate</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Specs quick info */}
                <div className="space-y-1 text-xs text-slate-400 pt-1">
                  {p.cpu && (
                    <div className="flex items-center space-x-1.5 truncate">
                      <Cpu className="w-3.5 h-3.5 text-brand-red shrink-0" />
                      <span className="truncate">{p.cpu}</span>
                    </div>
                  )}
                  {p.gpu && (
                    <div className="flex items-center space-x-1.5 truncate">
                      <Layers className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span className="truncate">{p.gpu}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-brand-border/60 mt-4 flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2 text-[11px] text-slate-400 shrink-0">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(p.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-0.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleStartEdit(p)}
                      className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-950/30 rounded-lg transition cursor-pointer"
                      title="Rename / edit project and specs"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id, p.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition cursor-pointer"
                      title="Delete project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => {
                      selectProject(p.id);
                      onNavigate("compare");
                    }}
                    className="px-3 py-1.5 rounded-lg bg-brand-red/20 hover:bg-brand-red text-rose-300 hover:text-white border border-brand-red/40 hover:border-brand-red text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
                    title="Open in Comparison Charts"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Charts</span>
                  </button>

                  <button
                    onClick={() => {
                      selectProject(p.id);
                      onNavigate("results");
                    }}
                    className="px-3 py-1.5 rounded-lg bg-brand-border/90 hover:bg-brand-border text-xs font-semibold text-white transition flex items-center space-x-1.5 cursor-pointer"
                    title="View benchmark data results"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Results</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-16 bg-brand-card/40 rounded-3xl border border-dashed border-brand-border space-y-3">
          <Cpu className="w-12 h-12 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-white">No Review Projects Yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Click "New Project" to set up a test environment for a laptop, CPU, or GPU review.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-xl bg-brand-red hover:bg-rose-600 text-xs font-semibold text-white shadow-lg transition"
          >
            Create Your First Project
          </button>
        </div>
      )}

      {/* Create Project Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-brand-surface border border-brand-border rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-brand-border pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Create Review Project</h3>
                <p className="text-xs text-slate-400">Specify product hardware details</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-brand-border"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 max-h-[75vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ASUS Zenbook S 16 Review"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-brand-card border border-brand-border rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-brand-red"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Product Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Zenbook S 16 (UM5606)"
                    value={formData.product_name}
                    onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                    className="w-full bg-brand-card border border-brand-border rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-brand-red"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Product Category
                  </label>
                  <select
                    value={formData.product_category}
                    onChange={(e) => setFormData({ ...formData, product_category: e.target.value })}
                    className="w-full bg-brand-card border border-brand-border rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-brand-red cursor-pointer"
                  >
                    {COMPONENT_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Reviewer Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Grant Soriano"
                    value={formData.reviewer}
                    onChange={(e) => setFormData({ ...formData, reviewer: e.target.value })}
                    className="w-full bg-brand-card border border-brand-border rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-brand-red"
                  />
                </div>
              </div>

              {/* Hardware Specifications */}
              <div className="border-t border-brand-border/60 pt-3 space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Test System Specifications (Optional)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="CPU (e.g. AMD Ryzen AI 9 HX 370)"
                    value={formData.cpu}
                    onChange={(e) => setFormData({ ...formData, cpu: e.target.value })}
                    className="bg-brand-card border border-brand-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-red"
                  />
                  <input
                    type="text"
                    placeholder="GPU (e.g. Radeon 890M / RTX 4070)"
                    value={formData.gpu}
                    onChange={(e) => setFormData({ ...formData, gpu: e.target.value })}
                    className="bg-brand-card border border-brand-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-red"
                  />
                  <input
                    type="text"
                    placeholder="RAM (e.g. 32GB LPDDR5X-7500)"
                    value={formData.ram}
                    onChange={(e) => setFormData({ ...formData, ram: e.target.value })}
                    className="bg-brand-card border border-brand-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-red"
                  />
                  <input
                    type="text"
                    placeholder="Storage (e.g. 1TB PCIe 4.0 NVMe)"
                    value={formData.storage}
                    onChange={(e) => setFormData({ ...formData, storage: e.target.value })}
                    className="bg-brand-card border border-brand-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-red"
                  />
                  <input
                    type="text"
                    placeholder="Motherboard / Model"
                    value={formData.motherboard}
                    onChange={(e) => setFormData({ ...formData, motherboard: e.target.value })}
                    className="bg-brand-card border border-brand-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-red"
                  />
                  <input
                    type="text"
                    placeholder="Operating System"
                    value={formData.os}
                    onChange={(e) => setFormData({ ...formData, os: e.target.value })}
                    className="bg-brand-card border border-brand-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-red"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-brand-border">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-brand-border/60 hover:bg-brand-border text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-brand-red hover:bg-rose-600 text-xs font-semibold text-white shadow-lg transition active:scale-95"
                >
                  {isSubmitting ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project / Product Modal */}
      {editingProject && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-brand-surface border border-brand-border rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-brand-border flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">Edit Project / Product</h3>
                  <p className="text-xs text-slate-400">Rename project, model name, category, or specs</p>
                </div>
              </div>
              <button
                onClick={() => setEditingProject(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-brand-card transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Project Display Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full bg-brand-card border border-brand-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    placeholder="Project Name (e.g. Acer Predator Helios 16)"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Product Model Name
                    </label>
                    <input
                      type="text"
                      value={editFormData.product_name}
                      onChange={(e) => setEditFormData({ ...editFormData, product_name: e.target.value })}
                      className="w-full bg-brand-card border border-brand-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      placeholder="e.g. Predator Helios 16 PH16-71"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Hardware Category
                    </label>
                    <select
                      value={editFormData.product_category}
                      onChange={(e) => setEditFormData({ ...editFormData, product_category: e.target.value })}
                      className="w-full bg-brand-card border border-brand-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    >
                      {COMPONENT_CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon} {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">CPU</label>
                    <input
                      type="text"
                      value={editFormData.cpu}
                      onChange={(e) => setEditFormData({ ...editFormData, cpu: e.target.value })}
                      className="w-full bg-brand-card border border-brand-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      placeholder="e.g. Intel Core i9-13900HX"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">GPU</label>
                    <input
                      type="text"
                      value={editFormData.gpu}
                      onChange={(e) => setEditFormData({ ...editFormData, gpu: e.target.value })}
                      className="w-full bg-brand-card border border-brand-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      placeholder="e.g. NVIDIA RTX 4080 Mobile"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">RAM</label>
                    <input
                      type="text"
                      value={editFormData.ram}
                      onChange={(e) => setEditFormData({ ...editFormData, ram: e.target.value })}
                      className="w-full bg-brand-card border border-brand-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      placeholder="e.g. 32GB DDR5-5600"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Storage</label>
                    <input
                      type="text"
                      value={editFormData.storage}
                      onChange={(e) => setEditFormData({ ...editFormData, storage: e.target.value })}
                      className="w-full bg-brand-card border border-brand-border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      placeholder="e.g. 1TB NVMe PCIe 4.0"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-brand-border">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-4 py-2 rounded-xl bg-brand-border/60 hover:bg-brand-border text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-xs font-semibold text-slate-950 font-bold shadow-lg transition active:scale-95"
                >
                  {isUpdating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
