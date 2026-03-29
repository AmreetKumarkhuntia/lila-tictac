import Table from "@/components/Table";
import type { LeaderboardProps, TableColumn } from "@/types/components";
import type { LeaderboardRecord } from "@/types/leaderboard";

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

const columns: TableColumn<LeaderboardRecord & { isCurrentUser: boolean }>[] = [
  {
    key: "rank",
    header: "#",
    render: (row) => {
      const badge = getRankBadge(row.rank);
      return badge ? (
        <span
          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${badge}`}
        >
          {row.rank}
        </span>
      ) : (
        <span className="inline-flex h-6 w-6 items-center justify-center text-xs text-gray-500 dark:text-gray-400">
          {row.rank}
        </span>
      );
    },
  },
  {
    key: "player",
    header: "Player",
    render: (row) => (
      <span
        className={`font-medium ${
          row.isCurrentUser
            ? "text-indigo-600 dark:text-indigo-400"
            : "text-gray-900 dark:text-white"
        }`}
      >
        {row.username}
        {row.isCurrentUser && (
          <span className="ml-1.5 text-xs text-indigo-400 dark:text-indigo-500">
            (you)
          </span>
        )}
      </span>
    ),
  },
  {
    key: "score",
    header: "Score",
    align: "right",
    render: (row) => (
      <span className="font-semibold tabular-nums text-gray-900 dark:text-white">
        {row.score}
      </span>
    ),
  },
  {
    key: "wins",
    header: "Wins",
    align: "right",
    hiddenClass: "hidden sm:table-cell",
    render: (row) => (
      <span className="tabular-nums text-gray-600 dark:text-gray-300">
        {row.metadata.wins}
      </span>
    ),
  },
  {
    key: "games",
    header: "Games",
    align: "right",
    hiddenClass: "hidden sm:table-cell",
    render: (row) => (
      <span className="tabular-nums text-gray-600 dark:text-gray-300">
        {row.metadata.gamesPlayed}
      </span>
    ),
  },
  {
    key: "winRate",
    header: "Win%",
    align: "right",
    render: (row) => (
      <span className="tabular-nums text-gray-600 dark:text-gray-300">
        {row.metadata.winRate.toFixed(1)}%
      </span>
    ),
  },
];

export default function Leaderboard({
  records,
  currentUserId,
}: LeaderboardProps) {
  const data = records.map((record) => ({
    ...record,
    isCurrentUser: record.ownerId === currentUserId,
  }));

  return (
    <Table
      columns={columns}
      data={data}
      rowKey={(row) => row.ownerId}
      highlightRow={(row) => row.isCurrentUser}
      emptyMessage="No records yet. Play a game to appear on the leaderboard!"
    />
  );
}
