# Backups

Two separate things, don't confuse them:

| | Manual download | Monthly Drive archive |
|---|---|---|
| Trigger | "Download Backup" button on the Dashboard | Vercel Cron, 1st of each month |
| Route | `GET /api/backup` | `GET /api/cron/backup` |
| Gate | `backup.export` permission | `CRON_SECRET` bearer, or a super admin |
| Database | whichever `APP_ENV` selected | **always production** (see below) |
| Destination | the user's browser | Google Drive |

Both produce the same thing: a JSON export of every collection
(`lib/types.ts`'s `DatabaseBackupPayload`). Neither is a `mongodump`/BSON
archive — Vercel's serverless runtime can't shell out to the `mongodump` binary
or write to a persistent filesystem, so an in-process Mongoose export is the
only approach that actually works there. Both include `User.password` (bcrypt
hashes), because a backup that can't restore working logins isn't a real backup
— treat the files as credentials.

## Drive layout

```
invoice-data-backup/        <- GOOGLE_DRIVE_BACKUP_FOLDER
  2026/
    Jan.json  Feb.json  Mar.json ...
  2025/
    Jan.json ...
```

Folders are created on demand. Re-running a month **replaces** that month's file
rather than adding `Jan (1).json`, so a retry or a manual re-run can't produce
duplicates.

## Scheduling

`vercel.json` runs the job **on the 1st of each month** at `0 2 1 * *`
(02:00 UTC = 07:30 IST), archiving the month that just ended:

```
1 Sep  ->  invoice-data-backup/2026/Aug.json
1 Jan  ->  invoice-data-backup/2025/Dec.json   (rolls back a year correctly)
```

**Why not "last day of the month"** — which is what was originally asked for:

1. Cron can't express it. Vercel's day-of-month field accepts only `1-31`; there
   is no `L`. Approximating with `28-31` plus a runtime "is today the last day?"
   check meant up to four firings a month to do one unit of work.
2. It was fragile. Hobby-plan cron has **±59 minutes of scheduling drift**, so a
   23:30 IST run on the 31st could land after midnight, fail the last-day test,
   and skip that month's backup **silently and entirely**.

Running on the 1st is immune to that drift (any time that day is valid) and the
archived month is genuinely complete — the last-day approach always missed the
final hours of the very month it was naming.

Dates are evaluated in **Asia/Kolkata**, not UTC: Vercel schedules in UTC, and
02:00 UTC is already 07:30 next-day in India, so a UTC-based check would name
the wrong month. `isBackupDay()` guards the handler even on a manual GET, so a
stray request can't overwrite a month's archive with a partial snapshot
(`?force=1` as a super admin is the deliberate override).

## Always production

`env.backupMongodbUri` resolves to `BACKUP_MONGODB_URI` → `MONGODB_URI_PRODUCTION`,
independent of `APP_ENV`. A cron firing from a preview/staging deployment
therefore still archives production rather than quietly saving the wrong
database. `lib/backupData.ts` opens its own short-lived Mongoose connection to
that URI (registering the same schemas on it) and closes it in a `finally`, so
it never disturbs the app's cached default connection or leaks connections
against the Atlas limit.

## Why an OAuth refresh token, not a service account

The destination is a **personal Gmail** Drive. A service account has no storage
quota of its own on consumer accounts, and files it uploads are owned by the
service account — uploading into a shared personal folder fails with
`storageQuotaExceeded`. Service accounts only work against a Workspace Shared
Drive. Using the owner's own refresh token means the files are created by, owned
by, and counted against that Gmail account, which is what was asked for.

The scope requested is `drive.file` — access limited to files this app itself
creates. It cannot read or modify anything else already in that Drive.

## One-time setup

1. **Google Cloud Console** → create/select a project → enable the **Google Drive API**.
2. **Credentials → Create credentials → OAuth client ID**, type **Web application**.
   Add `http://localhost:53682` as an authorized redirect URI.
   (If the consent screen is in "Testing" mode, add the Gmail account under
   *Test users*, otherwise authorization is refused.)
3. Put the client id/secret in `.env` (`GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`).
4. Run `npm run drive:token`, open the printed URL, sign in as
   **beintouch.vgk@gmail.com**, approve. Copy the printed
   `GOOGLE_DRIVE_REFRESH_TOKEN` into `.env`.
5. Set a long random `CRON_SECRET` in `.env`.
6. In **Vercel → Project → Settings → Environment Variables (Production)** add:
   `CRON_SECRET`, `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`,
   `GOOGLE_DRIVE_REFRESH_TOKEN`, `GOOGLE_DRIVE_BACKUP_FOLDER`, and
   `MONGODB_URI_PRODUCTION`. Deploy.

Vercel automatically sends `Authorization: Bearer $CRON_SECRET` on cron
invocations once `CRON_SECRET` is set on the project — nothing else to wire up.

## Verifying it works (without waiting for month end)

Signed in as a super admin, hit:

```
POST /api/cron/backup?force=1
```

`force=1` is honoured **only** for an authenticated super admin, never for the
cron caller, so the schedule itself can't be bypassed. The response reports the
Drive path written, whether it replaced an existing file, the byte size, and a
per-collection row count.

The refresh token stays valid until it's revoked, the Google account password
changes, or it goes ~6 months unused. If backups start failing with
`invalid_grant`, re-run `npm run drive:token`.
