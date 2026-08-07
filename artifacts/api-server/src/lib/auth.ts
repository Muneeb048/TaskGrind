import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

const COOKIE_NAME = "taskflow_token";
const JWT_SECRET: string = process.env.SESSION_SECRET ?? (() => {
  throw new Error("SESSION_SECRET must be set");
})();

declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

export function setSession(res: Response, userId: number): void {
  const token = jwt.sign({ sub: String(userId) }, JWT_SECRET, { expiresIn: "7d" });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearSession(res: Response): void {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

function readToken(req: Request): string | undefined {
  const cookieToken = req.cookies?.[COOKIE_NAME];
  if (typeof cookieToken === "string") return cookieToken;

  const authHeader = req.header("authorization");
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);
  return undefined;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = readToken(req);
  if (!token) {
    res.status(401).json({ error: "You must be signed in" });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    const userId = Number(payload.sub);
    if (!Number.isInteger(userId) || userId <= 0) {
      res.status(401).json({ error: "Invalid session" });
      return;
    }
    req.userId = userId;
    next();
  } catch {
    res.status(401).json({ error: "Your session has expired" });
  }
}

export function userId(req: Request): number {
  if (!req.userId) throw new Error("Missing authenticated user");
  return req.userId;
}