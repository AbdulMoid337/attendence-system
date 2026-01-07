import { z } from "zod";

export const createClassSchema = z.object({
  className: z.string().min(1),
});

export const addStudentSchema = z.object({
  studentId: z.string(),
});
