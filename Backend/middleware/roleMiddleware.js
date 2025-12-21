export const requireTeacher = (req, res, next) => {
  if (req.user.role !== "teacher") {
    return res.status(403).json({
      success: false,
      error: "Forbidden, teacher access required",
    });
  }
  next();
};

export const requireStudent = (req, res, next) => {
  if (req.user.role !== "student") {
    return res.status(403).json({
      success: false,
      error: "Forbidden, student access required",
    });
  }
  next();
};
