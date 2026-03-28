import type { MatchData } from "@heroiclabs/nakama-js";
import { useGameStore } from "@/store/gameStore";
import { useUiStore } from "@/store/uiStore";
import { OP_CODE } from "@/lib/constants";
import type {
  StateUpdateMessage,
  GameStartMessage,
  GameOverMessage,
  ErrorMessage,
  OpponentLeftMessage,
  OpponentReconnectedMessage,
} from "@/types/protocol";

function decodeMatchData(data: Uint8Array): string {
  return new TextDecoder().decode(data);
}

/**
 * Shared match-data handler used by both useMatch and useMatchmaker.
 *
 * This is a plain function (not a hook) that reads from Zustand stores via
 * `getState()`, so it can be safely assigned to `socket.onmatchdata` from
 * any context — inside React components, callbacks, or async flows.
 */
export function handleMatchData(matchData: MatchData): void {
  const opCode = matchData.op_code;
  let payload: string;

  try {
    payload = decodeMatchData(matchData.data);
  } catch {
    console.error("[match] failed to decode match data");
    return;
  }

  console.log("[match] received opCode=%d payload=%s", opCode, payload.slice(0, 200));

  switch (opCode) {
    case OP_CODE.STATE_UPDATE: {
      const data: StateUpdateMessage = JSON.parse(payload);
      useGameStore.getState().applyStateUpdate(data);
      break;
    }

    case OP_CODE.GAME_START: {
      const data: GameStartMessage = JSON.parse(payload);
      useGameStore.getState().setGameStart(
        data.players,
        data.mode,
        data.assignedSymbol,
      );
      break;
    }

    case OP_CODE.GAME_OVER: {
      const data: GameOverMessage = JSON.parse(payload);
      useGameStore.getState().setGameOver(data.winner, data.winningLine, data.reason);
      break;
    }

    case OP_CODE.ERROR: {
      const data: ErrorMessage = JSON.parse(payload);
      useUiStore.getState().addToast(data.message, "error");
      break;
    }

    case OP_CODE.OPPONENT_LEFT: {
      const data: OpponentLeftMessage = JSON.parse(payload);
      if (data.reason === "disconnected_temporary") {
        // Opponent disconnected but may reconnect — show waiting state
        useGameStore.getState().setOpponentDisconnected(true);
        useUiStore.getState().addToast("Opponent disconnected — waiting for reconnect...", "info");
      } else {
        // Permanent disconnect / forfeit
        useGameStore.getState().setGameOver(data.winner, null, "forfeit");
      }
      break;
    }

    case OP_CODE.OPPONENT_RECONNECTED: {
      JSON.parse(payload) as OpponentReconnectedMessage;
      useGameStore.getState().setOpponentDisconnected(false);
      useUiStore.getState().addToast("Opponent reconnected!", "success");
      break;
    }

    case OP_CODE.MATCH_TERMINATED: {
      useGameStore.getState().resetGame();
      useUiStore.getState().addToast("Match terminated by server", "error");
      break;
    }

    default:
      console.warn("Unknown match op code:", opCode);
  }
}
