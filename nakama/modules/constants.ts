const OP_MOVE = 1;

const OP_STATE_UPDATE = 10;
const OP_GAME_START = 11;
const OP_GAME_OVER = 12;
const OP_ERROR = 13;
const OP_OPPONENT_LEFT = 14;
const OP_MATCH_TERMINATED = 15;
const OP_OPPONENT_RECONNECTED = 16;

const LEADERBOARD_ID = "tic-tac-toe-wins";
const STATS_COLLECTION = "player_stats";
const STATS_KEY = "summary";

const SCORE_WIN = 3;
const SCORE_DRAW = 1;

const RECONNECT_GRACE_SECONDS = 15;
const GRACE_TICK_RATE = 5;

// Win condition lines — flat [r,c,r,c,r,c] format per line
const WIN_LINES: number[][] = [
  // Rows
  0, 0, 0, 1, 0, 2, 1, 0, 1, 1, 1, 2, 2, 0, 2, 1, 2, 2,
  // Columns
  0, 0, 1, 0, 2, 0, 0, 1, 1, 1, 2, 1, 0, 2, 1, 2, 2, 2,
  // Diagonals
  0, 0, 1, 1, 2, 2, 0, 2, 1, 1, 2, 0,
].reduce<number[][]>((acc, _, i, arr) => {
  // Group flat pairs into [r,c,r,c,r,c] triples
  if (i % 6 === 0) {
    acc.push([
      arr[i] as number,
      arr[i + 1] as number,
      arr[i + 2] as number,
      arr[i + 3] as number,
      arr[i + 4] as number,
      arr[i + 5] as number,
    ]);
  }
  return acc;
}, []);
