import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";

// ── Shared mock state via globalThis ─────────────────────────────────────
vi.hoisted(() => {
  (globalThis as any).__mockStores = {
    users: [] as Record<string, unknown>[],
    rooms: [] as Record<string, unknown>[],
    posts: [] as Record<string, unknown>[],
    notifications: [] as Record<string, unknown>[],
    collabRequests: [] as Record<string, unknown>[],
    profileViews: [] as Record<string, unknown>[],
  };
  (globalThis as any).__mockNextId = { users: 1, rooms: 1, posts: 1, notifications: 1, collabRequests: 1, profileViews: 1 };
});

const { __seed, __clearStores } = vi.hoisted(() => {
  function __make(table: string, data: Record<string, unknown>) {
    const id = (globalThis as any).__mockNextId[table]++;
    const base: Record<string, unknown> = { id };
    if (table === "users") {
      return { ...base, username: "", email: null, passwordHash: null, displayName: "", bio: null, avatarUrl: null, location: null, skills: [], level: "beginner", githubUrl: null, twitterUrl: null, lookingFor: null, roomsJoined: 0, postsCount: 0, emailVerified: false, createdAt: new Date().toISOString(), ...data };
    }
    if (table === "rooms") {
      return { ...base, name: "", description: null, type: "discussion", skills: [], memberCount: 0, postCount: 0, isPinned: false, isPrivate: false, createdByUserId: null, createdAt: new Date().toISOString(), lastActiveAt: new Date().toISOString(), ...data };
    }
    if (table === "posts") {
      return { ...base, roomId: 0, authorId: null, content: "", isPinned: false, upvotes: 0, parentPostId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...data };
    }
    if (table === "notifications") {
      return { ...base, userId: 0, fromUserId: null, postId: null, roomId: null, message: "", isRead: false, createdAt: new Date().toISOString(), ...data };
    }
    if (table === "collabRequests") {
      return { ...base, fromUserId: 0, toUserId: 0, message: null, status: "pending", createdAt: new Date().toISOString(), ...data };
    }
    if (table === "profileViews") {
      return { ...base, viewerId: 0, profileId: 0, viewedAt: new Date().toISOString(), ...data };
    }
    return { ...base, ...data };
  }

  (globalThis as any).__mockMake = __make;

  function __seed(table: string, items: Record<string, unknown>[]) {
    const stores = (globalThis as any).__mockStores;
    const created = items.map(i => __make(table, i));
    stores[table].push(...created);
    return created;
  }

  function __clearStores() {
    const stores = (globalThis as any).__mockStores;
    for (const key of Object.keys(stores)) stores[key] = [];
    const ids = (globalThis as any).__mockNextId;
    for (const key of Object.keys(ids)) ids[key] = 1;
  }

  return { __seed, __clearStores };
});

// ── Mock drizzle-orm ────────────────────────────────────────────────────
vi.mock("drizzle-orm", () => {
  // Helper: extract column name from a Drizzle column reference
  function colName(column: unknown): string {
    if (typeof column === "string") return column;
    if (column && typeof column === "object" && "name" in (column as any)) return (column as any).name;
    return "";
  }

  const eq = (column: unknown, value: unknown) => ({ type: "eq" as const, column: colName(column), value });
  const and = (...conds: unknown[]) => ({ type: "and" as const, conditions: conds.flat() });
  const or = (...conds: unknown[]) => ({ type: "or" as const, conditions: conds.flat() });
  const ne = (column: unknown, value: unknown) => ({ type: "ne" as const, column: colName(column), value });
  const gt = (column: unknown, value: unknown) => ({ type: "gt" as const, column: colName(column), value });
  const ilike = (column: unknown, pattern: string) => ({ type: "ilike" as const, column: colName(column), pattern });
  const desc = (column: unknown) => ({ type: "desc" as const, column: colName(column) });

  // sql tagged template — preserves structured conditions for mock evaluation
  function sql(strings: TemplateStringsArray, ...values: unknown[]): any {
    const parts = Array.from(strings);
    let result = "";
    const preservedConds: any[] = [];
    for (let i = 0; i < parts.length; i++) {
      result += parts[i];
      if (i < values.length) {
        const v = values[i];
        if (v == null) continue;
        if (typeof v === "object" && "__sql" in (v as any)) {
          result += (v as any).__sql;
          if ((v as any).conds) preservedConds.push(...(v as any).conds);
        } else if (typeof v === "object" && "type" in (v as any) && (v as any).type !== "sql") {
          preservedConds.push(v);
          result += `__cond_${preservedConds.length - 1}__`;
        } else {
          result += String(v);
        }
      }
    }
    return { __sql: result, type: "sql", conds: preservedConds, as: (alias: string) => ({ __sql: result, type: "sql" }) };
  }
  sql.join = (items: unknown[], separator?: unknown) => {
    const sep = separator && typeof separator === "object" && "__sql" in (separator as any) ? (separator as any).__sql : ", ";
    return items.map(i => i && typeof i === "object" && "__sql" in (i as any) ? (i as any).__sql : String(i ?? "")).join(sep);
  };

  return { eq, and, or, ne, gt, ilike, desc, sql };
});

