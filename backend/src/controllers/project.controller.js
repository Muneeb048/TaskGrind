import Project from "../models/Project.js";
import Task from "../models/Task.js";
import TeamMember from "../models/TeamMember.js";
import Team from "../models/Team.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

/**
 * Build the enriched project view (with task counts and member count).
 */
async function projectView(project) {
  const [taskStats] = await Task.aggregate([
    { $match: { project: project._id } },
    {
      $group: {
        _id: null,
        taskCount: { $sum: 1 },
        completedTaskCount: {
          $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] },
        },
      },
    },
  ]);

  // Count members across all teams owned by this project's owner
  const teamIds = await Team.find({ owner: project.owner }).distinct("_id");
  const memberCount = teamIds.length
    ? await TeamMember.countDocuments({ team: { $in: teamIds } })
    : 0;

  return {
    id: project._id,
    name: project.name,
    description: project.description,
    color: project.color,
    status: project.status,
    taskCount: taskStats?.taskCount ?? 0,
    completedTaskCount: taskStats?.completedTaskCount ?? 0,
    memberCount,
    updatedAt: project.updatedAt,
  };
}

/**
 * Find a project that belongs to the given owner.
 */
async function getOwnedProject(projectId, ownerId) {
  return Project.findOne({ _id: projectId, owner: ownerId });
}

/**
 * GET /api/projects
 */
export const listProjects = asyncHandler(async (req, res) => {
  const projects = await Project.find({ owner: req.userId }).sort({
    updatedAt: -1,
  });
  const data = await Promise.all(projects.map(projectView));
  res.json(data);
});

/**
 * POST /api/projects
 */
export const createProject = asyncHandler(async (req, res) => {
  const project = await Project.create({
    owner: req.userId,
    name: req.body.name,
    description: req.body.description ?? "",
    color: req.body.color ?? "#5b5bd6",
  });

  res.status(201).json(await projectView(project));
});

/**
 * GET /api/projects/:projectId
 */
export const getProject = asyncHandler(async (req, res) => {
  const project = await getOwnedProject(req.params.projectId, req.userId);
  if (!project) {
    throw ApiError.notFound("Project not found");
  }

  res.json(await projectView(project));
});

/**
 * PATCH /api/projects/:projectId
 */
export const updateProject = asyncHandler(async (req, res) => {
  const project = await getOwnedProject(req.params.projectId, req.userId);
  if (!project) {
    throw ApiError.notFound("Project not found");
  }

  // Apply only provided fields
  const updates = {};
  if (req.body.name !== undefined) updates.name = req.body.name;
  if (req.body.description !== undefined) updates.description = req.body.description;
  if (req.body.color !== undefined) updates.color = req.body.color;
  if (req.body.status !== undefined) updates.status = req.body.status;

  const updated = await Project.findByIdAndUpdate(
    project._id,
    { $set: updates },
    { new: true, runValidators: true }
  );

  res.json(await projectView(updated));
});

/**
 * DELETE /api/projects/:projectId
 */
export const deleteProject = asyncHandler(async (req, res) => {
  const project = await getOwnedProject(req.params.projectId, req.userId);
  if (!project) {
    throw ApiError.notFound("Project not found");
  }

  // Cascade: delete all tasks in this project
  await Task.deleteMany({ project: project._id });
  await Project.findByIdAndDelete(project._id);

  res.sendStatus(204);
});

export { getOwnedProject };
