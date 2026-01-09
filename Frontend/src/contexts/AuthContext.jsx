import React, { createContext, useContext, useState, useEffect } from "react";
import { authService } from "../services/authService.js";

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is authenticated on mount
    const checkAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          const storedUser = authService.getStoredUser();
          setUser(storedUser);
          setIsAuthenticated(true);
          try {
            const response = await authService.getCurrentUser();
            if (response.success) {
              setUser({
                ...storedUser,
                ...response.data,
              });
            }
          } catch (error) {
            console.error("Failed to fetch user data:", error);
          }
        }
      } catch (error) {
        console.error("Auth check failed:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password);
      if (response.success) {
        const storedUser = authService.getStoredUser();
        setUser(storedUser);
        setIsAuthenticated(true);
        
        try {
          const userResponse = await authService.getCurrentUser();
          if (userResponse.success) {
            setUser({
              ...storedUser,
              ...userResponse.data,
            });
          }
        } catch (error) {
          console.error("Failed to fetch user data:", error);
        }
        
        return { success: true };
      }
      return { success: false, error: response.error || "Login failed" };
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || "Login failed. Please check your connection.",
      };
    }
  };

  const signup = async (name, email, password, role) => {
    try {
      const response = await authService.signup(name, email, password, role);
      if (response.success) {
        try {
          const loginResponse = await authService.login(email, password);
          if (loginResponse.success) {
            const storedUser = authService.getStoredUser();
            setUser(storedUser);
            setIsAuthenticated(true);
            
            try {
              const userResponse = await authService.getCurrentUser();
              if (userResponse.success) {
                setUser({
                  ...storedUser,
                  ...userResponse.data,
                });
              }
            } catch (error) {
              console.error("Failed to fetch user data:", error);
            }
            
            return { success: true };
          }
          return { success: false, error: "Signup successful but auto-login failed. Please try logging in." };
        } catch (loginError) {
          console.error("Auto-login error:", loginError);
          return { success: false, error: "Signup successful but auto-login failed. Please try logging in." };
        }
      }
      return { success: false, error: response.error || "Signup failed" };
    } catch (error) {
      console.error("Signup error:", error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || "Signup failed. Please check your connection.",
      };
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    signup,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

