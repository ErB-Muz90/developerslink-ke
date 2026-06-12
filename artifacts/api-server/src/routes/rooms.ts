import { Router } from "express";
import { db } from "@workspace/db";
import { roomsTable, postsTable, usersTable } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";
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

const router = Router();

router.get("/rooms", async (req, res) => {
  const query = ListRoomsQueryParams.safeParse(req.query);
  if (!query.success) return res.status(400).json({ error: "Invalid query" });

  const { type, skill, limit = 20, offset = 0 } = query.data;

  let rooms = await db
    .select()
    .from(roomsTable)
    .orderBy(desc(roomsTable.lastActiveAt))
    .limit(limit)
    .offset(offset);

  if (type) rooms = rooms.filter((r) => r.type === type);
  if (skill) {
    rooms = rooms.filter((r) =>
      (r.skills as string[]).some((s) => s.toLowerCase().includes(skill.toLowerCase()))
    );
  }

  res.json(rooms);
});

router.post("/rooms", async (req, res) => {
  const body = CreateRoomBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid request body" });

  const [room] = await db.insert(roomsTable).values(body.data).returning();
  res.status(201).json(room);
});

router.get("/rooms/live-activity", async (req, res) => {
  const query = GetLiveRoomActivityQueryParams.safeParse(req.query);
  const limit = query.success ? (query.data.limit ?? 6) : 6;

  const rooms = await db
    .select()
    .from(roomsTable)
    .orderBy(desc(roomsTable.lastActiveAt))
    .limit(limit);

  const results = await Promise.all(
    rooms.map(async (room) => {
      const recentPosts = await db
        .select()
        .from(postsTable)
        .where(eq(postsTable.roomId, room.id))
        .orderBy(desc(postsTable.createdAt))
        .limit(5);

      let lastPost = undefined;
      if (recentPosts[0]) {
        let author = undefined;
        if (recentPosts[0].authorId) {
          const [u] = await db.select().from(usersTable).where(eq(usersTable.id, recentPosts[0].authorId));
          author = u;
        }
        lastPost = { ...recentPosts[0], author };
      }

      return {
        room,
        recentPostCount: recentPosts.length,
        lastPost,
      };
    })
  );

  res.json(results);
});

router.get("/rooms/:id", async (req, res) => {
  const params = GetRoomParams.safeParse(req.params);
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, params.data.id));
  if (!room) return res.status(404).json({ error: "Room not found" });
  res.json(room);
});

router.patch("/rooms/:id", async (req, res) => {
  const params = UpdateRoomParams.safeParse(req.params);
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  const body = UpdateRoomBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid request body" });

  const [room] = await db
    .update(roomsTable)
    .set(body.data)
    .where(eq(roomsTable.id, params.data.id))
    .returning();
  if (!room) return res.status(404).json({ error: "Room not found" });
  res.json(room);
});

router.delete("/rooms/:id", async (req, res) => {
  const params = DeleteRoomParams.safeParse(req.params);
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  await db.delete(roomsTable).where(eq(roomsTable.id, params.data.id));
  res.status(204).send();
});

router.post("/rooms/:id/join", async (req, res) => {
  const params = JoinRoomParams.safeParse(req.params);
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  const [room] = await db
    .update(roomsTable)
    .set({ memberCount: sql`${roomsTable.memberCount} + 1` })
    .where(eq(roomsTable.id, params.data.id))
    .returning();
  if (!room) return res.status(404).json({ error: "Room not found" });
  res.json(room);
});

export default router;
