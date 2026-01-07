import express from "express";
import mongoose from "mongoose";
import { attendanceSchema } from "../validators/attendanceValidators.js";
import authMiddleware from "../middleware/authMiddleware.js";
import Attendence from "../models/Attendence.js";
import ClassModel from "../models/Class.js";
import {
  requireTeacher,
  requireStudent,
} from "../middleware/roleMiddleware.js";
import { setActiveSession, clearActiveSession } from "../state/activeSession.js";

const router = express.Router();

router.get(
  "/class/:id/my-attendance",
  authMiddleware,
  requireStudent,
  async (req, res) => {
    const classId = req.params.id;
    const studentId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(404).json({
        success: false,
        error: "Class not found",
      });
    }

    try {
      const cls = await ClassModel.findById(classId);
      if (!cls) {
        return res.status(404).json({
          success: false,
          error: "Class not found",
        });
      }

      const isEnrolled = cls.studentIds.some(
        (id) => id.toString() === studentId,
      );
      if (!isEnrolled) {
        return res.status(403).json({
          success: false,
          error: "Forbidden, student not enrolled in class",
        });
      }

      // Get today's attendance record
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const record = await Attendence.findOne({
        classId,
        studentsId: studentId,
        createdAt: { $gte: today, $lt: tomorrow },
      });

      return res.status(200).json({
        success: true,
        data: {
          classId,
          status: record ? record.status : null,
        },
      });
    } catch (e) {
      return res.status(500).json({
        success: false,
        error: "Server error",
      });
    }
  },
);

router.post(
  "/attendance/start",
  authMiddleware,
  requireTeacher,
  async (req, res) => {
    const parsed = attendanceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid request schema",
      });
    }

    const { classId } = parsed.data;

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(404).json({
        success: false,
        error: "Class not found",
      });
    }

    try {
      const cls = await ClassModel.findById(classId);
      if (!cls) {
        return res.status(404).json({
          success: false,
          error: "Class not found",
        });
      }

      // Ownership check (teacher must own class)
      if (cls.teacherId.toString() !== req.user.userId) {
        return res.status(403).json({
          success: false,
          error: "Forbidden, not class teacher",
        });
      }

      const startedAt = new Date().toISOString();

      setActiveSession({
        classId,
        startedAt,
        attendance: {},
      });

      return res.status(200).json({
        success: true,
        data: {
          classId,
          startedAt,
        },
      });
    } catch (e) {
      return res.status(500).json({
        success: false,
        error: "Server error",
      });
    }
  },
);

// Mark attendance (student)
router.post(
  "/attendance/mark",
  authMiddleware,
  requireStudent,
  async (req, res) => {
    const { classId, status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid class ID",
      });
    }

    if (!["present", "absent", "late"].includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Invalid status. Must be present, absent, or late",
      });
    }

    try {
      const cls = await ClassModel.findById(classId);
      if (!cls) {
        return res.status(404).json({
          success: false,
          error: "Class not found",
        });
      }

      const isEnrolled = cls.studentIds.some(
        (id) => id.toString() === req.user.userId
      );
      if (!isEnrolled) {
        return res.status(403).json({
          success: false,
          error: "Forbidden, student not enrolled in class",
        });
      }

      // Check if attendance already marked for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const existingAttendance = await Attendence.findOne({
        classId,
        studentsId: req.user.userId,
        createdAt: { $gte: today, $lt: tomorrow },
      });

      if (existingAttendance) {
        existingAttendance.status = status;
        await existingAttendance.save();
        
        return res.status(200).json({
          success: true,
          message: "Attendance updated",
          data: existingAttendance,
        });
      }

      const attendance = await Attendence.create({
        classId,
        studentsId: req.user.userId,
        status,
      });

      return res.status(201).json({
        success: true,
        message: "Attendance marked successfully",
        data: attendance,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }
);

// Get attendance records for a class (teacher)
router.get(
  "/class/:id/attendance",
  authMiddleware,
  requireTeacher,
  async (req, res) => {
    const classId = req.params.id;
    const { date } = req.query;

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid class ID",
      });
    }

    try {
      const cls = await ClassModel.findById(classId);
      if (!cls) {
        return res.status(404).json({
          success: false,
          error: "Class not found",
        });
      }

      if (cls.teacherId.toString() !== req.user.userId) {
        return res.status(403).json({
          success: false,
          error: "Forbidden, not class teacher",
        });
      }

      let query = { classId };
      
      if (date) {
        const filterDate = new Date(date);
        filterDate.setHours(0, 0, 0, 0);
        const nextDay = new Date(filterDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        query.createdAt = {
          $gte: filterDate,
          $lt: nextDay,
        };
      }

      const attendanceRecords = await Attendence.find(query)
        .populate("studentsId", "name email")
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        data: attendanceRecords.map(record => ({
          _id: record._id,
          classId: record.classId,
          student: {
            _id: record.studentsId._id,
            name: record.studentsId.name,
            email: record.studentsId.email,
          },
          status: record.status,
          createdAt: record.createdAt,
        })),
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }
);

