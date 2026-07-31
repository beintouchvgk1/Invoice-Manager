import { NextResponse } from "next/server";

// Auth-free on purpose — this only answers "can the browser reach the server at
// all", which lib/offline/connectivity.ts polls to detect real connectivity
// (navigator.onLine is unreliable: it can't tell a dead LAN from a live one).
// Deliberately doesn't touch the DB — a Mongo hiccup shouldn't read as "offline".
export async function GET() {
  return new NextResponse(null, { status: 204 });
}
