import { pgTable, integer, timestamp } from "drizzle-orm/pg-core";
import { roomsTable } from "./rooms";
import { usersTable } from "./users";

export const roomMembersTable = pgTable("room_members", {
  roomId: integer("room_id")
    .notNull()
    .references(() => roomsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});
