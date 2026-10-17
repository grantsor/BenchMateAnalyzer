import React, { useState } from "react";
import {
  BarChart3,
  CheckSquare,
  FolderSync,
  FolderTree,
  HardDrive,
  History,
  LayoutDashboard,
  Layers,
  Settings,
  Sliders,
  Table,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";

import { APP_VERSION_LABEL } from "../../constants/version";

export type NavTab =
  | "dashboard"
  | "import"
  | "ssd_database"
  | "results"
  | "ocr_review"
  | "compare"
  | "tables"
  | "benchmarks"
  | "projects"
  | "settings"
  | "changelog";

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

interface NavSection {
  title: string;
  items: {
    id: NavTab;
    label: string;
    icon: React.ReactNode;
    badge?: string;
  }[];
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("benchmate_ocr_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("benchmate_ocr_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  const sections: NavSection[] = [
    {
      title: "Workflow",
      items: [
        { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
        { id: "import", label: "Import & Scan", icon: <FolderSync className="w-4 h-4" /> },
        { id: "ocr_review", label: "OCR Review", icon: <CheckSquare className="w-4 h-4" /> },
        { id: "compare", label: "Comparison Charts", icon: <BarChart3 className="w-4 h-4" /> }
      ]
    },
    {
      title: "Data Explorer",
      items: [
        { id: "results", label: "All Results", icon: <Layers className="w-4 h-4" /> },
        { id: "ssd_database", label: "SSD Database", icon: <HardDrive className="w-4 h-4" /> },
        { id: "tables", label: "Table Designer", icon: <Table className="w-4 h-4" /> },
        { id: "benchmarks", label: "Benchmark Profiles", icon: <Sliders className="w-4 h-4" /> },
        { id: "projects", label: "Projects", icon: <FolderTree className="w-4 h-4" /> }
      ]
    },
    {
      title: "Preferences",
      items: [
        { id: "settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
        {
          id: "changelog",
          label: "Changelogs",
          icon: <History className="w-4 h-4" />,
          badge: APP_VERSION_LABEL
        }
      ]
    }
  ];

  return (
    <aside
      className={`${
        isCollapsed ? "w-16" : "w-64"
      } bg-brand-surface border-r border-brand-border flex flex-col justify-between select-none transition-[width] duration-200 shrink-0 font-['Geist',sans-serif]`}
    >
      {/* Top Header Row with Collapse / Expand Toggle */}
      <div
        className={`flex items-center px-3 py-2 border-b border-brand-border/60 ${
          isCollapsed ? "justify-center" : "justify-between"
        }`}
      >
        {!isCollapsed && (
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider pl-1">
            Navigation
          </span>
        )}
        <button
          type="button"
          onClick={toggleCollapse}
          className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-white transition cursor-pointer"
          title={isCollapsed ? "Expand sidebar (w-64)" : "Collapse sidebar (w-16)"}
        >
          {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* Scrollable Navigation Body */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {sections.map((section) => (
          <div key={section.title} className="space-y-1">
            {!isCollapsed ? (
              <div className="px-3 py-1 text-[10px] font-semibold text-slate-500 tracking-[0.08em] uppercase">
                {section.title}
              </div>
            ) : (
              <div className="h-px bg-white/[0.06] mx-2 my-1" />
            )}

            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center rounded-xl text-xs font-medium transition-all relative ${
                      isCollapsed
                        ? "justify-center h-10 w-10 mx-auto px-0"
                        : "justify-between px-3 py-2"
                    } ${
                      isActive
                        ? "bg-blue-600/15 border border-blue-400/35 text-white font-semibold shadow-sm"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent"
                    }`}
                  >
                    <div className={`flex items-center ${isCollapsed ? "justify-center" : "space-x-2.5"}`}>
                      <span className={isActive ? "text-[#3d8bff]" : "text-slate-400"}>
                        {item.icon}
                      </span>
                      {!isCollapsed && <span>{item.label}</span>}
                    </div>

                    {!isCollapsed && item.badge && (
                      <span className="text-[10px] font-medium font-mono px-1.5 py-0.5 rounded-md bg-white/[0.06] text-slate-300 border border-brand-border">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info: RapidOCR Engine Status Card */}
      <div className="p-2.5 border-t border-brand-border/60 bg-white/[0.01]">
        {!isCollapsed ? (
          <div className="rounded-xl border border-brand-border bg-brand-card/70 p-3 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="text-slate-400 font-medium">OCR Engine:</span>
              <span className="font-medium text-emerald-400 flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                RapidOCR PP-v4
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="text-slate-400 font-medium">Operation:</span>
              <span className="font-mono text-[10px] text-slate-300 px-1.5 py-0.5 rounded bg-white/[0.05] border border-brand-border">
                100% Offline
              </span>
            </div>
          </div>
        ) : (
          <div
            className="flex justify-center py-1 cursor-default"
            title="RapidOCR PP-v4: Online & 100% Offline"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
        )}
      </div>
    </aside>
  );
};
