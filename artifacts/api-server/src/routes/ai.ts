import { Router } from "express";
import { db } from "@workspace/db";
import { postsTable, roomsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { SummarizeRoomParams, SuggestSolutionBody } from "@workspace/api-zod";

const router = Router();

router.get("/ai/summarize/:roomId", async (req, res) => {
  const params = SummarizeRoomParams.safeParse(req.params);
  if (!params.success) return res.status(400).json({ error: "Invalid roomId" });

  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, params.data.roomId));
  if (!room) return res.status(404).json({ error: "Room not found" });

  const recentPosts = await db
    .select()
    .from(postsTable)
    .where(eq(postsTable.roomId, params.data.roomId))
    .orderBy(desc(postsTable.createdAt))
    .limit(20);

  const roomSkills = (room.skills as string[]);
  const topicSet = new Set<string>([...roomSkills]);
  for (const post of recentPosts) {
    const words = post.content.split(/\s+/).filter((w) => w.length > 5).slice(0, 3);
    words.forEach((w) => topicSet.add(w.replace(/[^a-zA-Z0-9]/g, "")));
  }

  const keyTopics = Array.from(topicSet).slice(0, 6);
  const postCount = recentPosts.length;
  const summary =
    postCount === 0
      ? `${room.name} is a new ${room.type} room focused on ${roomSkills.join(", ")}. No discussions yet — be the first to post!`
      : `${room.name} has had ${postCount} recent message${postCount > 1 ? "s" : ""}. The conversation spans ${roomSkills.join(", ")} topics. Members are ${room.type === "learning" ? "learning and mentoring" : room.type === "project" ? "collaborating on real builds" : "sharing insights and discussing ideas"}.`;

  return res.json({
    roomId: params.data.roomId,
    summary,
    keyTopics,
    generatedAt: new Date().toISOString(),
  });
});

router.post("/ai/suggest-solution", async (req, res) => {
  const body = SuggestSolutionBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid request body" });

  const { problem, context, skills = [] } = body.data;

  const techStack = skills.length > 0 ? skills.join(", ") : "your current tech stack";

  const steps = [
    `Break down "${problem.slice(0, 60)}" into smaller, testable sub-problems`,
    `Identify the core constraint — is it data, logic, or infrastructure?`,
    `Search DevLink KE rooms for others who have tackled similar challenges`,
    `Prototype a minimal solution using ${techStack}`,
    `Share your progress in a project room for peer review and iteration`,
  ];

  const resources = [
    `Search the Backend room for "${problem.split(" ").slice(0, 3).join(" ")}" threads`,
    `Connect with a Pro-level ${skills[0] || "developer"} via the Match feature`,
    `Post your problem in the relevant Learning room for mentor guidance`,
  ];

  return res.json({
    solution: `For "${problem.slice(0, 80)}${problem.length > 80 ? "..." : ""}": Start by isolating the root cause. ${context ? `Given context: ${context}. ` : ""}Use ${techStack} to implement a lean solution — validate early with peers in DevLink KE rooms before going deep.`,
    steps,
    resources,
  });
});

export default router;
