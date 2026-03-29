import { forwardRef } from "react";
import type { ButtonProps } from "@/types/components";

const variantClasses: Record<string, string> = {
  primary:
    "rounded-lg bg-indigo-600 text-white transition hover:bg-indigo-700 active:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50",
  secondary:
    "rounded-lg border border-gray-300 text-gray-700 transition hover:bg-gray-100 active:bg-gray-200 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:active:bg-gray-700",
  ghost:
    "rounded-lg transition text-gray-400 hover:text-red-500 dark:hover:text-red-400",
  icon: "rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200",
};

const sizeClasses: Record<string, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-sm font-semibold",
  lg: "px-4 py-3 font-semibold",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    fullWidth = false,
    loading = false,
    loadingText,
    disabled,
    className = "",
    children,
    ...rest
  },
  ref,
) {
  const isIcon = variant === "icon";

  const classes = [
    variantClasses[variant],
    !isIcon ? sizeClasses[size] : "",
    fullWidth ? "w-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={classes}
      {...rest}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
          {loadingText ?? children}
        </span>
      ) : (
        children
      )}
    </button>
  );
});

export default Button;
