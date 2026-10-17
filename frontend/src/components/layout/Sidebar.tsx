import React, { useRef, useState, useEffect } from "react";
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
  Table
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
  const containerRef = useRef<HTMLDivElement>(null);
  const activeBtnRef = useRef<HTMLButtonElement | null>(null);
  const [pillStyle, setPillStyle] = useState<{ top: number; height: number; opacity: number }>({
    top: 0,
    height: 34,
    opacity: 0
  });

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

  // Update gliding pill position with spring physics
  useEffect(() => {
    if (activeBtnRef.current && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const btnRect = activeBtnRef.current.getBoundingClientRect();
      const relativeTop = btnRect.top - containerRect.top;

      setPillStyle({
        top: relativeTop,
        height: btnRect.height,
        opacity: 1
      });
    }
  }, [activeTab]);

  return (
    <aside className="w-64 bg-[#0a0e17] border-r border-white/[0.08] flex flex-col justify-between select-none font-['Geist',sans-serif]">
      {/* Scrollable Navigation Body */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 relative" ref={containerRef}>
        {/* BrewedOps Gliding Active Spring Pill */}
        <div
          className="absolute left-3 right-3 rounded-xl bg-blue-500/12 border border-blue-400/25 pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            transform: `translateY(${pillStyle.top}px)`,
            height: `${pillStyle.height}px`,
            opacity: pillStyle.opacity
          }}
        />

        {sections.map((section) => (
          <div key={section.title} className="space-y-1">
            <div className="px-3 py-1 text-[10px] font-semibold text-slate-500 tracking-[0.08em] uppercase">
              {section.title}
            </div>

            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    ref={isActive ? activeBtnRef : null}
                    onClick={() => onTabChange(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors relative z-10 ${
                      isActive
                        ? "text-white font-semibold"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className={isActive ? "text-[#3d8bff]" : "text-slate-400"}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className="text-[10px] font-medium font-mono px-1.5 py-0.5 rounded-md bg-white/[0.06] text-slate-300 border border-white/[0.08]">
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

      {/* Footer Info: Minimalist BrewedOps Card */}
      <div className="p-3 border-t border-white/[0.06] bg-white/[0.01]">
        <div className="rounded-xl border border-white/[0.06] bg-[#111827]/70 p-3 space-y-1.5">
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
            <span className="font-mono text-[10px] text-slate-300 px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/[0.06]">
              100% Offline
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
