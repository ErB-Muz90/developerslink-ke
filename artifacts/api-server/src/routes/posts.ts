import { Router } from "express";
import { db } from "@workspace/db";
import { postsTable, usersTable, roomsTable, notificationsTable } from "@workspace/db";
import { eq, sql, desc, ne, and } from "drizzle-orm";
import {
  GetRoomPostsQueryParams,
  CreatePostParams,
  CreatePostBody,
  UpdatePostParams,
  UpdatePostBody,
  DeletePostParams,
  UpvotePostParams,
} from "@workspace/api-zod";
import { broadcastToRoom, broadcastToUser } from "../lib/websocket";

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
  return res.json(enriched);
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
    .set({ postCount: sql`${roomsTable.postCount} + 1`, lastActiveAt: new Date() })
    .where(eq(roomsTable.id, params.data.id));

  if (body.data.authorId) {
    await db
      .update(usersTable)
      .set({ postsCount: sql`${usersTable.postsCount} + 1` })
      .where(eq(usersTable.id, body.data.authorId));
  }

  const enriched = await enrichPost(post);
  broadcastToRoom(params.data.id, { type: "new_post", post: enriched });

  // Create notifications
  const fromUser = enriched.author;
  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, params.data.id));

  if (fromUser && room) {
    // If it's a reply, notify the parent post author specifically
    if (body.data.parentPostId) {
      const [parentPost] = await db
        .select()
        .from(postsTable)
        .where(eq(postsTable.id, body.data.parentPostId));

      if (parentPost?.authorId && parentPost.authorId !== body.data.authorId) {
        const [notif] = await db
          .insert(notificationsTable)
          .values({
            userId: parentPost.authorId,
            fromUserId: body.data.authorId ?? null,
            postId: post.id,
            roomId: params.data.id,
            message: `${fromUser.displayName} replied to your post in #${room.name}`,
          })
          .returning();

        const enrichedNotif = { ...notif, fromUser, room };
        broadcastToUser(parentPost.authorId, { type: "new_notification", notification: enrichedNotif });
      }
    } else {
      // Notify recent room participants (last 10 unique posters, excluding the current author)
      const recentPosts = await db
        .select({ authorId: postsTable.authorId })
        .from(postsTable)
        .where(
          and(
            eq(postsTable.roomId, params.data.id),
            body.data.authorId ? ne(postsTable.authorId, body.data.authorId) : undefined
          )
        )
        .orderBy(desc(postsTable.createdAt))
        .limit(50);

      const notifiedUserIds = new Set<number>();
      for (const p of recentPosts) {
        if (!p.authorId || notifiedUserIds.has(p.authorId) || notifiedUserIds.size >= 5) continue;
        notifiedUserIds.add(p.authorId);

        const [notif] = await db
          .insert(notificationsTable)
          .values({
            userId: p.authorId,
            fromUserId: body.data.authorId ?? null,
            postId: post.id,
            roomId: params.data.id,
            message: `${fromUser.displayName} posted in #${room.name}`,
          })
          .returning();

        const enrichedNotif = { ...notif, fromUser, room };
        broadcastToUser(p.authorId, { type: "new_notification", notification: enrichedNotif });
      }
    }
  }

  return res.status(201).json(enriched);
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
  return res.json(enriched);
});

router.delete("/posts/:id", async (req, res) => {
   const params = DeletePostParams.safeParse(req.params);
   if (!params.success) {
     return res.status(400).json({ error: "Invalid id" });
   }

   const [deleted] = await db.delete(postsTable).where(eq(postsTable.id, params.data.id)).returning();
   if (deleted) broadcastToRoom(deleted.roomId, { type: "delete_post", postId: deleted.id });
   return res.status(204).send();
});

router.post("/posts/:id/upvote", async (req, res) => {
   const params = UpvotePostParams.safeParse(req.params);
   if (!params.success) {
     return res.status(400).json({ error: "Invalid id" });
   }

   const [post] = await db
     .update(postsTable)
     .set({ upvotes: sql`${postsTable.upvotes} + 1` })
     .where(eq(postsTable.id, params.data.id))
     .returning();
   if (!post) {
     return res.status(404).json({ error: "Post not found" });
   }

   const enriched = await enrichPost(post);
   broadcastToRoom(post.roomId, { type: "update_post", post: enriched });
   return res.json(enriched);
});

export default router;
