import express from "express";
import ClassModel from "../models/Class.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import authMiddleware from "../middleware/authMiddleware.js";
import { requireTeacher } from "../middleware/roleMiddleware.js";
import {
  createClassSchema,
  addStudentSchema,
} from "../validators/classValidators.js";

const router = express.Router();

router.post("/class", authMiddleware, requireTeacher, async (req, res) => {
  const validation = createClassSchema.safeParse(req.body);
  if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid request schema",
      });
  }
  try {
    const newClass = await ClassModel.create({
      name: validation.data.className,
      teacherId: req.user.userId,
      studentIds: [],
    });
    return res.status(201).json({
      success: true,
      data: {
        _id: newClass._id,
        className: newClass.name,
        teacherId: newClass.teacherId,
        studentIds: newClass.studentIds,
      },
    });
  } catch (error) {
    console.error(error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
      });
  }
});

router.post(
  "/class/:id/add-student",
  authMiddleware,
  requireTeacher,
  async (req, res) => {
    const classId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(404).json({
        success: false,
        error: "Class not found",
      });
    }
    console.log("REQ BODY:", req.body);
    console.log("REQ USER:", req.user);

    const parsed = addStudentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid request schema",
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

      // ownership check
      if (!cls.teacherId.equals(req.user.userId)) {
        return res.status(403).json({
          success: false,
          error: "Forbidden, not class teacher",
        });
      }
      console.log("CLASS TEACHER:", cls.teacherId.toString());
      console.log("TOKEN USER:", req.user.userId);
      const studentId = parsed.data.studentId;

      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        return res.status(404).json({
          success: false,
          error: "Student not found",
        });
      }

      const student = await User.findById(studentId);
      console.log("STUDENT FOUND:", student);
      if (!student || student.role !== "student") {
        return res.status(404).json({
          success: false,
          error: "Student not found",
        });
      }

      // avoid duplicates
      if (!cls.studentIds.some((id) => id.toString() === studentId)) {
        cls.studentIds.push(studentId);
        await cls.save();
      }

      return res.status(200).json({
        success: true,
        data: {
          _id: cls._id,
          className: cls.name,
          teacherId: cls.teacherId,
          studentIds: cls.studentIds,
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

router.get("/class/:id", authMiddleware, async (req, res) => {
  const classId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(classId)) {
    return res.status(404).json({
      success: false,
      error: "Class not found",
    });
  }

  try {
    const cls = await ClassModel.findById(classId).populate({
      path: "studentIds",
      select: "_id name email",
    });

    if (!cls) {
      return res.status(404).json({
        success: false,
        error: "Class not found",
      });
    }

    const userId = req.user.userId;
    const isTeacherOwner = cls.teacherId.toString() === userId;
    const isEnrolledStudent = cls.studentIds.some(
      (s) => s._id.toString() === userId,
    );

    if (!isTeacherOwner && !isEnrolledStudent) {
      return res.status(403).json({
        success: false,
        error: "Forbidden, not class teacher",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        _id: cls._id,
        className: cls.name,
        teacherId: cls.teacherId,
        students: cls.studentIds.map((s) => ({
          _id: s._id,
          name: s.name,
          email: s.email,
        })),
      },
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

router.get("/students", authMiddleware, requireTeacher, async (req, res) => {
  try {
    const students = await User.find({ role: "student" }).select("-password");
    return res.status(200).json({
      success: true,
      data: students,
    });
  } catch (error) {
    console.error(error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
      });
  }
});

// Get all classes for a teacher
router.get("/classes/my-classes", authMiddleware, requireTeacher, async (req, res) => {
  try {
    const classes = await ClassModel.find({ teacherId: req.user.userId })
      .populate("studentIds", "name email")
      .select("-__v");
    
    return res.status(200).json({
      success: true,
      data: classes.map(cls => ({
        _id: cls._id,
        className: cls.name,
        teacherId: cls.teacherId,
        studentCount: cls.studentIds.length,
        students: cls.studentIds,
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Get all classes for a student
router.get("/classes/enrolled", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const classes = await ClassModel.find({ studentIds: userId })
      .populate("teacherId", "name email")
      .select("-__v");
    
    return res.status(200).json({
      success: true,
      data: classes.map(cls => ({
        _id: cls._id,
        className: cls.name,
        teacher: {
          _id: cls.teacherId._id,
          name: cls.teacherId.name,
          email: cls.teacherId.email,
        },
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Remove student from class
router.delete(
  "/class/:id/remove-student/:studentId",
  authMiddleware,
  requireTeacher,
  async (req, res) => {
    const classId = req.params.id;
    const studentId = req.params.studentId;

    if (!mongoose.Types.ObjectId.isValid(classId) || !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid ID format",
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

      if (!cls.teacherId.equals(req.user.userId)) {
        return res.status(403).json({
          success: false,
          error: "Forbidden, not class teacher",
        });
      }

      cls.studentIds = cls.studentIds.filter(
        (id) => id.toString() !== studentId
      );
      await cls.save();

      return res.status(200).json({
        success: true,
        message: "Student removed from class",
        data: {
          _id: cls._id,
          className: cls.name,
          studentIds: cls.studentIds,
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
