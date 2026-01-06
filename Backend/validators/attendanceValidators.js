import z from "zod";

export const attendanceSchema = z.object({
  classId: z.string(),
});
