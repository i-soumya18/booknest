import { getAccessToken } from "@/lib/api/client";

type EventCallback = (eventData: any) => void;

function getWsBaseUrl(): string {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    // On any non-localhost host (production domain), auto-detect secure/standard WebSocket origin
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      return `${protocol}//${window.location.host}/api/v1`;
    }
  }
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }
  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/api/v1`;
  }
  return "ws://localhost:8001/api/v1";
}

class WebSocketClient {
  private socket: WebSocket | null = null;
  private listeners: Set<EventCallback> = new Set();
  private isConnecting: boolean = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  public connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const token = getAccessToken();
    if (!token) {
      return;
    }

    const baseUrl = getWsBaseUrl();
    const wsUrl = `${baseUrl}/ws?token=${encodeURIComponent(token)}`;

    this.isConnecting = true;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.isConnecting = false;
        this.startHeartbeat();
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "domain_event" && data.event) {
            this.listeners.forEach((callback) => {
              try {
                callback(data.event);
              } catch (err) {
                console.error("Error in WS listener callback:", err);
              }
            });
          }
        } catch {
          // Non-JSON or unknown frame
        }
      };

      this.socket.onclose = () => {
        this.cleanup();
        this.scheduleReconnect();
      };

      this.socket.onerror = () => {
        this.cleanup();
      };
    } catch (err) {
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  public disconnect() {
    this.cleanup();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  public addListener(callback: EventCallback) {
    this.listeners.add(callback);
    if (!this.socket || this.socket.readyState === WebSocket.CLOSED) {
      this.connect();
    }
  }

  public removeListener(callback: EventCallback) {
    this.listeners.delete(callback);
  }

  private startHeartbeat() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);
  }

  private cleanup() {
    this.isConnecting = false;
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onclose = null;
      this.socket.onerror = null;
      if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
        this.socket.close();
      }
      this.socket = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 5000);
  }
}

export const wsClient = new WebSocketClient();
