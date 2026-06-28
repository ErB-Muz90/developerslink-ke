import { Router } from "express";
import { db } from "@workspace/db";
import { collabRequestsTable, usersTable, notificationsTable, roomsTable, roomMembersTable } from "@workspace/db";
import { eq, and, or, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "../lib/auth-middleware";

const router = Router();

const sendSchema = z.object({
  toUserId: z.number().int().positive(),
  message: z.string().max(400).optional(),
});

router.post("/collab-requests", requireAuth, async (req, res) => {
  const userId = req.session.userId!;

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
    roomId: null,
    message: `${fromUser?.displayName ?? "Someone"} wants to collaborate with you${message ? `: "${message.substring(0, 80)}${message.length > 80 ? "…" : ""}"` : "."}`,
  }).catch(() => {});

  return res.status(201).json(request);
});

router.get("/collab-requests/incoming", requireAuth, async (req, res) => {
  const userId = req.session.userId!;

  const requests = await db.select({
    id: collabRequestsTable.id,
    fromUserId: collabRequestsTable.fromUserId,
    message: collabRequestsTable.message,
    status: collabRequestsTable.status,
    createdAt: collabRequestsTable.createdAt,
    displayName: usersTable.displayName,
    username: usersTable.username,
  })
    .from(collabRequestsTable)
    .leftJoin(usersTable, eq(collabRequestsTable.fromUserId, usersTable.id))
    .where(eq(collabRequestsTable.toUserId, userId))
    .orderBy(desc(collabRequestsTable.createdAt));

  return res.json(requests);
});

router.patch("/collab-requests/:id", requireAuth, async (req, res) => {
  const userId = req.session.userId!;

  const rawId = req.params["id"];
  const id = typeof rawId === "string" ? parseInt(rawId) : 0;
  if (!id) return res.status(400).json({ error: "Invalid id" });

  const { action } = req.body ?? {};
  if (action !== "accept" && action !== "decline") {
    return res.status(400).json({ error: "action must be 'accept' or 'decline'" });
  }

  const [request] = await db.select()
    .from(collabRequestsTable)
    .where(eq(collabRequestsTable.id, id));

  if (!request) return res.status(404).json({ error: "Request not found" });
  if (request.toUserId !== userId) return res.status(403).json({ error: "Forbidden" });
  if (request.status !== "pending") return res.status(400).json({ error: "Request already resolved" });

  const status = action === "accept" ? "accepted" : "declined";
  const [updated] = await db.update(collabRequestsTable)
    .set({ status })
    .where(eq(collabRequestsTable.id, id))
    .returning();

  if (status === "accepted") {
    const [receiver] = await db.select({ displayName: usersTable.displayName })
      .from(usersTable).where(eq(usersTable.id, userId));
    const [sender] = await db.select({ displayName: usersTable.displayName })
      .from(usersTable).where(eq(usersTable.id, request.fromUserId));

    const smaller = Math.min(request.fromUserId, userId);
    const larger = Math.max(request.fromUserId, userId);
    const hookRoomName = `hook-${smaller}-${larger}`;

    let [room] = await db.select().from(roomsTable).where(eq(roomsTable.name, hookRoomName));
    if (!room) {
      [room] = await db.insert(roomsTable).values({
        name: hookRoomName,
        type: "discussion",
        description: `Private hook room: ${sender?.displayName ?? "User"} × ${receiver?.displayName ?? "User"}`,
        skills: [],
        memberCount: 2,
        isPrivate: true,
        createdByUserId: request.fromUserId,
      }).returning();

      await db.insert(roomMembersTable).values([
        { roomId: room.id, userId: request.fromUserId },
        { roomId: room.id, userId },
      ]).execute();

      await db.update(usersTable)
        .set({ roomsJoined: sql`${usersTable.roomsJoined} + 1` })
        .where(eq(usersTable.id, request.fromUserId));
      await db.update(usersTable)
        .set({ roomsJoined: sql`${usersTable.roomsJoined} + 1` })
        .where(eq(usersTable.id, userId));
    }

    await db.insert(notificationsTable).values({
      userId: request.fromUserId,
      fromUserId: userId,
      roomId: room.id,
      message: `🎉 ${receiver?.displayName ?? "Someone"} accepted your collab request! Join your hook room to engage.`,
    }).catch(() => {});
  }

  return res.json(updated);
});

router.get("/collab-requests/sent", requireAuth, async (req, res) => {
  const userId = req.session.userId!;

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

  return res.json(requests);
});

