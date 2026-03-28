import type { LeaderboardProps } from "@/types/components";

function getRankBadge(rank: number): string | null {
  switch (rank) {
    case 1:
      return "bg-amber-400 text-amber-900";
    case 2:
      return "bg-gray-300 text-gray-700";
    case 3:
      return "bg-orange-400 text-orange-900";
    default:
      return null;
  }
}

export default function Leaderboard({ records, currentUserId }: LeaderboardProps) {
  if (records.length === 0) {
    return (
      <div className="rounded-xl bg-gray-100 p-8 text-center dark:bg-gray-800">
        <p className="text-gray-500 dark:text-gray-400">
          No records yet. Play a game to appear on the leaderboard!
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
            <th className="px-3 py-2.5 font-semibold text-gray-600 dark:text-gray-300">
              #
            </th>
            <th className="px-3 py-2.5 font-semibold text-gray-600 dark:text-gray-300">
              Player
            </th>
            <th className="px-3 py-2.5 text-right font-semibold text-gray-600 dark:text-gray-300">
              Score
            </th>
            <th className="hidden px-3 py-2.5 text-right font-semibold text-gray-600 dark:text-gray-300 sm:table-cell">
              Wins
            </th>
            <th className="hidden px-3 py-2.5 text-right font-semibold text-gray-600 dark:text-gray-300 sm:table-cell">
              Games
            </th>
            <th className="px-3 py-2.5 text-right font-semibold text-gray-600 dark:text-gray-300">
              Win%
            </th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => {
            const isCurrentUser = record.ownerId === currentUserId;
            const badge = getRankBadge(record.rank);

            return (
              <tr
                key={record.ownerId}
                className={`border-b border-gray-100 transition-colors last:border-b-0 dark:border-gray-800 ${
                  isCurrentUser
                    ? "bg-indigo-50 dark:bg-indigo-950/30"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800/30"
                }`}
              >
                <td className="px-3 py-2.5">
                  {badge ? (
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${badge}`}
                    >
                      {record.rank}
                    </span>
                  ) : (
                    <span className="inline-flex h-6 w-6 items-center justify-center text-xs text-gray-500 dark:text-gray-400">
                      {record.rank}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className={`font-medium ${
                      isCurrentUser
                        ? "text-indigo-600 dark:text-indigo-400"
                        : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {record.username}
                    {isCurrentUser && (
                      <span className="ml-1.5 text-xs text-indigo-400 dark:text-indigo-500">
                        (you)
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-gray-900 dark:text-white">
                  {record.score}
                </td>
                <td className="hidden px-3 py-2.5 text-right tabular-nums text-gray-600 dark:text-gray-300 sm:table-cell">
                  {record.metadata.wins}
                </td>
                <td className="hidden px-3 py-2.5 text-right tabular-nums text-gray-600 dark:text-gray-300 sm:table-cell">
                  {record.metadata.gamesPlayed}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-gray-600 dark:text-gray-300">
                  {record.metadata.winRate.toFixed(1)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
