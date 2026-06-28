import { Router } from "express";
import { db } from "@workspace/db";
import { roomsTable, postsTable, usersTable, roomMembersTable } from "@workspace/db";
import { eq, sql, desc, and, ilike } from "drizzle-orm";
import { z } from "zod";
import {
  ListRoomsQueryParams,
  CreateRoomBody,
  GetRoomParams,
  UpdateRoomParams,
  UpdateRoomBody,
  DeleteRoomParams,
  GetLiveRoomActivityQueryParams,
  JoinRoomParams,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth-middleware";
const router = Router();

const UpdateRoomLinksBody = z.object({
  links: z.array(z.object({
    label: z.string().min(1).max(100),
    url: z.string().url(),
  })),
});

router.get("/rooms", async (req, res) => {
   const query = ListRoomsQueryParams.safeParse(req.query);
   if (!query.success) {
     return res.status(400).json({ error: "Invalid query" });
   }

   const { type, skill, limit = 20, offset = 0 } = query.data;

   const conditions: ReturnType<typeof eq>[] = [];
   if (type) conditions.push(eq(roomsTable.type, type));

   let whereClause = conditions.length > 0
     ? sql`${conditions.reduce((acc, c) => sql`${acc} AND ${c}`)}`
     : undefined;

   let rooms = await db
     .select()
     .from(roomsTable)
     .where(whereClause)
     .orderBy(desc(roomsTable.lastActiveAt))
     .limit(limit)
     .offset(offset);

   // Skill filter uses JSONB which can't be indexed with simple WHERE, but we store it narrow
   if (skill) {
     rooms = rooms.filter((r) =>
       (r.skills as string[]).some((s) => s.toLowerCase().includes(skill.toLowerCase()))
     );
   }

   return res.json(rooms);
});

router.post("/rooms", requireAuth, async (req, res) => {
   const body = CreateRoomBody.safeParse(req.body);
   if (!body.success) {
     return res.status(400).json({ error: "Invalid request body" });
   }

   const [room] = await db.insert(roomsTable).values({ ...body.data, createdByUserId: req.session.userId ?? null }).returning();
   return res.status(201).json(room);
});

router.get("/rooms/live-activity", async (req, res) => {
  const query = GetLiveRoomActivityQueryParams.safeParse(req.query);
  const limit = query.success ? (query.data.limit ?? 6) : 6;

  const rooms = await db
    .select()
    .from(roomsTable)
    .orderBy(desc(roomsTable.lastActiveAt))
    .limit(limit);

  // Batch-fetch recent posts for all rooms at once
  const roomIds = rooms.map((r) => r.id);
  const allRecentPosts = roomIds.length > 0
    ? await db
        .select()
        .from(postsTable)
        .where(sql`${postsTable.roomId} IN (${sql.join(roomIds.map((id) => sql`${id}`), sql`, `)})`)
        .orderBy(desc(postsTable.createdAt))
        .limit(roomIds.length * 5)
    : [];

  // Group posts by room and take top 5 per room
  const postsByRoom = new Map<number, typeof allRecentPosts>();
  for (const post of allRecentPosts) {
    if (!postsByRoom.has(post.roomId)) postsByRoom.set(post.roomId, []);
    const list = postsByRoom.get(post.roomId)!;
    if (list.length < 5) list.push(post);
  }

  // Batch-fetch authors for all last posts
  const lastPostAuthorIds = [...new Set(
    allRecentPosts
      .filter((_, i, arr) => {
        // Find first post per room (most recent)
        const roomId = arr[i].roomId;
        return arr.findIndex((p) => p.roomId === roomId) === i;
      })
      .map((p) => p.authorId)
      .filter(Boolean) as number[]
  )];

  const authorMap = new Map<number, typeof usersTable.$inferSelect>();
  if (lastPostAuthorIds.length > 0) {
    const authors = await db
      .select()
      .from(usersTable)
      .where(sql`${usersTable.id} IN (${sql.join(lastPostAuthorIds.map((id) => sql`${id}`), sql`, `)})`);
    for (const a of authors) authorMap.set(a.id, a);
  }

  const results = rooms.map((room) => {
    const recentPosts = postsByRoom.get(room.id) ?? [];
    let lastPost = undefined;
    if (recentPosts[0]) {
      lastPost = {
        ...recentPosts[0],
        author: recentPosts[0].authorId ? (authorMap.get(recentPosts[0].authorId) ?? null) : null,
      };
    }

    return {
      room,
      recentPostCount: recentPosts.length,
      lastPost,
    };
  });

  return res.json(results);
});

router.get("/rooms/:id", async (req, res) => {
   const params = GetRoomParams.safeParse(req.params);
   if (!params.success) {
     return res.status(400).json({ error: "Invalid id" });
   }

   const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, params.data.id));
   if (!room) {
     return res.status(404).json({ error: "Room not found" });
   }

   return res.json(room);
});

