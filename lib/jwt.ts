import jwt from "jsonwebtoken";
import { env } from "@/lib/env";

const TOKEN_TTL = "7d";

export type AuthPayload = {
  sub: string;
  username: string;
};

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: TOKEN_TTL });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, env.jwtSecret) as AuthPayload;
  } catch {
    return null;
  }
}

export const AUTH_COOKIE = "vgk_token";
