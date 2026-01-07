import api from "./api.js";
import { jwtDecode } from "jwt-decode";

export const authService = {
  async signup(name, email, password, role) {
    const response = await api.post("/auth/signup", {
      name,
      email,
      password,
      role,
    });
    return response.data;
  },

  async login(email, password) {
    const response = await api.post("/auth/login", {
      email,
      password,
    });
    
    if (response.data.success && response.data.data.token) {
      const token = response.data.data.token;
      const decoded = jwtDecode(token);
      
      // Store token and user info
      localStorage.setItem("token", token);
      localStorage.setItem(
        "user",
        JSON.stringify({
          userId: decoded.userId,
          role: decoded.role,
        })
      );
      
      return response.data;
    }
    
    throw new Error("Invalid response from server");
  },

  async getCurrentUser() {
    const response = await api.get("/auth/me");
    return response.data;
  },

  logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },

  isAuthenticated() {
    const token = localStorage.getItem("token");
    if (!token) return false;

    try {
      const decoded = jwtDecode(token);
      // Check if token is expired
      if (decoded.exp * 1000 < Date.now()) {
        this.logout();
        return false;
      }
      return true;
    } catch (error) {
      this.logout();
      return false;
    }
  },

  getStoredUser() {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  },
};

