const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { requireAuth } = require("../middleware/auth");
const { analyzeResume } = require("../controllers/resumeController");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || "";
    cb(null, `${unique}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  const ok =
    allowed.includes(file.mimetype) ||
    /\.pdf$/i.test(file.originalname) ||
    /\.docx$/i.test(file.originalname);
  if (ok) cb(null, true);
  else cb(new Error("Only PDF and DOCX files are allowed."));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router = express.Router();

router.post(
  "/analyze",
  requireAuth,
  upload.single("resume"),
  analyzeResume
);

module.exports = router;
