import { ok } from "@/lib/response";
import { AUTH_COOKIE } from "@/lib/jwt";

export async function POST() {
  const res = ok({ loggedOut: true });
  res.cookies.set(AUTH_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
