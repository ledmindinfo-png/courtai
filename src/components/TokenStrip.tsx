export default function TokenStrip() {
  return (
    <footer className="mt-20 border-t-2 border-ink">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <img src="/logo.png" alt="" className="mt-1 h-10 w-10" />
          <div>
            <div className="font-serif text-2xl text-ink">$COURT</div>
            <p className="mt-1 max-w-xs font-mono text-xs leading-relaxed text-stone">
              AI-POWERED ON-CHAIN INTELLIGENCE.
            </p>
            <p className="mt-3 max-w-sm font-serif text-sm text-ink">
              Hold $COURT. Launched on Stonkfun.
            </p>
            <p className="mt-1 max-w-sm font-mono text-[11px] leading-relaxed text-stone">
              Trading fees follow Stonkfun pool rules. No APY. No guaranteed returns.
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-10 gap-y-1 font-mono text-xs text-stone sm:text-right">
          <dt>LAUNCHPAD</dt>
          <dd className="text-ink">STONKFUN</dd>
          <dt>NETWORK</dt>
          <dd className="text-ink">SOLANA</dd>
          <dt>SITE</dt>
          <dd className="text-ink">stonkfun.xyz</dd>
          <dt>Contract</dt>
          <dd className="text-ink">Coming soon</dd>
        </dl>
      </div>
      <div className="border-t border-ink/15 px-6 py-4 text-center font-mono text-[11px] text-stone">
        Branding only — not an offer to sell any security or investment. No APY or guaranteed returns.
      </div>
    </footer>
  );
}
