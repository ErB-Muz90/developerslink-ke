import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { MatchDevelopersBody, GetMatchSuggestionsParams } from "@workspace/api-zod";

const router = Router();

function computeMatchScore(
  user: typeof usersTable.$inferSelect,
  skills: string[],
  level?: string,
  location?: string,
  lookingFor?: string
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  const userSkills = user.skills as { name: string; category: string; proficiency: string }[];
  const userSkillNames = userSkills.map((s) => s.name.toLowerCase());

  const skillMatches = skills.filter((s) =>
    userSkillNames.some((us) => us.includes(s.toLowerCase()) || s.toLowerCase().includes(us))
  );

  if (skillMatches.length > 0) {
    score += skillMatches.length * 0.3;
    reasons.push(`Knows ${skillMatches.join(", ")}`);
  }

  if (level && user.level === level) {
    score += 0.2;
    reasons.push(`Same experience level (${level})`);
  }

  if (location && user.location) {
    if (user.location.toLowerCase().includes(location.toLowerCase())) {
      score += 0.2;
      reasons.push(`Based in ${user.location}`);
    }
  }

  if (lookingFor && user.lookingFor) {
    const lf = lookingFor.toLowerCase();
    const ulf = user.lookingFor.toLowerCase();
    if (ulf.includes(lf) || lf.includes(ulf)) {
      score += 0.1;
      reasons.push("Compatible collaboration goals");
    }
  }

  if (user.postsCount > 5) {
    score += 0.1;
    reasons.push("Active community member");
  }

  return { score: Math.min(score, 1), reasons };
}

router.post("/match/developers", async (req, res) => {
  const body = MatchDevelopersBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid request body" });

  const { skills, level, location, lookingFor, limit = 10 } = body.data;

  const allUsers = await db.select().from(usersTable);

  const results = allUsers
    .map((user) => {
      const { score, reasons } = computeMatchScore(user, skills, level ?? undefined, location ?? undefined, lookingFor ?? undefined);
      return { user, matchScore: score, matchReasons: reasons };
    })
    .filter((r) => r.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);

  return res.json(results);
});

router.get("/match/suggestions/:userId", async (req, res) => {
  const params = GetMatchSuggestionsParams.safeParse(req.params);
  if (!params.success) return res.status(400).json({ error: "Invalid userId" });

  const [targetUser] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.userId));
  if (!targetUser) return res.status(404).json({ error: "User not found" });

  const targetUserSkills = targetUser.skills as { name: string; category: string; proficiency: string }[];
  const targetSkills = targetUserSkills.map((s) => s.name);
  const allUsers = await db.select().from(usersTable);

  const results = allUsers
    .filter((u) => u.id !== params.data.userId)
    .map((user) => {
      const { score, reasons } = computeMatchScore(user, targetSkills, targetUser.level, targetUser.location ?? undefined, targetUser.lookingFor ?? undefined);
      return { user, matchScore: score, matchReasons: reasons };
    })
    .filter((r) => r.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 10);

  return res.json(results);
});

export default router;
