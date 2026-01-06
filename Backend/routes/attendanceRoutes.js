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
import { setActiveSession } from "../state/activeSession.js";

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

      const record = await Attendence.findOne({
        classId,
        studentsId: studentId,
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

export default router;
