import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable, usersTable, roomsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth-middleware";

const router = Router();

type EnrichedNotification = typeof notificationsTable.$inferSelect & {
  fromUser: Partial<typeof usersTable.$inferSelect> | null;
  room: Partial<typeof roomsTable.$inferSelect> | null;
};

async function enrichNotifications(
  notifications: (typeof notificationsTable.$inferSelect)[]
): Promise<EnrichedNotification[]> {
  if (notifications.length === 0) return [];

  // Batch-fetch fromUsers
  const fromUserIds = [...new Set(notifications.map((n) => n.fromUserId).filter(Boolean))] as number[];
  const fromUsers = fromUserIds.length > 0
    ? await db
        .select({ id: usersTable.id, displayName: usersTable.displayName, username: usersTable.username })
        .from(usersTable)
        .where(sql`${usersTable.id} IN (${sql.join(fromUserIds.map((id) => sql`${id}`), sql`, `)})`)
    : [];
  const fromUserMap = new Map(fromUsers.map((u) => [u.id, u]));

  // Batch-fetch rooms
  const roomIds = [...new Set(notifications.map((n) => n.roomId).filter((id): id is number => id !== null && id > 0))];
  const rooms = roomIds.length > 0
    ? await db
        .select({ id: roomsTable.id, name: roomsTable.name })
        .from(roomsTable)
        .where(sql`${roomsTable.id} IN (${sql.join(roomIds.map((id) => sql`${id}`), sql`, `)})`)
    : [];
  const roomMap = new Map(rooms.map((r) => [r.id, r]));

  return notifications.map((n) => ({
    ...n,
    fromUser: n.fromUserId ? (fromUserMap.get(n.fromUserId) ?? null) : null,
    room: n.roomId != null && n.roomId > 0 ? (roomMap.get(n.roomId) ?? null) : null,
  }));
}

router.patch("/notifications/:id/read", requireAuth, async (req, res) => {
  const rawId = req.params["id"];
  const id = typeof rawId === "string" ? parseInt(rawId) : 0;
  if (!id || isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [updated] = await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, req.session.userId!)))
    .returning();

  if (!updated) return res.status(404).json({ error: "Notification not found" });

  const [enriched] = await enrichNotifications([updated]);
  return res.json(enriched);
});

router.get("/me/notifications", requireAuth, async (req, res) => {
  const userId = req.session.userId!;

  const notifications = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, userId))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(100);

  const enriched = await enrichNotifications(notifications);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return res.json({ notifications: enriched, unreadCount });
});

router.patch("/me/notifications/read-all", requireAuth, async (req, res) => {
  const userId = req.session.userId!;

  const result = await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.isRead, false)))
    .returning();

  return res.json({ updated: result.length });
});

export default router;
