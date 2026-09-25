import { create } from "zustand";

export type UITheme = "dark" | "light" | "oled" | "midnight";

export interface ThemeOption {
  id: UITheme;
  name: string;
  badge: string;
  description: string;
  surfaceColor: string;
  cardColor: string;
  borderColor: string;
  icon: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: "dark",
    name: "Obsidian Dark",
    badge: "Obsidian",
    description: "Sleek neutral dark charcoal with high-contrast borders and red accents (Default)",
    surfaceColor: "#09090b",
    cardColor: "#121215",
    borderColor: "#23232a",
    icon: "🌙"
  },
  {
    id: "light",
    name: "Clean Light",
    badge: "Light",
    description: "Bright and crisp publication style with high-contrast text and clean borders",
    surfaceColor: "#f4f5f8",
    cardColor: "#ffffff",
    borderColor: "#e2e8f0",
    icon: "☀️"
  },
  {
    id: "oled",
    name: "Pure Black",
    badge: "OLED",
    description: "100% pitch-black background for maximum contrast on OLED displays",
    surfaceColor: "#000000",
    cardColor: "#0a0a0c",
    borderColor: "#1c1c22",
    icon: "🖤"
  },
  {
    id: "midnight",
    name: "Midnight Navy",
    badge: "Deep Blue",
    description: "Classic deep blue and navy slate theme with cyan undertones",
    surfaceColor: "#0b1320",
    cardColor: "#131f30",
    borderColor: "#2a3a50",
    icon: "🌌"
  }
];

const STORAGE_KEY_UI_THEME = "gp_ui_theme_v1";

interface ThemeState {
  theme: UITheme;
  setTheme: (theme: UITheme) => void;
  cycleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => {
  let initialTheme: UITheme = "dark";
  try {
    const saved = localStorage.getItem(STORAGE_KEY_UI_THEME);
    if (saved === "dark" || saved === "light" || saved === "oled" || saved === "midnight") {
      initialTheme = saved;
    }
  } catch (e) {
    console.warn("Could not read stored UI theme:", e);
  }

  // Apply immediately on initialization
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", initialTheme);
  }

  // Multi-window synchronization
  if (typeof window !== "undefined") {
    window.addEventListener("storage", (event) => {
      if (event.key === STORAGE_KEY_UI_THEME && event.newValue) {
        const t = event.newValue as UITheme;
        if (["dark", "light", "oled", "midnight"].includes(t)) {
          set({ theme: t });
          document.documentElement.setAttribute("data-theme", t);
        }
      }
    });
  }

  return {
    theme: initialTheme,
    setTheme: (newTheme: UITheme) => {
      set({ theme: newTheme });
      try {
        localStorage.setItem(STORAGE_KEY_UI_THEME, newTheme);
      } catch (e) {
        console.warn("Could not save UI theme:", e);
      }
      if (typeof document !== "undefined") {
        document.documentElement.setAttribute("data-theme", newTheme);
      }
    },
    cycleTheme: () => {
      const order: UITheme[] = ["dark", "light", "oled", "midnight"];
      const current = get().theme;
      const nextIdx = (order.indexOf(current) + 1) % order.length;
      get().setTheme(order[nextIdx]);
    }
  };
});
