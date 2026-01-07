import api from "./api.js";

export const classService = {
  // Get all classes for teacher
  async getMyClasses() {
    const response = await api.get("/classes/my-classes");
    return response.data;
  },

  // Get all enrolled classes for student
  async getEnrolledClasses() {
    const response = await api.get("/classes/enrolled");
    return response.data;
  },

  // Get single class details
  async getClass(classId) {
    const response = await api.get(`/class/${classId}`);
    return response.data;
  },

  // Create new class
  async createClass(className) {
    const response = await api.post("/class", { className });
    return response.data;
  },

  // Update class
  async updateClass(classId, className) {
    const response = await api.put(`/class/${classId}`, { className });
    return response.data;
  },

  // Delete class
  async deleteClass(classId) {
    const response = await api.delete(`/class/${classId}`);
    return response.data;
  },

  // Add student to class
  async addStudent(classId, studentId) {
    const response = await api.post(`/class/${classId}/add-student`, { studentId });
    return response.data;
  },

  // Remove student from class
  async removeStudent(classId, studentId) {
    const response = await api.delete(`/class/${classId}/remove-student/${studentId}`);
    return response.data;
  },

  // Get all students
  async getAllStudents() {
    const response = await api.get("/students");
    return response.data;
  },
};


