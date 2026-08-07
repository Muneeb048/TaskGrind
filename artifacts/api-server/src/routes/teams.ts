import { Router, type IRouter } from "express";
import { and, eq, or } from "drizzle-orm";
import { db, teamMembersTable, teamsTable, usersTable } from "@workspace/db";
import {
  CreateTeamBody,
  CreateTeamResponse,
  InviteTeamMemberBody,
  InviteTeamMemberParams,
  InviteTeamMemberResponse,
  ListTeamsResponse,
  UpdateTeamMemberBody,
  UpdateTeamMemberParams,
  UpdateTeamMemberResponse,
} from "@workspace/api-zod";
import { requireAuth, userId } from "../lib/auth";
import { serializeMember, serializeUser } from "../lib/serializers";

const router: IRouter = Router();
router.use(requireAuth);

async function teamView(team: typeof teamsTable.$inferSelect) {
  const rows = await db.select().from(teamMembersTable).where(eq(teamMembersTable.teamId, team.id));
  return {
    id: team.id,
    name: team.name,
    memberCount: rows.length,
    members: rows.map(serializeMember),
  };
}

async function ownedTeam(teamId: number, ownerId: number) {
  const [team] = await db.select().from(teamsTable)
    .where(and(eq(teamsTable.id, teamId), eq(teamsTable.ownerId, ownerId))).limit(1);
  return team;
}

router.get("/teams", async (req, res): Promise<void> => {
  const teams = await db.select().from(teamsTable)
    .where(eq(teamsTable.ownerId, userId(req)));
  res.json(ListTeamsResponse.parse(await Promise.all(teams.map(teamView))));
});

router.post("/teams", async (req, res): Promise<void> => {
  const parsed = CreateTeamBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const ownerId = userId(req);
  const [team] = await db.insert(teamsTable).values({ name: parsed.data.name, ownerId }).returning();
  const [owner] = await db.select().from(usersTable).where(eq(usersTable.id, ownerId)).limit(1);
  await db.insert(teamMembersTable).values({
    teamId: team.id,
    userId: ownerId,
    email: owner.email,
    name: owner.name,
    avatar: owner.avatar,
    role: "owner",
    status: "active",
  });
  res.status(201).json(CreateTeamResponse.parse(await teamView(team)));
});

router.post("/teams/:teamId/members", async (req, res): Promise<void> => {
  const params = InviteTeamMemberParams.safeParse(req.params);
  const body = InviteTeamMemberBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const team = await ownedTeam(params.data.teamId, userId(req));
  if (!team) {
    res.status(404).json({ error: "Team not found" });
    return;
  }
  const email = body.data.email.toLowerCase();
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  const [member] = await db.insert(teamMembersTable).values({
    teamId: team.id,
    userId: existing?.id ?? null,
    email,
    name: existing?.name ?? "Pending invite",
    avatar: existing?.avatar ?? "",
    role: body.data.role ?? "member",
    status: existing ? "active" : "invited",
  }).onConflictDoUpdate({
    target: [teamMembersTable.teamId, teamMembersTable.email],
    set: {
      userId: existing?.id ?? null,
      name: existing?.name ?? "Pending invite",
      avatar: existing?.avatar ?? "",
      role: body.data.role ?? "member",
      status: existing ? "active" : "invited",
    },
  }).returning();
  res.status(201).json(InviteTeamMemberResponse.parse(serializeMember(member)));
});

router.patch("/teams/:teamId/members/:userId", async (req, res): Promise<void> => {
  const params = UpdateTeamMemberParams.safeParse(req.params);
  const body = UpdateTeamMemberBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const team = await ownedTeam(params.data.teamId, userId(req));
  if (!team) {
    res.status(404).json({ error: "Team not found" });
    return;
  }
  const [member] = await db.update(teamMembersTable).set({ role: body.data.role })
    .where(and(eq(teamMembersTable.teamId, team.id), eq(teamMembersTable.userId, params.data.userId))).returning();
  if (!member) {
    res.status(404).json({ error: "Member not found" });
    return;
  }
  res.json(UpdateTeamMemberResponse.parse(serializeMember(member)));
});

export default router;