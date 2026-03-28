export default function Board() {
  return (
    <div className="grid grid-cols-3 gap-2 rounded-xl bg-gray-200 p-2 dark:bg-gray-800">
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          className="flex h-24 w-24 items-center justify-center rounded-lg bg-gray-100 text-3xl font-bold text-gray-400 dark:bg-gray-700 dark:text-gray-500"
        >
          -
        </div>
      ))}
    </div>
  );
}
