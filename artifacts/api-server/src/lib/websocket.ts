import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage, Server } from "http";
import { logger } from "./logger";

interface RoomClient {
  ws: WebSocket;
  roomId: number;
}

let wss: WebSocketServer | null = null;
const clients = new Set<RoomClient>();

export function initWebSocketServer(server: Server) {
  wss = new WebSocketServer({ server, path: "/api/ws" });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url ?? "", "http://localhost");
    const roomId = parseInt(url.searchParams.get("roomId") ?? "0");

    if (!roomId) {
      ws.close(1008, "roomId required");
      return;
    }

    const client: RoomClient = { ws, roomId };
    clients.add(client);
    logger.info({ roomId }, "WebSocket client connected");

    ws.on("close", () => {
      clients.delete(client);
      logger.info({ roomId }, "WebSocket client disconnected");
    });

    ws.on("error", (err) => {
      logger.error({ err, roomId }, "WebSocket error");
      clients.delete(client);
    });

    ws.send(JSON.stringify({ type: "connected", roomId }));
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
