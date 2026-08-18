import { z } from "zod";
import mongoose from "mongoose";

// Reusable ObjectId string validator
const objectId = z.string().refine(
  (val) => mongoose.Types.ObjectId.isValid(val),
  { message: "Invalid ID" }
);

export const projectIdParam = z.object({
  projectId: objectId,
});

export const createProjectSchema = z.object({
  name: z
    .string({ required_error: "Project name is required" })
    .trim()
    .min(1, "Project name cannot be empty"),
  description: z.string().optional(),
  color: z.string().optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().trim().min(1, "Project name cannot be empty").optional(),
  description: z.string().optional(),
  color: z.string().optional(),
  status: z.enum(["active", "archived"]).optional(),
});
