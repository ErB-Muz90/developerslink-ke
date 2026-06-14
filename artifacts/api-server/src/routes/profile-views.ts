import { Router } from "express";
import { db } from "@workspace/db";
import { profileViewsTable, usersTable } from "@workspace/db";
import { eq, and, gt, desc, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth-middleware";

const router = Router();

router.post("/profile-views/:profileId", requireAuth, async (req, res) => {
   const rawProfileId = req.params.profileId;
   const profileId = typeof rawProfileId === "string" ? parseInt(rawProfileId) : NaN;
   const viewerId = req.session.userId!;

   if (!profileId || isNaN(profileId) || viewerId === profileId) {
     return res.status(204).send();
   }

   const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
   const [existing] = await db
     .select({ id: profileViewsTable.id })
     .from(profileViewsTable)
     .where(
       and(
         eq(profileViewsTable.viewerId, viewerId),
         eq(profileViewsTable.profileId, profileId),
         gt(profileViewsTable.viewedAt, oneHourAgo),
       ),
     )
     .limit(1);

   if (!existing) {
     await db.insert(profileViewsTable).values({ viewerId, profileId });
   }

   return res.status(204).send();
});

router.get("/me/profile-views", requireAuth, async (req, res) => {
   const userId = req.session.userId!;

   const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

   const viewers = await db
     .select({
       viewerId: profileViewsTable.viewerId,
       viewedAt: sql<string>`MAX(${profileViewsTable.viewedAt})`.as("viewed_at"),
       displayName: usersTable.displayName,
       username: usersTable.username,
       avatarUrl: usersTable.avatarUrl,
       level: usersTable.level,
     })
     .from(profileViewsTable)
     .innerJoin(usersTable, eq(profileViewsTable.viewerId, usersTable.id))
     .where(
       and(
         eq(profileViewsTable.profileId, userId),
         gt(profileViewsTable.viewedAt, thirtyDaysAgo),
       ),
     )
     .groupBy(
       profileViewsTable.viewerId,
       usersTable.displayName,
       usersTable.username,
       usersTable.avatarUrl,
       usersTable.level,
     )
     .orderBy(desc(sql`MAX(${profileViewsTable.viewedAt})`))
     .limit(50);

   return res.json({ viewers, total: viewers.length });
});

export default router;
