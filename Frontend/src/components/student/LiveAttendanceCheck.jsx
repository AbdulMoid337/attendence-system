import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { classService } from "../../services/classService.js";
import { attendanceService } from "../../services/attendanceService.js";
import websocketService from "../../services/websocketService.js";

const LiveAttendanceCheck = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [classData, setClassData] = useState(null);
  const [myStatus, setMyStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const wsInitialized = useRef(false);

  useEffect(() => {
    if (user?.role !== "student") {
      navigate("/dashboard");
      return;
    }

    loadClassDetails();
    initializeWebSocket();

    return () => {
      if (wsInitialized.current) {
        websocketService.off("MY_ATTENDANCE", handleMyAttendance);
        websocketService.off("ATTENDANCE_MARKED", handleAttendanceUpdate);
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

      websocketService.on("MY_ATTENDANCE", handleMyAttendance);
      websocketService.on("ATTENDANCE_MARKED", handleAttendanceUpdate);
      websocketService.on("ERROR", handleError);
      websocketService.on("connected", () => {
        console.log("WebSocket connected for student");
        // Request my attendance status
        checkMyAttendance();
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

  const checkMyAttendance = () => {
    if (websocketService.isConnected()) {
      websocketService.send("MY_ATTENDANCE", {});
    }
  };

  const handleMyAttendance = async (data) => {
    // Only update if this is for the current student
    if (data.status && data.status !== "not yet updated") {
      setMyStatus(data.status);
    } else {
      // If no active session, try to fetch today's attendance from database
      try {
        const response = await attendanceService.getMyAttendance(id);
        if (response.success && response.data.status) {
          setMyStatus(response.data.status);
        } else {
          setMyStatus(null);
        }
      } catch (error) {
        console.error("Failed to fetch today's attendance:", error);
        setMyStatus(null);
      }
    }
  };

  const handleAttendanceUpdate = (data) => {
    // Update if this is my attendance
    if (data.studentId === user?.userId) {
      setMyStatus(data.status);
    }
  };

  const handleError = (data) => {
    alert(`Error: ${data.message}`);
  };

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
            onClick={() => navigate("/student/classes")}
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
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button
            onClick={() => navigate("/student/classes")}
            className="text-indigo-600 hover:text-indigo-700 mb-4"
          >
            ← Back to Classes
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Live Attendance</h1>
          <p className="text-gray-600 mt-2">{classData.className}</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Your Attendance Status</h2>
          
          <div className="mb-6">
            {myStatus ? (
              <div className={`inline-block px-6 py-4 rounded-lg ${
                myStatus === "present"
                  ? "bg-green-100 text-green-800"
                  : myStatus === "absent"
                  ? "bg-red-100 text-red-800"
                  : "bg-gray-100 text-gray-800"
              }`}>
                <p className="text-3xl font-bold capitalize mb-2">{myStatus}</p>
                <p className="text-sm">Your attendance has been marked by the teacher</p>
              </div>
            ) : (
              <div className="inline-block px-6 py-4 rounded-lg bg-gray-100 text-gray-800">
                <p className="text-2xl font-bold mb-2">Not yet updated</p>
                <p className="text-sm">Waiting for teacher to mark your attendance</p>
              </div>
            )}
          </div>

          <button
            onClick={checkMyAttendance}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            Refresh Status
          </button>

          <p className="mt-4 text-sm text-gray-600">
            Note: Only your teacher can mark your attendance. This page updates in real-time when the teacher marks attendance.
          </p>

          <button
            onClick={() => navigate(`/student/classes/${id}/history`)}
            className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
          >
            View Attendance History
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveAttendanceCheck;

