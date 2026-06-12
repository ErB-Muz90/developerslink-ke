import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage, Server } from "http";
import { logger } from "./logger";

interface TrackedClient {
  ws: WebSocket;
  roomId: number;
  userId?: number;
}

let wss: WebSocketServer | null = null;
const clients = new Set<TrackedClient>();

export function initWebSocketServer(server: Server) {
  wss = new WebSocketServer({ server, path: "/api/ws" });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url ?? "", "http://localhost");
    const roomId = parseInt(url.searchParams.get("roomId") ?? "0");
    const userId = url.searchParams.get("userId")
      ? parseInt(url.searchParams.get("userId")!)
      : undefined;

    if (!roomId) {
      ws.close(1008, "roomId required");
      return;
    }

    const client: TrackedClient = { ws, roomId, userId };
    clients.add(client);
    logger.info({ roomId, userId }, "WebSocket client connected");

    ws.on("close", () => {
      clients.delete(client);
      logger.info({ roomId, userId }, "WebSocket client disconnected");
    });

    ws.on("error", (err) => {
      logger.error({ err, roomId, userId }, "WebSocket error");
      clients.delete(client);
    });

    ws.send(JSON.stringify({ type: "connected", roomId, userId }));
  });

  logger.info("WebSocket server initialized at /api/ws");
}

export function broadcastToRoom(roomId: number, payload: unknown) {
  const message = JSON.stringify(payload);
  for (const client of clients) {
    if (client.roomId === roomId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  }
}

export function broadcastToUser(userId: number, payload: unknown) {
  const message = JSON.stringify(payload);
  for (const client of clients) {
    if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  }
}
