export default function PlayerCard() {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-gray-100 px-4 py-3 dark:bg-gray-800">
      <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
      <div>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          Player
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Player info display
        </p>
      </div>
    </div>
  );
}
