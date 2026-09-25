import { create } from "zustand";
import { api, ScanPreviewResult } from "../api/client";

export interface ImportProgress {
  status: string;
  current?: number;
  total?: number;
  current_file?: string;
  report?: any;
  error?: string;
}

interface ImportState {
  folderPath: string;
  productName: string;
  productCategory: string;
  isPreviewing: boolean;
  isBrowsingFolder: boolean;
  previewResult: ScanPreviewResult | null;
  previewError: string | null;

  isImporting: boolean;
  importProgress: ImportProgress | null;
  activeProjectId: string | null;
  autoExtract: boolean;

  setFolderPath: (path: string) => void;
  setProductName: (name: string) => void;
  setProductCategory: (cat: string) => void;
  setIsPreviewing: (val: boolean) => void;
  setIsBrowsingFolder: (val: boolean) => void;
  setPreviewResult: (res: ScanPreviewResult | null) => void;
  setPreviewError: (err: string | null) => void;
  setIsImporting: (val: boolean) => void;
  setImportProgress: (prog: ImportProgress | null) => void;
  setActiveProjectId: (id: string | null) => void;
  setAutoExtract: (val: boolean) => void;

  startPolling: (projectId: string, onComplete?: () => Promise<void>) => void;
  stopPolling: () => void;
  clearState: () => void;
}

const STORAGE_KEY_FOLDER = "gp_import_folder_path";
const STORAGE_KEY_PROD_NAME = "gp_import_product_name";
const STORAGE_KEY_PROD_CAT = "gp_import_product_cat";
const STORAGE_KEY_ACTIVE_PID = "gp_import_active_project_id";
const STORAGE_KEY_AUTO_EXTRACT = "gp_auto_extract_on_folder_select";

let pollTimer: any = null;

export const useImportStore = create<ImportState>((set, get) => ({
  folderPath: (() => {
    try {
      return localStorage.getItem(STORAGE_KEY_FOLDER) || "";
    } catch {
      return "";
    }
  })(),
  productName: (() => {
    try {
      return localStorage.getItem(STORAGE_KEY_PROD_NAME) || "";
    } catch {
      return "";
    }
  })(),
  productCategory: (() => {
    try {
      return localStorage.getItem(STORAGE_KEY_PROD_CAT) || "Laptop";
    } catch {
      return "Laptop";
    }
  })(),
  isPreviewing: false,
  isBrowsingFolder: false,
  previewResult: null,
  previewError: null,

  isImporting: false,
  importProgress: null,
  activeProjectId: (() => {
    try {
      return localStorage.getItem(STORAGE_KEY_ACTIVE_PID) || null;
    } catch {
      return null;
    }
  })(),
  autoExtract: (() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_AUTO_EXTRACT);
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  })(),

  setFolderPath: (path: string) => {
    set({ folderPath: path });
    try {
      localStorage.setItem(STORAGE_KEY_FOLDER, path);
    } catch {}
  },

  setProductName: (name: string) => {
    set({ productName: name });
    try {
      localStorage.setItem(STORAGE_KEY_PROD_NAME, name);
    } catch {}
  },

  setProductCategory: (cat: string) => {
    set({ productCategory: cat });
    try {
      localStorage.setItem(STORAGE_KEY_PROD_CAT, cat);
    } catch {}
  },

  setIsPreviewing: (val: boolean) => set({ isPreviewing: val }),
  setIsBrowsingFolder: (val: boolean) => set({ isBrowsingFolder: val }),
  setPreviewResult: (res: ScanPreviewResult | null) => set({ previewResult: res, importProgress: null }),
  setPreviewError: (err: string | null) => set({ previewError: err }),
  setIsImporting: (val: boolean) => set({ isImporting: val }),
  setImportProgress: (prog: ImportProgress | null) => set({ importProgress: prog }),

  setActiveProjectId: (id: string | null) => {
    set({ activeProjectId: id });
    try {
      if (id) {
        localStorage.setItem(STORAGE_KEY_ACTIVE_PID, id);
      } else {
        localStorage.removeItem(STORAGE_KEY_ACTIVE_PID);
      }
    } catch {}
  },

  setAutoExtract: (val: boolean) => {
    set({ autoExtract: val });
    try {
      localStorage.setItem(STORAGE_KEY_AUTO_EXTRACT, String(val));
    } catch {}
  },

  startPolling: (projectId: string, onComplete?: () => Promise<void>) => {
    if (pollTimer) clearInterval(pollTimer);
    get().setActiveProjectId(projectId);
    set({ isImporting: true });

    pollTimer = setInterval(async () => {
      try {
        const prog = await api.getImportProgress(projectId);
        set({ importProgress: prog });

        if (prog.status === "completed" || prog.status === "failed") {
          clearInterval(pollTimer);
          pollTimer = null;
          set({ isImporting: false });
          if (onComplete) {
            await onComplete();
          }
        }
      } catch (e) {
        console.warn("Poll import progress error:", e);
      }
    }, 1000);
  },

  stopPolling: () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    set({ isImporting: false });
  },

  clearState: () => {
    get().stopPolling();
    set({
      folderPath: "",
      productName: "",
      productCategory: "Laptop",
      previewResult: null,
      previewError: null,
      isImporting: false,
      importProgress: null,
      activeProjectId: null
    });
    try {
      localStorage.removeItem(STORAGE_KEY_FOLDER);
      localStorage.removeItem(STORAGE_KEY_PROD_NAME);
      localStorage.removeItem(STORAGE_KEY_PROD_CAT);
      localStorage.removeItem(STORAGE_KEY_ACTIVE_PID);
    } catch {}
  }
}));
