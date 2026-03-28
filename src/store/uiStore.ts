import { create } from "zustand";

export type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;
  return "dark";
}

function applyThemeClass(theme: Theme) {
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

// Apply on module load so there's no flash of wrong theme
applyThemeClass(getInitialTheme());

interface UiState {
  isLoading: boolean;
  error: string | null;
  theme: Theme;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  isLoading: false,
  error: null,
  theme: getInitialTheme(),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
  clearError: () => set({ error: null }),
  toggleTheme: () => {
    const next = get().theme === "dark" ? "light" : "dark";
    localStorage.setItem("theme", next);
    applyThemeClass(next);
    set({ theme: next });
  },
  setTheme: (theme) => {
    localStorage.setItem("theme", theme);
    applyThemeClass(theme);
    set({ theme });
  },
}));
