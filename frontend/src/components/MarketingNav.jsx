import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function MarketingNav() {
  const { user, logout } = useAuth();

  return (
    <header className="relative border-b border-zinc-800/80 bg-zinc-900/40 backdrop-blur-xl">
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link to="/" className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 p-[1px] shadow-glow-violet">
            <div className="flex h-full w-full items-center justify-center rounded-[11px] bg-zinc-900">
              <svg
                className="h-5 w-5 text-fuchsia-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          </div>
          <span className="font-display text-[30px] font-bold text-white">
           CVInsight
          </span>
        </Link>

        <nav className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          {user ? (
            <>
              <Link
                to="/analyze"
                className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800/80 hover:text-white"
              >
                Analyzer
              </Link>
              <button
                type="button"
                onClick={() => logout()}
                className="rounded-lg border border-zinc-600 bg-zinc-800/50 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-violet-500/50 hover:text-white"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 transition hover:text-white"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/20 transition hover:brightness-110"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
