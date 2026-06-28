import { Router, type Request, type Response } from "express";
import { OAuth2Client } from "google-auth-library";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

const CLIENT_ID = process.env["GOOGLE_CLIENT_ID"] ?? "";
const CLIENT_SECRET = process.env["GOOGLE_CLIENT_SECRET"] ?? "";
const REDIRECT_URI =
  process.env["GOOGLE_CALLBACK_URL"] ??
  "https://devlink.erunstech.top/api/auth/google/callback";

function getOAuth2Client(): OAuth2Client {
  return new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

/**
 * GET /api/auth/google/url
 * Returns the Google OAuth consent URL. Frontend redirects the user here.
 */
router.get("/auth/google/url", (_req: Request, res: Response) => {
  const client = getOAuth2Client();

  const authorizeUrl = client.generateAuthUrl({
    access_type: "online",
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
  });

  return res.json({ url: authorizeUrl });
});

/**
 * GET /api/auth/google/callback
 * Google redirects here after the user consents.
 * Exchanges the code for tokens, finds or creates the user, and sets the session.
 */
router.get("/auth/google/callback", async (req: Request, res: Response) => {
  const { code, error: oauthError } = req.query;

  const frontendUrl = process.env["FRONTEND_URL"] ?? "https://devlink.erunstech.top";

  // User denied permissions or error
  if (oauthError) {
    logger.warn({ oauthError }, "Google OAuth error");
    return res.redirect(`${frontendUrl}/?google_auth=error&reason=access_denied`);
  }

  if (!code || typeof code !== "string") {
    return res.redirect(`${frontendUrl}/?google_auth=error&reason=missing_code`);
  }

  try {
    const client = getOAuth2Client();

    // Exchange code for tokens
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    if (!tokens.id_token) {
      return res.redirect(`${frontendUrl}/?google_auth=error&reason=no_id_token`);
    }

    // Verify and decode the ID token to get user profile info
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.sub) {
      return res.redirect(`${frontendUrl}/?google_auth=error&reason=invalid_token`);
    }

    const googleId = payload.sub;
    const email = payload.email ?? null;
    const displayName = payload.name ?? "Google User";
    const avatarUrl = payload.picture ?? null;

    // Check if a user already exists with this googleId or email
    const conditions = [eq(usersTable.googleId, googleId)];
    if (email) conditions.push(eq(usersTable.email, email));

    const [existingUser] = await db
      .select()
      .from(usersTable)
      .where(or(...conditions));

    if (existingUser) {
      // Link googleId if not already set (user registered with email first, then used Google)
      if (!existingUser.googleId) {
        await db
          .update(usersTable)
          .set({ googleId, avatarUrl: existingUser.avatarUrl ?? avatarUrl })
          .where(eq(usersTable.id, existingUser.id));
      }

      req.session.userId = existingUser.id;
      return res.redirect(`${frontendUrl}/?google_auth=success`);
    }

    // No existing user — create a new account
    // Generate a username from the email or display name
    let username = email
      ? email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 20)
      : `user_${googleId.slice(0, 8)}`;

    // Ensure username is unique by appending numbers if needed
    const [existingUsername] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.username, username));
    if (existingUsername) {
      username = `${username.slice(0, 15)}_${Math.random().toString(36).slice(2, 5)}`;
    }

    const [newUser] = await db
      .insert(usersTable)
      .values({
        username,
        email,
        displayName: displayName.slice(0, 100),
        avatarUrl,
        googleId,
        emailVerified: true, // Google has already verified the email
      })
      .returning();

    req.session.userId = newUser.id;
    return res.redirect(`${frontendUrl}/?google_auth=success`);
  } catch (err) {
    logger.error({ err }, "Google OAuth callback error");
    return res.redirect(`${frontendUrl}/?google_auth=error&reason=server_error`);
  }
});

export default router;