router.get("/collab-requests/check/:toUserId", requireAuth, async (req, res) => {
  const userId = req.session.userId!;

  const rawToUserId = req.params.toUserId;
  const toUserId = typeof rawToUserId === "string" ? parseInt(rawToUserId) : NaN;
  if (isNaN(toUserId)) return res.status(400).json({ error: "Invalid id" });

  const [existing] = await db.select({ id: collabRequestsTable.id, status: collabRequestsTable.status })
    .from(collabRequestsTable)
    .where(and(
      eq(collabRequestsTable.fromUserId, userId),
      eq(collabRequestsTable.toUserId, toUserId),
    ));

  return res.json({ sent: !!existing, status: existing?.status ?? null });
});

router.post("/collab-requests/hook-zone/:id/recreate-room", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const rawId = req.params["id"];
  const id = typeof rawId === "string" ? parseInt(rawId) : 0;
  if (!id) return res.status(400).json({ error: "Invalid id" });

  const [request] = await db
    .select()
    .from(collabRequestsTable)
    .where(eq(collabRequestsTable.id, id));
  if (!request) return res.status(404).json({ error: "Request not found" });
  if (request.status !== "accepted") return res.status(400).json({ error: "Request not accepted" });
  if (request.fromUserId !== userId && request.toUserId !== userId) {
    return res.status(403).json({ error: "Not your connection" });
  }

  const smaller = Math.min(request.fromUserId, request.toUserId);
  const larger = Math.max(request.fromUserId, request.toUserId);
  const hookRoomName = `hook-${smaller}-${larger}`;

  let [room] = await db.select().from(roomsTable).where(eq(roomsTable.name, hookRoomName));
  if (room) return res.json(room);

  const [sender] = await db.select({ displayName: usersTable.displayName })
    .from(usersTable).where(eq(usersTable.id, request.fromUserId));
  const [receiver] = await db.select({ displayName: usersTable.displayName })
    .from(usersTable).where(eq(usersTable.id, request.toUserId));

  [room] = await db.insert(roomsTable).values({
    name: hookRoomName,
    type: "discussion",
    description: `Private hook room: ${sender?.displayName ?? "User"} × ${receiver?.displayName ?? "User"}`,
    skills: [],
    memberCount: 2,
    isPrivate: true,
    createdByUserId: request.fromUserId,
  }).returning();

  await db.insert(roomMembersTable).values([
    { roomId: room.id, userId: request.fromUserId },
    { roomId: room.id, userId: request.toUserId },
  ]).execute();

  return res.json(room);
});

router.get("/collab-requests/hook-zone", requireAuth, async (req, res) => {
  const userId = req.session.userId!;

  const accepted = await db
    .select({
      id: collabRequestsTable.id,
      fromUserId: collabRequestsTable.fromUserId,
      toUserId: collabRequestsTable.toUserId,
      status: collabRequestsTable.status,
      createdAt: collabRequestsTable.createdAt,
    })
    .from(collabRequestsTable)
    .where(and(
      or(
        eq(collabRequestsTable.fromUserId, userId),
        eq(collabRequestsTable.toUserId, userId)
      ),
      eq(collabRequestsTable.status, "accepted")
    ))
    .orderBy(desc(collabRequestsTable.createdAt));

  if (accepted.length === 0) return res.json([]);

  const partnerIds = [...new Set(accepted.flatMap(r =>
    r.fromUserId === userId ? [r.toUserId] : [r.fromUserId]
  ))].filter(Boolean) as number[];

  const partners = partnerIds.length > 0
    ? await db
        .select({ id: usersTable.id, displayName: usersTable.displayName, username: usersTable.username, avatarUrl: usersTable.avatarUrl, level: usersTable.level })
        .from(usersTable)
        .where(sql`${usersTable.id} IN (${sql.join(partnerIds.map(id => sql`${id}`), sql`, `)})`)
    : [];

  const partnerMap = new Map(partners.map(p => [p.id, p]));
  const results: any[] = [];

  for (const req of accepted) {
    const partnerId = req.fromUserId === userId ? req.toUserId : req.fromUserId;
    const partner = partnerMap.get(partnerId!);
    const smaller = Math.min(userId, partnerId!);
    const larger = Math.max(userId, partnerId!);
    const hookRoomName = `hook-${smaller}-${larger}`;
    const [room] = await db.select().from(roomsTable).where(eq(roomsTable.name, hookRoomName));

    results.push({
      id: req.id,
      partner,
      room: room ?? null,
      createdAt: req.createdAt,
    });
  }

  return res.json(results);
});

export default router;
