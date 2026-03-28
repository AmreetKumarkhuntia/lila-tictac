export default function PlayerCard() {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-gray-800 px-4 py-3">
      <div className="h-10 w-10 rounded-full bg-gray-600" />
      <div>
        <p className="text-sm font-semibold text-white">Player</p>
        <p className="text-xs text-gray-400">Player info display</p>
      </div>
    </div>
  );
}
