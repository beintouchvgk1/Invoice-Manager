import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import "@/models/Role";
import { comparePassword } from "@/lib/bcrypt";
import { signToken, AUTH_COOKIE } from "@/lib/jwt";
import { ok, fail } from "@/lib/response";
import { isNonEmptyString } from "@/lib/validators";
import { env } from "@/lib/env";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || !isNonEmptyString(body.email) || !isNonEmptyString(body.password)) {
    return fail("Email and password are required", 400);
  }

  await connectDB();
  const user = await User.findOne({ email: body.email.trim().toLowerCase() }).populate<{
    roleId: { name: string; isActive: boolean };
  }>("roleId");
  if (!user) return fail("Invalid email or password", 401);

  // Deliberately more specific than "Invalid email or password" once we know the
  // account exists — the account-status/role-status reasons aren't secrets (an
  // admin can already see them on the Users/Roles screens), and telling the user
  // exactly what to ask their admin for saves a support round-trip. Only "no such
  // user" and "wrong password" stay merged into the generic message, so login
  // still doesn't reveal whether an email is registered.
  if (!user.isActive) return fail("Your account has been deactivated by the admin. Please contact your admin.", 401);

  const role = user.roleId as unknown as { name: string; isActive: boolean } | null;
  if (!role || !role.isActive) {
    const roleName = role?.name || "assigned";
    return fail(`Your "${roleName}" role has been deactivated by the admin. Please contact your admin to activate it.`, 401);
  }

  const valid = await comparePassword(body.password, user.password);
  if (!valid) return fail("Invalid email or password", 401);

  const token = signToken({ sub: user._id.toString(), email: user.email, role: role.name });
  const res = ok({ email: user.email, role: role.name });
  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
