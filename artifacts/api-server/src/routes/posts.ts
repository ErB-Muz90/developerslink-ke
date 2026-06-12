import { Router } from "express";
import { db } from "@workspace/db";
import { postsTable, usersTable, roomsTable } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";
import {
  GetRoomPostsQueryParams,
  CreatePostParams,
  CreatePostBody,
  UpdatePostParams,
  UpdatePostBody,
  DeletePostParams,
  UpvotePostParams,
} from "@workspace/api-zod";
import { broadcastToRoom } from "../lib/websocket";

const router = Router();

async function enrichPost(post: typeof postsTable.$inferSelect) {
  let author = undefined;
  if (post.authorId) {
    const [u] = await db.select().from(usersTable).where(eq(usersTable.id, post.authorId));
    author = u;
  }
  return { ...post, author };
}

router.get("/posts", async (req, res) => {
  const query = GetRoomPostsQueryParams.safeParse(req.query);
  if (!query.success) return res.status(400).json({ error: "Invalid query parameters" });

  const { roomId, limit = 30, offset = 0 } = query.data;

  const posts = await db
    .select()
    .from(postsTable)
    .where(eq(postsTable.roomId, roomId))
    .orderBy(desc(postsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const enriched = await Promise.all(posts.map(enrichPost));
  res.json(enriched);
});

router.post("/rooms/:id/posts", async (req, res) => {
  const params = CreatePostParams.safeParse(req.params);
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  const body = CreatePostBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid request body" });

  const [post] = await db
    .insert(postsTable)
    .values({ ...body.data, roomId: params.data.id })
    .returning();

  await db
    .update(roomsTable)
    .set({
      postCount: sql`${roomsTable.postCount} + 1`,
      lastActiveAt: new Date(),
    })
    .where(eq(roomsTable.id, params.data.id));

  if (body.data.authorId) {
    await db
      .update(usersTable)
      .set({ postsCount: sql`${usersTable.postsCount} + 1` })
      .where(eq(usersTable.id, body.data.authorId));
  }

  const enriched = await enrichPost(post);

  broadcastToRoom(params.data.id, { type: "new_post", post: enriched });

  res.status(201).json(enriched);
});

router.patch("/posts/:id", async (req, res) => {
  const params = UpdatePostParams.safeParse(req.params);
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  const body = UpdatePostBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid request body" });

  const [post] = await db
    .update(postsTable)
    .set({ ...body.data, updatedAt: new Date() })
    .where(eq(postsTable.id, params.data.id))
    .returning();
  if (!post) return res.status(404).json({ error: "Post not found" });

  const enriched = await enrichPost(post);
  broadcastToRoom(post.roomId, { type: "update_post", post: enriched });
  res.json(enriched);
});

router.delete("/posts/:id", async (req, res) => {
  const params = DeletePostParams.safeParse(req.params);
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  const [deleted] = await db.delete(postsTable).where(eq(postsTable.id, params.data.id)).returning();
  if (deleted) broadcastToRoom(deleted.roomId, { type: "delete_post", postId: deleted.id });
  res.status(204).send();
});

router.post("/posts/:id/upvote", async (req, res) => {
  const params = UpvotePostParams.safeParse(req.params);
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  const [post] = await db
    .update(postsTable)
    .set({ upvotes: sql`${postsTable.upvotes} + 1` })
    .where(eq(postsTable.id, params.data.id))
    .returning();
  if (!post) return res.status(404).json({ error: "Post not found" });

  const enriched = await enrichPost(post);
  broadcastToRoom(post.roomId, { type: "update_post", post: enriched });
  res.json(enriched);
});

export default router;
