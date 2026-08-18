import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import validate from "../middlewares/validate.js";
import { updateProfileSchema } from "../validators/profile.validator.js";
import * as profileController from "../controllers/profile.controller.js";

const router = Router();

// PATCH /api/profile
router.patch(
  "/profile",
  requireAuth,
  validate({ body: updateProfileSchema }),
  profileController.updateProfile
);

export default router;
