import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { classService } from "../../services/classService.js";
import { attendanceService } from "../../services/attendanceService.js";

const AttendanceHistory = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [classData, setClassData] = useState(null);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClassDetails();
    loadHistory();
  }, [id]);

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

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await attendanceService.getAttendanceHistory(id);
      if (response.success) {
        setHistory(response.data);
      }
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "present":
        return "bg-green-100 text-green-800 border-green-200";
      case "absent":
        return "bg-red-100 text-red-800 border-red-200";
      case "late":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button
            onClick={() => navigate("/student/classes")}
            className="text-indigo-600 hover:text-indigo-700 mb-4"
          >
            ← Back to Classes
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Attendance History</h1>
          {classData && <p className="text-gray-600 mt-2">{classData.className}</p>}
        </div>

        {history && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-indigo-50 rounded-lg">
                <p className="text-2xl font-bold text-indigo-600">
                  {history.statistics.presentPercentage}%
                </p>
                <p className="text-sm text-gray-600">Attendance Rate</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {history.statistics.present}
                </p>
                <p className="text-sm text-gray-600">Present</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">
                  {history.statistics.absent}
                </p>
                <p className="text-sm text-gray-600">Absent</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">
                  {history.statistics.late}
                </p>
                <p className="text-sm text-gray-600">Late</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Attendance Records</h2>
          {history && history.records.length === 0 ? (
            <p className="text-gray-600">No attendance records yet</p>
          ) : (
            <div className="space-y-3">
              {history?.records.map((record) => (
                <div
                  key={record._id}
                  className={`flex justify-between items-center p-4 border-2 rounded-lg ${getStatusColor(
                    record.status
                  )}`}
                >
                  <div>
                    <p className="font-medium capitalize">{record.status}</p>
                    <p className="text-sm opacity-75">
                      {formatDate(record.createdAt)}
                    </p>
                  </div>
                  <span className="text-lg font-bold capitalize">{record.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceHistory;


