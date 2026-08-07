import { Router, type IRouter } from "express";
import { and, asc, eq } from "drizzle-orm";
import { db, projectsTable, tasksTable, usersTable } from "@workspace/db";
import {
  CreateTaskBody,
  CreateTaskParams,
  CreateTaskResponse,
  DeleteTaskParams,
  ListTasksParams,
  ListTasksResponse,
  UpdateTaskBody,
  UpdateTaskParams,
  UpdateTaskResponse,
  DeleteTaskResponse,
} from "@workspace/api-zod";
import { requireAuth, userId } from "../lib/auth";
import { getOwnedProject } from "./projects";
import { serializeTask } from "../lib/serializers";

const router: IRouter = Router();
router.use(requireAuth);

async function taskView(task: typeof tasksTable.$inferSelect) {
  const [assignee] = task.assigneeId
    ? await db.select().from(usersTable).where(eq(usersTable.id, task.assigneeId)).limit(1)
    : [];
  return serializeTask(task, assignee ?? null);
}

async function ownedTask(taskId: number, ownerId: number) {
  const [task] = await db.select({ task: tasksTable }).from(tasksTable)
    .innerJoin(projectsTable, eq(tasksTable.projectId, projectsTable.id))
    .where(and(eq(tasksTable.id, taskId), eq(projectsTable.ownerId, ownerId))).limit(1);
  return task?.task;
}

router.get("/projects/:projectId/tasks", async (req, res): Promise<void> => {
  const parsed = ListTasksParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const project = await getOwnedProject(parsed.data.projectId, userId(req));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const tasks = await db.select().from(tasksTable)
    .where(eq(tasksTable.projectId, project.id)).orderBy(asc(tasksTable.createdAt));
  res.json(ListTasksResponse.parse(await Promise.all(tasks.map(taskView))));
});

router.post("/projects/:projectId/tasks", async (req, res): Promise<void> => {
  const params = CreateTaskParams.safeParse(req.params);
  const body = CreateTaskBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const project = await getOwnedProject(params.data.projectId, userId(req));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const [task] = await db.insert(tasksTable).values({
    projectId: project.id,
    title: body.data.title,
    description: body.data.description ?? "",
    status: body.data.status ?? "todo",
    priority: body.data.priority ?? "medium",
    assigneeId: body.data.assigneeId ?? null,
    dueDate: body.data.dueDate ? body.data.dueDate.toISOString().slice(0, 10) : null,
  }).returning();
  res.status(201).json(CreateTaskResponse.parse(await taskView(task)));
});

router.patch("/tasks/:taskId", async (req, res): Promise<void> => {
  const params = UpdateTaskParams.safeParse(req.params);
  const body = UpdateTaskBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const task = await ownedTask(params.data.taskId, userId(req));
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  const [updated] = await db.update(tasksTable).set({
    ...(body.data.title !== undefined ? { title: body.data.title } : {}),
    ...(body.data.description !== undefined ? { description: body.data.description } : {}),
    ...(body.data.status !== undefined ? { status: body.data.status } : {}),
    ...(body.data.priority !== undefined ? { priority: body.data.priority } : {}),
    ...(body.data.assigneeId !== undefined ? { assigneeId: body.data.assigneeId } : {}),
    ...(body.data.dueDate !== undefined ? { dueDate: body.data.dueDate ? body.data.dueDate.toISOString().slice(0, 10) : null } : {}),
  }).where(eq(tasksTable.id, task.id)).returning();
  res.json(UpdateTaskResponse.parse(await taskView(updated)));
});

router.delete("/tasks/:taskId", async (req, res): Promise<void> => {
  const params = DeleteTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const task = await ownedTask(params.data.taskId, userId(req));
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  await db.delete(tasksTable).where(eq(tasksTable.id, task.id));
  res.json(DeleteTaskResponse.parse(undefined));
});

export default router;