import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import validate from "../middlewares/validate.js";
import {
  projectIdParam,
  createProjectSchema,
  updateProjectSchema,
} from "../validators/project.validator.js";
import * as projectController from "../controllers/project.controller.js";

const router = Router();

// All project routes require authentication
router.use(requireAuth);

// GET /api/projects
router.get("/projects", projectController.listProjects);

// POST /api/projects
router.post(
  "/projects",
  validate({ body: createProjectSchema }),
  projectController.createProject
);

// GET /api/projects/:projectId
router.get(
  "/projects/:projectId",
  validate({ params: projectIdParam }),
  projectController.getProject
);

// PATCH /api/projects/:projectId
router.patch(
  "/projects/:projectId",
  validate({ params: projectIdParam, body: updateProjectSchema }),
  projectController.updateProject
);

// DELETE /api/projects/:projectId
router.delete(
  "/projects/:projectId",
  validate({ params: projectIdParam }),
  projectController.deleteProject
);

export default router;
