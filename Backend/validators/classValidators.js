import { z } from "zod";

export const createClassSchema = z.object({
  className: z.string(),
});

export const addStudentSchema = z.object({
  studentId: z.string(),
});