router.patch("/rooms/:id", async (req, res) => {
  const params = UpdateRoomParams.safeParse(req.params);
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  const [existing] = await db
    .select({ id: roomsTable.id, createdByUserId: roomsTable.createdByUserId })
    .from(roomsTable)
    .where(eq(roomsTable.id, params.data.id));
  if (!existing) return res.status(404).json({ error: "Room not found" });

  // Only the creator can update the room
  if (req.session.userId && existing.createdByUserId && req.session.userId !== existing.createdByUserId) {
    return res.status(403).json({ error: "You can only update rooms you created" });
  }

  const body = UpdateRoomBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid request body" });

  const [room] = await db
    .update(roomsTable)
    .set(body.data)
    .where(eq(roomsTable.id, params.data.id))
    .returning();
  if (!room) return res.status(404).json({ error: "Room not found" });
  return res.json(room);
});

router.delete("/rooms/:id", async (req, res) => {
  const params = DeleteRoomParams.safeParse(req.params);
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  const [existing] = await db
    .select({ id: roomsTable.id, createdByUserId: roomsTable.createdByUserId })
    .from(roomsTable)
    .where(eq(roomsTable.id, params.data.id));
  if (!existing) return res.status(404).json({ error: "Room not found" });

  // Only the creator can delete the room
  if (req.session.userId && existing.createdByUserId && req.session.userId !== existing.createdByUserId) {
    return res.status(403).json({ error: "You can only delete rooms you created" });
  }

  await db.delete(roomsTable).where(eq(roomsTable.id, params.data.id));
  return res.status(204).send();
});

router.get("/rooms/:id/membership", requireAuth, async (req, res) => {
  const params = GetRoomParams.safeParse(req.params);
  if (!params.success) return res.status(400).json({ error: "Invalid id" });
  const userId = req.session.userId!;

  const [existing] = await db
    .select({ id: roomMembersTable.id })
    .from(roomMembersTable)
    .where(and(eq(roomMembersTable.roomId, params.data.id), eq(roomMembersTable.userId, userId)));

  return res.json({ isMember: !!existing });
});

router.post("/rooms/:id/join", requireAuth, async (req, res) => {
  const params = JoinRoomParams.safeParse(req.params);
  if (!params.success) return res.status(400).json({ error: "Invalid id" });
  const userId = req.session.userId!;

  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, params.data.id));
  if (!room) return res.status(404).json({ error: "Room not found" });

  const [existing] = await db
    .select({ id: roomMembersTable.id })
    .from(roomMembersTable)
    .where(and(eq(roomMembersTable.roomId, params.data.id), eq(roomMembersTable.userId, userId)));

  if (existing) return res.json(room);

  const result = await db.insert(roomMembersTable)
    .values({ roomId: params.data.id, userId })
    .onConflictDoNothing()
    .returning()
    .execute();

  if (result.length === 0) {
    const [updated] = await db.select().from(roomsTable).where(eq(roomsTable.id, params.data.id));
    return res.json(updated);
  }

  await db
    .update(roomsTable)
    .set({ memberCount: sql`${roomsTable.memberCount} + 1` })
    .where(eq(roomsTable.id, params.data.id));

  await db
    .update(usersTable)
    .set({ roomsJoined: sql`${usersTable.roomsJoined} + 1` })
    .where(eq(usersTable.id, userId));

  const [updated] = await db.select().from(roomsTable).where(eq(roomsTable.id, params.data.id));
  return res.json(updated);
});

router.patch("/rooms/:id/links", requireAuth, async (req, res) => {
  const params = GetRoomParams.safeParse(req.params);
  if (!params.success) return res.status(400).json({ error: "Invalid id" });
  const userId = req.session.userId!;

  const [existing] = await db
    .select({ id: roomsTable.id, createdByUserId: roomsTable.createdByUserId })
    .from(roomsTable)
    .where(eq(roomsTable.id, params.data.id));
  if (!existing) return res.status(404).json({ error: "Room not found" });

  if (existing.createdByUserId && existing.createdByUserId !== userId) {
    return res.status(403).json({ error: "Only the room owner can manage links" });
  }

  const body = UpdateRoomLinksBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid links", details: body.error.flatten() });

  const [room] = await db
    .update(roomsTable)
    .set({ links: body.data.links })
    .where(eq(roomsTable.id, params.data.id))
    .returning();

  return res.json(room);
});

export default router;
