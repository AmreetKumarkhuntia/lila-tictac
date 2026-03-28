import { Client } from "@heroiclabs/nakama-js";
import type { Session, Socket } from "@heroiclabs/nakama-js";

// ---------------------------------------------------------------------------
// Connection config
// If VITE_NAKAMA_URL is set (e.g. "https://xyz.ngrok.io"), it takes
// precedence and the host/port/ssl are parsed from that URL.
// Otherwise, fall back to the individual env vars for local development.
// ---------------------------------------------------------------------------

function parseNakamaConfig() {
  const rawUrl = import.meta.env.VITE_NAKAMA_URL as string | undefined;
  if (rawUrl) {
    const url = new URL(rawUrl);
    const useSsl = url.protocol === "https:";
    // Tunnel services (ngrok, Cloudflare) use standard ports (443/80),
    // which the Nakama client omits when empty string is passed.
    const port = url.port || (useSsl ? "443" : "80");
    return {
      host: url.hostname,
      port,
      ssl: useSsl,
      serverKey: import.meta.env.VITE_NAKAMA_SERVER_KEY ?? "defaultkey",
    };
  }
  return {
    host: import.meta.env.VITE_NAKAMA_HOST ?? "127.0.0.1",
    port: import.meta.env.VITE_NAKAMA_PORT ?? "7350",
    ssl: import.meta.env.VITE_NAKAMA_SSL === "true",
    serverKey: import.meta.env.VITE_NAKAMA_SERVER_KEY ?? "defaultkey",
  };
}

const { host, port, ssl, serverKey } = parseNakamaConfig();

export const nakamaClient = new Client(serverKey, host, port, ssl);

// ---------------------------------------------------------------------------
// Shared socket singleton
// Both useMatchmaker and useMatch share a single WebSocket connection so that
// the matchmaker can receive `onmatchmakermatched` events and then seamlessly
// hand off to match gameplay without reconnecting.
// ---------------------------------------------------------------------------

let sharedSocket: Socket | null = null;
let socketConnected = false;
let connectingPromise: Promise<Socket> | null = null;

/**
 * Get (or create + connect) the shared Nakama socket.
 * Subsequent calls return the same socket as long as it hasn't been
 * explicitly disconnected via `disconnectSocket()`.
 *
 * Uses promise deduplication — concurrent callers share the same
 * in-flight connection attempt instead of creating multiple sockets.
 */
export async function getSocket(session: Session): Promise<Socket> {
  if (sharedSocket && socketConnected) {
    return sharedSocket;
  }

  if (connectingPromise) {
    return connectingPromise;
  }

  connectingPromise = (async () => {
    sharedSocket = nakamaClient.createSocket(ssl, false);

    sharedSocket.ondisconnect = () => {
      socketConnected = false;
      // Keep the reference so callers can still check, but mark as disconnected.
      // Callers (hooks) will set their own ondisconnect *after* getSocket resolves.
    };

    await sharedSocket.connect(session, false);
    socketConnected = true;
    connectingPromise = null;
    return sharedSocket;
  })();

  try {
    return await connectingPromise;
  } catch (err) {
    connectingPromise = null;
    throw err;
  }
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
  connectingPromise = null;
}

export function isSocketConnected(): boolean {
  return socketConnected && sharedSocket !== null;
}
