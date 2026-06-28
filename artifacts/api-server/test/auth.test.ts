import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";

// ── Shared mock state via globalThis ─────────────────────────────────────
// vi.hoisted and vi.mock run in separate scopes, so we use globalThis
// to share the stores array between them.

vi.hoisted(() => {
  (globalThis as any).__mockStores = { users: [] as Record<string, unknown>[] };
  (globalThis as any).__mockNextId = 1;
});

const { __seedUsers, __clearStores } = vi.hoisted(() => {
  function makeUser(data: Record<string, unknown>) {
    const id = (globalThis as any).__mockNextId++;
    return {
      id,
      username: data.username ?? "",
      email: data.email ?? null,
      passwordHash: data.passwordHash ?? null,
      displayName: data.displayName ?? "",
      bio: data.bio ?? null,
      avatarUrl: data.avatarUrl ?? null,
      location: data.location ?? null,
      skills: data.skills ?? [],
      level: data.level ?? "beginner",
      githubUrl: data.githubUrl ?? null,
      twitterUrl: data.twitterUrl ?? null,
      lookingFor: data.lookingFor ?? null,
      roomsJoined: 0,
      postsCount: 0,
      emailVerified: false,
      createdAt: new Date().toISOString(),
    };
  }

  function __seedUsers(users: Record<string, unknown>[]) {
    const stores = (globalThis as any).__mockStores;
    const created = users.map((u) => makeUser(u));
    stores.users.push(...created);
    return created;
  }

  function __clearStores() {
    (globalThis as any).__mockStores.users = [];
    (globalThis as any).__mockNextId = 1;
  }

  return { __seedUsers, __clearStores };
});

// ── Mock drizzle-orm ────────────────────────────────────────────────────
// The route imports `eq` from "drizzle-orm", not from "@workspace/db".
// We must mock it so our mock's matchWhere can parse the conditions.
vi.mock("drizzle-orm", () => ({
  eq: (column: string | { name?: string }, value: unknown) => {
    const colName =
      typeof column === "string"
        ? column
        : typeof column === "object" && column !== null && "name" in column
          ? (column as { name: string }).name
          : "";
    return { type: "eq" as const, column: colName, value };
  },
  sql: (strings: TemplateStringsArray) => strings.join(""),
  and: (...conds: unknown[]) => conds,
  or: (...conds: unknown[]) => conds,
}));

// ── Mock @workspace/db ───────────────────────────────────────────────────
// Note: This mock does NOT export eq (it uses the real drizzle-orm eq), because
// the route imports eq from "drizzle-orm", and that's now mocked above.
vi.mock("@workspace/db", () => {
  function eq(column: string | { name?: string }, value: unknown) {
    const colName =
      typeof column === "string"
        ? column
        : typeof column.name === "string"
          ? column.name
          : "";
    return { type: "eq" as const, column: colName, value };
  }

  function sql(strings: TemplateStringsArray) {
    return strings.join("");
  }

  function matchWhere(conditions: unknown[]) {
    return (item: Record<string, unknown>) =>
      conditions.every((cond) => {
        if (cond && typeof cond === "object" && "type" in cond) {
          const c = cond as { type: string; column: string; value: unknown };
          if (c.type === "eq") {
            return item[c.column] === c.value;
          }
        }
        return true;
      });
  }

  function pick(
    columns: Record<string, unknown> | undefined,
    items: Record<string, unknown>[],
  ) {
    if (!columns) return items;
    return items.map((item) => {
      const r: Record<string, unknown> = {};
      for (const k of Object.keys(columns)) r[k] = item[k];
      return r;
    });
  }

  function thenable<T>(v: T) {
    return {
      then: (resolve: (v: T) => unknown) => Promise.resolve(v).then(resolve),
      catch: (reject: (e: unknown) => unknown) =>
        Promise.resolve(v).catch(reject),
    };
  }

  function getStores() {
    return (globalThis as any).__mockStores as { users: Record<string, unknown>[] };
  }

  const usersTable = {
    id: "id",
    username: "username",
    email: "email",
    passwordHash: "password_hash",
    displayName: "display_name",
    bio: "bio",
    avatarUrl: "avatar_url",
    location: "location",
    skills: "skills",
    level: "level",
    githubUrl: "github_url",
    twitterUrl: "twitter_url",
    lookingFor: "looking_for",
    roomsJoined: "rooms_joined",
    postsCount: "posts_count",
    emailVerified: "email_verified",
    createdAt: "created_at",
  };

  const db = {
    select: (columns?: Record<string, unknown>) => ({
      from: () => {
        const stores = getStores();
        const all = () => pick(columns, stores.users);
        const filtered = (...conditions: unknown[]) =>
          pick(columns, stores.users.filter(matchWhere(conditions)));

        return {
          where: (...c: unknown[]) => ({
            ...thenable(filtered(...c)),
            limit: (n: number) => thenable(filtered(...c).slice(0, n)),
            orderBy: () => ({
              limit: (n: number) => thenable(filtered(...c).slice(0, n)),
              ...thenable(filtered(...c)),
            }),
          }),
          orderBy: () => ({
            limit: (n: number) => thenable(all().slice(0, n)),
            ...thenable(all()),
          }),
          limit: (n: number) => thenable(all().slice(0, n)),
          ...thenable(all()),
        };
      },
    }),
    insert: () => ({
      values: (data: Record<string, unknown>) => ({
        returning: () => {
          const stores = getStores();
          const nextId = (globalThis as any).__mockNextId++;
          const user = {
            id: nextId,
            username: data.username ?? "",
            email: data.email ?? null,
            passwordHash: data.passwordHash ?? null,
            displayName: data.displayName ?? "",
            bio: data.bio ?? null,
            avatarUrl: data.avatarUrl ?? null,
            location: data.location ?? null,
            skills: data.skills ?? [],
            level: data.level ?? "beginner",
            githubUrl: data.githubUrl ?? null,
            twitterUrl: data.twitterUrl ?? null,
            lookingFor: data.lookingFor ?? null,
            roomsJoined: 0,
            postsCount: 0,
            emailVerified: false,
            createdAt: new Date().toISOString(),
          };
          stores.users.push(user);
          return thenable([user]);
        },
      }),
    }),
    update: () => ({
      set: (data: Record<string, unknown>) => ({
        where: (...conditions: unknown[]) => ({
          returning: () => {
            const stores = getStores();
            const fn = matchWhere(conditions);
            const idx = stores.users.findIndex((u) => fn(u));
            if (idx === -1) return thenable([]);
            stores.users[idx] = { ...stores.users[idx], ...data };
            return thenable([stores.users[idx]]);
          },
        }),
      }),
    }),
    delete: () => ({
      where: () => ({ returning: () => thenable([]) }),
    }),
    execute: () => thenable({ rows: [] }),
  };

  const pool = { query: () => Promise.resolve({ rows: [] }) };

  return { db, usersTable, eq, sql, pool };
});

