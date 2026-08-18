import { Router } from "express";
import validate from "../middlewares/validate.js";
import { signupSchema, loginSchema } from "../validators/auth.validator.js";
import { requireAuth } from "../middlewares/auth.js";
import * as authController from "../controllers/auth.controller.js";

const router = Router();

// POST /api/auth/signup
router.post("/auth/signup", validate({ body: signupSchema }), authController.signup);

// POST /api/auth/login
router.post("/auth/login", validate({ body: loginSchema }), authController.login);

// POST /api/auth/logout
router.post("/auth/logout", authController.logout);

// GET /api/auth/me
router.get("/auth/me", requireAuth, authController.me);

export default router;
