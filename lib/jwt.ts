import jwt from "jsonwebtoken";
import { env } from "@/lib/env";
import { AUTH_COOKIE, AUTH_TOKEN_TTL } from "@/lib/constants";
import type { AuthPayload } from "@/lib/types";

export type { AuthPayload };

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: AUTH_TOKEN_TTL });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, env.jwtSecret) as AuthPayload;
  } catch {
    return null;
  }
}

export { AUTH_COOKIE };
