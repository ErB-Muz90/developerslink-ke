import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const collabRequestsTable = pgTable("collab_requests", {
  id: serial("id").primaryKey(),
  fromUserId: integer("from_user_id").references(() => usersTable.id).notNull(),
  toUserId: integer("to_user_id").references(() => usersTable.id).notNull(),
  message: text("message"),
  status: text("status").default("pending").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type CollabRequest = typeof collabRequestsTable.$inferSelect;