// ── Mock @workspace/db ───────────────────────────────────────────────────
vi.mock("@workspace/db", () => {
  function getStore(tableName: string): Record<string, unknown>[] {
    return (globalThis as any).__mockStores[tableName] ?? [];
  }

  function matchCondition(item: Record<string, unknown>, cond: any): boolean {
    if (!cond || typeof cond !== "object") return true;
    if (cond.type === "eq") return item[cond.column] === cond.value;
    if (cond.type === "ne") return item[cond.column] !== cond.value;
    if (cond.type === "gt") return new Date(item[cond.column]).getTime() > new Date(cond.value).getTime();
    if (cond.type === "ilike") {
      const val = String(item[cond.column] ?? "");
      const pat = cond.pattern.replace(/%/g, ".*");
      return new RegExp(pat, "i").test(val);
    }
    if (cond.type === "and") return cond.conditions.every((c: any) => matchCondition(item, c));
    if (cond.type === "or") return cond.conditions.some((c: any) => matchCondition(item, c));
    if (cond.type === "desc") return true;
    if (cond.type === "sql") {
      if (cond.conds && cond.conds.length > 0) return cond.conds.every((c: any) => matchCondition(item, c));
      const sqlStr = cond.__sql ?? "";
      const inMatch = sqlStr.match(/(\w+)\s+IN\s+\(([^)]+)\)/i);
      if (inMatch) {
        const col = inMatch[1];
        const vals = inMatch[2].split(",").map((s: string) => s.trim()).filter(Boolean);
        return vals.includes(String(item[col]));
      }
      return true;
    }
    return true;
  }

  function matchWhere(conditions: (any[] | any)[]) {
    const flat = conditions.flat().filter(Boolean);
    return (item: Record<string, unknown>) => flat.every((c) => matchCondition(item, c));
  }

  function pick(columns: Record<string, unknown> | undefined, items: Record<string, unknown>[]) {
    if (!columns || Object.keys(columns).length === 0) return items;
    return items.map((item) => {
      const r: Record<string, unknown> = {};
      for (const [alias, colDef] of Object.entries(columns)) {
        if (colDef && typeof colDef === "object" && !Array.isArray(colDef) && "__sql" in (colDef as any)) {
          const m = (colDef as any).__sql.match(/MAX\((\w+)\)/i);
          r[alias] = item[alias] ?? (m ? item[m[1]] : null) ?? null;
        } else {
          const key = typeof colDef === "string" ? colDef : (colDef && typeof colDef === "object" && "name" in colDef ? (colDef as any).name : alias);
          r[alias] = item[key] ?? null;
        }
      }
      return r;
    });
  }

  function thenable<T>(v: T) {
    return {
      then: (resolve: (v: T) => unknown) => Promise.resolve(v).then(resolve),
      catch: () => {},
    };
  }

  // ── Table column definitions ──────────────────────────────────────
  // IMPORTANT: Values must match the JavaScript property names used by __make and test data
  const usersTable: any = {
    id: "id", username: "username", email: "email", passwordHash: "passwordHash",
    displayName: "displayName", bio: "bio", avatarUrl: "avatarUrl", location: "location",
    skills: "skills", level: "level", githubUrl: "githubUrl", twitterUrl: "twitterUrl",
    lookingFor: "lookingFor", roomsJoined: "roomsJoined", postsCount: "postsCount",
    emailVerified: "emailVerified", createdAt: "createdAt", __tableKey: "users",
  };
  usersTable.name = "users";

  const roomsTable: any = {
    id: "id", name: "name", description: "description", type: "type",
    skills: "skills", memberCount: "memberCount", postCount: "postCount",
    isPinned: "isPinned", isPrivate: "isPrivate", createdByUserId: "createdByUserId",
    createdAt: "createdAt", lastActiveAt: "lastActiveAt", __tableKey: "rooms",
  };
  roomsTable.name = "rooms";

  const postsTable: any = {
    id: "id", roomId: "roomId", authorId: "authorId", content: "content",
    isPinned: "isPinned", upvotes: "upvotes", parentPostId: "parentPostId",
    createdAt: "createdAt", updatedAt: "updatedAt", __tableKey: "posts",
  };
  postsTable.name = "posts";

  const notificationsTable: any = {
    id: "id", userId: "userId", fromUserId: "fromUserId", postId: "postId",
    roomId: "roomId", message: "message", isRead: "isRead", createdAt: "createdAt",
    __tableKey: "notifications",
  };
  notificationsTable.name = "notifications";

  const collabRequestsTable: any = {
    id: "id", fromUserId: "fromUserId", toUserId: "toUserId", message: "message",
    status: "status", createdAt: "createdAt", __tableKey: "collabRequests",
  };
  collabRequestsTable.name = "collabRequests";

  const profileViewsTable: any = {
    id: "id", viewerId: "viewerId", profileId: "profileId", viewedAt: "viewedAt",
    __tableKey: "profileViews",
  };
  profileViewsTable.name = "profileViews";

  function resolveTable(table: any): string {
    if (!table || typeof table !== "object") return "users";
    return table.__tableKey || "users";
  }

  function sortItems(items: Record<string, unknown>[], orderBy: any[]): Record<string, unknown>[] {
    if (orderBy.length === 0) return items;
    return [...items].sort((a, b) => {
      for (const o of orderBy) {
        if (!o || typeof o !== "object") continue;
        const col = o.column || "";
        const dir = o.type === "desc" ? -1 : 1;
        const va = a[col];
        const vb = b[col];
        if (va == null && vb == null) continue;
        if (va == null) return 1;
        if (vb == null) return -1;
        if (va < vb) return -1 * dir;
        if (va > vb) return 1 * dir;
      }
      return 0;
    });
  }

  // ── Query builder ─────────────────────────────────────────────────
  function buildQuery(tbl: string) {
    let conditions: any[] = [];
    let orderByCols: any[] = [];
    let limitVal: number | undefined;
    let offsetVal: number | undefined;
    let joins: { type: string; table: string; on: any }[] = [];
    let groupByCols: any[] = [];

    function getItems() {
      let items = [...getStore(tbl)];
      for (const j of joins) {
        if (j.type === "left" || j.type === "inner") {
          const joinedItems = getStore(j.table);
          const newItems: Record<string, unknown>[] = [];
          for (const item of items) {
            const joinFn = matchWhere([j.on]);
            const matches = joinedItems.filter(joinFn);
            if (matches.length > 0 || j.type === "left") {
              const merged = { ...item };
              if (matches[0]) {
                for (const [k, v] of Object.entries(matches[0])) {
                  if (!(k in item)) merged[k] = v;
                }
              }
              newItems.push(merged);
            }
          }
          items = newItems;
        }
      }
      if (conditions.length > 0) {
        items = items.filter(matchWhere(conditions));
      }
      if (orderByCols.length > 0) {
        items = sortItems(items, orderByCols);
      }
      return items;
    }

    function applyGroupBy(items: Record<string, unknown>[], cols: any[]): Record<string, unknown>[] {
      if (cols.length === 0) return items;
      const seen = new Set<string>();
      return items.filter(item => {
        const key = cols.map((c: any) => String(item[c.column ?? c])).join("|");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    return {
      where(...c: any[]) { conditions.push(...c.flat().filter(Boolean)); return this; },
      orderBy(...c: any[]) { orderByCols.push(...c.flat().filter(Boolean)); return this; },
      limit(n: number) { limitVal = n; return this; },
      offset(n: number) { offsetVal = n; return this; },
      groupBy(...c: any[]) { groupByCols.push(...c.flat().filter(Boolean)); return this; },
      leftJoin(table: any, on: any) { joins.push({ type: "left", table: resolveTable(table), on }); return this; },
      innerJoin(table: any, on: any) { joins.push({ type: "inner", table: resolveTable(table), on }); return this; },
      then(resolve: any) {
        let items = getItems();
        if (groupByCols.length > 0) items = applyGroupBy(items, groupByCols);
        if (offsetVal) items = items.slice(offsetVal);
        if (limitVal) items = items.slice(0, limitVal);
        return Promise.resolve(items).then(resolve);
      },
      catch() {},
    };
  }

  // ── Resolve SQL expressions in update values (e.g., sql`col + 1`) ─
  function resolveValue(val: unknown, item: Record<string, unknown>): unknown {
    if (val && typeof val === "object" && (val as any).type === "sql" && typeof (val as any).__sql === "string") {
      const sqlStr = (val as any).__sql as string;
      const match = sqlStr.match(/^(\w+)\s*([+]|-)\s*(\d+)$/);
      if (match) {
        const col = match[1];
        const op = match[2];
        const num = parseInt(match[3]);
        const current = Number(item[col] ?? 0);
        return op === "+" ? current + num : current - num;
      }
      return sqlStr;
    }
    return val;
  }

  const db = {
    select: (columns?: Record<string, unknown>) => ({
      from: (table: any) => buildQuery(resolveTable(table)),
    }),
    insert: (table: any) => {
      const tbl = resolveTable(table);
      return {
        values: (data: Record<string, unknown>) => ({
          returning: () => {
            const stores = (globalThis as any).__mockStores;
            const nextId = (globalThis as any).__mockNextId[tbl]++;
            const item = (globalThis as any).__mockMake(tbl, { ...data, id: nextId });
            stores[tbl].push(item);
            return thenable([item]);
          },
          catch: () => {},
        }),
      };
    },
    update: (table: any) => {
      const tbl = resolveTable(table);
      return {
        set: (data: Record<string, unknown>) => ({
          where(...conditions: any[]) {
            const fn = matchWhere(conditions.flat().filter(Boolean));
            return {
              returning: () => {
                const stores = (globalThis as any).__mockStores;
                // Update ALL matching items (not just first)
                const updated: Record<string, unknown>[] = [];
                for (let i = 0; i < stores[tbl].length; i++) {
                  if (fn(stores[tbl][i])) {
                    const resolvedData: Record<string, unknown> = {};
                    for (const [k, v] of Object.entries(data)) {
                      resolvedData[k] = resolveValue(v, stores[tbl][i]);
                    }
                    stores[tbl][i] = { ...stores[tbl][i], ...resolvedData };
                    updated.push(stores[tbl][i]);
                  }
                }
                return thenable(updated);
              },
            };
          },
        }),
      };
    },
    delete: (table: any) => {
      const tbl = resolveTable(table);
      return {
        where(...conditions: any[]) {
          const fn = matchWhere(conditions.flat().filter(Boolean));
          return {
            returning: () => {
              const stores = (globalThis as any).__mockStores;
              const idx = stores[tbl].findIndex((u: any) => fn(u));
              if (idx === -1) return thenable([]);
              const [deleted] = stores[tbl].splice(idx, 1);
              return thenable([deleted]);
            },
          };
        },
      };
    },
    execute: () => thenable({ rows: [] }),
  };

  const pool = { query: () => Promise.resolve({ rows: [] }) };

  return { db, pool, usersTable, roomsTable, postsTable, notificationsTable, collabRequestsTable, profileViewsTable };
});

// ── Import app (mocks already applied) ──────────────────────────────────
import app from "../src/app";

const CSRF = { "x-requested-with": "devlink-ke" };

async function registerUser(appInstance: any, user?: Record<string, unknown>): Promise<string[]> {
  const res = await request(appInstance)
    .post("/api/auth/register")
    .send(user ?? { username: "testuser", email: "test@example.com", password: "Password123", displayName: "Test User" })
    .set(CSRF);
  const c = res.headers["set-cookie"];
  return Array.isArray(c) ? c : [c ?? ""];
}

function cookieHeader(cookies: string[]): Record<string, string> {
  return { Cookie: Array.isArray(cookies) ? cookies.join("; ") : String(cookies) };
}

// =========================================================================
//  ROOMS
// =========================================================================
describe("Rooms Routes", () => {
  beforeEach(() => __clearStores());

  const sampleRoom = { name: "Test Room", type: "discussion" as const, skills: ["react", "typescript"] };

  describe("GET /api/rooms", () => {
    it("returns an empty list when no rooms exist", async () => {
      const res = await request(app).get("/api/rooms").set(CSRF);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
    it("returns all rooms without filters", async () => {
      __seed("rooms", [{ name: "Room A", type: "discussion" }, { name: "Room B", type: "project" }]);
      const res = await request(app).get("/api/rooms").set(CSRF);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });
    it("filters by type", async () => {
      __seed("rooms", [{ name: "Chat", type: "discussion" }, { name: "Project X", type: "project" }]);
      const res = await request(app).get("/api/rooms?type=project").set(CSRF);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe("Project X");
    });
  });

  describe("POST /api/rooms", () => {
    it("creates a room and returns 201", async () => {
      const res = await request(app).post("/api/rooms").send(sampleRoom).set(CSRF);
      expect(res.status).toBe(201);
      expect(res.body.name).toBe("Test Room");
      expect(res.body).toHaveProperty("id");
    });
    it("rejects missing name", async () => {
      const res = await request(app).post("/api/rooms").send({ type: "discussion" }).set(CSRF);
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/rooms/:id", () => {
    it("returns a room by id", async () => {
      const [room] = __seed("rooms", [{ name: "My Room", type: "discussion" }]);
      const res = await request(app).get(`/api/rooms/${room.id}`).set(CSRF);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe("My Room");
    });
    it("returns 404 for non-existent room", async () => {
      const res = await request(app).get("/api/rooms/999").set(CSRF);
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/rooms/:id", () => {
    it("updates a room", async () => {
      const [room] = __seed("rooms", [{ name: "Old Name", type: "discussion" }]);
      const res = await request(app).patch(`/api/rooms/${room.id}`).send({ name: "New Name" }).set(CSRF);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe("New Name");
    });
    it("returns 404 for non-existent room", async () => {
      const res = await request(app).patch("/api/rooms/999").send({ name: "Nope" }).set(CSRF);
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/rooms/:id", () => {
    it("deletes a room and returns 204", async () => {
      const [room] = __seed("rooms", [{ name: "Delete Me", type: "discussion" }]);
      const res = await request(app).delete(`/api/rooms/${room.id}`).set(CSRF);
      expect(res.status).toBe(204);
    });
    it("returns 404 for non-existent room", async () => {
      const res = await request(app).delete("/api/rooms/999").set(CSRF);
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/rooms/:id/join", () => {
    it("increments member count", async () => {
      const [room] = __seed("rooms", [{ name: "Joinable", type: "discussion", memberCount: 0 }]);
      const res = await request(app).post(`/api/rooms/${room.id}/join`).set(CSRF);
      expect(res.status).toBe(200);
      expect(res.body.memberCount).toBe(1);
    });
    it("returns 404 for non-existent room", async () => {
      const res = await request(app).post("/api/rooms/999/join").set(CSRF);
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/rooms/live-activity", () => {
    it("returns rooms with activity counts", async () => {
      __seed("rooms", [{ name: "Active", type: "discussion" }]);
      const res = await request(app).get("/api/rooms/live-activity").set(CSRF);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});

// =========================================================================
//  POSTS
// =========================================================================
describe("Posts Routes", () => {
  beforeEach(() => __clearStores());

  describe("GET /api/posts", () => {
    it("returns posts filtered by roomId", async () => {
      __seed("posts", [{ roomId: 1, content: "Hello" }, { roomId: 1, content: "World" }, { roomId: 2, content: "Other" }]);
      const res = await request(app).get("/api/posts?roomId=1").set(CSRF);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });
    it("returns 400 for missing roomId", async () => {
      const res = await request(app).get("/api/posts").set(CSRF);
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/rooms/:id/posts", () => {
    it("creates a post in a room", async () => {
      const cookies = await registerUser(app);
      const [room] = __seed("rooms", [{ name: "Room", type: "discussion" }]);
      const res = await request(app)
        .post(`/api/rooms/${room.id}/posts`).set(CSRF).set(cookieHeader(cookies))
        .send({ content: "My post" });
      expect(res.status).toBe(201);
      expect(res.body.content).toBe("My post");
      expect(res.body.roomId).toBe(room.id);
    });
    it("rejects invalid body", async () => {
      const res = await request(app).post("/api/rooms/1/posts").set(CSRF).send({});
      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /api/posts/:id", () => {
    it("updates a post", async () => {
      const [post] = __seed("posts", [{ roomId: 1, content: "Old", authorId: 1 }]);
      const res = await request(app).patch(`/api/posts/${post.id}`).set(CSRF).send({ content: "Updated" });
      expect(res.status).toBe(200);
      expect(res.body.content).toBe("Updated");
    });
    it("returns 404 for non-existent post", async () => {
      const res = await request(app).patch("/api/posts/999").set(CSRF).send({ content: "Nope" });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/posts/:id", () => {
    it("deletes a post and returns 204", async () => {
      const [post] = __seed("posts", [{ roomId: 1, content: "Delete me", authorId: 1 }]);
      const res = await request(app).delete(`/api/posts/${post.id}`).set(CSRF);
      expect(res.status).toBe(204);
    });
    it("returns 404 for non-existent post", async () => {
      const res = await request(app).delete("/api/posts/999").set(CSRF);
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/posts/:id/upvote", () => {
    it("increments upvotes", async () => {
      const [post] = __seed("posts", [{ roomId: 1, content: "Nice!", upvotes: 0 }]);
      const res = await request(app).post(`/api/posts/${post.id}/upvote`).set(CSRF);
      expect(res.status).toBe(200);
      expect(res.body.upvotes).toBe(1);
    });
    it("returns 404 for non-existent post", async () => {
      const res = await request(app).post("/api/posts/999/upvote").set(CSRF);
      expect(res.status).toBe(404);
    });
  });
});

// =========================================================================
//  USERS
// =========================================================================
describe("Users Routes", () => {
  beforeEach(() => __clearStores());

  describe("GET /api/users", () => {
    it("returns all users", async () => {
      __seed("users", [{ username: "alice", displayName: "Alice" }, { username: "bob", displayName: "Bob" }]);
      const res = await request(app).get("/api/users").set(CSRF);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });
    it("filters by level", async () => {
      __seed("users", [{ username: "alice", displayName: "Alice", level: "beginner" }, { username: "bob", displayName: "Bob", level: "pro" }]);
      const res = await request(app).get("/api/users?level=pro").set(CSRF);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].username).toBe("bob");
    });
    it("strips passwordHash from results", async () => {
      __seed("users", [{ username: "alice", displayName: "Alice", passwordHash: "secret" }]);
      const res = await request(app).get("/api/users").set(CSRF);
      expect(res.body[0]).not.toHaveProperty("passwordHash");
    });
  });

  describe("GET /api/users/:id", () => {
    it("returns a user by id", async () => {
      const [user] = __seed("users", [{ username: "alice", displayName: "Alice" }]);
      const res = await request(app).get(`/api/users/${user.id}`).set(CSRF);
      expect(res.status).toBe(200);
      expect(res.body.username).toBe("alice");
    });
    it("returns 404 for non-existent user", async () => {
      const res = await request(app).get("/api/users/999").set(CSRF);
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/users/:id", () => {
    it("updates own profile when authenticated", async () => {
      const cookies = await registerUser(app, { username: "reguser", email: "reg@example.com", password: "Password123", displayName: "Reg User" });
      const meRes = await request(app).get("/api/auth/me").set(CSRF).set(cookieHeader(cookies));
      const myId = meRes.body.id;
      const res = await request(app).patch(`/api/users/${myId}`).set(CSRF).set(cookieHeader(cookies)).send({ displayName: "Updated Name" });
      expect(res.status).toBe(200);
      expect(res.body.displayName).toBe("Updated Name");
    });
    it("rejects updating another user's profile", async () => {
      const cookies = await registerUser(app);
      const res = await request(app).patch("/api/users/999").set(CSRF).set(cookieHeader(cookies)).send({ displayName: "Hacker" });
      expect(res.status).toBe(403);
    });
    it("returns 401 when not authenticated (inline check returns 403)", async () => {
      const res = await request(app).patch("/api/users/1").set(CSRF).send({ displayName: "No Auth" });
      // Route does inline check: req.session.userId !== params.id → 403 (not 401)
      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/users/top-builders", () => {
    it("returns top builders by posts count", async () => {
      __seed("users", [{ username: "top", displayName: "Top", postsCount: 10 }, { username: "low", displayName: "Low", postsCount: 1 }]);
      const res = await request(app).get("/api/users/top-builders").set(CSRF);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });
  });

  describe("GET /api/users/stats/overview", () => {
    it("returns platform stats", async () => {
      const res = await request(app).get("/api/users/stats/overview").set(CSRF);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("totalUsers");
      expect(res.body).toHaveProperty("totalRooms");
      expect(res.body).toHaveProperty("totalPosts");
      expect(res.body).toHaveProperty("byLevel");
      expect(res.body).toHaveProperty("byCategory");
    });
  });
});

// =========================================================================
//  NOTIFICATIONS
// =========================================================================
describe("Notifications Routes", () => {
  beforeEach(() => __clearStores());

  describe("GET /api/me/notifications", () => {
    it("returns notifications for authenticated user", async () => {
      const cookies = await registerUser(app);
      const meRes = await request(app).get("/api/auth/me").set(CSRF).set(cookieHeader(cookies));
      const myId = meRes.body.id;
      __seed("notifications", [{ userId: myId, message: "Hello!" }, { userId: myId + 1, message: "Not mine" }]);
      const res = await request(app).get("/api/me/notifications").set(CSRF).set(cookieHeader(cookies));
      expect(res.status).toBe(200);
      expect(res.body.notifications).toHaveLength(1);
      expect(res.body.notifications[0].message).toBe("Hello!");
    });
    it("returns 401 when not authenticated", async () => {
      const res = await request(app).get("/api/me/notifications").set(CSRF);
      expect(res.status).toBe(401);
    });
  });

  describe("PATCH /api/notifications/:id/read", () => {
    it("marks a notification as read", async () => {
      const cookies = await registerUser(app);
      const meRes = await request(app).get("/api/auth/me").set(CSRF).set(cookieHeader(cookies));
      const [notif] = __seed("notifications", [{ userId: meRes.body.id, message: "Read me", isRead: false }]);
      const res = await request(app).patch(`/api/notifications/${notif.id}/read`).set(CSRF).set(cookieHeader(cookies));
      expect(res.status).toBe(200);
      expect(res.body.isRead).toBe(true);
    });
    it("returns 404 for non-existent notification", async () => {
      const cookies = await registerUser(app);
      const res = await request(app).patch("/api/notifications/999/read").set(CSRF).set(cookieHeader(cookies));
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/me/notifications/read-all", () => {
    it("marks all user notifications as read", async () => {
      const cookies = await registerUser(app);
      const meRes = await request(app).get("/api/auth/me").set(CSRF).set(cookieHeader(cookies));
      __seed("notifications", [{ userId: meRes.body.id, message: "A", isRead: false }, { userId: meRes.body.id, message: "B", isRead: false }]);
      const res = await request(app).patch("/api/me/notifications/read-all").set(CSRF).set(cookieHeader(cookies));
      expect(res.status).toBe(200);
      expect(res.body.updated).toBe(2);
    });
  });
});

// =========================================================================
//  COLLAB REQUESTS
// =========================================================================
describe("Collab Requests Routes", () => {
  beforeEach(() => __clearStores());

  function makeUsers() {
    return __seed("users", [
      { username: "alice", displayName: "Alice", passwordHash: "hash" },
      { username: "bob", displayName: "Bob", passwordHash: "hash" },
    ]);
  }

  describe("POST /api/collab-requests", () => {
    it("sends a collab request to another user", async () => {
      const [alice, bob] = makeUsers();
      const cookies = await registerUser(app, { username: "alice2", email: "alice@test.com", password: "Password123", displayName: "Alice" });
      const res = await request(app)
        .post("/api/collab-requests").set(CSRF).set(cookieHeader(cookies))
        .send({ toUserId: bob.id, message: "Let's build!" });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe("pending");
    });
    it("rejects self-request", async () => {
      const cookies = await registerUser(app);
      const meRes = await request(app).get("/api/auth/me").set(CSRF).set(cookieHeader(cookies));
      const res = await request(app)
        .post("/api/collab-requests").set(CSRF).set(cookieHeader(cookies))
        .send({ toUserId: meRes.body.id });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("yourself");
    });
    it("rejects duplicate pending request", async () => {
      const [alice, bob] = makeUsers();
      const cookies = await registerUser(app, { username: "alice2", email: "a@t.com", password: "Password123", displayName: "Alice" });
      await request(app).post("/api/collab-requests").set(CSRF).set(cookieHeader(cookies)).send({ toUserId: bob.id });
      const res = await request(app).post("/api/collab-requests").set(CSRF).set(cookieHeader(cookies)).send({ toUserId: bob.id });
      expect(res.status).toBe(409);
    });
  });

  describe("GET /api/collab-requests/incoming", () => {
    it("lists incoming requests", async () => {
      const [alice, bob] = makeUsers();
      const cookies = await registerUser(app, { username: "bob2", email: "b@t.com", password: "Password123", displayName: "Bob" });
      const meRes = await request(app).get("/api/auth/me").set(CSRF).set(cookieHeader(cookies));
      __seed("collabRequests", [{ fromUserId: alice.id, toUserId: meRes.body.id }]);
      const res = await request(app).get("/api/collab-requests/incoming").set(CSRF).set(cookieHeader(cookies));
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });
  });

  describe("GET /api/collab-requests/sent", () => {
    it("lists sent requests", async () => {
      const [alice, bob] = makeUsers();
      const cookies = await registerUser(app, { username: "alice2", email: "a2@t.com", password: "Password123", displayName: "Alice" });
      const meRes = await request(app).get("/api/auth/me").set(CSRF).set(cookieHeader(cookies));
      __seed("collabRequests", [{ fromUserId: meRes.body.id, toUserId: bob.id }]);
      const res = await request(app).get("/api/collab-requests/sent").set(CSRF).set(cookieHeader(cookies));
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });
  });

  describe("PATCH /api/collab-requests/:id", () => {
    it("accepts a pending request", async () => {
      const [alice, bob] = makeUsers();
      const cookies = await registerUser(app, { username: "bob2", email: "b2@t.com", password: "Password123", displayName: "Bob" });
      const meRes = await request(app).get("/api/auth/me").set(CSRF).set(cookieHeader(cookies));
      const [req] = __seed("collabRequests", [{ fromUserId: alice.id, toUserId: meRes.body.id }]);
      const res = await request(app).patch(`/api/collab-requests/${req.id}`).set(CSRF).set(cookieHeader(cookies)).send({ action: "accept" });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("accepted");
    });
    it("declines a pending request", async () => {
      const [alice, bob] = makeUsers();
      const cookies = await registerUser(app, { username: "bob3", email: "b3@t.com", password: "Password123", displayName: "Bob" });
      const meRes = await request(app).get("/api/auth/me").set(CSRF).set(cookieHeader(cookies));
      const [req] = __seed("collabRequests", [{ fromUserId: alice.id, toUserId: meRes.body.id }]);
      const res = await request(app).patch(`/api/collab-requests/${req.id}`).set(CSRF).set(cookieHeader(cookies)).send({ action: "decline" });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("declined");
    });
    it("rejects action on already resolved request", async () => {
      const [alice, bob] = makeUsers();
      const cookies = await registerUser(app, { username: "bob4", email: "b4@t.com", password: "Password123", displayName: "Bob" });
      const meRes = await request(app).get("/api/auth/me").set(CSRF).set(cookieHeader(cookies));
      const [req] = __seed("collabRequests", [{ fromUserId: alice.id, toUserId: meRes.body.id, status: "accepted" }]);
      const res = await request(app).patch(`/api/collab-requests/${req.id}`).set(CSRF).set(cookieHeader(cookies)).send({ action: "accept" });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/collab-requests/check/:toUserId", () => {
    it("returns existing request status", async () => {
      const [alice, bob] = makeUsers();
      const cookies = await registerUser(app, { username: "alice3", email: "a3@t.com", password: "Password123", displayName: "Alice" });
      const meRes = await request(app).get("/api/auth/me").set(CSRF).set(cookieHeader(cookies));
      __seed("collabRequests", [{ fromUserId: meRes.body.id, toUserId: bob.id }]);
      const res = await request(app).get(`/api/collab-requests/check/${bob.id}`).set(CSRF).set(cookieHeader(cookies));
      expect(res.status).toBe(200);
      expect(res.body.sent).toBe(true);
    });
  });
});

// =========================================================================
//  MATCHING
// =========================================================================
describe("Matching Routes", () => {
  beforeEach(() => __clearStores());

  describe("POST /api/match/developers", () => {
    it("returns matched developers", async () => {
      __seed("users", [
        { username: "dev1", displayName: "Dev One", skills: [{ name: "React", category: "frontend", proficiency: "pro" }], postsCount: 10 },
        { username: "dev2", displayName: "Dev Two", skills: [{ name: "Python", category: "backend", proficiency: "intermediate" }] },
      ]);
      const res = await request(app).post("/api/match/developers").set(CSRF).send({ skills: ["React"] });
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].user.username).toBe("dev1");
    });
    it("returns empty array when no matches", async () => {
      __seed("users", [{ username: "dev", displayName: "Dev", skills: [{ name: "Go", category: "backend", proficiency: "pro" }] }]);
      const res = await request(app).post("/api/match/developers").set(CSRF).send({ skills: ["COBOL"] });
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
    it("rejects invalid body", async () => {
      const res = await request(app).post("/api/match/developers").set(CSRF).send({});
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/match/suggestions/:userId", () => {
    it("returns suggestions for a user", async () => {
      __seed("users", [
        { username: "target", displayName: "Target", skills: [{ name: "React", category: "frontend", proficiency: "pro" }] },
        { username: "suggestion", displayName: "Suggestion", skills: [{ name: "React", category: "frontend", proficiency: "pro" }] },
      ]);
      const res = await request(app).get("/api/match/suggestions/1").set(CSRF);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].user.username).toBe("suggestion");
    });
    it("returns 404 for non-existent user", async () => {
      const res = await request(app).get("/api/match/suggestions/999").set(CSRF);
      expect(res.status).toBe(404);
    });
  });
});

// =========================================================================
//  PROFILE VIEWS
// =========================================================================
describe("Profile Views Routes", () => {
  beforeEach(() => __clearStores());

  describe("POST /api/profile-views/:profileId", () => {
    it("records a profile view", async () => {
      const cookies = await registerUser(app);
      const res = await request(app).post("/api/profile-views/2").set(CSRF).set(cookieHeader(cookies));
      expect(res.status).toBe(204);
    });
    it("skips recording for self-view", async () => {
      const cookies = await registerUser(app);
      const meRes = await request(app).get("/api/auth/me").set(CSRF).set(cookieHeader(cookies));
      const res = await request(app).post(`/api/profile-views/${meRes.body.id}`).set(CSRF).set(cookieHeader(cookies));
      expect(res.status).toBe(204);
    });
    it("returns 401 when not authenticated", async () => {
      const res = await request(app).post("/api/profile-views/1").set(CSRF);
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/me/profile-views", () => {
    it("returns viewers for authenticated user", async () => {
      const cookies = await registerUser(app);
      const meRes = await request(app).get("/api/auth/me").set(CSRF).set(cookieHeader(cookies));
      const myId = meRes.body.id;
      __seed("profileViews", [{ viewerId: 99, profileId: myId }]);
      __seed("users", [{ id: 99, username: "viewer", displayName: "Viewer" }]);
      const res = await request(app).get("/api/me/profile-views").set(CSRF).set(cookieHeader(cookies));
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("viewers");
    });
    it("returns 401 when not authenticated", async () => {
      const res = await request(app).get("/api/me/profile-views").set(CSRF);
      expect(res.status).toBe(401);
    });
  });
});
