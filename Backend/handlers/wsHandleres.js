import {
  getActiveSession,
  setActiveSession,
  clearActiveSession,
} from "../state/activeSession.js";

import ClassModel from "../models/Class.js";
import Attendence from "../models/Attendence.js";

async function sendErrorAndClose(ws, message) {
  ws.send(
    JSON.stringify({
      event: "ERROR",
      data: { message },
    })
  );
  ws.close();
}

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
  sendErrorAndClose(ws, "No active attendance session");
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
  sendErrorAndClose(ws, "No active attendance session");
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
  sendErrorAndClose(ws, "No active attendance session");
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
  sendErrorAndClose(ws, "No active attendance session");
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

export {
  handleAttendanceMarked,
  handleTodaySummary,
  handleMyAttendance,
  handleDone,
};
