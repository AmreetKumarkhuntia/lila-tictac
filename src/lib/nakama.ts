import { Client } from "@heroiclabs/nakama-js";
import type { Session, Socket } from "@heroiclabs/nakama-js";

const host = import.meta.env.VITE_NAKAMA_HOST ?? "127.0.0.1";
const port = import.meta.env.VITE_NAKAMA_PORT ?? "7350";
const ssl = import.meta.env.VITE_NAKAMA_SSL === "true";
const serverKey = import.meta.env.VITE_NAKAMA_SERVER_KEY ?? "defaultkey";

export const nakamaClient = new Client(serverKey, host, port, ssl);

// ---------------------------------------------------------------------------
// Shared socket singleton
// Both useMatchmaker and useMatch share a single WebSocket connection so that
// the matchmaker can receive `onmatchmakermatched` events and then seamlessly
// hand off to match gameplay without reconnecting.
// ---------------------------------------------------------------------------

let sharedSocket: Socket | null = null;
let socketConnected = false;

/**
 * Get (or create + connect) the shared Nakama socket.
 * Subsequent calls return the same socket as long as it hasn't been
 * explicitly disconnected via `disconnectSocket()`.
 */
export async function getSocket(session: Session): Promise<Socket> {
  if (sharedSocket && socketConnected) {
    return sharedSocket;
  }

  sharedSocket = nakamaClient.createSocket(ssl, false);

  sharedSocket.ondisconnect = () => {
    socketConnected = false;
    // Keep the reference so callers can still check, but mark as disconnected.
    // Callers (hooks) will set their own ondisconnect *after* getSocket resolves.
  };

  await sharedSocket.connect(session, false);
  socketConnected = true;
  return sharedSocket;
}

/**
 * Disconnect the shared socket and release the reference.
 * Safe to call even if already disconnected.
 */
export function disconnectSocket() {
  if (sharedSocket) {
    sharedSocket.disconnect(false);
    sharedSocket = null;
    socketConnected = false;
  }
}

/**
 * Check whether a shared socket exists and is connected.
 */
export function isSocketConnected(): boolean {
  return socketConnected && sharedSocket !== null;
}
