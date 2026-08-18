import bcrypt from "bcryptjs";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { setSession, clearSession } from "../middlewares/auth.js";

/**
 * POST /api/auth/signup
 * Create a new account and set session cookie.
 */
export const signup = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Check for existing user
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw ApiError.badRequest("An account with that email already exists");
  }

  // Hash password and create user
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
  });

  setSession(res, user._id);
  res.status(201).json({ user: user.toSafeJSON() });
});

/**
 * POST /api/auth/login
 * Verify credentials and set session cookie.
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw ApiError.unauthorized("Email or password is incorrect");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw ApiError.unauthorized("Email or password is incorrect");
  }

  setSession(res, user._id);
  res.json({ user: user.toSafeJSON() });
});

/**
 * POST /api/auth/logout
 * Clear session cookie.
 */
export const logout = (_req, res) => {
  clearSession(res);
  res.sendStatus(204);
};

/**
 * GET /api/auth/me
 * Return the currently authenticated user.
 */
export const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) {
    clearSession(res);
    throw ApiError.unauthorized("User account not found");
  }

  res.json(user.toSafeJSON());
});
