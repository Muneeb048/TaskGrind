import { integer, pgTable, serial, text, timestamp, date, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  avatar: text("avatar").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  color: text("color").notNull().default("#5b5bd6"),
  status: text("status", { enum: ["active", "archived"] }).notNull().default("active"),
  ownerId: integer("owner_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  status: text("status", { enum: ["todo", "in_progress", "done"] }).notNull().default("todo"),
  priority: text("priority", { enum: ["low", "medium", "high"] }).notNull().default("medium"),
  assigneeId: integer("assignee_id").references(() => usersTable.id, { onDelete: "set null" }),
  dueDate: date("due_date", { mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const teamsTable = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: integer("owner_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
});

export const teamMembersTable = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => teamsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  email: text("email").notNull(),
  name: text("name").notNull().default("Pending invite"),
  avatar: text("avatar").notNull().default(""),
  role: text("role", { enum: ["owner", "admin", "member"] }).notNull().default("member"),
  status: text("status", { enum: ["active", "invited"] }).notNull().default("invited"),
}, (table) => ({
  teamEmailUnique: unique("team_members_team_email_unique").on(table.teamId, table.email),
}));

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export const insertProjectSchema = createInsertSchema(projectsTable).omit({ id: true, updatedAt: true });
export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true, createdAt: true });
export const insertTeamSchema = createInsertSchema(teamsTable).omit({ id: true });
export const insertTeamMemberSchema = createInsertSchema(teamMembersTable).omit({ id: true });

export type User = typeof usersTable.$inferSelect;
export type Project = typeof projectsTable.$inferSelect;
export type Task = typeof tasksTable.$inferSelect;
export type Team = typeof teamsTable.$inferSelect;
export type TeamMember = typeof teamMembersTable.$inferSelect;