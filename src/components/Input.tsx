import { forwardRef, useId } from "react";
import type { InputProps } from "@/types/components";

const sizeClasses: Record<string, string> = {
  sm: "px-3 py-2 text-sm",
  md: "px-4 py-3",
};

const baseClass =
  "w-full rounded-lg border border-gray-300 bg-gray-50 text-gray-900 placeholder-gray-400 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500";

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, mono = false, inputSize = "md", id, className = "", ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;

  const classes = [
    baseClass,
    sizeClasses[inputSize],
    mono ? "font-mono" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-300"
        >
          {label}
        </label>
      )}
      <input ref={ref} id={inputId} className={classes} {...rest} />
      {error && (
        <p className="mt-1 text-sm text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  );
});

export default Input;
