import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { classService } from "../../services/classService.js";
import { attendanceService } from "../../services/attendanceService.js";

const ClassDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [classData, setClassData] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [allStudents, setAllStudents] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    loadClassDetails();
    loadAllStudents();
  }, [id]);

  const loadClassDetails = async () => {
    try {
      setLoading(true);
      const response = await classService.getClass(id);
      if (response.success) {
        setClassData(response.data);
        setStudents(response.data.students || []);
      }
    } catch (error) {
      console.error("Failed to load class:", error);
      setError("Failed to load class details");
    } finally {
      setLoading(false);
    }
  };

  const loadAllStudents = async () => {
    try {
      const response = await classService.getAllStudents();
      if (response.success) {
        setAllStudents(response.data);
      }
    } catch (error) {
      console.error("Failed to load students:", error);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!selectedStudentId) {
      setError("Please select a student");
      return;
    }

    try {
      setError("");
      const response = await classService.addStudent(id, selectedStudentId);
      if (response.success) {
        setSelectedStudentId("");
        setShowAddStudent(false);
        loadClassDetails();
      } else {
        setError(response.error || "Failed to add student");
      }
    } catch (error) {
      setError(error.response?.data?.error || "Failed to add student");
    }
  };

  const handleRemoveStudent = async (studentId) => {
    if (!window.confirm("Are you sure you want to remove this student?")) {
      return;
    }

    try {
      const response = await classService.removeStudent(id, studentId);
      if (response.success) {
        loadClassDetails();
      } else {
        setError(response.error || "Failed to remove student");
      }
    } catch (error) {
      setError(error.response?.data?.error || "Failed to remove student");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading class details...</p>
        </div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button
            onClick={() => navigate("/teacher/classes")}
            className="text-indigo-600 hover:text-indigo-700 mb-4"
          >
            ← Back to Classes
          </button>
          <h1 className="text-3xl font-bold text-gray-800">{classData.className}</h1>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Students ({students.length})</h2>
            <div className="space-x-2">
              <div className="flex space-x-2">
                <button
                  onClick={() => navigate(`/teacher/classes/${id}/live`)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  Live Attendance
                </button>
                <button
                  onClick={() => navigate(`/teacher/classes/${id}/attendance`)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  View Records
                </button>
              </div>
              <button
                onClick={() => setShowAddStudent(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                + Add Student
              </button>
            </div>
          </div>

          {students.length === 0 ? (
            <p className="text-gray-600">No students enrolled yet</p>
          ) : (
            <div className="space-y-2">
              {students.map((student) => (
                <div
                  key={student._id}
                  className="flex justify-between items-center p-3 border border-gray-200 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-800">{student.name}</p>
                    <p className="text-sm text-gray-600">{student.email}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveStudent(student._id)}
                    className="px-3 py-1 text-red-600 hover:bg-red-50 rounded transition"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Student Modal */}
      {showAddStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Add Student</h2>
            <form onSubmit={handleAddStudent}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Student
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Choose a student...</option>
                  {allStudents
                    .filter(
                      (s) => !students.some((enrolled) => enrolled._id === s._id)
                    )
                    .map((student) => (
                      <option key={student._id} value={student._id}>
                        {student.name} ({student.email})
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddStudent(false);
                    setSelectedStudentId("");
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassDetails;

