import { Router } from "express";
import crypto from "crypto";
import { db } from "@workspace/db";
import { usersTable, emailVerificationTokensTable } from "@workspace/db";
import { eq, and, gt, isNull } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

export async function sendVerificationEmail(email: string, verifyUrl: string): Promise<void> {
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) {
    logger.info({ verifyUrl }, "DEV MODE — no RESEND_API_KEY. Verification link logged here:");
    return;
  }
  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: "DevLink KE <noreply@devlink.ke>",
    to: email,
    subject: "Verify your DevLink KE email",
    html: `
      <div style="font-family:monospace;max-width:480px;margin:0 auto;background:#0a0a0a;color:#e5e5e5;padding:32px;border:1px solid #27272a;">
        <p style="font-size:18px;font-weight:bold;color:#22c55e;margin:0 0 4px;">DL_KE</p>
        <p style="font-size:12px;color:#71717a;margin:0 0 24px;">VERIFY_EMAIL</p>
        <p style="margin:0 0 16px;font-size:14px;">Click below to verify your DevLink KE email address.</p>
        <a href="${verifyUrl}"
           style="display:inline-block;background:#22c55e;color:#0a0a0a;font-weight:bold;padding:12px 24px;text-decoration:none;font-size:13px;letter-spacing:0.05em;">
          VERIFY_EMAIL →
        </a>
        <p style="margin:24px 0 0;font-size:12px;color:#71717a;">
          This link expires in 24 hours. If you didn't create a DevLink KE account, ignore this email.
        </p>
      </div>
    `,
  });
}

export async function createAndSendVerification(userId: number, email: string): Promise<void> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await db.insert(emailVerificationTokensTable).values({ userId, token, expiresAt });

  const domain = process.env["REPLIT_DEV_DOMAIN"]
    ? `https://${process.env["REPLIT_DEV_DOMAIN"]}`
    : "http://localhost:80";
  const verifyUrl = `${domain}/verify-email?token=${token}`;

  try {
    await sendVerificationEmail(email, verifyUrl);
  } catch (err) {
    logger.error({ err }, "Failed to send verification email");
  }
}

router.post("/auth/verify-email", async (req, res) => {
  const { token } = req.body ?? {};
  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "Missing token" });
  }

  const [record] = await db
    .select()
    .from(emailVerificationTokensTable)
    .where(
      and(
        eq(emailVerificationTokensTable.token, token),
        isNull(emailVerificationTokensTable.usedAt),
        gt(emailVerificationTokensTable.expiresAt, new Date()),
      ),
    );

  if (!record) {
    return res.status(400).json({ error: "This link is invalid or has expired. Request a new one." });
  }

  await db.update(usersTable).set({ emailVerified: true }).where(eq(usersTable.id, record.userId));
  await db.update(emailVerificationTokensTable).set({ usedAt: new Date() }).where(eq(emailVerificationTokensTable.id, record.id));

  if (req.session.userId === record.userId) {
    res.json({ message: "Email verified." });
  } else {
    res.json({ message: "Email verified. You can now log in." });
  }
});

router.post("/auth/resend-verification", async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const [user] = await db.select({ id: usersTable.id, email: usersTable.email, emailVerified: usersTable.emailVerified })
    .from(usersTable).where(eq(usersTable.id, userId));

  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.emailVerified) return res.status(400).json({ error: "Email is already verified" });
  if (!user.email) return res.status(400).json({ error: "No email address on this account" });

  await createAndSendVerification(userId, user.email);
  res.json({ message: "Verification email sent." });
});

export default router;
