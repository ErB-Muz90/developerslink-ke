import { Router } from "express";
import { db } from "@workspace/db";
import { collabRequestsTable, usersTable, notificationsTable } from "@workspace/db";
import { eq, and, or } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const sendSchema = z.object({
  toUserId: z.number().int().positive(),
  message: z.string().max(400).optional(),
});

router.post("/collab-requests", async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const parsed = sendSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const { toUserId, message } = parsed.data;

  if (toUserId === userId) {
    return res.status(400).json({ error: "You cannot send a collab request to yourself" });
  }

  const [target] = await db.select({ id: usersTable.id, displayName: usersTable.displayName })
    .from(usersTable).where(eq(usersTable.id, toUserId));
  if (!target) return res.status(404).json({ error: "User not found" });

  const [existing] = await db.select({ id: collabRequestsTable.id, status: collabRequestsTable.status })
    .from(collabRequestsTable)
    .where(and(
      eq(collabRequestsTable.fromUserId, userId),
      eq(collabRequestsTable.toUserId, toUserId),
      eq(collabRequestsTable.status, "pending"),
    ));

  if (existing) {
    return res.status(409).json({ error: "You already have a pending request to this builder" });
  }

  const [fromUser] = await db.select({ displayName: usersTable.displayName })
    .from(usersTable).where(eq(usersTable.id, userId));

  const [request] = await db.insert(collabRequestsTable)
    .values({ fromUserId: userId, toUserId, message: message ?? null })
    .returning();

  await db.insert(notificationsTable).values({
    userId: toUserId,
    fromUserId: userId,
    roomId: 0,
    message: `${fromUser?.displayName ?? "Someone"} wants to collaborate with you${message ? `: "${message.substring(0, 80)}${message.length > 80 ? "…" : ""}"` : "."}`,
  }).catch(() => {});

  res.status(201).json(request);
});

router.get("/collab-requests/sent", async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const requests = await db.select({
    id: collabRequestsTable.id,
    toUserId: collabRequestsTable.toUserId,
    message: collabRequestsTable.message,
    status: collabRequestsTable.status,
    createdAt: collabRequestsTable.createdAt,
    displayName: usersTable.displayName,
    username: usersTable.username,
  })
    .from(collabRequestsTable)
    .leftJoin(usersTable, eq(collabRequestsTable.toUserId, usersTable.id))
    .where(eq(collabRequestsTable.fromUserId, userId))
    .orderBy(collabRequestsTable.createdAt);

  res.json(requests);
});

router.get("/collab-requests/check/:toUserId", async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ sent: false });

  const toUserId = parseInt(req.params.toUserId);
  if (isNaN(toUserId)) return res.status(400).json({ error: "Invalid id" });

  const [existing] = await db.select({ id: collabRequestsTable.id, status: collabRequestsTable.status })
    .from(collabRequestsTable)
    .where(and(
      eq(collabRequestsTable.fromUserId, userId),
      eq(collabRequestsTable.toUserId, toUserId),
    ));

  res.json({ sent: !!existing, status: existing?.status ?? null });
});

export default router;
