const mongoose = require("mongoose");

const resumeSchema = new mongoose.Schema(
  {
    originalFileName: { type: String, required: true },
    storedFileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    resumeText: { type: String, default: "" },
    jobDescription: { type: String, default: "" },
    resumeScore: { type: Number },
    detectedSkills: [{ type: String }],
    missingSkills: [{ type: String }],
    strengths: [{ type: String }],
    improvements: [{ type: String }],
    suggestions: [{ type: String }],
    summary: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Resume", resumeSchema);
