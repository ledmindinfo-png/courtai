import { Case } from "@/lib/types";

interface RecentDocketProps {
  cases: Case[];
  onSelect: (c: Case) => void;
}

export default function RecentDocket({ cases, onSelect }: RecentDocketProps) {
  if (cases.length === 0) return null;

  return (
    <section className="mt-16">
      <div className="flex items-baseline justify-between border-b-2 border-ink pb-2">
        <h2 className="font-serif text-2xl text-ink">Recent Verdicts</h2>
        <span className="font-mono text-[11px] tracking-widest2 text-stone">
          THE COURT NEVER SLEEPS
        </span>
      </div>

      <ul className="mt-4 divide-y divide-ink/15">
        {cases.map((c) => (
          <li key={c.id}>
            <button
              onClick={() => onSelect(c)}
              className="flex w-full items-center gap-4 py-4 text-left transition-colors hover:bg-paperDim"
            >
              <span className="w-16 shrink-0 font-mono text-xs text-stone">
                #{String(c.caseNumber).padStart(3, "0")}
              </span>
              <span className="w-24 shrink-0 font-serif text-base font-medium text-court-red sm:w-32">
                {c.verdict.verdict}
              </span>
              <span className="flex-1 truncate font-serif text-base italic text-ink/80">
                &ldquo;{c.question}&rdquo;
              </span>
              <span className="shrink-0 font-mono text-xs text-stone">
                {c.verdict.confidence}%
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
