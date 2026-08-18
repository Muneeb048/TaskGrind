import Project from "../models/Project.js";
import Task from "../models/Task.js";
import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";

/**
 * GET /api/dashboard/summary
 */
export const getDashboardSummary = asyncHandler(async (req, res) => {
  const ownerId = req.userId;

  // Get all project IDs for this user
  const projects = await Project.find({ owner: ownerId }).select("_id");
  const projectIds = projects.map((p) => p._id);

  // Get all tasks across those projects
  const tasks = projectIds.length
    ? await Task.find({ project: { $in: projectIds } }).sort({ createdAt: -1 })
    : [];

  // Build recent tasks (top 5) with assignee info
  const recentTasks = await Promise.all(
    tasks.slice(0, 5).map(async (task) => {
      const assignee = task.assignee
        ? await User.findById(task.assignee)
        : null;
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
    })
  );

  res.json({
    totalProjects: projects.length,
    totalTasks: tasks.length,
    completedTasks: tasks.filter((t) => t.status === "done").length,
    inProgressTasks: tasks.filter((t) => t.status === "in_progress").length,
    recentTasks,
  });
});
