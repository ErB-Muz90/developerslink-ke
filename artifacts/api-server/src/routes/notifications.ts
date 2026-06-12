import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable, usersTable, roomsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

router.get("/notifications", async (req, res) => {
  const userId = parseInt(req.query["userId"] as string);
  const unreadOnly = req.query["unreadOnly"] === "true";

  if (!userId || isNaN(userId)) {
    return res.status(400).json({ error: "userId is required" });
  }

  const conditions = [eq(notificationsTable.userId, userId)];
  if (unreadOnly) conditions.push(eq(notificationsTable.isRead, false));

  const notifications = await db
    .select()
    .from(notificationsTable)
    .where(conditions.length === 1 ? conditions[0] : and(...conditions))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);

  const enriched = await Promise.all(
    notifications.map(async (n) => {
      let fromUser = undefined;
      let room = undefined;
      if (n.fromUserId) {
        const [u] = await db.select().from(usersTable).where(eq(usersTable.id, n.fromUserId));
        fromUser = u;
      }
      const [r] = await db.select().from(roomsTable).where(eq(roomsTable.id, n.roomId));
      room = r;
      return { ...n, fromUser, room };
    })
  );

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  res.json({ notifications: enriched, unreadCount });
});

router.patch("/notifications/read-all", async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId is required" });

  const result = await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.isRead, false)))
    .returning();

  res.json({ updated: result.length });
});

router.patch("/notifications/:id/read", async (req, res) => {
  const id = parseInt(req.params["id"] ?? "0");
  if (!id) return res.status(400).json({ error: "Invalid id" });

  const [updated] = await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.id, id))
    .returning();

  if (!updated) return res.status(404).json({ error: "Notification not found" });

  const [fromUser] = updated.fromUserId
    ? await db.select().from(usersTable).where(eq(usersTable.id, updated.fromUserId))
    : [undefined];
  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, updated.roomId));

  res.json({ ...updated, fromUser, room });
});

router.get("/me/notifications", async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const notifications = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, userId))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(100);

  const enriched = await Promise.all(
    notifications.map(async (n) => {
      let fromUser = undefined;
      let room = undefined;
      if (n.fromUserId) {
        const [u] = await db.select({ id: usersTable.id, displayName: usersTable.displayName, username: usersTable.username })
          .from(usersTable).where(eq(usersTable.id, n.fromUserId));
        fromUser = u;
      }
      if (n.roomId && n.roomId > 0) {
        const [r] = await db.select({ id: roomsTable.id, name: roomsTable.name })
          .from(roomsTable).where(eq(roomsTable.id, n.roomId));
        room = r;
      }
      return { ...n, fromUser, room };
    })
  );

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  res.json({ notifications: enriched, unreadCount });
});

router.patch("/me/notifications/read-all", async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const result = await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.isRead, false)))
    .returning();

  res.json({ updated: result.length });
});

export default router;
