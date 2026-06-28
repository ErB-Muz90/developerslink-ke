import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

const CLIENT_ID = process.env["GITHUB_CLIENT_ID"] ?? "";
const CLIENT_SECRET = process.env["GITHUB_CLIENT_SECRET"] ?? "";
const REDIRECT_URI =
  process.env["GITHUB_CALLBACK_URL"] ??
  "https://devlink.erunstech.top/api/auth/github/callback";

/**
 * GET /api/auth/github/url
 * Returns the GitHub OAuth consent URL.
 */
router.get("/auth/github/url", (_req: Request, res: Response) => {
  const redirectUri = REDIRECT_URI;
  const url = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user%20user:email`;

  return res.json({ url });
});

/**
 * GET /api/auth/github/callback
 * GitHub redirects here after the user consents.
 */
router.get("/auth/github/callback", async (req: Request, res: Response) => {
  const { code, error: oauthError } = req.query;
  const frontendUrl = process.env["FRONTEND_URL"] ?? "https://devlink.erunstech.top";

  if (oauthError) {
    logger.warn({ oauthError }, "GitHub OAuth error");
    return res.redirect(`${frontendUrl}/?github_auth=error&reason=access_denied`);
  }
  if (!code || typeof code !== "string") {
    return res.redirect(`${frontendUrl}/?github_auth=error&reason=missing_code`);
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
      }),
    });
    const tokenData = await tokenRes.json() as { access_token?: string; error?: string };

    if (!tokenData.access_token) {
      return res.redirect(`${frontendUrl}/?github_auth=error&reason=token_exchange_failed`);
    }

    const accessToken = tokenData.access_token;
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    // Get user profile
    const userRes = await fetch("https://api.github.com/user", { headers: authHeader });
    const githubUser = await userRes.json() as { id: number; login: string; name?: string | null; avatar_url?: string; email?: string | null };

    // Get primary email if not public
    let email: string | null = githubUser.email ?? null;
    if (!email) {
      const emailsRes = await fetch("https://api.github.com/user/emails", { headers: authHeader });
      const emails = await emailsRes.json() as { email: string; primary: boolean; verified: boolean }[];
      const primary = emails.find((e) => e.primary);
      if (primary) email = primary.email;
    }

    const githubId = String(githubUser.id);
    const displayName = githubUser.name ?? githubUser.login;
    const avatarUrl = githubUser.avatar_url ?? null;

    // Look up existing user by githubId or email
    const conditions = [eq(usersTable.githubId, githubId)];
    if (email) conditions.push(eq(usersTable.email, email));

    const [existingUser] = await db
      .select()
      .from(usersTable)
      .where(or(...conditions));

    if (existingUser) {
      if (!existingUser.githubId) {
        await db
          .update(usersTable)
          .set({ githubId, avatarUrl: existingUser.avatarUrl ?? avatarUrl })
          .where(eq(usersTable.id, existingUser.id));
      }
      req.session.userId = existingUser.id;
      return res.redirect(`${frontendUrl}/?github_auth=success`);
    }

    // Create new user
    let username = githubUser.login.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 20);
    const [existingUsername] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.username, username));
    if (existingUsername) {
      username = `${username.slice(0, 15)}_${Math.random().toString(36).slice(2, 5)}`;
    }

    const [newUser] = await db
      .insert(usersTable)
      .values({ username, email, displayName: displayName.slice(0, 100), avatarUrl, githubId, emailVerified: true })
      .returning();

    req.session.userId = newUser.id;
    return res.redirect(`${frontendUrl}/?github_auth=success`);
  } catch (err) {
    logger.error({ err }, "GitHub OAuth callback error");
    return res.redirect(`${frontendUrl}/?github_auth=error&reason=server_error`);
  }
});

export default router;
