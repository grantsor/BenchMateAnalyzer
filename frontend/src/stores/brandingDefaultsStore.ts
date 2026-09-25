import { create } from "zustand";

export interface BrandingDefaultsState {
  publicationName: string;
  logoUrl: string;
  logoAspectRatio: number;
  defaultAspectRatio: "16:9" | "9:16";
  defaultResolution: "720p" | "1080p" | "4k";
  defaultFormat: "webp" | "png" | "jpeg";
  autoSwitchVerticalEnabled: boolean;
  autoSwitchThreshold: number;
  exportNamingTemplate: string;
  defaultBatchMode: "individual" | "zip";

  setPublicationName: (name: string) => void;
  setLogoUrl: (url: string, aspect?: number) => void;
  setDefaultAspectRatio: (ratio: "16:9" | "9:16") => void;
  setDefaultResolution: (res: "720p" | "1080p" | "4k") => void;
  setDefaultFormat: (fmt: "webp" | "png" | "jpeg") => void;
  setAutoSwitchVerticalEnabled: (enabled: boolean) => void;
  setAutoSwitchThreshold: (threshold: number) => void;
  setExportNamingTemplate: (template: string) => void;
  setDefaultBatchMode: (mode: "individual" | "zip") => void;
  resetDefaults: () => void;
}

const STORAGE_KEY = "bm_branding_defaults_v1";

export interface BrandingValues {
  publicationName: string;
  logoUrl: string;
  logoAspectRatio: number;
  defaultAspectRatio: "16:9" | "9:16";
  defaultResolution: "720p" | "1080p" | "4k";
  defaultFormat: "webp" | "png" | "jpeg";
  autoSwitchVerticalEnabled: boolean;
  autoSwitchThreshold: number;
  exportNamingTemplate: string;
  defaultBatchMode: "individual" | "zip";
}

const INITIAL_DEFAULTS: BrandingValues = {
  publicationName: "GADGET PILIPINAS",
  logoUrl: "/Full Logo Horizontal Colored.png",
  logoAspectRatio: 2.7778,
  defaultAspectRatio: "16:9",
  defaultResolution: "720p",
  defaultFormat: "webp",
  autoSwitchVerticalEnabled: true,
  autoSwitchThreshold: 8,
  exportNamingTemplate: "[product] - [benchmark] - [resolution]",
  defaultBatchMode: "individual",
};

function loadStoredDefaults() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...INITIAL_DEFAULTS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn("Could not load stored branding defaults:", e);
  }
  return INITIAL_DEFAULTS;
}

export const useBrandingDefaultsStore = create<BrandingDefaultsState>((set, get) => {
  const initial = loadStoredDefaults();

  const persist = (updated: Partial<typeof INITIAL_DEFAULTS>) => {
    const current = get();
    const payload = {
      publicationName: updated.publicationName ?? current.publicationName,
      logoUrl: updated.logoUrl ?? current.logoUrl,
      logoAspectRatio: updated.logoAspectRatio ?? current.logoAspectRatio,
      defaultAspectRatio: updated.defaultAspectRatio ?? current.defaultAspectRatio,
      defaultResolution: updated.defaultResolution ?? current.defaultResolution,
      defaultFormat: updated.defaultFormat ?? current.defaultFormat,
      autoSwitchVerticalEnabled: updated.autoSwitchVerticalEnabled ?? current.autoSwitchVerticalEnabled,
      autoSwitchThreshold: updated.autoSwitchThreshold ?? current.autoSwitchThreshold,
      exportNamingTemplate: updated.exportNamingTemplate ?? current.exportNamingTemplate,
      defaultBatchMode: updated.defaultBatchMode ?? current.defaultBatchMode,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn("Failed to persist branding defaults:", e);
    }
  };

  return {
    ...initial,
    setPublicationName: (name) => {
      set({ publicationName: name });
      persist({ publicationName: name });
    },
    setLogoUrl: (url, aspect) => {
      const asp = aspect || 2.7778;
      set({ logoUrl: url, logoAspectRatio: asp });
      persist({ logoUrl: url, logoAspectRatio: asp });
    },
    setDefaultAspectRatio: (ratio) => {
      set({ defaultAspectRatio: ratio });
      persist({ defaultAspectRatio: ratio });
    },
    setDefaultResolution: (res) => {
      set({ defaultResolution: res });
      persist({ defaultResolution: res });
    },
    setDefaultFormat: (fmt) => {
      set({ defaultFormat: fmt });
      persist({ defaultFormat: fmt });
    },
    setAutoSwitchVerticalEnabled: (enabled) => {
      set({ autoSwitchVerticalEnabled: enabled });
      persist({ autoSwitchVerticalEnabled: enabled });
    },
    setAutoSwitchThreshold: (threshold) => {
      set({ autoSwitchThreshold: threshold });
      persist({ autoSwitchThreshold: threshold });
    },
    setExportNamingTemplate: (template) => {
      set({ exportNamingTemplate: template });
      persist({ exportNamingTemplate: template });
    },
    setDefaultBatchMode: (mode) => {
      set({ defaultBatchMode: mode });
      persist({ defaultBatchMode: mode });
    },
    resetDefaults: () => {
      set(INITIAL_DEFAULTS);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DEFAULTS));
      } catch (e) {}
    }
  };
});
