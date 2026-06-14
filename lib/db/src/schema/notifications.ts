import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { roomsTable } from "./rooms";

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  fromUserId: integer("from_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  postId: integer("post_id"),
  roomId: integer("room_id"),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Notification = typeof notificationsTable.$inferSelect;
