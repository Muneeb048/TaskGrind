import { z } from "zod";
import mongoose from "mongoose";

const objectId = z.string().refine(
  (val) => mongoose.Types.ObjectId.isValid(val),
  { message: "Invalid ID" }
);

export const taskIdParam = z.object({
  taskId: objectId,
});

export const projectIdParam = z.object({
  projectId: objectId,
});

export const createTaskSchema = z.object({
  title: z
    .string({ required_error: "Task title is required" })
    .trim()
    .min(1, "Task title cannot be empty"),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "done"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  assigneeId: z
    .string()
    .refine((val) => val === null || mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid assignee ID",
    })
    .nullable()
    .optional(),
  dueDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .nullable()
    .optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1, "Task title cannot be empty").optional(),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "done"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  assigneeId: z
    .string()
    .refine((val) => val === null || mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid assignee ID",
    })
    .nullable()
    .optional(),
  dueDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .nullable()
    .optional(),
});
