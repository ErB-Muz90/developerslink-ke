import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userSkillSchema = z.object({
  name: z.string(),
  category: z.enum(["backend", "frontend", "mobile", "ai", "networking", "design", "devops", "other"]),
  proficiency: z.enum(["beginner", "intermediate", "pro"]),
});

export type UserSkill = z.infer<typeof userSkillSchema>;

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  location: text("location"),
  skills: jsonb("skills").notNull().$type<UserSkill[]>().default([]),
  level: text("level").notNull().default("beginner"),
  githubUrl: text("github_url"),
  twitterUrl: text("twitter_url"),
  lookingFor: text("looking_for"),
  roomsJoined: integer("rooms_joined").notNull().default(0),
  postsCount: integer("posts_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, roomsJoined: true, postsCount: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
