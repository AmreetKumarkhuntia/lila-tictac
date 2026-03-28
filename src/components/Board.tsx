export default function Board() {
  return (
    <div className="grid grid-cols-3 gap-2 rounded-xl bg-gray-800 p-2">
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          className="flex h-24 w-24 items-center justify-center rounded-lg bg-gray-700 text-3xl font-bold text-gray-500"
        >
          -
        </div>
      ))}
    </div>
  );
}
