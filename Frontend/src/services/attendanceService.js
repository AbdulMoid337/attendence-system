import api from "./api.js";

export const attendanceService = {
  // Start attendance session (teacher)
  async startAttendance(classId) {
    const response = await api.post("/attendance/start", { classId });
    return response.data;
  },

  // Stop attendance session (teacher)
  async stopAttendance(classId) {
    const response = await api.post("/attendance/stop", { classId });
    return response.data;
  },

  // Note: Students cannot mark their own attendance
  // Only teachers can mark attendance via WebSocket (ATTENDANCE_MARKED event)

  // Get my attendance for a class (student)
  async getMyAttendance(classId) {
    const response = await api.get(`/class/${classId}/my-attendance`);
    return response.data;
  },

  // Get attendance records for a class (teacher)
  async getClassAttendance(classId, date = null) {
    const url = date 
      ? `/class/${classId}/attendance?date=${date}`
      : `/class/${classId}/attendance`;
    const response = await api.get(url);
    return response.data;
  },

  // Get attendance history
  async getAttendanceHistory(classId, studentId = null) {
    const url = studentId
      ? `/class/${classId}/attendance/history?studentId=${studentId}`
      : `/class/${classId}/attendance/history`;
    const response = await api.get(url);
    return response.data;
  },

  // Get attendance statistics
  async getAttendanceStats(classId) {
    const response = await api.get(`/class/${classId}/attendance/stats`);
    return response.data;
  },
};

