import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { UpdateProfileBody, UpdateProfileResponse } from "@workspace/api-zod";
import { requireAuth, userId } from "../lib/auth";
import { serializeUser } from "../lib/serializers";

const router: IRouter = Router();
router.patch("/profile", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, userId(req))).limit(1);
  if (!existing) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const [updated] = await db.update(usersTable).set({
    ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
    ...(parsed.data.email !== undefined ? { email: parsed.data.email.toLowerCase() } : {}),
  }).where(eq(usersTable.id, existing.id)).returning();
  res.json(UpdateProfileResponse.parse(serializeUser(updated)));
});

export default router;