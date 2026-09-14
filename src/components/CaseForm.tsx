"use client";

import { FormEvent, useState } from "react";

export const QUICK = [
  { label: "FULL TOKEN OVERVIEW", q: "Give me a full overview of this token." },
  { label: "HOLDER CONCENTRATION", q: "How concentrated is the supply?" },
  { label: "TOP HOLDERS", q: "Who are the largest holders?" },
  { label: "DEPLOYER ACTIVITY", q: "Has the deployer sold any tokens?" },
  { label: "WALLET CONNECTIONS", q: "Are the top wallets connected?" },
  { label: "LARGE TRANSFERS", q: "Show me the largest recent transfers." },
  { label: "INSIDER RISK", q: "Are there any obvious insider-risk signals?" },
];

const EXAMPLES = [
  "Give me a full overview of this token.",
  "How concentrated is the supply?",
  "Who are the largest holders?",
  "Are there suspicious holder clusters?",
  "Has the deployer sold any tokens?",
  "Are the top wallets connected?",
  "Show me the largest recent transfers.",
  "Is there evidence of coordinated selling?",
  "How much supply do the top 10 holders control?",
  "Are there wallets that received tokens directly from the deployer?",
  "Does the holder distribution look healthy?",
  "Are there any obvious insider-risk signals?",
  "Summarize the on-chain activity of this token.",
];

interface CaseFormProps {
  onSubmit: (contract: string, question: string) => void;
  disabled: boolean;
}

export default function CaseForm({ onSubmit, disabled }: CaseFormProps) {
  const [contract, setContract] = useState("");
  const [question, setQuestion] = useState("Give me a full overview of this token.");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const c = contract.trim();
    const q = question.trim();
    if (!c || !q || disabled) return;
    onSubmit(c, q);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <p className="font-mono text-[11px] tracking-widest2 text-stone">INVESTIGATE A TOKEN</p>
      <input
        value={contract}
        onChange={(e) => setContract(e.target.value)}
        disabled={disabled}
        placeholder="Paste Stonkfun token CA"
        spellCheck={false}
        className="mt-2 w-full border-2 border-ink bg-paper px-5 py-4 font-mono text-sm text-ink placeholder:text-stone/60 focus:outline-none"
      />

      <p className="mt-6 font-mono text-[11px] tracking-widest2 text-stone">ASK THE COURT</p>
      <div className="relative mt-2 border-2 border-ink bg-paper">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={2000}
          rows={3}
          disabled={disabled}
          placeholder="What do you want to know?"
          className="w-full resize-none bg-transparent px-5 pb-4 pt-4 font-serif text-lg text-ink placeholder:text-stone/60 focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={disabled || !contract.trim() || !question.trim()}
        className="mt-5 w-full border-2 border-ink bg-ink px-6 py-4 font-serif text-lg tracking-wide text-paper transition-colors disabled:cursor-not-allowed disabled:border-stone/40 disabled:bg-transparent disabled:text-stone/50 sm:w-auto"
      >
        INVESTIGATE
      </button>

      <div className="mt-8">
        <p className="font-mono text-[11px] tracking-widest2 text-stone">QUICK INVESTIGATIONS</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK.map((item) => (
            <button
              key={item.label}
              type="button"
              disabled={disabled}
              onClick={() => setQuestion(item.q)}
              className="border border-ink/30 px-3 py-1.5 font-mono text-[11px] tracking-wide text-ink transition-colors hover:border-court-red hover:text-court-red disabled:opacity-50"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            disabled={disabled}
            onClick={() => setQuestion(ex)}
            className="border border-ink/20 px-3 py-1.5 font-mono text-[11px] text-stone transition-colors hover:border-court-red hover:text-court-red disabled:opacity-50"
          >
            {ex}
          </button>
        ))}
      </div>
    </form>
  );
}
