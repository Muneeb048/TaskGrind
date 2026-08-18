import Task from "../models/Task.js";
import Project from "../models/Project.js";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { getOwnedProject } from "./project.controller.js";

/**
 * Build task view with populated assignee.
 */
function serializeTask(task, assignee) {
  return {
    id: task._id,
    projectId: task.project,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    assignee: assignee
      ? {
          id: assignee._id,
          name: assignee.name,
          email: assignee.email,
          avatar: assignee.avatar,
          createdAt: assignee.createdAt,
        }
      : null,
    dueDate: task.dueDate,
    createdAt: task.createdAt,
  };
}

/**
 * Find a task whose parent project is owned by the given user.
 */
async function ownedTask(taskId, ownerId) {
  const task = await Task.findById(taskId);
  if (!task) return null;

  const project = await Project.findOne({ _id: task.project, owner: ownerId });
  if (!project) return null;

  return task;
}

/**
 * GET /api/projects/:projectId/tasks
 */
export const listTasks = asyncHandler(async (req, res) => {
  const project = await getOwnedProject(req.params.projectId, req.userId);
  if (!project) {
    throw ApiError.notFound("Project not found");
  }

  const tasks = await Task.find({ project: project._id }).sort({ createdAt: 1 });

  const data = await Promise.all(
    tasks.map(async (task) => {
      const assignee = task.assignee
        ? await User.findById(task.assignee)
        : null;
      return serializeTask(task, assignee);
    })
  );

  res.json(data);
});

/**
 * POST /api/projects/:projectId/tasks
 */
export const createTask = asyncHandler(async (req, res) => {
  const project = await getOwnedProject(req.params.projectId, req.userId);
  if (!project) {
    throw ApiError.notFound("Project not found");
  }

  const task = await Task.create({
    project: project._id,
    title: req.body.title,
    description: req.body.description ?? "",
    status: req.body.status ?? "todo",
    priority: req.body.priority ?? "medium",
    assignee: req.body.assigneeId ?? null,
    dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
  });

  const assignee = task.assignee ? await User.findById(task.assignee) : null;
  res.status(201).json(serializeTask(task, assignee));
});

/**
 * PATCH /api/tasks/:taskId
 */
export const updateTask = asyncHandler(async (req, res) => {
  const task = await ownedTask(req.params.taskId, req.userId);
  if (!task) {
    throw ApiError.notFound("Task not found");
  }

  const updates = {};
  if (req.body.title !== undefined) updates.title = req.body.title;
  if (req.body.description !== undefined) updates.description = req.body.description;
  if (req.body.status !== undefined) updates.status = req.body.status;
  if (req.body.priority !== undefined) updates.priority = req.body.priority;
  if (req.body.assigneeId !== undefined) updates.assignee = req.body.assigneeId;
  if (req.body.dueDate !== undefined) {
    updates.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;
  }

  const updated = await Task.findByIdAndUpdate(
    task._id,
    { $set: updates },
    { new: true, runValidators: true }
  );

  const assignee = updated.assignee
    ? await User.findById(updated.assignee)
    : null;
  res.json(serializeTask(updated, assignee));
});

/**
 * DELETE /api/tasks/:taskId
 */
export const deleteTask = asyncHandler(async (req, res) => {
  const task = await ownedTask(req.params.taskId, req.userId);
  if (!task) {
    throw ApiError.notFound("Task not found");
  }

  await Task.findByIdAndDelete(task._id);
  res.sendStatus(204);
});
