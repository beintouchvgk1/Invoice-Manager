import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Admin from "@/models/Admin";
import { comparePassword } from "@/lib/bcrypt";
import { signToken, AUTH_COOKIE } from "@/lib/jwt";
import { ok, fail } from "@/lib/response";
import { isNonEmptyString } from "@/lib/validators";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || !isNonEmptyString(body.username) || !isNonEmptyString(body.password)) {
    return fail("Username and password are required", 400);
  }

  await connectDB();
  const admin = await Admin.findOne({ username: body.username.trim() });
  if (!admin) return fail("Invalid username or password", 401);

  const valid = await comparePassword(body.password, admin.password);
  if (!valid) return fail("Invalid username or password", 401);

  const token = signToken({ sub: admin._id.toString(), username: admin.username });
  const res = ok({ username: admin.username });
  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
