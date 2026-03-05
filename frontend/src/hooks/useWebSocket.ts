import { useEffect, useRef, useCallback, useState } from "react";

export function useWebSocket(url: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const [lastMessage, setLastMessage] = useState<unknown>(null);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}${url}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        setLastMessage(JSON.parse(event.data));
      } catch {
        setLastMessage(event.data);
      }
    };

    ws.onclose = () => {
      setTimeout(() => {
        wsRef.current = new WebSocket(wsUrl);
      }, 3000);
    };

    return () => {
      ws.close();
    };
  }, [url]);

  const send = useCallback((data: unknown) => {
    wsRef.current?.send(JSON.stringify(data));
  }, []);

  return { lastMessage, send };
}
