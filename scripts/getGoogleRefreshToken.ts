/**
 * One-time setup helper: obtains the Google Drive refresh token used by the
 * monthly backup job (see .claude/references/backup.md for the full walkthrough).
 *
 *   npm run drive:token
 *
 * Run it once, sign in as the Gmail account whose Drive should hold the
 * backups (beintouch.vgk@gmail.com), and paste the resulting refresh token into
 * GOOGLE_DRIVE_REFRESH_TOKEN. The token does not expire on its own — it stays
 * valid until it's revoked in the Google account, or the account password
 * changes, or it goes ~6 months unused.
 *
 * It spins up a throwaway localhost server purely to catch Google's redirect,
 * which is what "http://localhost:53682" must be registered as an authorized
 * redirect URI for in the Cloud Console OAuth client.
 */
import http from "node:http";
import { URL } from "node:url";

const PORT = 53682;
const REDIRECT_URI = `http://localhost:${PORT}`;
// drive.file = access ONLY to files this app itself creates. It deliberately
// cannot read or touch anything else already in the Drive — the narrowest scope
// that still allows creating the backup folders and uploading into them.
const SCOPE = "https://www.googleapis.com/auth/drive.file";

const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error(
    "\nMissing GOOGLE_DRIVE_CLIENT_ID / GOOGLE_DRIVE_CLIENT_SECRET in .env.\n" +
      "Create an OAuth client (type: Web application) in Google Cloud Console first,\n" +
      `add "${REDIRECT_URI}" as an authorized redirect URI, then put both values in .env.\n`
  );
  process.exit(1);
}

const authUrl =
  "https://accounts.google.com/o/oauth2/v2/auth?" +
  new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPE,
    // access_type=offline + prompt=consent is what actually makes Google return
    // a refresh_token; without them you only get a 1-hour access token, and a
    // repeat authorization silently omits the refresh token entirely.
    access_type: "offline",
    prompt: "consent",
  }).toString();

console.log("\n1. Open this URL and sign in as the Drive account for backups:\n");
console.log(authUrl);
console.log("\n2. Waiting for Google to redirect back...\n");

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", REDIRECT_URI);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    res.end(`Authorization failed: ${error}. You can close this tab.`);
    console.error("Authorization failed:", error);
    server.close();
    process.exit(1);
  }
  if (!code) {
    res.end("Waiting for the authorization code...");
    return;
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });
    const body = (await tokenRes.json()) as { refresh_token?: string; error_description?: string; error?: string };

    if (!body.refresh_token) {
      const reason = body.error_description || body.error || "no refresh_token in response";
      res.end(`Failed: ${reason}. You can close this tab.`);
      console.error(
        `\nNo refresh token returned (${reason}).\n` +
          "If you've authorized this client before, revoke it at\n" +
          "https://myaccount.google.com/permissions and run this again.\n"
      );
      server.close();
      process.exit(1);
    }

    // Charset declared explicitly — without it Windows terminals/browsers render
    // the em dash as mojibake ("Done â€" refresh token captured").
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Done - refresh token captured. You can close this tab and return to the terminal.");
    console.log("Add this line to your .env (and to the Vercel Production environment variables):\n");
    console.log(`GOOGLE_DRIVE_REFRESH_TOKEN=${body.refresh_token}\n`);
    // Exit only once the socket is fully closed. Calling process.exit() straight
    // after server.close() trips a libuv assertion on Windows
    // ("!(handle->flags & UV_HANDLE_CLOSING)") — harmless, since the token has
    // already printed, but it looks like a crash.
    server.close(() => process.exit(0));
  } catch (err) {
    res.end("Token exchange failed. You can close this tab.");
    console.error("Token exchange failed:", err);
    server.close();
    process.exit(1);
  }
});

server.listen(PORT);
