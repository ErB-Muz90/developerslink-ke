import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const profileViewsTable = pgTable("profile_views", {
  id: serial("id").primaryKey(),
  viewerId: integer("viewer_id").references(() => usersTable.id).notNull(),
  profileId: integer("profile_id").references(() => usersTable.id).notNull(),
  viewedAt: timestamp("viewed_at").notNull().defaultNow(),
});

export type ProfileView = typeof profileViewsTable.$inferSelect;
