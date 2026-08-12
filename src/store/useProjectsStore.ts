import { create } from "zustand";

type ProjectFilter = "all" | "internal" | "client";

interface ProjectsUiState {
  filter: ProjectFilter;
  expandedId: string | null;
  showNewForm: boolean;
  setFilter: (f: ProjectFilter) => void;
  toggleExpanded: (id: string) => void;
  setShowNewForm: (v: boolean) => void;
}

export const useProjectsStore = create<ProjectsUiState>((set) => ({
  filter: "all",
  expandedId: null,
  showNewForm: false,
  setFilter: (f) => set({ filter: f }),
  toggleExpanded: (id) => set((s) => ({ expandedId: s.expandedId === id ? null : id })),
  setShowNewForm: (v) => set({ showNewForm: v }),
}));
