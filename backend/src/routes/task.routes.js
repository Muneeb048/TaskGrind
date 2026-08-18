import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import validate from "../middlewares/validate.js";
import {
  projectIdParam,
  taskIdParam,
  createTaskSchema,
  updateTaskSchema,
} from "../validators/task.validator.js";
import * as taskController from "../controllers/task.controller.js";

const router = Router();

// All task routes require authentication
router.use(requireAuth);

// GET /api/projects/:projectId/tasks
router.get(
  "/projects/:projectId/tasks",
  validate({ params: projectIdParam }),
  taskController.listTasks
);

// POST /api/projects/:projectId/tasks
router.post(
  "/projects/:projectId/tasks",
  validate({ params: projectIdParam, body: createTaskSchema }),
  taskController.createTask
);

// PATCH /api/tasks/:taskId
router.patch(
  "/tasks/:taskId",
  validate({ params: taskIdParam, body: updateTaskSchema }),
  taskController.updateTask
);

// DELETE /api/tasks/:taskId
router.delete(
  "/tasks/:taskId",
  validate({ params: taskIdParam }),
  taskController.deleteTask
);

export default router;
