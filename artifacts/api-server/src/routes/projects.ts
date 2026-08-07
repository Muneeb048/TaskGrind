import { Router, type IRouter } from "express";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { db, projectsTable, tasksTable, teamMembersTable, teamsTable } from "@workspace/db";
import {
  CreateProjectBody,
  CreateProjectResponse,
  GetProjectParams,
  GetProjectResponse,
  ListProjectsResponse,
  UpdateProjectBody,
  UpdateProjectParams,
  UpdateProjectResponse,
  DeleteProjectParams,
} from "@workspace/api-zod";
import { requireAuth, userId } from "../lib/auth";

const router: IRouter = Router();

async function projectView(project: typeof projectsTable.$inferSelect) {
  const [taskStats] = await db.select({
    taskCount: count(tasksTable.id),
    completedTaskCount: sql<number>`count(*) filter (where ${tasksTable.status} = 'done')`,
  }).from(tasksTable).where(eq(tasksTable.projectId, project.id));
  const [memberStats] = await db.select({
    memberCount: count(teamMembersTable.id),
  }).from(teamMembersTable).innerJoin(teamsTable, eq(teamMembersTable.teamId, teamsTable.id)).where(eq(teamsTable.ownerId, project.ownerId));
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    color: project.color,
    status: project.status as "active" | "archived",
    taskCount: Number(taskStats?.taskCount ?? 0),
    completedTaskCount: Number(taskStats?.completedTaskCount ?? 0),
    memberCount: Number(memberStats?.memberCount ?? 0),
    updatedAt: project.updatedAt,
  };
}

async function getOwnedProject(projectId: number, ownerId: number) {
  const [project] = await db.select().from(projectsTable)
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.ownerId, ownerId))).limit(1);
  return project;
}

router.use(requireAuth);

router.get("/projects", async (req, res): Promise<void> => {
  const projects = await db.select().from(projectsTable)
    .where(eq(projectsTable.ownerId, userId(req))).orderBy(desc(projectsTable.updatedAt));
  const data = await Promise.all(projects.map(projectView));
  res.json(ListProjectsResponse.parse(data));
});

router.post("/projects", async (req, res): Promise<void> => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [project] = await db.insert(projectsTable).values({
    ownerId: userId(req),
    name: parsed.data.name,
    description: parsed.data.description ?? "",
    color: parsed.data.color ?? "#5b5bd6",
  }).returning();
  res.status(201).json(CreateProjectResponse.parse(await projectView(project)));
});

router.get("/projects/:projectId", async (req, res): Promise<void> => {
  const parsed = GetProjectParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const project = await getOwnedProject(parsed.data.projectId, userId(req));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(GetProjectResponse.parse(await projectView(project)));
});

router.patch("/projects/:projectId", async (req, res): Promise<void> => {
  const params = UpdateProjectParams.safeParse(req.params);
  const body = UpdateProjectBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const existing = await getOwnedProject(params.data.projectId, userId(req));
  if (!existing) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const [project] = await db.update(projectsTable).set({
    ...body.data,
    updatedAt: new Date(),
  }).where(eq(projectsTable.id, existing.id)).returning();
  res.json(UpdateProjectResponse.parse(await projectView(project)));
});

router.delete("/projects/:projectId", async (req, res): Promise<void> => {
  const parsed = DeleteProjectParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const project = await getOwnedProject(parsed.data.projectId, userId(req));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  await db.delete(projectsTable).where(eq(projectsTable.id, project.id));
  res.sendStatus(204);
});

export { getOwnedProject };
export default router;