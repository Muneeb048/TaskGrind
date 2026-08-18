import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import * as dashboardController from "../controllers/dashboard.controller.js";

const router = Router();

// GET /api/dashboard/summary
router.get("/dashboard/summary", requireAuth, dashboardController.getDashboardSummary);

export default router;
