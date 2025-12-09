import { Server as NetServer } from "http";
import { NextApiRequest } from "next";
import { Server as ServerIO } from "socket.io";

import { NextApiResponseServerIO } from "@/types";

export const config = {
  api: {
    bodyParser: false,
  },
};

const ioHandler = (req: NextApiRequest, res: NextApiResponseServerIO) => {
  try {
    if (!res.socket?.server) {
      res.status(500).end();
      return;
    }

    if (!res.socket.server.io) {
      const path = "/api/socket/io";
      const httpServer: NetServer = res.socket.server as any;
      const io = new ServerIO(httpServer, {
        path: path,
        addTrailingSlash: false,
        transports: ["websocket", "polling"],
        pingTimeout: 60000,
        pingInterval: 25000,
      });

      io.on("connection", (socket) => {
        socket.on("ping-check", (callback: () => void) => {
          if (typeof callback === "function") {
            callback();
          }
        });

        socket.on("error", (error) => {
          console.error("[Socket Error]", error);
        });
      });

      io.engine.on("connection_error", (err) => {
        console.error("[Socket Connection Error]", err.message);
      });

      res.socket.server.io = io;
    }
    res.end();
  } catch (error) {
    console.error("[Socket IO Handler Error]", error);
    res.status(500).end();
  }
};

export default ioHandler;
