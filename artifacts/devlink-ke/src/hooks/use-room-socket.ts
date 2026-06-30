import { useEffect, useRef, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetRoomPostsQueryKey } from "@workspace/api-client-react";

type WsMessage =
  | { type: "connected"; roomId: number; userId?: number }
  | { type: "new_post"; post: any }
  | { type: "update_post"; post: any }
  | { type: "delete_post"; postId: number }
  | { type: "new_notification"; notification: any };

interface UseRoomSocketOptions {
  userId?: number;
}

export function useRoomSocket(roomId: number, options: UseRoomSocketOptions = {}) {
  const { userId } = options;
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(true);
  const [isConnected, setIsConnected] = useState(false);
  const postsKey = getGetRoomPostsQueryKey({ roomId });

  const connect = useCallback(() => {
    if (!isMounted.current || !roomId) return;

    // Close existing connection before opening a new one
    if (wsRef.current) {
      wsRef.current.onclose = null; // prevent reconnect when we close intentionally
      wsRef.current.onerror = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const params = new URLSearchParams({ roomId: String(roomId) });
    if (userId) params.set("userId", String(userId));
    const url = `${protocol}//${window.location.host}/api/ws?${params}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (isMounted.current) setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);

        if (msg.type === "new_post") {
          queryClient.setQueryData(postsKey, (old: any[] | undefined) => {
            if (!old) return [msg.post];
            if (old.some((p) => p.id === msg.post.id)) return old;
            return [msg.post, ...old];
          });
        }

        if (msg.type === "update_post") {
          queryClient.setQueryData(postsKey, (old: any[] | undefined) =>
            old ? old.map((p) => (p.id === msg.post.id ? msg.post : p)) : old
          );
        }

        if (msg.type === "delete_post") {
          queryClient.setQueryData(postsKey, (old: any[] | undefined) =>
            old ? old.filter((p) => p.id !== msg.postId) : old
          );
        }

        if (msg.type === "new_notification") {
          window.dispatchEvent(
            new CustomEvent("devlink:notification", { detail: msg.notification })
          );
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      if (!isMounted.current) return;
      reconnectTimer.current = setTimeout(() => connect(), 3000);
    };
    ws.onerror = () => {
      ws.close();
    };
  }, [roomId, userId, queryClient, postsKey]);

  useEffect(() => {
    isMounted.current = true;
    connect();
    return () => {
      isMounted.current = false;
      setIsConnected(false);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { isConnected };
}
