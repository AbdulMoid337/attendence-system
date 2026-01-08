import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import { parse } from "url";
import {
  handleAttendanceMarked,
  handleTodaySummary,
  handleMyAttendance,
  handleDone,
} from "./handlers/wsHandleres.js";

export function initWebSocketServer(server) {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
  });

  const broadcast = (messageObj) => {
    const data = JSON.stringify(messageObj);

    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  };

  wss.on("connection", async (ws, req) => {
    try {
      const { query } = parse(req.url, true);
      const token = query.token;

      if (!token) {
        ws.send(
          JSON.stringify({
            event: "ERROR",
            data: { message: "Unauthorized or invalid token" },
          }),
        );
        ws.close();
        return;
      }

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch {
        ws.send(
          JSON.stringify({
            event: "ERROR",
            data: { message: "Unauthorized or invalid token" },
          }),
        );
        ws.close();
        return;
      }

      ws.user = {
        userId: decoded.userId,
        role: decoded.role,
      };

      ws.on("message", async (message) => {
        let parsed;

        try {
          parsed = JSON.parse(message.toString());
        } catch {
          ws.send(
            JSON.stringify({
              event: "ERROR",
              data: { message: "Invalid message format" },
            }),
          );
          return;
        }

        const { event, data } = parsed ?? {};

        switch (event) {
          case "ATTENDANCE_MARKED":
            await handleAttendanceMarked(ws, data, broadcast);
            break;

          case "TODAY_SUMMARY":
            await handleTodaySummary(ws, broadcast);
            break;

          case "MY_ATTENDANCE":
            await handleMyAttendance(ws);
            break;

          case "DONE":
            await handleDone(ws, broadcast);
            break;

          default:
            ws.send(
              JSON.stringify({
                event: "ERROR",
                data: { message: "Unknown event" },
              }),
            );
        }
      });
    } catch (error) {
      ws.send(
        JSON.stringify({
          event: "ERROR",
          data: { message: "Server error" },
        }),
      );
      ws.close();
    }
  });
}
