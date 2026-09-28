import React from "react";
import { useExportToastStore } from "../../stores/exportToastStore";
import { openFileInExplorer } from "../../utils/exportDownloadHelper";
import { CheckCircle2, FolderOpen, X, AlertCircle, Info } from "lucide-react";

export const ExportToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useExportToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col space-y-2.5 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start space-x-3 p-3.5 rounded-2xl bg-slate-900/95 text-slate-100 border border-slate-700/80 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5 duration-300"
        >
          <div className="flex-shrink-0 mt-0.5">
            {toast.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            {toast.type === "error" && <AlertCircle className="w-5 h-5 text-rose-400" />}
            {toast.type === "info" && <Info className="w-5 h-5 text-sky-400" />}
          </div>

          <div className="flex-1 min-w-0 pr-1">
            <h4 className="text-xs font-bold text-slate-100 tracking-wide uppercase">
              {toast.title}
            </h4>
            <p className="text-xs text-slate-300 truncate mt-0.5" title={toast.message}>
              {toast.message}
            </p>
            {toast.filePath && (
              <div className="mt-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => openFileInExplorer(toast.filePath, toast.directory)}
                  className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] font-semibold transition border border-emerald-500/30 active:scale-95 cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Show in Explorer</span>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            className="flex-shrink-0 text-slate-400 hover:text-slate-200 transition p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
