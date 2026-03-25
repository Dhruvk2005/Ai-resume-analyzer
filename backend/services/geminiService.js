const { GoogleGenerativeAI } = require("@google/generative-ai");

const DEFAULT_MODEL = "gemini-1.5-flash";
const MAX_INPUT_CHARS = 100000;

function stripJsonFence(text) {
  const trimmed = text.trim();
  // Gemini sometimes wraps JSON in ```json ... ``` blocks. Strip those if present
  // (even if there is extra text before/after the fence).
  const fence = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(trimmed);
  if (fence) return fence[1].trim();
  return trimmed;
}

function extractFirstBalancedJsonObject(text) {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  return null;
}

function tryParseAnalysisJson(text) {
  const cleaned = stripJsonFence(text).replace(/^\uFEFF/, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const obj = extractFirstBalancedJsonObject(cleaned);
    if (obj) return JSON.parse(obj);

    // Fallback: very broad extraction. This is less reliable but helps
    // when the model returns extra pre/post text.
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);

    throw new Error("PARSE_FAIL");
  }
}

function parseScoreValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    // Supports values like "82", "82%", "82/100", "score: 82"
    const ratioMatch = trimmed.match(/(-?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
    if (ratioMatch) {
      const num = Number(ratioMatch[1]);
      const den = Number(ratioMatch[2]);
      if (Number.isFinite(num) && Number.isFinite(den) && den > 0) {
        return (num / den) * 100;
      }
    }

    const numberMatch = trimmed.match(/-?\d+(?:\.\d+)?/);
    if (numberMatch) {
      const n = Number(numberMatch[0]);
      if (Number.isFinite(n)) return n;
    }
  }

  return null;
}

function resolveResumeScore(raw) {
  const scoreCandidates = [
    raw?.resumeScore,
    raw?.score,
    raw?.overallScore,
    raw?.fitScore,
    raw?.matchScore,
    raw?.analysis?.resumeScore,
    raw?.analysis?.score,
  ];

  for (const value of scoreCandidates) {
    const parsed = parseScoreValue(value);
    if (parsed !== null) {
      return Math.min(100, Math.max(0, parsed));
    }
  }

  return 0;
}

function normalizeAnalysis(raw) {
  return {
    resumeScore: resolveResumeScore(raw),
    detectedSkills: Array.isArray(raw.detectedSkills)
      ? raw.detectedSkills.map(String)
      : [],
    missingSkills: Array.isArray(raw.missingSkills)
      ? raw.missingSkills.map(String)
      : [],
    strengths: Array.isArray(raw.strengths) ? raw.strengths.map(String) : [],
    improvements: Array.isArray(raw.improvements)
      ? raw.improvements.map(String)
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
      `Gemini model not found for generateContent. In backend/.env try a different GEMINI_MODEL (e.g. gemini-2.5-flash or gemini-2.0-flash). Your key may not have access to the current model. Original: ${msg}`
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
  "strengths": [<strings>],
  "improvements": [<strings>],
  "suggestions": [<strings>],
  "summary": "<3-5 sentence overview>"
}

Guidelines (follow closely):
- detectedSkills and missingSkills: list the most relevant job-matching skills/keywords (prefer exact phrases from the job description).
- strengths: 5-8 resume-specific wins tied to the job requirements.
- improvements: 5-8 concrete gaps or weaknesses (what to add/adjust).
- suggestions: 8-12 actionable suggestions (ATS-friendly edits, wording, ordering, and what to emphasize).

--- RESUME ---
${resumeText || "(empty)"}

--- JOB DESCRIPTION ---
${jobDescription || "(empty)"}`;
}

function extractResumeScoreFromText(text) {
  const keys = [
    "resumeScore",
    "score",
    "overallScore",
    "fitScore",
    "matchScore",
  ];
  for (const key of keys) {
    const keyPattern = new RegExp(
      `"?${key}"?\\s*[:=]\\s*([^,\\n}]+)`,
      "i"
    );
    const m = keyPattern.exec(text || "");
    if (!m) continue;
    const parsed = parseScoreValue(m[1]);
    if (parsed !== null) {
      return Math.min(100, Math.max(0, parsed));
    }
  }
  return null;
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

  const genAI = new GoogleGenerativeAI(apiKey);

  const primaryModel = (process.env.GEMINI_MODEL || DEFAULT_MODEL).trim();
  const modelCandidates = [
    primaryModel,
    // Common fallbacks (accounts may differ on availability)
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
  ].filter(Boolean);

  const rt = (resumeText || "").slice(0, MAX_INPUT_CHARS);
  const jd = (jobDescription || "").slice(0, MAX_INPUT_CHARS);
  const prompt = buildPrompt(rt, jd);

  const isModelNotFoundError = (e) => {
    const m = String(e?.message || e);
    return /404|not found|NOT_FOUND/i.test(m) && /model/i.test(m);
  };

  const runOnce = async (modelNameToTry, useJsonMime) => {
    const model = genAI.getGenerativeModel({
      model: modelNameToTry,
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

  let lastError = null;
  // Try each candidate model name.
  // For each model, try JSON-response mode first, then plain text mode.
  for (const candidateModel of modelCandidates) {
    for (const useJsonMime of [true, false]) {
      try {
        rawText = await runOnce(candidateModel, useJsonMime);
        lastError = null;
        break;
      } catch (e) {
        lastError = e;
        // If the model itself is not found, don't keep trying JSON/plain for it.
        if (isModelNotFoundError(e)) break;
      }
    }
    if (rawText) break;
  }

  if (!rawText) {
    // Best-effort debug: show available models for this API key.
    try {
      const list = await genAI.listModels();
      const names = (list || [])
        .map((m) => m?.name)
        .filter(Boolean)
        .slice(0, 50);
      if (names.length) {
        console.error("[Gemini] Available model names (sample):", names);
      }
    } catch {
      // ignore
    }

    throw lastError || new Error("Gemini model calls failed.");
  }

  let parsed;
  try {
    parsed = tryParseAnalysisJson(rawText);
  } catch {
    // If the model output isn't valid JSON, still try to salvage the score
    // so the UI can show something useful rather than failing completely.
    const salvagedScore = extractResumeScoreFromText(rawText);
    if (salvagedScore !== null) {
      parsed = { resumeScore: salvagedScore };
    } else {
      throw new Error(
        "Gemini did not return valid JSON. Try again or set GEMINI_MODEL to another Flash model."
      );
    }
  }

  return normalizeAnalysis(parsed);
}

module.exports = { analyzeResumeWithGemini, DEFAULT_MODEL };
