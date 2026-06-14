import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app";

describe("Health Check", () => {
  it("GET /api/healthz returns 200 with status ok", async () => {
    const res = await request(app)
      .get("/api/healthz")
      .set("x-requested-with", "devlink-ke")
      .expect(200);

    expect(res.body).toEqual({ status: "ok" });
  });
});
