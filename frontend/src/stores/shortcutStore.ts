import { create } from "zustand";

export interface ShortcutDefinition {
  id: string;
  label: string;
  description: string;
  defaultCombo: { key: string; ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean };
  combo: { key: string; ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean };
}

export interface ShortcutStoreState {
  shortcuts: Record<string, ShortcutDefinition>;
  updateShortcut: (id: string, combo: { key: string; ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean }) => void;
  resetShortcuts: () => void;
}

const STORAGE_KEY = "bm_custom_shortcuts_v1";

export const DEFAULT_SHORTCUTS: Record<string, ShortcutDefinition> = {
  switch_ocr: {
    id: "switch_ocr",
    label: "Switch to Benchmark OCR Analyzer",
    description: "Instantly switch active view to the OCR Benchmark Analyzer workspace",
    defaultCombo: { key: "1", ctrl: true },
    combo: { key: "1", ctrl: true }
  },
  switch_capframex: {
    id: "switch_capframex",
    label: "Switch to CapFrameX Analyzer",
    description: "Instantly switch active view to the CapFrameX Analyzer workspace",
    defaultCombo: { key: "2", ctrl: true },
    combo: { key: "2", ctrl: true }
  },
  quick_export: {
    id: "quick_export",
    label: "Quick Export Active Chart",
    description: "Export the currently active comparison chart as an image directly",
    defaultCombo: { key: "e", ctrl: true },
    combo: { key: "e", ctrl: true }
  },
  batch_export: {
    id: "batch_export",
    label: "Open Batch Export",
    description: "Open the batch export modal or initiate batch exports",
    defaultCombo: { key: "b", ctrl: true },
    combo: { key: "b", ctrl: true }
  },
  open_settings: {
    id: "open_settings",
    label: "Open BenchMate Settings",
    description: "Open the unified BenchMate Settings & Changelogs modal",
    defaultCombo: { key: ",", ctrl: true },
    combo: { key: ",", ctrl: true }
  },
  toggle_theme: {
    id: "toggle_theme",
    label: "Cycle UI Theme",
    description: "Cycle workspace theme between Clean Light, Obsidian Dark, OLED, and Midnight Navy",
    defaultCombo: { key: "T", ctrl: true, shift: true },
    combo: { key: "T", ctrl: true, shift: true }
  },
  open_data: {
    id: "open_data",
    label: "Open Data Folder",
    description: "Open the local BenchMate data and exports folder in Windows File Explorer",
    defaultCombo: { key: "o", ctrl: true },
    combo: { key: "o", ctrl: true }
  },
  open_import_folder: {
    id: "open_import_folder",
    label: "Open Active Import Folder",
    description: "Open the active app's import folder (OCR screenshots or CapFrameX captures) in Windows File Explorer",
    defaultCombo: { key: "i", ctrl: true },
    combo: { key: "i", ctrl: true }
  }
};

function formatCombo(combo: { key: string; ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean }): string {
  const parts: string[] = [];
  if (combo.ctrl) parts.push("Ctrl");
  if (combo.alt) parts.push("Alt");
  if (combo.shift) parts.push("Shift");
  if (combo.meta) parts.push("Cmd");
  let k = combo.key.toUpperCase();
  if (k === " ") k = "Space";
  parts.push(k);
  return parts.join(" + ");
}

export { formatCombo };

function loadSavedShortcuts(): Record<string, ShortcutDefinition> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      const merged: Record<string, ShortcutDefinition> = { ...DEFAULT_SHORTCUTS };
      for (const [id, combo] of Object.entries(saved)) {
        if (merged[id]) {
          merged[id] = { ...merged[id], combo: combo as any };
        }
      }
      return merged;
    }
  } catch (e) {
    console.warn("Could not load custom shortcuts:", e);
  }
  return DEFAULT_SHORTCUTS;
}

export const useShortcutStore = create<ShortcutStoreState>((set, get) => ({
  shortcuts: loadSavedShortcuts(),
  updateShortcut: (id, combo) => {
    const cur = get().shortcuts;
    if (!cur[id]) return;
    const updated = {
      ...cur,
      [id]: {
        ...cur[id],
        combo
      }
    };
    set({ shortcuts: updated });
    try {
      const serialized: Record<string, any> = {};
      for (const [k, v] of Object.entries(updated)) {
        serialized[k] = v.combo;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
    } catch (e) {}
  },
  resetShortcuts: () => {
    set({ shortcuts: DEFAULT_SHORTCUTS });
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }
}));

export function isShortcutMatch(
  combo: { key: string; ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean },
  event: KeyboardEvent
): boolean {
  const keyMatches = event.key.toLowerCase() === combo.key.toLowerCase();
  const ctrlMatches = !!combo.ctrl === (event.ctrlKey || event.metaKey);
  const shiftMatches = !!combo.shift === event.shiftKey;
  const altMatches = !!combo.alt === event.altKey;
  return keyMatches && ctrlMatches && shiftMatches && altMatches;
}
