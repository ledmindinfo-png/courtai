export default function Masthead({ ticker }: { ticker: string }) {
  return (
    <header className="mx-auto max-w-3xl px-6 pt-10 sm:pt-16">
      <div className="flex items-end justify-between gap-6">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="AI Court" className="h-14 w-14 sm:h-16 sm:w-16" />
          <h1 className="font-serif text-4xl font-medium text-ink sm:text-6xl">
            AI Court
          </h1>
        </div>
        <span className="mb-1 font-mono text-[11px] tracking-widest2 text-stone">
          {ticker}
        </span>
      </div>
      <div className="mt-3 border-t-2 border-ink" />
      <div className="mt-1 border-t border-ink" />

      <p className="mt-6 max-w-xl font-serif text-2xl leading-snug text-ink sm:text-3xl">
        Put any token on trial.
      </p>
      <p className="mt-4 max-w-lg font-mono text-xs leading-relaxed text-stone">
        Launched on Stonkfun. Paste a CA. Ask the court. Let the chain provide the evidence.
      </p>
    </header>
  );
}
