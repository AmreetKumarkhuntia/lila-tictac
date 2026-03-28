import { create } from "zustand";
import type { Theme, ToastType, Toast } from "@/types/ui";

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

let toastCounter = 0;

interface UiState {
  isLoading: boolean;
  error: string | null;
  theme: Theme;
  toasts: Toast[];
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  addToast: (message: string, type: ToastType) => void;
  removeToast: (id: string) => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  isLoading: false,
  error: null,
  theme: getInitialTheme(),
  toasts: [],
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => {
    set({ error, isLoading: false });
    // Surface the error as a toast so the user always sees it
    if (error) {
      get().addToast(error, "error");
    }
  },
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
  addToast: (message, type) => {
    const id = `toast-${++toastCounter}-${Date.now()}`;
    const toast: Toast = { id, message, type };
    set((state) => ({ toasts: [...state.toasts, toast] }));

    setTimeout(() => {
      get().removeToast(id);
    }, 4000);
  },
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));
