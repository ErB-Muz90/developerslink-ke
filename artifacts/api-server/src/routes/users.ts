import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq, ilike, sql } from "drizzle-orm";
import {
  ListUsersQueryParams,
  CreateUserBody,
  GetUserParams,
  UpdateUserParams,
  UpdateUserBody,
  GetTopBuildersQueryParams,
} from "@workspace/api-zod";

const router = Router();

function safeUser(user: typeof usersTable.$inferSelect) {
  const { passwordHash: _, ...safe } = user;
  return safe;
}

router.get("/users", async (req, res) => {
  const query = ListUsersQueryParams.safeParse(req.query);
  if (!query.success) {
    return res.status(400).json({ error: "Invalid query parameters" });
  }
  const { skill, level, location, limit = 20, offset = 0 } = query.data;

  const conditions: ReturnType<typeof eq>[] = [];

  if (level) conditions.push(eq(usersTable.level, level));
  if (location) conditions.push(ilike(usersTable.location, `%${location}%`));

  let users = await db
    .select()
    .from(usersTable)
    .where(conditions.length > 0 ? sql`${conditions.reduce((acc, c) => sql`${acc} AND ${c}`)}` : undefined)
    .limit(limit)
    .offset(offset);

  // Skill filter uses JSONB which requires in-memory filtering
  if (skill) {
    const skillLower = skill.toLowerCase();
    users = users.filter((u) => {
      const skills = u.skills as { name: string; category: string; proficiency: string }[];
      return skills.some((s) => s.name.toLowerCase().includes(skillLower));
    });
  }

  return res.json(users.map(safeUser));
});

router.post("/users", async (req, res) => {
  const body = CreateUserBody.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: "Invalid request body" });
  }
  const [user] = await db.insert(usersTable).values(body.data).returning();
  return res.status(201).json(user);
});

router.get("/users/stats/overview", async (req, res) => {
  const [totalUsersRes, totalRoomsRes, totalPostsRes] = await Promise.all([
    db.execute(sql`SELECT COUNT(*) as count FROM users`),
    db.execute(sql`SELECT COUNT(*) as count FROM rooms`),
    db.execute(sql`SELECT COUNT(*) as count FROM posts`),
  ]);

  const levelCounts = await db.execute(
    sql`SELECT level, COUNT(*) as count FROM users GROUP BY level`
  );

  const allUsers = await db.select({ skills: usersTable.skills }).from(usersTable);
  const categoryCountMap: Record<string, number> = {};
  for (const u of allUsers) {
    const skills = u.skills as { name: string; category: string; proficiency: string }[];
    for (const s of skills) {
      categoryCountMap[s.category] = (categoryCountMap[s.category] || 0) + 1;
    }
  }
  const byCategory = Object.entries(categoryCountMap).map(([category, count]) => ({ category, count }));

  const levelMap: Record<string, number> = { beginner: 0, intermediate: 0, pro: 0 };
  const rows = levelCounts.rows as { level: string; count: string }[];
  for (const row of rows) {
    levelMap[row.level] = Number(row.count);
  }

  const firstTotalRow = totalUsersRes.rows[0] as { count: string } | undefined;
  const firstRoomRow = totalRoomsRes.rows[0] as { count: string } | undefined;
  const firstPostRow = totalPostsRes.rows[0] as { count: string } | undefined;

  return res.json({
    totalUsers: firstTotalRow ? Number(firstTotalRow.count) : 0,
    totalRooms: firstRoomRow ? Number(firstRoomRow.count) : 0,
    totalPosts: firstPostRow ? Number(firstPostRow.count) : 0,
    byLevel: {
      beginner: levelMap.beginner,
      intermediate: levelMap.intermediate,
      pro: levelMap.pro,
    },
    byCategory,
  });
});

router.get("/users/top-builders", async (req, res) => {
  const query = GetTopBuildersQueryParams.safeParse(req.query);
  const limit = query.success ? (query.data.limit ?? 10) : 10;
  const users = await db
    .select()
    .from(usersTable)
    .orderBy(sql`posts_count DESC, rooms_joined DESC`)
    .limit(limit);
  return res.json(users);
});

router.get("/users/:id", async (req, res) => {
  const params = GetUserParams.safeParse(req.params);
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id));
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json(safeUser(user));
});

router.patch("/users/:id", async (req, res) => {
  const params = UpdateUserParams.safeParse(req.params);
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  if (req.session.userId !== params.data.id) {
    return res.status(403).json({ error: "You can only update your own profile" });
  }

  const body = UpdateUserBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid request body" });

  const [user] = await db
    .update(usersTable)
    .set(body.data)
    .where(eq(usersTable.id, params.data.id))
    .returning();
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json(safeUser(user));
});

export default router;
