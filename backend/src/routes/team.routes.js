import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import validate from "../middlewares/validate.js";
import {
  teamIdParam,
  teamMemberParams,
  createTeamSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
} from "../validators/team.validator.js";
import * as teamController from "../controllers/team.controller.js";

const router = Router();

// All team routes require authentication
router.use(requireAuth);

// GET /api/teams
router.get("/teams", teamController.listTeams);

// POST /api/teams
router.post(
  "/teams",
  validate({ body: createTeamSchema }),
  teamController.createTeam
);

// POST /api/teams/:teamId/members
router.post(
  "/teams/:teamId/members",
  validate({ params: teamIdParam, body: inviteMemberSchema }),
  teamController.inviteMember
);

// PATCH /api/teams/:teamId/members/:userId
router.patch(
  "/teams/:teamId/members/:userId",
  validate({ params: teamMemberParams, body: updateMemberRoleSchema }),
  teamController.updateMemberRole
);

export default router;
