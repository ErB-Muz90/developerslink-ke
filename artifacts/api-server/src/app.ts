import express, { type Express } from "express";
import cors from "cors";
import session from "express-session";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { csrfProtection } from "./lib/csrf-middleware";

const app: Express = express();

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

const isProduction = process.env.NODE_ENV === "production";

if (isProduction && !process.env["SESSION_SECRET"]) {
  throw new Error(
    "SESSION_SECRET environment variable is required in production. " +
    "Set it to a long, random string."
  );
}

app.use(
  session({
    name: "devlink.sid",
    secret: process.env["SESSION_SECRET"] || "devlink-ke-dev-secret",
    resave: false,
    saveUninitialized: false,
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
