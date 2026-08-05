// Single source of truth for environment/config values. Every file that needs
// an env var imports `env` from here instead of reading `process.env` directly.
//
// One .env file holds all three MongoDB URIs (local / staging / production).
// APP_ENV is the switch that picks which one is active:
//   APP_ENV=local       -> MONGODB_URI_LOCAL
//   APP_ENV=staging     -> MONGODB_URI_STAGING
//   APP_ENV=production  -> MONGODB_URI_PRODUCTION
// On Vercel, set APP_ENV=staging for the Preview scope and APP_ENV=production
// for the Production scope in the project's Environment Variables dashboard.

import type { AppEnv } from "@/lib/types";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const VALID_APP_ENVS: AppEnv[] = ["local", "staging", "production"];

function resolveAppEnv(): AppEnv {
  const raw = process.env.APP_ENV;
  if (!raw) {
    throw new Error('Missing required environment variable: APP_ENV (must be "local", "staging", or "production")');
  }
  if (!VALID_APP_ENVS.includes(raw as AppEnv)) {
    throw new Error(`Invalid APP_ENV "${raw}" - must be one of: ${VALID_APP_ENVS.join(", ")}`);
  }
  return raw as AppEnv;
}

function resolveMongodbUri(appEnv: AppEnv): string {
  const key = `MONGODB_URI_${appEnv.toUpperCase()}`;
  return required(key);
}

const appEnv = resolveAppEnv();

export const env = {
  appEnv,
  mongodbUri: resolveMongodbUri(appEnv),
  jwtSecret: required("JWT_SECRET"),

  // --- Monthly Google Drive backup (see references/backup.md) -----------------
  // All optional: the app boots and runs perfectly without them, the scheduled
  // backup simply reports that it isn't configured yet. `required()` is
  // deliberately NOT used here — a missing Drive credential must never take the
  // whole app down.
  //
  // The backup always reads PRODUCTION data regardless of which deployment runs
  // it, so a cron firing from a preview/staging deployment can't quietly archive
  // the wrong database. BACKUP_MONGODB_URI overrides that for testing.
  backupMongodbUri: process.env.BACKUP_MONGODB_URI || process.env.MONGODB_URI_PRODUCTION || "",
  cronSecret: process.env.CRON_SECRET || "",
  googleDrive: {
    clientId: process.env.GOOGLE_DRIVE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET || "",
    refreshToken: process.env.GOOGLE_DRIVE_REFRESH_TOKEN || "",
    rootFolder: process.env.GOOGLE_DRIVE_BACKUP_FOLDER || "invoice-data-backup",
  },
  seedSuperAdminEmail: process.env.SEED_SUPER_ADMIN_EMAIL || "beintouch.vgk@gmail.com",
  seedSuperAdminPassword: process.env.SEED_SUPER_ADMIN_PASSWORD || "admin123",
  seedSuperAdminPhone: process.env.SEED_SUPER_ADMIN_PHONE || "",
  isProduction: process.env.NODE_ENV === "production",
} as const;
