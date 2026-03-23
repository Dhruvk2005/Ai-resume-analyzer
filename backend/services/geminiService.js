const { GoogleGenerativeAI } = require("@google/generative-ai");

const DEFAULT_MODEL = "gemini-2.5-flash";
const MAX_INPUT_CHARS = 100000;

function stripJsonFence(text) {
  const trimmed = text.trim();
  const fence = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i.exec(trimmed);
  if (fence) return fence[1].trim();
  return trimmed;
}

function tryParseAnalysisJson(text) {
  const cleaned = stripJsonFence(text).replace(/^\uFEFF/, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error("PARSE_FAIL");
  }
}

function normalizeAnalysis(raw) {
  return {
    resumeScore: Math.min(
      100,
      Math.max(0, Number(raw.resumeScore) || 0)
    ),
    detectedSkills: Array.isArray(raw.detectedSkills)
      ? raw.detectedSkills.map(String)
      : [],
    missingSkills: Array.isArray(raw.missingSkills)
      ? raw.missingSkills.map(String)
      : [],
    suggestions: Array.isArray(raw.suggestions)
      ? raw.suggestions.map(String)
      : [],
    summary: typeof raw.summary === "string" ? raw.summary : "",
  };
}

function formatApiError(err) {
  const msg = err?.message || String(err);
  if (/404|not found|NOT_FOUND/i.test(msg) && /model/i.test(msg)) {
    return new Error(
      `Gemini model not found. In backend/.env set GEMINI_MODEL=gemini-2.0-flash or gemini-1.5-flash (your key may not have access to the current model). Original: ${msg}`
    );
  }
  if (/API key|API_KEY|401|403|invalid/i.test(msg)) {
    return new Error(
      `Gemini API key issue: check GEMINI_API_KEY in backend/.env. ${msg}`
    );
  }
  return err;
}

function buildPrompt(resumeText, jobDescription) {
  return `Analyze the following resume and job description.
Compare skills, experience, and keywords. Be constructive and specific.

Return ONLY valid JSON with this exact shape (no markdown, no extra keys):
{
  "resumeScore": <number 0-100>,
  "detectedSkills": [<strings>],
  "missingSkills": [<strings>],
  "suggestions": [<strings>],
  "summary": "<short paragraph>"
}

--- RESUME ---
${resumeText || "(empty)"}

--- JOB DESCRIPTION ---
${jobDescription || "(empty)"}`;
}

/**
 * @param {string} resumeText
 * @param {string} jobDescription
 */
async function analyzeResumeWithGemini(resumeText, jobDescription) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in backend/.env");
  }

  const modelName = (process.env.GEMINI_MODEL || DEFAULT_MODEL).trim();
  const genAI = new GoogleGenerativeAI(apiKey);

  const rt = (resumeText || "").slice(0, MAX_INPUT_CHARS);
  const jd = (jobDescription || "").slice(0, MAX_INPUT_CHARS);
  const prompt = buildPrompt(rt, jd);

  const runOnce = async (useJsonMime) => {
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        ...(useJsonMime ? { responseMimeType: "application/json" } : {}),
        temperature: 0.3,
      },
    });
    let result;
    try {
      result = await model.generateContent(prompt);
    } catch (e) {
      throw formatApiError(e);
    }
    const response = result.response;
    let text = "";
    try {
      text = typeof response.text === "function" ? response.text() : "";
    } catch (inner) {
      throw formatApiError(inner);
    }
    if (!text || !String(text).trim()) {
      throw new Error(
        "Gemini returned no text (empty or blocked). Try shorter content or a different file."
      );
    }
    return text;
  };

  let rawText;
  try {
    rawText = await runOnce(true);
  } catch (first) {
    const msg = String(first?.message || first);
    if (/models\/[^/\s]+ is not found|404|NOT_FOUND/i.test(msg)) {
      throw formatApiError(first);
    }
    try {
      rawText = await runOnce(false);
    } catch {
      throw formatApiError(first);
    }
  }

  let parsed;
  try {
    parsed = tryParseAnalysisJson(rawText);
  } catch {
    try {
      rawText = await runOnce(false);
      parsed = tryParseAnalysisJson(rawText);
    } catch {
      throw new Error(
        "Gemini did not return valid JSON. Try again or set GEMINI_MODEL to another Flash model."
      );
    }
  }

  return normalizeAnalysis(parsed);
}

module.exports = { analyzeResumeWithGemini, DEFAULT_MODEL };
