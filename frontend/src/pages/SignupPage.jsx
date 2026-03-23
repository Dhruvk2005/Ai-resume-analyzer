import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import MarketingNav from "../components/MarketingNav";
import ThemeBackground from "../components/ThemeBackground";
import { useAuth } from "../context/AuthContext";

export default function SignupPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await register({ email, password, name });
      navigate("/analyze", { replace: true });
    } catch (err) {
      setError(err?.message || "Could not create account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemeBackground>
      <MarketingNav />
      <main className="mx-auto flex min-h-[calc(100vh-73px)] max-w-lg flex-col justify-center px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/60 p-8 shadow-xl shadow-black/40 backdrop-blur-md">
          <h1 className="font-display text-2xl font-bold text-white">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Start analyzing resumes in minutes.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-zinc-200">
                Name <span className="font-normal text-zinc-500">(optional)</span>
              </label>
              <input
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 w-full rounded-xl border border-zinc-700/80 bg-charcoal-925/90 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-cyan-500/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                placeholder="Jane Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-200">
                Email
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-2 w-full rounded-xl border border-zinc-700/80 bg-charcoal-925/90 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-cyan-500/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-200">
                Password
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="mt-2 w-full rounded-xl border border-zinc-700/80 bg-charcoal-925/90 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-cyan-500/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                placeholder="At least 8 characters"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-200">
                Confirm password
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="mt-2 w-full rounded-xl border border-zinc-700/80 bg-charcoal-925/90 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-cyan-500/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                placeholder="Repeat password"
              />
            </div>

            {error && (
              <p className="rounded-xl border border-rose-500/40 bg-rose-950/50 px-3 py-2 text-sm text-rose-200">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-orange-500 py-3.5 font-display text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/25 transition hover:brightness-110 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Creating account…
                </>
              ) : (
                "Sign up"
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-cyan-400 hover:text-cyan-300"
            >
              Log in
            </Link>
          </p>
        </div>
      </main>
    </ThemeBackground>
  );
}
