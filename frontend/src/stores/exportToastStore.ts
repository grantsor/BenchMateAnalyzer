import { create } from "zustand";

export interface ExportToast {
  id: string;
  type: "success" | "error" | "info";
  title: string;
  message: string;
  filePath?: string;
  directory?: string;
  timestamp: number;
}

interface ExportToastStore {
  toasts: ExportToast[];
  showToast: (toast: {
    type?: "success" | "error" | "info";
    title: string;
    message: string;
    filePath?: string;
    directory?: string;
  }) => void;
  dismissToast: (id: string) => void;
}

export const useExportToastStore = create<ExportToastStore>((set) => ({
  toasts: [],
  showToast: (toast) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newToast: ExportToast = {
      id,
      type: toast.type || "success",
      title: toast.title,
      message: toast.message,
      filePath: toast.filePath,
      directory: toast.directory,
      timestamp: Date.now()
    };
    set((state) => ({
      toasts: [...state.toasts.slice(-4), newToast]
    }));

    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
      }));
    }, 8000);
  },
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    }))
}));
