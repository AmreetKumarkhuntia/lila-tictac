import type { TabGroupProps } from "@/types/components";

const sizeClasses: Record<string, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-3 py-2 text-sm",
};

export default function TabGroup<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
  size = "md",
}: TabGroupProps<T>) {
  return (
    <div className="flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`flex-1 rounded-md font-medium transition ${sizeClasses[size]} ${
              isActive
                ? "bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            } disabled:cursor-not-allowed`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
