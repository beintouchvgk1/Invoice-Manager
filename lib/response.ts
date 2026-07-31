import { NextResponse } from "next/server";

export function ok(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

// 409 — the caller sent a `baseUpdatedAt` that no longer matches the record's
// current `updatedAt` (see offline sync's baseUpdatedAt precondition, checked in
// every mutable resource's PUT/DELETE route). `serverDoc` is the current record
// so the client's Resolve Sync Conflicts UI can show "yours vs. server's" without
// a second round-trip.
export function conflict(message: string, serverDoc: unknown) {
  return NextResponse.json({ success: false, error: message, conflict: serverDoc }, { status: 409 });
}
