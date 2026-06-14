// Set env vars at the TOP LEVEL so they're available during module imports
process.env["DATABASE_URL"] = "postgres://mock:mock@localhost:5432/mock";
process.env["SESSION_SECRET"] = "test-secret-for-unit-tests";
process.env["NODE_ENV"] = "test";
process.env["LOG_LEVEL"] = "silent";

import { vi } from "vitest";

// Mock rate-limit so tests don't get blocked by repeated requests
vi.mock("../src/lib/rate-limit", () => ({
  loginLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  registerLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  resendVerificationLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  passwordResetLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

// Mock websocket so routes that broadcast don't crash
vi.mock("../src/lib/websocket", () => ({
  initWebSocketServer: () => {},
  broadcastToRoom: () => {},
  broadcastToUser: () => {},
}));
