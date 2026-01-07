import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-6">
              <h1
                className="text-2xl font-bold text-indigo-600 cursor-pointer"
                onClick={() => navigate("/dashboard")}
              >
                Attendance System
              </h1>
              {user?.role === "teacher" && (
                <>
                  <button
                    onClick={() => handleNavigation("/teacher/classes")}
                    className="text-gray-700 hover:text-indigo-600 transition"
                  >
                    My Classes
                  </button>
                </>
              )}
              {user?.role === "student" && (
                <>
                  <button
                    onClick={() => handleNavigation("/student/classes")}
                    className="text-gray-700 hover:text-indigo-600 transition"
                  >
                    My Classes
                  </button>
                </>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                {user?.name || user?.email} ({user?.role})
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      {children}
    </div>
  );
};

export default Layout;


