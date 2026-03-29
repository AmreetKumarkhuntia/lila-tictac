export type Theme = "light" | "dark";
export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export type AuthMode = "login" | "register";
