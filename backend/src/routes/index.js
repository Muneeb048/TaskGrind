import { Router } from "express";
import authRoutes from "./auth.routes.js";
import projectRoutes from "./project.routes.js";
import taskRoutes from "./task.routes.js";
import teamRoutes from "./team.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import profileRoutes from "./profile.routes.js";

const router = Router();

// Health check (no auth required)
router.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

// Mount all sub-routers
router.use(authRoutes);
router.use(projectRoutes);
router.use(taskRoutes);
router.use(teamRoutes);
router.use(dashboardRoutes);
router.use(profileRoutes);

export default router;
