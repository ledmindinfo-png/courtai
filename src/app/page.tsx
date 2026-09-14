"use client";

import { useEffect, useState } from "react";
import Masthead from "@/components/Masthead";
import CaseForm from "@/components/CaseForm";
import CourtSession from "@/components/CourtSession";
import VerdictCard from "@/components/VerdictCard";
import RecentDocket from "@/components/RecentDocket";
import TokenStrip from "@/components/TokenStrip";
import { Case, InvestigationMetrics, TokenSnapshot, Verdict } from "@/lib/types";
import { loadCases, saveCase, nextCaseNumber } from "@/lib/storage";

type Status = "idle" | "loading" | "error";

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [activeCase, setActiveCase] = useState<Case | null>(null);
  const [extra, setExtra] = useState<{
    holders?: Array<{ address: string; percent: number; balance: string; label?: string; isContract?: boolean }>;
    unavailable?: string[];
  }>({});
  const [cases, setCases] = useState<Case[]>([]);

  useEffect(() => {
    setCases(loadCases());
  }, []);

  async function handleSubmit(contract: string, question: string) {
    setStatus("loading");
    setError(null);
    setActiveCase(null);

    try {
      const res = await fetch("/api/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contract, question }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "The court could not reach a verdict.");
      }

      const verdict: Verdict = {
        verdict: data.verdict,
        confidence: data.confidence,
        reasoning: data.reasoning,
        judge_quote: data.judge_quote,
        findings: data.findings,
        cannotProve: data.cannotProve,
        focus: data.focus,
      };

      const snapshot = data.snapshot as TokenSnapshot | undefined;
      const metrics = data.metrics as InvestigationMetrics | undefined;

      const newCase: Case = {
        id: crypto.randomUUID(),
        caseNumber: nextCaseNumber(),
        question,
        contract,
        snapshot,
        metrics,
        verdict,
        createdAt: Date.now(),
      };

      const updated = saveCase(newCase);
      setCases(updated);
      setActiveCase(newCase);
      setExtra({ holders: data.holders, unavailable: data.unavailable });
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  function handleReset() {
    setActiveCase(null);
    setStatus("idle");
    setError(null);
  }

  return (
    <main className="paper-grain min-h-screen pb-10">
      <Masthead ticker="$COURT" />

      <div className="mx-auto mt-10 max-w-3xl px-6">
        {status === "loading" && <CourtSession />}

        {status !== "loading" && activeCase && (
          <VerdictCard courtCase={activeCase} extra={extra} onReset={handleReset} />
        )}

        {status !== "loading" && !activeCase && (
          <>
            <p className="mb-8 max-w-lg font-serif text-xl leading-snug text-ink">
              The chain doesn&apos;t lie.
              <br />
              The court just reads it.
            </p>
            <p className="mb-8 max-w-lg font-mono text-xs leading-relaxed text-stone">
              Analyze holders and concentration of tokens launched on Stonkfun, using public chain data. No invented balances.
            </p>
            <CaseForm onSubmit={handleSubmit} disabled={false} />
            {status === "error" && error && (
              <p className="mt-4 border border-court-red px-4 py-3 font-mono text-sm text-court-red">
                {error}
              </p>
            )}
          </>
        )}

        <RecentDocket cases={cases} onSelect={(c) => setActiveCase(c)} />
      </div>

      <TokenStrip />
    </main>
  );
}
