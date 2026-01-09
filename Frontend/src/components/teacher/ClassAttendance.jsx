import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { classService } from "../../services/classService.js";
import { attendanceService } from "../../services/attendanceService.js";

const ClassAttendance = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [classData, setClassData] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [activeTab, setActiveTab] = useState("records"); 

  useEffect(() => {
    loadClassDetails();
    loadAttendance();
    loadStats();
  }, [id, selectedDate]);

  const loadClassDetails = async () => {
    try {
      const response = await classService.getClass(id);
      if (response.success) {
        setClassData(response.data);
      }
    } catch (error) {
      console.error("Failed to load class:", error);
    }
  };

  const loadAttendance = async () => {
    try {
      const response = await attendanceService.getClassAttendance(id, selectedDate);
      if (response.success) {
        setAttendanceRecords(response.data);
      }
    } catch (error) {
      console.error("Failed to load attendance:", error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await attendanceService.getAttendanceStats(id);
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartAttendance = async () => {
    try {
      const response = await attendanceService.startAttendance(id);
      if (response.success) {
        alert("Attendance session started!");
      }
    } catch (error) {
      alert(error.response?.data?.error || "Failed to start attendance");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "present":
        return "bg-green-100 text-green-800";
      case "absent":
        return "bg-red-100 text-red-800";
      case "late":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
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
            {classData?.className} - Attendance
          </h1>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab("records")}
                className={`px-4 py-2 rounded-lg ${
                  activeTab === "records"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                Records
              </button>
              <button
                onClick={() => setActiveTab("stats")}
                className={`px-4 py-2 rounded-lg ${
                  activeTab === "stats"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                Statistics
              </button>
            </div>
            <button
              onClick={handleStartAttendance}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              Start Attendance Session
            </button>
          </div>

          {activeTab === "records" && (
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              {attendanceRecords.length === 0 ? (
                <p className="text-gray-600">No attendance records for this date</p>
              ) : (
                <div className="space-y-2">
                  {attendanceRecords.map((record) => (
                    <div
                      key={record._id}
                      className="flex justify-between items-center p-3 border border-gray-200 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-800">{record.student.name}</p>
                        <p className="text-sm text-gray-600">{record.student.email}</p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                          record.status
                        )}`}
                      >
                        {record.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "stats" && stats && (
            <div>
              <div className="mb-6 p-4 bg-indigo-50 rounded-lg">
                <h3 className="text-lg font-bold mb-2">Overall Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Records</p>
                    <p className="text-2xl font-bold">{stats.overall.totalRecords}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Present</p>
                    <p className="text-2xl font-bold text-green-600">
                      {stats.overall.totalPresent}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Absent</p>
                    <p className="text-2xl font-bold text-red-600">
                      {stats.overall.totalAbsent}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Late</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {stats.overall.totalLate}
                    </p>
                  </div>
                </div>
              </div>

              <h3 className="text-lg font-bold mb-4">Student Statistics</h3>
              <div className="space-y-2">
                {stats.studentStats.map((studentStat) => (
                  <div
                    key={studentStat.student._id}
                    className="p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-gray-800">{studentStat.student.name}</p>
                        <p className="text-sm text-gray-600">{studentStat.student.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-indigo-600">
                          {studentStat.presentPercentage}%
                        </p>
                        <p className="text-sm text-gray-600">Attendance</p>
                      </div>
                    </div>
                    <div className="flex space-x-4 text-sm">
                      <span className="text-green-600">Present: {studentStat.present}</span>
                      <span className="text-red-600">Absent: {studentStat.absent}</span>
                      <span className="text-yellow-600">Late: {studentStat.late}</span>
                      <span className="text-gray-600">Total: {studentStat.total}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClassAttendance;


