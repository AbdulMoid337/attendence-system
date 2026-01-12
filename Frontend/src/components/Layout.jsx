import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import { motion } from "framer-motion";

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const NavLink = ({ to, label }) => {
    const isActive = location.pathname.startsWith(to);
    return (
      <button
        onClick={() => navigate(to)}
        className={`relative px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${isActive
          ? "text-violet-700 bg-violet-50"
          : "text-gray-600 hover:text-violet-600 hover:bg-white/50"
          }`}
      >
        {label}
        {isActive && (
          <motion.div
            layoutId="nav-pill"
            className="absolute inset-0 rounded-xl bg-violet-100/50 -z-10"
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 relative selection:bg-violet-200 selection:text-violet-900">
      {/* Background Decor */}
      <div className="fixed top-0 left-0 right-0 h-96 bg-gradient-to-br from-indigo-50/50 via-purple-50/50 to-pink-50/50 -z-10" />

      {/* Floating Navbar */}
      <div className="fixed top-4 left-4 right-4 z-50 max-w-7xl mx-auto">
        <nav className="glass rounded-2xl px-6 py-3 flex justify-between items-center shadow-lg shadow-black/5">
          <div className="flex items-center gap-8">
            <motion.h1
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-indigo-600 cursor-pointer"
              onClick={() => navigate("/dashboard")}
            >
              Attendance<span className="text-gray-400 font-light">.sys</span>
            </motion.h1>

            <div className="hidden md:flex items-center gap-2">
              {user?.role === "teacher" && (
                <NavLink to="/teacher/classes" label="My Classes" />
              )}
              {user?.role === "student" && (
                <NavLink to="/student/classes" label="My Classes" />
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end mr-2">
              <span className="text-sm font-bold text-gray-700 leading-tight">
                {user?.name || user?.email?.split('@')[0]}
              </span>
              <span className="text-xs font-medium text-violet-500 capitalize bg-violet-50 px-2 py-0.5 rounded-full">
                {user?.role}
              </span>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-500/20 hover:shadow-red-500/30 transition-all"
            >
              Logout
            </motion.button>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <main className="pt-28 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
};

export default Layout;




