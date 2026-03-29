import type { TableProps } from "@/types/components";

export default function Table<T>({
  columns,
  data,
  rowKey,
  highlightRow,
  emptyMessage = "No data to display.",
}: TableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl bg-gray-100 p-8 text-center dark:bg-gray-800">
        <p className="text-gray-500 dark:text-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-3 py-2.5 font-semibold text-gray-600 dark:text-gray-300 ${
                  col.align === "right" ? "text-right" : ""
                } ${col.hiddenClass ?? ""}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => {
            const highlighted = highlightRow?.(row) ?? false;

            return (
              <tr
                key={rowKey(row)}
                className={`border-b border-gray-100 transition-colors last:border-b-0 dark:border-gray-800 ${
                  highlighted
                    ? "bg-indigo-50 dark:bg-indigo-950/30"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800/30"
                }`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-3 py-2.5 ${
                      col.align === "right" ? "text-right" : ""
                    } ${col.hiddenClass ?? ""}`}
                  >
                    {col.render(row, index)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
