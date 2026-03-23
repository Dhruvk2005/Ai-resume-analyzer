export default function ThemeBackground({ children }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-charcoal-950">
      <div
        className="pointer-events-none fixed inset-0 bg-grid-dark opacity-[0.45] [background-size:48px_48px]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 bg-gradient-to-b from-violet-950/40 via-transparent to-cyan-950/25"
        aria-hidden
      />
      <div className="pointer-events-none fixed -left-32 top-0 h-[420px] w-[420px] rounded-full bg-violet-600/25 blur-[120px]" />
      <div className="pointer-events-none fixed -right-20 top-1/3 h-[380px] w-[380px] rounded-full bg-cyan-500/15 blur-[100px]" />
      <div className="pointer-events-none fixed bottom-0 left-1/3 h-[300px] w-[300px] rounded-full bg-fuchsia-600/15 blur-[90px]" />
      {children}
    </div>
  );
}
