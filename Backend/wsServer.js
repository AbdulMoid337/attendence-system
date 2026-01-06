import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import { parse } from "url";

import {
  getActiveSession,
  setActiveSession,
  clearActiveSession,
} from "./state/activeSession.js";

import ClassModel from "./models/Class.js";
import User from "./models/User.js";
import Attendence from "./models/Attendence.js";

export function initWebSocketServer(server) {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
  });

  // Broadcast helper
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
      // 1. Extract token from query ?token=<JWT>
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

      // 2. Verify JWT
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

      // 3. Attach user info
      ws.user = {
        userId: decoded.userId,
        role: decoded.role,
      };

      // 4. Handle incoming messages
      ws.on("message", async (message) => {
        let parsed;

        try {
          parsed = JSON.parse(message.toString());
        } catch {
          ws.send(
            JSON.stringify({
              event: "ERROR",
              data: { message: "Invalid JSON message" },
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
// wsServer.js (below imports) todo in diff file
async function handleAttendanceMarked(ws, data, broadcast) {
  if (ws.user.role !== "teacher") {
    ws.send(
      JSON.stringify({
        event: "ERROR",
        data: { message: "Forbidden, teacher event only" },
      }),
    );
    return;
  }

  const activeSession = getActiveSession();
  if (!activeSession) {
    ws.send(
      JSON.stringify({
        event: "ERROR",
        data: { message: "No active attendance session" },
      }),
    );
    return;
  }

  const { studentId, status } = data || {};
  if (!studentId || !["present", "absent"].includes(status)) {
    ws.send(
      JSON.stringify({
        event: "ERROR",
        data: { message: "Invalid ATTENDANCE_MARKED payload" },
      }),
    );
    return;
  }

  activeSession.attendance[studentId] = status;
  setActiveSession(activeSession);

  broadcast({
    event: "ATTENDANCE_MARKED",
    data: { studentId, status },
  });
}

async function handleTodaySummary(ws, broadcast) {
  if (ws.user.role !== "teacher") {
    ws.send(
      JSON.stringify({
        event: "ERROR",
        data: { message: "Forbidden, teacher event only" },
      }),
    );
    return;
  }

  const activeSession = getActiveSession();
  if (!activeSession) {
    ws.send(
      JSON.stringify({
        event: "ERROR",
        data: { message: "No active attendance session" },
      }),
    );
    return;
  }

  const statuses = Object.values(activeSession.attendance);
  const present = statuses.filter((s) => s === "present").length;
  const absent = statuses.filter((s) => s === "absent").length;
  const total = present + absent;

  broadcast({
    event: "TODAY_SUMMARY",
    data: { present, absent, total },
  });
}

async function handleMyAttendance(ws) {
  if (ws.user.role !== "student") {
    ws.send(
      JSON.stringify({
        event: "ERROR",
        data: { message: "Forbidden, student event only" },
      }),
    );
    return;
  }

  const activeSession = getActiveSession();
  if (!activeSession) {
    ws.send(
      JSON.stringify({
        event: "ERROR",
        data: { message: "No active attendance session" },
      }),
    );
    return;
  }

  const status = activeSession.attendance[ws.user.userId] || "not yet updated";

  ws.send(
    JSON.stringify({
      event: "MY_ATTENDANCE",
      data: { status },
    }),
  );
}

async function handleDone(ws, broadcast) {
  if (ws.user.role !== "teacher") {
    ws.send(
      JSON.stringify({
        event: "ERROR",
        data: { message: "Forbidden, teacher event only" },
      }),
    );
    return;
  }

  const activeSession = getActiveSession();
  if (!activeSession) {
    ws.send(
      JSON.stringify({
        event: "ERROR",
        data: { message: "No active attendance session" },
      }),
    );
    return;
  }

  const classId = activeSession.classId;

  // 2. Get all students in active class
  const cls = await ClassModel.findById(classId);
  if (!cls) {
    ws.send(
      JSON.stringify({
        event: "ERROR",
        data: { message: "Class not found" },
      }),
    );
    return;
  }

  // 3. Mark absents in memory
  const presentMap = activeSession.attendance; // { studentId: 'present' | 'absent' }
  const allStudentIds = cls.studentIds.map((id) => id.toString());

  allStudentIds.forEach((sId) => {
    if (!presentMap[sId]) {
      presentMap[sId] = "absent";
    }
  });

  // 4. Persist to MongoDB
  const attendanceDocs = allStudentIds.map((sId) => ({
    classId,
    studentsId: sId,
    status: presentMap[sId],
  }));

  await Attendence.deleteMany({ classId }); // optional: clear old records
  await Attendence.insertMany(attendanceDocs);

  // 5. Calculate final summary
  const statuses = Object.values(presentMap);
  const present = statuses.filter((s) => s === "present").length;
  const absent = statuses.filter((s) => s === "absent").length;
  const total = present + absent;

  // 6. Clear memory
  clearActiveSession();

  // 7. Broadcast DONE
  broadcast({
    event: "DONE",
    data: {
      message: "Attendance persisted",
      present,
      absent,
      total,
    },
  });
}
