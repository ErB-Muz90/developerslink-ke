import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createAndSendVerification } from "./email-verification";

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

const router = Router();

const registerSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  displayName: z.string().min(2),
  bio: z.string().optional(),
  location: z.string().optional(),
  level: z.enum(["beginner", "intermediate", "pro"]).default("beginner"),
  lookingFor: z.string().optional(),
  githubUrl: z.string().url().optional().or(z.literal("")),
  twitterUrl: z.string().url().optional().or(z.literal("")),
  skills: z.array(z.object({
    name: z.string(),
    category: z.enum(["backend", "frontend", "mobile", "ai", "networking", "design", "devops", "other"]),
    proficiency: z.enum(["beginner", "intermediate", "pro"]),
  })).default([]),
});

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

function safeUser(user: typeof usersTable.$inferSelect) {
  const { passwordHash: _, ...safe } = user;
  return safe;
}

router.post("/auth/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }

  const { username, email, password, ...rest } = parsed.data;

  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.username, username));
  if (existing) return res.status(409).json({ error: "Username already taken" });

  const [existingEmail] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email));
  if (existingEmail) return res.status(409).json({ error: "Email already registered" });

  const passwordHash = await bcrypt.hash(password, 12);

  const [user] = await db
    .insert(usersTable)
    .values({ username, email, passwordHash, ...rest })
    .returning();

  req.session.userId = user.id;

  if (user.email) {
    createAndSendVerification(user.id, user.email).catch(() => {});
  }

  res.status(201).json(safeUser(user));
});

router.post("/auth/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const { username, password } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username));

  if (!user) return res.status(401).json({ error: "Invalid username or password" });
  if (!user.passwordHash) return res.status(401).json({ error: "Account has no password set. Contact support." });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid username or password" });

  req.session.userId = user.id;
  res.json(safeUser(user));
});

router.post("/auth/logout", async (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: "Failed to logout" });
    res.clearCookie("devlink.sid");
    res.json({ message: "Logged out" });
  });
});

router.get("/auth/me", async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: "Session invalid" });
  }

  res.json(safeUser(user));
});

export default router;
