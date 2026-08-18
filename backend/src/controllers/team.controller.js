import Team from "../models/Team.js";
import TeamMember from "../models/TeamMember.js";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

/**
 * Serialize a team member document for the API response.
 */
function serializeMember(member) {
  return {
    userId: member.user ?? member._id,
    name: member.name,
    email: member.email,
    avatar: member.avatar,
    role: member.role,
    status: member.status,
  };
}

/**
 * Build full team view with members.
 */
async function teamView(team) {
  const members = await TeamMember.find({ team: team._id });
  return {
    id: team._id,
    name: team.name,
    memberCount: members.length,
    members: members.map(serializeMember),
  };
}

/**
 * Find a team owned by the given user.
 */
async function ownedTeam(teamId, ownerId) {
  return Team.findOne({ _id: teamId, owner: ownerId });
}

/**
 * GET /api/teams
 */
export const listTeams = asyncHandler(async (req, res) => {
  const teams = await Team.find({ owner: req.userId });
  const data = await Promise.all(teams.map(teamView));
  res.json(data);
});

/**
 * POST /api/teams
 */
export const createTeam = asyncHandler(async (req, res) => {
  const ownerId = req.userId;
  const team = await Team.create({ name: req.body.name, owner: ownerId });

  // Add the owner as the first member
  const owner = await User.findById(ownerId);
  await TeamMember.create({
    team: team._id,
    user: ownerId,
    email: owner.email,
    name: owner.name,
    avatar: owner.avatar,
    role: "owner",
    status: "active",
  });

  res.status(201).json(await teamView(team));
});

/**
 * POST /api/teams/:teamId/members
 */
export const inviteMember = asyncHandler(async (req, res) => {
  const team = await ownedTeam(req.params.teamId, req.userId);
  if (!team) {
    throw ApiError.notFound("Team not found");
  }

  const email = req.body.email.toLowerCase();
  const existingUser = await User.findOne({ email });

  const memberData = {
    team: team._id,
    user: existingUser?._id ?? null,
    email,
    name: existingUser?.name ?? "Pending invite",
    avatar: existingUser?.avatar ?? "",
    role: req.body.role ?? "member",
    status: existingUser ? "active" : "invited",
  };

  // Upsert: if this email is already invited to this team, update them
  const member = await TeamMember.findOneAndUpdate(
    { team: team._id, email },
    { $set: memberData },
    { new: true, upsert: true, runValidators: true }
  );

  res.status(201).json(serializeMember(member));
});

/**
 * PATCH /api/teams/:teamId/members/:userId
 */
export const updateMemberRole = asyncHandler(async (req, res) => {
  const team = await ownedTeam(req.params.teamId, req.userId);
  if (!team) {
    throw ApiError.notFound("Team not found");
  }

  const member = await TeamMember.findOneAndUpdate(
    { team: team._id, user: req.params.userId },
    { $set: { role: req.body.role } },
    { new: true, runValidators: true }
  );

  if (!member) {
    throw ApiError.notFound("Member not found");
  }

  res.json(serializeMember(member));
});
