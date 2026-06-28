import express, { type Express } from "express";
import path from "path";
import cors from "cors";
import session from "express-session";
import pgSession from "connect-pg-simple";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { csrfProtection } from "./lib/csrf-middleware";
import { pool } from "@workspace/db";

const app: Express = express();

// Ultra-lightweight health/liveness endpoints – mounted BEFORE any middleware
// so they always respond quickly, even if session/DB setup is slow or broken.
app.get("/api/livez", (_req, res) => {
  return res.json({ status: "ok" });
});

// Trust the first proxy (Cloudflare Tunnel, Replit proxy, etc.) so that
// req.protocol / req.secure reflect the original scheme (HTTPS) rather than
// the local HTTP connection. This is required for secure session cookies to
// work behind a TLS-terminating proxy.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

const isProduction = process.env.NODE_ENV === "production";

if (isProduction && !process.env["SESSION_SECRET"]) {
  throw new Error(
    "SESSION_SECRET environment variable is required in production. " +
    "Set it to a long, random string."
  );
}

// Ensure the session table exists in PostgreSQL before setting up the session middleware.
// This is needed because connect-pg-single's createTableIfMissing reads a table.sql
// file at runtime, which isn't available after esbuild bundles the code.
pool.query(`
  CREATE TABLE IF NOT EXISTS "session" (
    "sid" varchar NOT NULL COLLATE "default",
    "sess" json NOT NULL,
    "expire" timestamp(6) NOT NULL
  ) WITH (OIDS=FALSE);
  CREATE UNIQUE INDEX IF NOT EXISTS "IDX_session_sid" ON "session" ("sid");
  CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
`).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  logger.error({ err: message }, "Failed to create session table");
});

app.use(
  session({
    name: "devlink.sid",
    secret: process.env["SESSION_SECRET"] || "devlink-ke-dev-secret",
    resave: false,
    saveUninitialized: false,
    store: new (pgSession(session))({
      pool,
      createTableIfMissing: false,
    }),
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

// CSRF protection via custom header — must come after session middleware
app.use("/api", csrfProtection);
app.use("/api", router);

export default app;
