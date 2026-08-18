import jwt from "jsonwebtoken";
import ApiError from "../utils/ApiError.js";

const COOKIE_NAME = "taskflow_token";

/**
 * Reads JWT from cookie or Authorization header.
 */
function readToken(req) {
  // 1. Try httpOnly cookie
  const cookieToken = req.cookies?.[COOKIE_NAME];
  if (typeof cookieToken === "string" && cookieToken.length > 0) {
    return cookieToken;
  }

  // 2. Try Authorization: Bearer <token>
  const authHeader = req.header("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return undefined;
}

/**
 * Middleware: Require a valid JWT. Attaches `req.userId` on success.
 */
export function requireAuth(req, _res, next) {
  const token = readToken(req);

  if (!token) {
    throw ApiError.unauthorized("You must be signed in");
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const userId = payload.sub;

    if (!userId) {
      throw ApiError.unauthorized("Invalid session");
    }

    req.userId = userId;
    next();
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw ApiError.unauthorized("Your session has expired");
  }
}

/**
 * Signs a JWT and sets it as an httpOnly cookie.
 */
export function setSession(res, userId) {
  const token = jwt.sign({ sub: String(userId) }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

/**
 * Clears the session cookie.
 */
export function clearSession(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
