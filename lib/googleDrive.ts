import { env } from "@/lib/env";

// A minimal Google Drive v3 client built on plain fetch.
//
// No `googleapis` dependency on purpose: that package is tens of megabytes and
// pulls in the whole Google API surface for what is three REST calls here, which
// matters on serverless cold starts. This project already avoids dependencies it
// doesn't need (no icon library, no data-fetching library) — same reasoning.
//
// AUTH — why a user refresh token and not a service account:
// the target is a personal Gmail Drive (beintouch.vgk@gmail.com). A service
// account has NO storage quota of its own on consumer Google accounts, and any
// file it uploads is owned by the service account rather than the person — so
// uploading into a shared personal folder fails with "storageQuotaExceeded".
// Service accounts only work against a Workspace Shared Drive. Using the
// owner's own OAuth refresh token means the files are created by, owned by, and
// counted against that Gmail account, which is exactly what was asked for.

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_FILES = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";
const FOLDER_MIME = "application/vnd.google-apps.folder";

export function isDriveConfigured(): boolean {
  const { clientId, clientSecret, refreshToken } = env.googleDrive;
  return Boolean(clientId && clientSecret && refreshToken);
}

async function getAccessToken(): Promise<string> {
  const { clientId, clientSecret, refreshToken } = env.googleDrive;
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.access_token) {
    // Surfaces the real reason (invalid_grant = the refresh token was revoked
    // or the Google account password changed) instead of a generic failure.
    throw new Error(`Google auth failed: ${body?.error_description || body?.error || res.status}`);
  }
  return body.access_token as string;
}

async function driveFetch(token: string, url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.headers || {}) },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`Drive API ${res.status}: ${body?.error?.message || "request failed"}`);
  return body;
}

function escapeQuery(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

// Returns the id of `name` under `parentId`, creating the folder if absent.
async function findOrCreateFolder(token: string, name: string, parentId: string | null): Promise<string> {
  const parentClause = parentId ? ` and '${parentId}' in parents` : " and 'root' in parents";
  const q = `name = '${escapeQuery(name)}' and mimeType = '${FOLDER_MIME}' and trashed = false${parentClause}`;
  const found = await driveFetch(token, `${DRIVE_FILES}?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=1`);
  if (found.files?.length) return found.files[0].id as string;

  const created = await driveFetch(token, `${DRIVE_FILES}?fields=id`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: parentId ? [parentId] : undefined }),
  });
  return created.id as string;
}

async function findFileId(token: string, name: string, parentId: string): Promise<string | null> {
  const q = `name = '${escapeQuery(name)}' and trashed = false and '${parentId}' in parents`;
  const found = await driveFetch(token, `${DRIVE_FILES}?q=${encodeURIComponent(q)}&fields=files(id)&pageSize=1`);
  return found.files?.length ? (found.files[0].id as string) : null;
}

// Uploads `content` to <rootFolder>/<year>/<fileName>, creating either folder if
// it doesn't exist yet. If that exact file already exists its content is
// REPLACED rather than duplicated — so a retried or re-triggered run for the
// same month leaves one file, not "Jan.json", "Jan (1).json", "Jan (2).json".
export async function uploadBackupToDrive(params: {
  year: string;
  fileName: string;
  content: string;
}): Promise<{ fileId: string; replaced: boolean; folderPath: string }> {
  const token = await getAccessToken();
  const rootId = await findOrCreateFolder(token, env.googleDrive.rootFolder, null);
  const yearId = await findOrCreateFolder(token, params.year, rootId);
  const existingId = await findFileId(token, params.fileName, yearId);

  const metadata = existingId
    ? { name: params.fileName }
    : { name: params.fileName, parents: [yearId] };

  // Multipart upload: metadata part + content part in one request.
  const boundary = `vgk-${crypto.randomUUID()}`;
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${params.content}\r\n` +
    `--${boundary}--`;

  const url = existingId
    ? `${DRIVE_UPLOAD}/${existingId}?uploadType=multipart&fields=id`
    : `${DRIVE_UPLOAD}?uploadType=multipart&fields=id`;

  const uploaded = await driveFetch(token, url, {
    method: existingId ? "PATCH" : "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });

  return {
    fileId: uploaded.id as string,
    replaced: Boolean(existingId),
    folderPath: `${env.googleDrive.rootFolder}/${params.year}/${params.fileName}`,
  };
}
