import { Router } from "express";
import { db } from "@workspace/db";
import { profileViewsTable, usersTable } from "@workspace/db";
import { eq, and, gt, desc, sql } from "drizzle-orm";

const router = Router();

router.post("/profile-views/:profileId", async (req, res) => {
   const profileId = parseInt(req.params.profileId);
   const viewerId = req.session.userId;

   if (!viewerId || !profileId || isNaN(profileId) || viewerId === profileId) {
     res.status(204).send();
     return;
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

   res.status(204).send();
   return;
});

router.get("/me/profile-views", async (req, res) => {
   const userId = req.session.userId;
   if (!userId) {
     res.status(401).json({ error: "Not authenticated" });
     return;
   }

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

   res.json({ viewers, total: viewers.length });
   return;
});

export default router;
