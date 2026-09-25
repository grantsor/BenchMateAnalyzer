import { create } from "zustand";
import { api, Project } from "../api/client";

interface ProjectState {
  currentProject: Project | null;
  projects: Project[];
  isLoading: boolean;
  error: string | null;

  fetchProjects: () => Promise<void>;
  selectProject: (id: string) => Promise<void>;
  setCurrentProject: (proj: Project | null) => void;
  refreshCurrentProject: () => Promise<void>;
}

const STORAGE_KEY_ACTIVE_PROJECT = "gp_active_project_id_v1";

export const useProjectStore = create<ProjectState>((set, get) => ({
  currentProject: null,
  projects: [],
  isLoading: false,
  error: null,

  fetchProjects: async () => {
    set({ isLoading: true, error: null });
    let attempts = 0;
    const maxAttempts = 4;

    while (attempts < maxAttempts) {
      try {
        const list = await api.getProjects();
        set({ projects: list, isLoading: false, error: null });

        // Restore previously active project, or default to first
        if (list.length > 0) {
          const storedId = localStorage.getItem(STORAGE_KEY_ACTIVE_PROJECT);
          const targetProj = (storedId && list.find((p) => p.id === storedId)) || list[0];
          if (!get().currentProject || get().currentProject?.id !== targetProj.id) {
            await get().selectProject(targetProj.id);
          }
        } else {
          set({ currentProject: null });
          try {
            localStorage.removeItem(STORAGE_KEY_ACTIVE_PROJECT);
          } catch {}
        }
        return;
      } catch (err: any) {
        attempts++;
        if (attempts >= maxAttempts) {
          set({ error: err.message, isLoading: false });
        } else {
          // Wait before retrying (e.g. backend completing lifespan startup)
          await new Promise((resolve) => setTimeout(resolve, 600 * attempts));
        }
      }
    }
  },

  selectProject: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const p = await api.getProject(id);
      set({ currentProject: p, isLoading: false });
      try {
        localStorage.setItem(STORAGE_KEY_ACTIVE_PROJECT, id);
      } catch (e) {
        console.warn("Could not persist active project id", e);
      }
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  setCurrentProject: (proj: Project | null) => {
    set({ currentProject: proj });
  },

  refreshCurrentProject: async () => {
    const curr = get().currentProject;
    if (curr) {
      await get().selectProject(curr.id);
    }
  }
}));
