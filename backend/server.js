const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { connectDB, isConnected, startMongoRetries } = require("./config/db");
const resumeRoutes = require("./routes/resumeRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

const corsOrigin =
  process.env.CLIENT_ORIGIN ||
  /^http:\/\/localhost:\d+$|^http:\/\/127\.0\.0\.1:\d+$/;

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));

app.use("/api/auth", authRoutes);
app.use("/api/resume", resumeRoutes);

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    mongo: isConnected() ? "connected" : "disconnected",
  });
});

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File too large (max 10MB)." });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message || "Upload failed." });
  }
  res.status(500).json({ error: "Server error." });
});

async function main() {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://127.0.0.1:${PORT}`);
  });

  try {
    await connectDB();
  } catch (e) {
    console.error("[MongoDB] initial connect failed:", e?.message || e);
    console.error(
      "[MongoDB] Server is up; analysis works. Retrying connection in background…"
    );
    startMongoRetries();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
