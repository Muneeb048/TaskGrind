import { z } from "zod";
import mongoose from "mongoose";

const objectId = z.string().refine(
  (val) => mongoose.Types.ObjectId.isValid(val),
  { message: "Invalid ID" }
);

export const teamIdParam = z.object({
  teamId: objectId,
});

export const teamMemberParams = z.object({
  teamId: objectId,
  userId: objectId,
});

export const createTeamSchema = z.object({
  name: z
    .string({ required_error: "Team name is required" })
    .trim()
    .min(1, "Team name cannot be empty"),
});

export const inviteMemberSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email("Invalid email address"),
  role: z.enum(["admin", "member"]).optional(),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(["admin", "member"], {
    required_error: "Role is required",
  }),
});
