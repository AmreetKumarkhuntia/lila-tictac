import { useUiStore } from "@/store/uiStore";
import { XIcon } from "@/components/icons";
import type { ToastType } from "@/types/ui";

function toastStyles(type: ToastType): string {
  switch (type) {
    case "success":
      return "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700";
    case "error":
      return "border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700";
    case "info":
      return "border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700";
  }
}

export default function ToastContainer() {
  const toasts = useUiStore((s) => s.toasts);
  const removeToast = useUiStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-4 bottom-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-2 rounded-lg border-l-4 px-4 py-3 shadow-lg animate-[fadeIn_200ms_ease-out] ${toastStyles(toast.type)}`}
          role="alert"
        >
          <p className="flex-1 text-sm font-medium">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="shrink-0 text-current opacity-60 transition-opacity hover:opacity-100"
            aria-label="Dismiss"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
