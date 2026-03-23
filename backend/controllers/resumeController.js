const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const Resume = require("../models/Resume");
const { analyzeResumeWithGemini } = require("../services/geminiService");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");

async function extractTextFromFile(filePath, mimeType, originalName) {
  const lower = (originalName || "").toLowerCase();
  const buffer = fs.readFileSync(filePath);

  if (
    mimeType === "application/pdf" ||
    lower.endsWith(".pdf")
  ) {
    const data = await pdfParse(buffer);
    return (data.text || "").trim();
  }

  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lower.endsWith(".docx")
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return (result.value || "").trim();
  }

  throw new Error(
    "Unsupported file type. Please upload a PDF or DOCX file."
  );
}

async function analyzeResume(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Resume file is required." });
    }

    const jobDescription =
      typeof req.body.jobDescription === "string"
        ? req.body.jobDescription
        : "";

    const filePath = req.file.path;
    let resumeText;
    try {
      resumeText = await extractTextFromFile(
        filePath,
        req.file.mimetype,
        req.file.originalname
      );
    } catch (err) {
      fs.unlink(filePath, () => {});
      return res.status(400).json({
        error: err.message || "Failed to extract text from the file.",
      });
    }

    if (!resumeText || resumeText.length < 20) {
      fs.unlink(filePath, () => {});
      return res.status(400).json({
        error:
          "Could not read enough text from the file. Try another PDF/DOCX or ensure the document has selectable text.",
      });
    }

    const analysis = await analyzeResumeWithGemini(
      resumeText,
      jobDescription
    );

    let docId = null;
    let saveWarning = null;
    try {
      const doc = await Resume.create({
        originalFileName: req.file.originalname,
        storedFileName: req.file.filename,
        mimeType: req.file.mimetype,
        resumeText,
        jobDescription,
        resumeScore: analysis.resumeScore,
        detectedSkills: analysis.detectedSkills,
        missingSkills: analysis.missingSkills,
        suggestions: analysis.suggestions,
        summary: analysis.summary,
      });
      docId = doc._id;
    } catch (dbErr) {
      console.error("MongoDB save failed:", dbErr);
      saveWarning =
        "Analysis succeeded but could not be saved to the database. Check MongoDB connection and Atlas IP allowlist.";
    }

    return res.status(200).json({
      id: docId,
      ...(saveWarning ? { warning: saveWarning } : {}),
      ...analysis,
    });
  } catch (err) {
    console.error(err);
    if (req.file?.path) {
      fs.unlink(req.file.path, () => {});
    }
    const message = err?.message || "Analysis failed.";
    return res.status(500).json({ error: message });
  }
}

module.exports = { analyzeResume, extractTextFromFile };