// Now import app — @workspace/db is already mocked
import app from "../src/app";

const CSRF_HEADER = { "x-requested-with": "devlink-ke" };

describe("Auth Routes", () => {
  beforeEach(() => {
    __clearStores();
  });

  // ── POST /api/auth/register ──────────────────────────────────────────
  describe("POST /api/auth/register", () => {
    const validUser = {
      username: "testuser",
      email: "test@example.com",
      password: "Password123",
      displayName: "Test User",
    };

    it("registers a new user and returns 201", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send(validUser)
        .set(CSRF_HEADER);

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        username: "testuser",
        email: "test@example.com",
        displayName: "Test User",
        level: "beginner",
      });
      expect(res.body).not.toHaveProperty("passwordHash");
      expect(res.body).toHaveProperty("id");
    });

    it("rejects duplicate username with 409", async () => {
      __seedUsers([
        {
          username: "testuser",
          displayName: "Existing",
          passwordHash: await bcrypt.hash("Password123", 4),
        },
      ]);

      const res = await request(app)
        .post("/api/auth/register")
        .send(validUser)
        .set(CSRF_HEADER);

      expect(res.status).toBe(409);
      expect(res.body.error).toBe("Username already taken");
    });

    it("rejects duplicate email with 409", async () => {
      __seedUsers([
        {
          username: "otheruser",
          email: "test@example.com",
          displayName: "Existing",
          passwordHash: await bcrypt.hash("Password123", 4),
        },
      ]);

      const res = await request(app)
        .post("/api/auth/register")
        .send(validUser)
        .set(CSRF_HEADER);

      expect(res.status).toBe(409);
      expect(res.body.error).toBe("Email already registered");
    });

    it("rejects disposable email with 400", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ ...validUser, email: "test@mailinator.com" })
        .set(CSRF_HEADER);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Disposable");
    });

    it("rejects short passwords with 400", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ ...validUser, password: "short" })
        .set(CSRF_HEADER);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid input");
    });

    it("rejects invalid usernames with 400", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ ...validUser, username: "user name!" })
        .set(CSRF_HEADER);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid input");
    });

    it("sets a session cookie on success", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send(validUser)
        .set(CSRF_HEADER);

      expect(res.status).toBe(201);
      const cookies = res.headers["set-cookie"];
      expect(cookies).toBeDefined();
      const cookieArr = Array.isArray(cookies) ? cookies : [cookies];
      expect(cookieArr.some((c: string) => c.startsWith("devlink.sid="))).toBe(
        true,
      );
    });
  });

  // ── POST /api/auth/login ─────────────────────────────────────────────
  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      __seedUsers([
        {
          username: "testuser",
          displayName: "Test User",
          passwordHash: await bcrypt.hash("Password123", 12),
        },
      ]);
    });

    it("logs in with valid credentials and returns 200", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ username: "testuser", password: "Password123" })
        .set(CSRF_HEADER);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        username: "testuser",
        displayName: "Test User",
      });
      expect(res.body).not.toHaveProperty("passwordHash");
    });

    it("rejects invalid password with 401", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ username: "testuser", password: "wrongpassword" })
        .set(CSRF_HEADER);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Invalid username or password");
    });

    it("rejects non-existent username with 401", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ username: "nobody", password: "Password123" })
        .set(CSRF_HEADER);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Invalid username or password");
    });

    it("sets a session cookie on success", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ username: "testuser", password: "Password123" })
        .set(CSRF_HEADER);

      expect(res.status).toBe(200);
      const cookies = res.headers["set-cookie"];
      expect(cookies).toBeDefined();
      const cookieArr = Array.isArray(cookies) ? cookies : [cookies];
      expect(cookieArr.some((c: string) => c.startsWith("devlink.sid="))).toBe(
        true,
      );
    });
  });

  // ── POST /api/auth/logout ────────────────────────────────────────────
  describe("POST /api/auth/logout", () => {
    it("logs out and clears the cookie", async () => {
      const registerRes = await request(app)
        .post("/api/auth/register")
        .send({
          username: "testuser",
          email: "test@example.com",
          password: "Password123",
          displayName: "Test User",
        })
        .set(CSRF_HEADER);

      expect(registerRes.status).toBe(201);
      const cookies = registerRes.headers["set-cookie"];

      const res = await request(app)
        .post("/api/auth/logout")
        .set("Cookie", cookies)
        .set(CSRF_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Logged out");
    });
  });

  // ── GET /api/auth/me ─────────────────────────────────────────────────
  describe("GET /api/auth/me", () => {
    it("returns the authenticated user", async () => {
      const registerRes = await request(app)
        .post("/api/auth/register")
        .send({
          username: "testuser",
          email: "test@example.com",
          password: "Password123",
          displayName: "Test User",
        })
        .set(CSRF_HEADER);

      expect(registerRes.status).toBe(201);
      const cookies = registerRes.headers["set-cookie"];

      const res = await request(app)
        .get("/api/auth/me")
        .set("Cookie", cookies)
        .set(CSRF_HEADER);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        username: "testuser",
        displayName: "Test User",
      });
    });

    it("returns 401 when not authenticated", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set(CSRF_HEADER);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Not authenticated");
    });
  });

  // ── PATCH /api/me/password ───────────────────────────────────────────
  describe("PATCH /api/me/password", () => {
    async function getSessionCookies(): Promise<string[]> {
      const registerRes = await request(app)
        .post("/api/auth/register")
        .send({
          username: "testuser",
          email: "test@example.com",
          password: "Password123",
          displayName: "Test User",
        })
        .set(CSRF_HEADER);

      const c = registerRes.headers["set-cookie"];
      return Array.isArray(c) ? c : [c];
    }

    it("changes the password with valid current password", async () => {
      const cookies = await getSessionCookies();

      const res = await request(app)
        .patch("/api/me/password")
        .send({ currentPassword: "Password123", newPassword: "NewPass1234" })
        .set("Cookie", cookies)
        .set(CSRF_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Password updated successfully");
    });

    it("rejects wrong current password with 401", async () => {
      const cookies = await getSessionCookies();

      const res = await request(app)
        .patch("/api/me/password")
        .send({ currentPassword: "WrongPass123", newPassword: "NewPass1234" })
        .set("Cookie", cookies)
        .set(CSRF_HEADER);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Current password is incorrect");
    });

    it("rejects weak new password", async () => {
      const cookies = await getSessionCookies();

      const res = await request(app)
        .patch("/api/me/password")
        .send({ currentPassword: "Password123", newPassword: "short" })
        .set("Cookie", cookies)
        .set(CSRF_HEADER);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("password");
    });

    it("rejects password without uppercase letter", async () => {
      const cookies = await getSessionCookies();

      const res = await request(app)
        .patch("/api/me/password")
        .send({ currentPassword: "Password123", newPassword: "nouppercase1" })
        .set("Cookie", cookies)
        .set(CSRF_HEADER);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("uppercase");
    });

    it("returns 401 when not authenticated", async () => {
      const res = await request(app)
        .patch("/api/me/password")
        .send({ currentPassword: "Password123", newPassword: "NewPass1234" })
        .set(CSRF_HEADER);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Not authenticated");
    });
  });

  // ── CSRF Protection ──────────────────────────────────────────────────
  describe("CSRF protection", () => {
    it("rejects POST without CSRF header", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ username: "testuser", password: "Password123" });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("CSRF validation failed");
    });

    it("allows GET requests without CSRF header", async () => {
      const res = await request(app).get("/api/healthz");
      expect(res.status).toBe(200);
    });
  });
});
