// Shared by every mutable resource's PUT/DELETE route to implement the offline
// sync conflict-detection precondition: the client sends the `updatedAt` it had
// cached when the change was made (only when replaying a queued offline op —
// an ordinary online edit never sends this), and if the record has moved on
// since, the caller gets a 409 with the current doc instead of silently
// clobbering someone else's change.
export function updatedAtMismatch(doc: { updatedAt?: Date }, baseUpdatedAt: unknown): boolean {
  if (typeof baseUpdatedAt !== "string") return false;
  return doc.updatedAt?.toISOString() !== baseUpdatedAt;
}
