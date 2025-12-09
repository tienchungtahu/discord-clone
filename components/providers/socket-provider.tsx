"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { io as ClientIO, Socket } from "socket.io-client";

type SocketContextType = {
  socket: Socket | null;
  isConnected: boolean;
  latency: number | null;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  latency: null,
});

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    const socketInstance = ClientIO(process.env.NEXT_PUBLIC_BASE_URL!, {
      path: "/api/socket/io",
      addTrailingSlash: false,
      // Cải thiện reconnection
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      // Transports
      transports: ["websocket", "polling"],
    });

    socketInstance.on("connect", () => {
      console.log("[Socket] Connected:", socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected:", reason);
      setIsConnected(false);
    });

    socketInstance.on("connect_error", (error) => {
      console.log("[Socket] Connection error:", error.message);
      // Fallback to polling if websocket fails
      if (socketInstance.io.opts.transports?.includes("websocket")) {
        socketInstance.io.opts.transports = ["polling", "websocket"];
      }
    });

    socketInstance.on("reconnect", (attemptNumber) => {
      console.log("[Socket] Reconnected after", attemptNumber, "attempts");
    });

    setSocket(socketInstance);

    // Ping check interval
    const interval = setInterval(() => {
      if (socketInstance.connected) {
        const start = Date.now();
        socketInstance.emit("ping-check", () => {
          const duration = Date.now() - start;
          setLatency(duration);
        });
      }
    }, 3000);

    return () => {
      clearInterval(interval);
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected, latency }}>
      {children}
    </SocketContext.Provider>
  );
};