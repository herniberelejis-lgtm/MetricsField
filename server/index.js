const path = require("node:path");
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");

// Cargar .env.local del repo (mismas vars que Next en desarrollo).
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const tapRoutes = require("./routes/tap");
const { router: portalRoutes, mountPortalOAuth } = require("./routes/portal");
const { mountOAuth } = require("./routes/oauth");
const cronRoutes = require("./routes/cron");
const placesRoutes = require("./routes/places");
const { oauthHomeHtml } = require("./views/oauth-home");

const app = express();
const PORT = Number(process.env.PORT || process.env.API_PORT) || 4000;
const WEB_ORIGIN = process.env.WEB_ORIGIN || "http://localhost:5173";
const SERVE_SPA = process.env.SERVE_SPA === "true";

app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: SERVE_SPA
      ? (origin, cb) => {
          // Mismo host en prod; en dev permite WEB_ORIGIN (Vite).
          if (!origin || origin === WEB_ORIGIN) cb(null, true);
          else cb(null, WEB_ORIGIN);
        }
      : WEB_ORIGIN,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());

// Trust proxy para IP real detrás de Vercel/Railway.
app.set("trust proxy", 1);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, stack: "express" });
});

app.use("/api/auth", authRoutes);
app.use("/api", placesRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/portal", portalRoutes);
app.use(tapRoutes);
mountPortalOAuth(app);

const oauthRouter = express.Router();
mountOAuth(oauthRouter);
app.use("/api/admin/oauth", oauthRouter);
app.use("/api/cron", cronRoutes);

// Homepage HTML para verificación OAuth de Google (sin depender de JS del SPA).
app.get("/", (req, res, next) => {
  const accept = req.headers.accept || "";
  if (process.env.SERVE_SPA === "true" && accept.includes("text/html") && !req.query.spa) {
    res.type("html").send(oauthHomeHtml());
    return;
  }
  next();
});

// En producción: Express sirve el build de Vite (mismo host, sin CORS).
const webDist = path.join(__dirname, "..", "web", "dist");
if (SERVE_SPA) {
  app.use(
    express.static(webDist, {
      maxAge: process.env.NODE_ENV === "production" ? "7d" : 0,
      index: false,
    }),
  );
  app.get(/^\/(?!api).*/, (req, res) => {
    if (req.path === "/privacidad") {
      res.redirect(301, "/privacy");
      return;
    }
    res.sendFile(path.join(webDist, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`API MetricsField (Express) → http://localhost:${PORT}`);
  if (process.env.SERVE_SPA === "true") {
    console.log(`SPA estático desde ${webDist}`);
  } else {
    console.log(`SPA en desarrollo: ${WEB_ORIGIN} (npm run dev:web)`);
  }
});
