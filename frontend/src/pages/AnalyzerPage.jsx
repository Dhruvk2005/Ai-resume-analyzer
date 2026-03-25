import { useState } from "react";
import { Link } from "react-router-dom";
import MarketingNav from "../components/MarketingNav";
import ThemeBackground from "../components/ThemeBackground";
import { useAuth } from "../context/AuthContext";

const initialResult = null;

function parseScoreValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

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

function resolveResumeScore(data) {
  const candidates = [
    data?.resumeScore,
    data?.score,
    data?.overallScore,
    data?.fitScore,
    data?.matchScore,
    data?.analysis?.resumeScore,
    data?.analysis?.score,
  ];

  for (const candidate of candidates) {
    const parsed = parseScoreValue(candidate);
    if (parsed !== null) {
      return Math.min(100, Math.max(0, parsed));
    }
  }

  return 0;
}

function normalizeApiResult(data) {
  return {
    ...data,
    resumeScore: resolveResumeScore(data),
  };
}

function ScoreRing({ score }) {
  const pct = Math.min(100, Math.max(0, Number(score) || 0));
  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (pct / 100) * circumference;
  let color = "stroke-emerald-400";
  if (pct < 50) color = "stroke-rose-400";
  else if (pct < 75) color = "stroke-amber-400";

  return (
    <div className="relative flex h-36 w-36 items-center justify-center">
      <div
        className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500/20 via-transparent to-cyan-500/20 blur-xl"
        aria-hidden
      />
      <svg className="relative h-36 w-36 -rotate-90" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r="52"
          fill="none"
          className="stroke-zinc-700/80"
          strokeWidth="10"
        />
        <circle
          cx="60"
          cy="60"
          r="52"
          fill="none"
          className={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display bg-gradient-to-br from-white to-zinc-300 bg-clip-text text-3xl font-bold text-transparent">
          {pct}
        </span>
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
          Score
        </span>
      </div>
    </div>
  );
}

function TagList({ title, items, variant }) {
  const base =
    "rounded-lg px-3 py-1.5 text-sm font-medium border backdrop-blur-sm transition-colors";
  const styles =
    variant === "good"
      ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200 shadow-[inset_0_1px_0_0_rgba(52,211,153,0.12)]"
      : "border-amber-500/35 bg-amber-500/10 text-amber-100 shadow-[inset_0_1px_0_0_rgba(251,191,36,0.1)]";

  if (!items?.length) {
    return (
      <div>
        <h3 className="mb-2 font-display text-sm font-semibold text-zinc-300">
          {title}
        </h3>
        <p className="text-sm text-zinc-500">None listed.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-2 font-display text-sm font-semibold text-zinc-300">
        {title}
      </h3>
      <ul className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <li key={`${item}-${i}`} className={`${base} ${styles}`}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AnalyzerPage() {
  const { token, logout } = useAuth();
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(initialResult);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!file) {
      setError("Please choose a PDF or DOCX resume.");
      return;
    }

    const formData = new FormData();
    formData.append("resume", file);
    formData.append("jobDescription", jobDescription);

    setLoading(true);
    try {
      const res = await fetch("/api/resume/analyze", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const raw = await res.text();
      let data = {};
      if (raw) {
        try {
          data = JSON.parse(raw);
        } catch {
          data = {
            error: raw.startsWith("<")
              ? `Server returned HTML (HTTP ${res.status}). Is the API running on port 5000?`
              : raw.slice(0, 280),
          };
        }
      }

      if (res.status === 401) {
        logout();
        setError("Session expired. Please log in again.");
        return;
      }

      if (!res.ok) {
        const detail =
          typeof data.error === "string" && data.error
            ? data.error
            : `HTTP ${res.status}`;
        throw new Error(detail);
      }

      setResult(normalizeApiResult(data));
    } catch (err) {
      const msg = err?.message || "Something went wrong.";
      const isNetwork =
        err?.name === "TypeError" &&
        /fetch|network|failed|load/i.test(String(msg));
      setError(
        isNetwork
          ? `${msg} — The backend may be stopped, or MongoDB/env is misconfigured so the server did not start. From the project folder run: npm run dev (starts API + UI). Ensure backend/.env has MONGODB_URI and GEMINI_API_KEY, and MongoDB is running.`
          : msg
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemeBackground>
      <MarketingNav />

      <div className="relative border-b border-zinc-800/80 bg-zinc-900/30 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-lg font-bold text-white sm:text-xl">
              Resume analyzer
            </h1>
            {/* <span className="hidden rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-xs font-medium text-cyan-300 sm:inline">
              Gemini
            </span> */}
          </div>
          <Link
            to="/"
            className="text-sm font-medium text-zinc-400 transition hover:text-cyan-400"
          >
            ← Back to home
          </Link>
        </div>
      </div>

      <main className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-5">
          <section className="lg:col-span-2">
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-zinc-800/90 bg-zinc-900/60 p-6 shadow-xl shadow-black/40 backdrop-blur-md"
            >
              <div className="mb-6 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Input
                </span>
              </div>
              <label className="block font-display text-sm font-semibold text-zinc-200">
                Resume (PDF or DOCX)
              </label>
              <div className="mt-2">
                <input
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="block w-full cursor-pointer text-sm text-zinc-400 file:mr-4 file:rounded-xl file:border-0 file:bg-gradient-to-r file:from-violet-600 file:to-fuchsia-600 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white file:shadow-md hover:file:brightness-110"
                />
              </div>

              <label className="mt-6 block font-display text-sm font-semibold text-zinc-200">
                Job description
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={10}
                placeholder="Paste the full job posting here (role, requirements, nice-to-haves)..."
                className="mt-2 w-full resize-y rounded-xl border border-zinc-700/80 bg-charcoal-925/90 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-cyan-500/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              />

              {error && (
                <p className="mt-4 rounded-xl border border-rose-500/40 bg-rose-950/50 px-3 py-2 text-sm text-rose-200">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-orange-500 px-4 py-3.5 font-display text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Analyzing…
                  </>
                ) : (
                  "Analyze resume"
                )}
              </button>
            </form>
          </section>

          <section className="lg:col-span-3">
            {!result && !loading && (
              <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-700/80 bg-zinc-900/30 p-8 text-center backdrop-blur-sm">
                <div className="rounded-2xl border border-zinc-700/60 bg-gradient-to-br from-violet-500/10 to-cyan-500/10 p-5 text-cyan-400/90">
                  <svg
                    className="h-10 w-10"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <p className="mt-5 max-w-sm text-sm leading-relaxed text-zinc-400">
                  Upload a resume and add a job description. You will get a
                  score, skill gaps, and tailored suggestions powered by{" "}
                  <span className="text-cyan-400">Gemini 2.5 Flash</span>.
                </p>
              </div>
            )}

            {loading && (
              <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 backdrop-blur-md">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-700 border-t-cyan-400" />
                <p className="mt-4 text-sm font-medium text-zinc-400">
                  Extracting text and running AI analysis…
                </p>
              </div>
            )}

            {result && !loading && (
              <div className="space-y-6">
                {result.warning && (
                  <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 backdrop-blur-sm">
                    {result.warning}
                  </div>
                )}
                <div className="rounded-2xl border border-zinc-800/90 bg-gradient-to-br from-zinc-900/90 to-charcoal-850/90 p-6 shadow-xl shadow-black/30 backdrop-blur-md">
                  <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex flex-col items-center sm:items-start">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="h-1.5 w-8 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" />
                        <h2 className="font-display text-lg font-semibold text-white">
                          Fit overview
                        </h2>
                      </div>
                      <p className="mt-1 max-w-xl text-sm leading-relaxed text-zinc-400">
                        {result.summary}
                      </p>
                    </div>
                    <ScoreRing score={result.resumeScore} />
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="rounded-2xl border border-emerald-500/20 bg-zinc-900/50 p-6 shadow-lg shadow-emerald-950/20 backdrop-blur-sm">
                    <TagList
                      title="Detected skills"
                      items={result.detectedSkills}
                      variant="good"
                    />
                  </div>
                  <div className="rounded-2xl border border-amber-500/20 bg-zinc-900/50 p-6 shadow-lg shadow-amber-950/20 backdrop-blur-sm">
                    <TagList
                      title="Missing / to strengthen"
                      items={result.missingSkills}
                      variant="warn"
                    />
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="rounded-2xl border border-emerald-500/20 bg-zinc-900/50 p-6 shadow-lg shadow-emerald-950/20 backdrop-blur-sm">
                    <TagList
                      title="Strengths"
                      items={result.strengths}
                      variant="good"
                    />
                  </div>
                  <div className="rounded-2xl border border-amber-500/20 bg-zinc-900/50 p-6 shadow-lg shadow-amber-950/20 backdrop-blur-sm">
                    <TagList
                      title="Improvements"
                      items={result.improvements}
                      variant="warn"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md">
                  <h3 className="font-display text-sm font-semibold text-zinc-200">
                    Suggestions
                  </h3>
                  <ol className="mt-4 space-y-3">
                    {(result.suggestions || []).map((s, i) => (
                      <li
                        key={i}
                        className="flex gap-3 text-sm leading-relaxed text-zinc-300"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-500/20 text-xs font-bold text-violet-300">
                          {i + 1}
                        </span>
                        <span className="pt-0.5">{s}</span>
                      </li>
                    ))}
                  </ol>
                  {!(result.suggestions || []).length && (
                    <p className="mt-2 text-sm text-zinc-500">No suggestions.</p>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </ThemeBackground>
  );
}