// Get attendance history
router.get(
  "/class/:id/attendance/history",
  authMiddleware,
  async (req, res) => {
    const classId = req.params.id;
    const studentId = req.user.role === "student" 
      ? req.user.userId 
      : req.query.studentId;

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid class ID",
      });
    }

    try {
      const cls = await ClassModel.findById(classId);
      if (!cls) {
        return res.status(404).json({
          success: false,
          error: "Class not found",
        });
      }

      if (req.user.role === "student") {
        const isEnrolled = cls.studentIds.some(
          (id) => id.toString() === req.user.userId
        );
        if (!isEnrolled) {
          return res.status(403).json({
            success: false,
            error: "Forbidden, student not enrolled in class",
          });
        }
      } else if (req.user.role === "teacher") {
        if (cls.teacherId.toString() !== req.user.userId) {
          return res.status(403).json({
            success: false,
            error: "Forbidden, not class teacher",
          });
        }
        if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
          return res.status(400).json({
            success: false,
            error: "Student ID is required",
          });
        }
      }

      const query = { 
        classId,
        studentsId: studentId || req.user.userId,
      };

      const attendanceHistory = await Attendence.find(query)
        .populate("studentsId", "name email")
        .sort({ createdAt: -1 })
        .limit(100);

      const total = attendanceHistory.length;
      const present = attendanceHistory.filter(a => a.status === "present").length;
      const absent = attendanceHistory.filter(a => a.status === "absent").length;
      const late = attendanceHistory.filter(a => a.status === "late").length;

      return res.status(200).json({
        success: true,
        data: {
          records: attendanceHistory.map(record => ({
            _id: record._id,
            status: record.status,
            createdAt: record.createdAt,
          })),
          statistics: {
            total,
            present,
            absent,
            late,
            presentPercentage: total > 0 ? ((present / total) * 100).toFixed(2) : 0,
          },
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }
);

// Stop attendance session (teacher)
router.post(
  "/attendance/stop",
  authMiddleware,
  requireTeacher,
  async (req, res) => {
    const { classId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid class ID",
      });
    }

    try {
      const cls = await ClassModel.findById(classId);
      if (!cls) {
        return res.status(404).json({
          success: false,
          error: "Class not found",
        });
      }

      if (cls.teacherId.toString() !== req.user.userId) {
        return res.status(403).json({
          success: false,
          error: "Forbidden, not class teacher",
        });
      }

      clearActiveSession();

      return res.status(200).json({
        success: true,
        message: "Attendance session ended",
        data: {
          classId,
          endedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }
);

// Get attendance statistics for a class (teacher)
router.get(
  "/class/:id/attendance/stats",
  authMiddleware,
  requireTeacher,
  async (req, res) => {
    const classId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid class ID",
      });
    }

    try {
      const cls = await ClassModel.findById(classId).populate("studentIds", "name email");
      if (!cls) {
        return res.status(404).json({
          success: false,
          error: "Class not found",
        });
      }

      if (cls.teacherId.toString() !== req.user.userId) {
        return res.status(403).json({
          success: false,
          error: "Forbidden, not class teacher",
        });
      }

      const allRecords = await Attendence.find({ classId })
        .populate("studentsId", "name email");

      const studentStats = cls.studentIds.map(student => {
        const studentRecords = allRecords.filter(
          r => r.studentsId._id.toString() === student._id.toString()
        );
        
        const total = studentRecords.length;
        const present = studentRecords.filter(r => r.status === "present").length;
        const absent = studentRecords.filter(r => r.status === "absent").length;
        const late = studentRecords.filter(r => r.status === "late").length;

        return {
          student: {
            _id: student._id,
            name: student.name,
            email: student.email,
          },
          total,
          present,
          absent,
          late,
          presentPercentage: total > 0 ? ((present / total) * 100).toFixed(2) : 0,
        };
      });

      const overall = {
        totalRecords: allRecords.length,
        totalPresent: allRecords.filter(r => r.status === "present").length,
        totalAbsent: allRecords.filter(r => r.status === "absent").length,
        totalLate: allRecords.filter(r => r.status === "late").length,
        enrolledStudents: cls.studentIds.length,
      };

      return res.status(200).json({
        success: true,
        data: {
          classId: cls._id,
          className: cls.name,
          overall,
          studentStats,
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }
);

export default router;
