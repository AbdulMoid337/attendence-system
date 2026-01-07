import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import Login from "./components/Login.jsx";
import Signup from "./components/Signup.jsx";
import Dashboard from "./components/Dashboard.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Layout from "./components/Layout.jsx";

// Teacher components
import TeacherClasses from "./components/teacher/TeacherClasses.jsx";
import ClassDetails from "./components/teacher/ClassDetails.jsx";
import ClassAttendance from "./components/teacher/ClassAttendance.jsx";
import LiveAttendance from "./components/teacher/LiveAttendance.jsx";

// Student components
import StudentClasses from "./components/student/StudentClasses.jsx";
import AttendanceHistory from "./components/student/AttendanceHistory.jsx";
import LiveAttendanceCheck from "./components/student/LiveAttendanceCheck.jsx";

import "./App.css";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Dashboard - redirects based on role */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Teacher Routes */}
          <Route
            path="/teacher/classes"
            element={
              <ProtectedRoute requiredRole="teacher">
                <Layout>
                  <TeacherClasses />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/classes/:id"
            element={
              <ProtectedRoute requiredRole="teacher">
                <Layout>
                  <ClassDetails />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/classes/:id/attendance"
            element={
              <ProtectedRoute requiredRole="teacher">
                <Layout>
                  <ClassAttendance />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/classes/:id/live"
            element={
              <ProtectedRoute requiredRole="teacher">
                <Layout>
                  <LiveAttendance />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Student Routes */}
          <Route
            path="/student/classes"
            element={
              <ProtectedRoute requiredRole="student">
                <Layout>
                  <StudentClasses />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/classes/:id/history"
            element={
              <ProtectedRoute requiredRole="student">
                <Layout>
                  <AttendanceHistory />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/classes/:id/live"
            element={
              <ProtectedRoute requiredRole="student">
                <Layout>
                  <LiveAttendanceCheck />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
