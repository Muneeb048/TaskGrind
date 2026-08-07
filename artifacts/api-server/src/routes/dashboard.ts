import { Router, type IRouter } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db, projectsTable, tasksTable, usersTable } from "@workspace/db";
import { GetDashboardSummaryResponse } from "@workspace/api-zod";
import { requireAuth, userId } from "../lib/auth";
import { serializeTask } from "../lib/serializers";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const ownerId = userId(req);
  const projects = await db.select({ id: projectsTable.id }).from(projectsTable).where(eq(projectsTable.ownerId, ownerId));
  const projectIds = projects.map((project) => project.id);
  const tasks = projectIds.length
    ? await db.select().from(tasksTable).where(inArray(tasksTable.projectId, projectIds)).orderBy(desc(tasksTable.createdAt))
    : [];
  const recent = await Promise.all(tasks.slice(0, 5).map(async (task) => {
    const [assignee] = task.assigneeId
      ? await db.select().from(usersTable).where(eq(usersTable.id, task.assigneeId)).limit(1)
      : [];
    return serializeTask(task, assignee ?? null);
  }));
  res.json(GetDashboardSummaryResponse.parse({
    totalProjects: projects.length,
    totalTasks: tasks.length,
    completedTasks: tasks.filter((task) => task.status === "done").length,
    inProgressTasks: tasks.filter((task) => task.status === "in_progress").length,
    recentTasks: recent,
  }));
});

export default router;