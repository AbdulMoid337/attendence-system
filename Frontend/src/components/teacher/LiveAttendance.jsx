import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { classService } from "../../services/classService.js";
import { attendanceService } from "../../services/attendanceService.js";
import websocketService from "../../services/websocketService.js";
import { authService } from "../../services/authService.js";

const LiveAttendance = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [classData, setClassData] = useState(null);
  const [attendance, setAttendance] = useState({}); // studentId: status
  const [summary, setSummary] = useState({ present: 0, absent: 0, total: 0 });
  const [sessionStarted, setSessionStarted] = useState(false);
  const [loading, setLoading] = useState(true);
  const wsInitialized = useRef(false);

  useEffect(() => {
    if (user?.role !== "teacher") {
      navigate("/dashboard");
      return;
    }

    loadClassDetails();
    initializeWebSocket();

    return () => {
      // Cleanup on unmount
      if (wsInitialized.current) {
        websocketService.off("ATTENDANCE_MARKED", handleAttendanceMarked);
        websocketService.off("TODAY_SUMMARY", handleTodaySummary);
        websocketService.off("DONE", handleDone);
        websocketService.off("ERROR", handleError);
      }
    };
  }, [user, id, navigate]);

  const initializeWebSocket = async () => {
    if (wsInitialized.current) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      websocketService.connect(token);

      // Listen to WebSocket events
      websocketService.on("ATTENDANCE_MARKED", handleAttendanceMarked);
      websocketService.on("TODAY_SUMMARY", handleTodaySummary);
      websocketService.on("DONE", handleDone);
      websocketService.on("ERROR", handleError);
      websocketService.on("connected", () => {
        console.log("WebSocket connected for live attendance");
      });

      wsInitialized.current = true;
    } catch (error) {
      console.error("Failed to initialize WebSocket:", error);
    }
  };

  const loadClassDetails = async () => {
    try {
      setLoading(true);
      const response = await classService.getClass(id);
      if (response.success) {
        setClassData(response.data);
      }
    } catch (error) {
      console.error("Failed to load class:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAttendanceMarked = (data) => {
    // Update attendance state when a student marks attendance
    setAttendance((prev) => ({
      ...prev,
      [data.studentId]: data.status,
    }));
  };

  const handleTodaySummary = (data) => {
    // Update summary when teacher requests it
    setSummary(data);
  };

  const handleDone = (data) => {
    // When attendance session is done and persisted
    alert(`Attendance session completed! ${data.present} present, ${data.absent} absent`);
    setSessionStarted(false);
    setAttendance({});
    setSummary({ present: 0, absent: 0, total: 0 });
    navigate(`/teacher/classes/${id}`);
  };

  const handleError = (data) => {
    alert(`Error: ${data.message}`);
  };

  const handleStartSession = async () => {
    try {
      const response = await attendanceService.startAttendance(id);
      if (response.success) {
        setSessionStarted(true);
        // Initialize attendance object for all students
        if (classData?.students) {
          const initialAttendance = {};
          classData.students.forEach((student) => {
            initialAttendance[student._id] = null;
          });
          setAttendance(initialAttendance);
        }
      } else {
        alert(response.error || "Failed to start session");
      }
    } catch (error) {
      alert(error.response?.data?.error || "Failed to start session");
    }
  };

  const handleRequestSummary = () => {
    // Send TODAY_SUMMARY event via WebSocket
    if (websocketService.isConnected()) {
      websocketService.send("TODAY_SUMMARY", {});
    } else {
      alert("WebSocket not connected");
    }
  };

  const handleMarkAttendanceForStudent = (studentId, status) => {
    // Teacher marks attendance for a student (sends via WebSocket)
    if (websocketService.isConnected() && sessionStarted) {
      websocketService.send("ATTENDANCE_MARKED", {
        studentId,
        status,
      });
    } else {
      alert("Session not started or WebSocket not connected");
    }
  };

  const handleDoneSession = () => {
    // Teacher ends session and persists to DB
    if (websocketService.isConnected() && sessionStarted) {
      if (window.confirm("Are you sure you want to end the session and save attendance?")) {
        websocketService.send("DONE", {});
      }
    } else {
      alert("Session not started or WebSocket not connected");
    }
  };

  // Calculate current summary
  useEffect(() => {
    const present = Object.values(attendance).filter((status) => status === "present").length;
    const absent = Object.values(attendance).filter((status) => status === "absent").length;
    const total = classData?.students?.length || 0;

    setSummary({ present, absent, total });
  }, [attendance, classData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <p className="text-red-600">Class not found</p>
          <button
            onClick={() => navigate("/teacher/classes")}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg"
          >
            Back to Classes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button
            onClick={() => navigate(`/teacher/classes/${id}`)}
            className="text-indigo-600 hover:text-indigo-700 mb-4"
          >
            ← Back to Class
          </button>
          <h1 className="text-3xl font-bold text-gray-800">
            Live Attendance - {classData.className}
          </h1>
        </div>

        {!sessionStarted ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Start Attendance Session
            </h2>
            <p className="text-gray-600 mb-6">
              Click below to start a live attendance session. Students will be able to mark their attendance in real-time.
            </p>
            <button
              onClick={handleStartSession}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              Start Attendance Session
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Card */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Live Summary</h2>
                <div className="flex space-x-2">
                  <button
                    onClick={handleRequestSummary}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                  >
                    Refresh Summary
                  </button>
                  <button
                    onClick={handleDoneSession}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                  >
                    End Session
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-3xl font-bold text-green-600">{summary.present}</p>
                  <p className="text-gray-600">Present</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-3xl font-bold text-red-600">{summary.absent}</p>
                  <p className="text-gray-600">Absent</p>
                </div>
                <div className="text-center p-4 bg-indigo-50 rounded-lg">
                  <p className="text-3xl font-bold text-indigo-600">{summary.total}</p>
                  <p className="text-gray-600">Total Students</p>
                </div>
              </div>
            </div>

            {/* Student List */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Students</h2>
              <div className="space-y-2">
                {classData.students && classData.students.length > 0 ? (
                  classData.students.map((student) => {
                    const status = attendance[student._id] || null;
                    return (
                      <div
                        key={student._id}
                        className="flex justify-between items-center p-4 border border-gray-200 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-800">{student.name}</p>
                          <p className="text-sm text-gray-600">{student.email}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              status === "present"
                                ? "bg-green-100 text-green-800"
                                : status === "absent"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {status || "Not marked"}
                          </span>
                          <button
                            onClick={() => handleMarkAttendanceForStudent(student._id, "present")}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm"
                          >
                            Present
                          </button>
                          <button
                            onClick={() => handleMarkAttendanceForStudent(student._id, "absent")}
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm"
                          >
                            Absent
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-600">No students enrolled</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveAttendance;


