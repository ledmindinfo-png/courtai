"use client";

import { useState } from "react";
import { Case } from "@/lib/types";

interface VerdictCardProps {
  courtCase: Case;
  extra?: {
    holders?: Array<{ address: string; percent: number; balance: string; label?: string; isContract?: boolean }>;
    unavailable?: string[];
  };
  onReset: () => void;
}

function formatCaseNumber(n: number) {
  return `#${String(n).padStart(3, "0")}`;
}

function shareText(c: Case) {
  const sym = c.snapshot?.symbol ? `$${c.snapshot.symbol}` : c.contract;
  return `AI COURT — ON-CHAIN INVESTIGATION ${formatCaseNumber(c.caseNumber)}\n\n${sym}\n${c.contract}\n\n${c.question}\n\nVERDICT: ${c.verdict.verdict} (${c.verdict.confidence}% confidence)\n\n"${c.verdict.judge_quote}"\n\n$COURT — put any token on trial.`;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-ink/10 py-1.5 font-mono text-xs">
      <span className="text-stone">{label}</span>
      <span className="text-ink">{value}</span>
    </div>
  );
}

export default function VerdictCard({ courtCase, extra, onReset }: VerdictCardProps) {
  const [copied, setCopied] = useState(false);
  const v = courtCase.verdict;
  const snap = courtCase.snapshot;
  const metrics = courtCase.metrics;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareText(courtCase));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  }

  function handleShareX() {
    const url = new URL("https://twitter.com/intent/tweet");
    url.searchParams.set("text", shareText(courtCase));
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  }

  const pct = (n: number | null | undefined) =>
    n == null ? "DATA UNAVAILABLE" : `${n.toFixed(1)}%`;

  return (
    <div className="animate-rise">
      <div className="relative overflow-hidden border-2 border-ink bg-paper">
        <div
          className="pointer-events-none absolute right-4 top-4 rotate-[-14deg] select-none animate-stamp opacity-90 sm:right-8 sm:top-8"
          aria-hidden
        >
          <div className="stamp-ring flex h-20 w-20 items-center justify-center px-1 text-center font-mono text-[9px] font-semibold leading-tight tracking-widest2 text-court-red sm:h-24 sm:w-24 sm:text-[10px]">
            VERDICT
            <br />
            RENDERED
          </div>
        </div>

        <div className="border-b border-ink/15 px-6 pb-4 pt-6 sm:px-10 sm:pt-8">
          <div className="font-mono text-[11px] tracking-widest2 text-stone">
            AI COURT · ON-CHAIN INVESTIGATION · CASE {formatCaseNumber(courtCase.caseNumber)}
          </div>
          <div className="mt-3 font-serif text-3xl text-ink">
            {snap?.symbol ? `$${snap.symbol}` : "TOKEN"}
          </div>
          <p className="mt-1 font-mono text-xs text-stone">{courtCase.contract}</p>
          {snap?.name && (
            <p className="mt-1 font-mono text-xs text-stone">
              {snap.name}
              {snap.holdersCount != null ? ` · ${snap.holdersCount.toLocaleString()} holders` : ""}
            </p>
          )}
          <p className="mt-3 max-w-[85%] font-serif text-lg italic text-ink/80">
            &ldquo;{courtCase.question}&rdquo;
          </p>
        </div>

        <div className="px-6 py-8 sm:px-10">
          <div className="font-mono text-[11px] tracking-widest2 text-stone">COURT ASSESSMENT</div>
          <div className="mt-1 font-serif text-4xl font-medium leading-none text-court-red sm:text-5xl">
            {v.verdict}
          </div>
          <div className="mt-5 flex items-center gap-3">
            <div className="h-2 w-40 max-w-[50%] border border-ink/25 sm:w-56">
              <div className="h-full bg-ink" style={{ width: `${v.confidence}%` }} />
            </div>
            <span className="font-mono text-sm text-ink">{v.confidence}% CONFIDENCE</span>
          </div>

          {metrics && (
            <div className="mt-8 border-t border-ink/15 pt-6">
              <div className="font-mono text-[11px] tracking-widest2 text-stone">HOLDER STRUCTURE</div>
              <div className="mt-3">
                <Metric label="Top 5" value={pct(metrics.top5Pct)} />
                <Metric label="Top 10" value={pct(metrics.top10Pct)} />
                <Metric label="Top 20" value={pct(metrics.top20Pct)} />
                <Metric label="Largest holder" value={pct(metrics.largestPct)} />
              </div>
            </div>
          )}

          {extra?.holders && extra.holders.length > 0 && /holder|largest|who are/i.test(courtCase.question) && (
            <div className="mt-8 border-t border-ink/15 pt-6">
              <div className="font-mono text-[11px] tracking-widest2 text-stone">TOP HOLDERS</div>
              <ol className="mt-3 space-y-2">
                {extra.holders.slice(0, 10).map((h, i) => (
                  <li key={h.address} className="flex items-baseline justify-between gap-3 font-mono text-xs">
                    <span className="truncate text-ink">
                      {i + 1}. {h.address.slice(0, 6)}...{h.address.slice(-4)}
                      {h.label ? <span className="ml-2 text-stone">{h.label}</span> : null}
                    </span>
                    <span className="shrink-0 text-ink">{h.percent.toFixed(2)}%</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {v.findings && v.findings.length > 0 && (
            <div className="mt-8 border-t border-ink/15 pt-6">
              <div className="font-mono text-[11px] tracking-widest2 text-stone">WHAT THE COURT FOUND</div>
              <ol className="mt-4 space-y-4">
                {v.findings.map((f, i) => (
                  <li key={i}>
                    <div className="font-mono text-[11px] text-court-red">
                      {String(i + 1).padStart(2, "0")} {f.title}
                    </div>
                    <p className="mt-1 font-serif text-base text-ink">{f.body}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {v.cannotProve && (
            <div className="mt-8 border-t border-ink/15 pt-6">
              <div className="font-mono text-[11px] tracking-widest2 text-stone">WHAT WE CANNOT PROVE</div>
              <p className="mt-2 font-serif text-base text-ink/80">{v.cannotProve}</p>
            </div>
          )}

          <div className="mt-8 border-t border-ink/15 pt-6">
            <div className="font-mono text-[11px] tracking-widest2 text-stone">VERDICT</div>
            <p className="mt-2 font-serif text-lg leading-snug text-ink">{v.reasoning}</p>
            <p className="mt-4 border-l-2 border-court-red pl-4 font-serif text-lg italic text-ink/80">
              &ldquo;{v.judge_quote}&rdquo;
            </p>
          </div>

          {extra?.unavailable && extra.unavailable.length > 0 && (
            <p className="mt-6 font-mono text-[11px] text-stone">
              DATA UNAVAILABLE: {extra.unavailable.join(", ")}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-ink/15 px-6 py-5 sm:flex-row sm:px-10">
          <button
            onClick={handleShareX}
            className="border-2 border-ink bg-ink px-5 py-3 font-mono text-xs tracking-widest2 text-paper"
          >
            SHARE ON X
          </button>
          <button
            onClick={handleCopy}
            className="border-2 border-ink px-5 py-3 font-mono text-xs tracking-widest2 text-ink hover:bg-ink hover:text-paper"
          >
            {copied ? "COPIED" : "COPY RESULT"}
          </button>
          <button
            onClick={onReset}
            className="border-2 border-transparent px-5 py-3 font-mono text-xs tracking-widest2 text-stone hover:text-court-red sm:ml-auto"
          >
            NEW INVESTIGATION
          </button>
        </div>
      </div>
    </div>
  );
}
