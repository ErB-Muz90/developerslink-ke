import { Router } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable, passwordResetTokensTable } from "@workspace/db";
import { eq, and, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { logger } from "../lib/logger";

const router = Router();

const forgotSchema = z.object({
  email: z.string().email(),
});

const resetSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[0-9]/),
});

async function sendResetEmail(to: string, resetUrl: string): Promise<void> {
  const apiKey = process.env["RESEND_API_KEY"];

  if (!apiKey) {
    logger.info({ resetUrl }, "DEV MODE — no RESEND_API_KEY set. Reset link logged here:");
    return;
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);

  await resend.emails.send({
    from: "DevLink KE <onboarding@resend.dev>",
    to,
    subject: "Reset your DevLink KE password",
    html: `
      <div style="font-family:monospace;max-width:480px;margin:0 auto;background:#0a0a0a;color:#e5e5e5;padding:32px;border:1px solid #27272a;">
        <p style="font-size:18px;font-weight:bold;color:#22c55e;margin:0 0 4px;">DL_KE</p>
        <p style="font-size:12px;color:#71717a;margin:0 0 24px;">RECOVER_ACCESS</p>
        <p style="margin:0 0 16px;font-size:14px;">You requested a password reset for your DevLink KE account.</p>
        <a href="${resetUrl}"
           style="display:inline-block;background:#22c55e;color:#0a0a0a;font-weight:bold;padding:12px 24px;text-decoration:none;font-size:13px;letter-spacing:0.05em;">
          RESET_PASSWORD →
        </a>
        <p style="margin:24px 0 0;font-size:12px;color:#71717a;">
          This link expires in 1 hour. If you didn't request this, ignore this email — your password won't change.
        </p>
      </div>
    `,
  });
}

router.post("/auth/forgot-password", async (req, res) => {
  const parsed = forgotSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid email address" });
  }

  const { email } = parsed.data;

  const [user] = await db
    .select({ id: usersTable.id, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.email, email));

  if (!user) {
    return res.json({ message: "If that email is registered, a reset link has been sent." });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await db.insert(passwordResetTokensTable).values({
    userId: user.id,
    token,
    expiresAt,
  });

  const domain = process.env["REPLIT_DEV_DOMAIN"]
    ? `https://${process.env["REPLIT_DEV_DOMAIN"]}`
    : "http://localhost:80";
  const resetUrl = `${domain}/reset-password?token=${token}`;

  try {
    await sendResetEmail(email, resetUrl);
  } catch (err) {
    logger.error({ err }, "Failed to send reset email");
  }

  res.json({ message: "If that email is registered, a reset link has been sent." });
});

router.post("/auth/reset-password", async (req, res) => {
  const parsed = resetSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }

  const { token, password } = parsed.data;

  const [record] = await db
    .select()
    .from(passwordResetTokensTable)
    .where(
      and(
        eq(passwordResetTokensTable.token, token),
        isNull(passwordResetTokensTable.usedAt),
        gt(passwordResetTokensTable.expiresAt, new Date()),
      ),
    );

  if (!record) {
    return res.status(400).json({ error: "This reset link is invalid or has expired. Please request a new one." });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db
    .update(usersTable)
    .set({ passwordHash })
    .where(eq(usersTable.id, record.userId));

  await db
    .update(passwordResetTokensTable)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokensTable.id, record.id));

  res.json({ message: "Password updated successfully." });
});

export default router;
