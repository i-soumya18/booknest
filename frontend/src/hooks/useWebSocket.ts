"use client";

import { useEffect } from "react";
import { wsClient } from "@/lib/websocket/client";

export function useWebSocket(onEvent: (event: any) => void) {
  useEffect(() => {
    wsClient.connect();
    wsClient.addListener(onEvent);
    return () => {
      wsClient.removeListener(onEvent);
    };
  }, [onEvent]);
}
