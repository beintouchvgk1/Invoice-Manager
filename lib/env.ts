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

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

type AppEnv = "local" | "staging" | "production";

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
  seedAdminUser: process.env.SEED_ADMIN_USER || "admin",
  seedAdminPass: process.env.SEED_ADMIN_PASS || "admin123",
  isProduction: process.env.NODE_ENV === "production",
} as const;
