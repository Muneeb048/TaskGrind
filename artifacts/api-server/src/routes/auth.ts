import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  SignupBody,
  SignupResponse,
  LoginBody,
  LoginResponse,
  GetCurrentUserResponse,
} from "@workspace/api-zod";
import { clearSession, requireAuth, setSession, userId } from "../lib/auth";
import { serializeUser } from "../lib/serializers";

const router: IRouter = Router();

router.post("/auth/signup", async (req, res): Promise<void> => {
  const parsed = SignupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing[0]) {
    res.status(400).json({ error: "An account with that email already exists" });
    return;
  }

  const [user] = await db.insert(usersTable).values({
    name: parsed.data.name,
    email,
    passwordHash: await bcrypt.hash(parsed.data.password, 12),
    avatar: "",
  }).returning();

  setSession(res, user.id);
  res.status(201).json(SignupResponse.parse({ user: serializeUser(user) }));
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, parsed.data.email.toLowerCase())).limit(1);
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    res.status(401).json({ error: "Email or password is incorrect" });
    return;
  }

  setSession(res, user.id);
  res.json(LoginResponse.parse({ user: serializeUser(user) }));
});

router.post("/auth/logout", (_req, res): void => {
  clearSession(res);
  res.sendStatus(204);
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId(req))).limit(1);
  if (!user) {
    clearSession(res);
    res.status(401).json({ error: "User account not found" });
    return;
  }
  res.json(GetCurrentUserResponse.parse(serializeUser(user)));
});

export default router;