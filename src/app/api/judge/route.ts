import { NextRequest, NextResponse } from "next/server";
import {
  isAddress,
  investigateToken,
  serializeBundle,
  scoreRisk,
} from "@/lib/blockscout";
import { isSolanaAddress, investigateSolanaToken } from "@/lib/solana";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are THE JUDGE of AI COURT.
You receive REAL data about a Solana token (on-chain mint + Dexscreener market) plus a user question.
Analyze ONLY that data. Never invent holders, prices, or pairs.

Default task: LAUNCH CARD — name, ticker, supply, pair, market cap, liquidity, 24h volume.
Skip holder forensics unless the user explicitly asks.

FACT vs INFERENCE vs UNKNOWN. If a field is missing, say DATA UNAVAILABLE.

Respond with ONLY JSON:
{
  "verdict": "SHORT LABEL",
  "confidence": 0-100,
  "reasoning": "2-5 sentences on the launched token",
  "judge_quote": "dry one-liner under 20 words",
  "findings": [{"title":"SHORT TITLE","body":"one or two factual sentences"}],
  "cannotProve": "what this snapshot cannot establish",
  "focus": "overview"
}`;

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found");
  return JSON.parse(trimmed.slice(start, end + 1));
}

function card(bundle: {
  token: { name: string | null; symbol: string | null; totalSupply: string | null; address: string };
  metrics: { largestPct: number | null; top10Pct: number | null };
  unavailable: string[];
  market?: Record<string, unknown>;
}, risk: { label: string; score: number }) {
  const m = bundle.market || {};
  return {
    verdict: risk.label,
    confidence: risk.score,
    reasoning: `Launch card. ${bundle.token.name || "DATA UNAVAILABLE"} (${bundle.token.symbol || "n/a"}). Supply ${bundle.token.totalSupply ?? "DATA UNAVAILABLE"}. Pair ${m.pair ?? "DATA UNAVAILABLE"}. Mcap ${m.marketCap ?? "DATA UNAVAILABLE"}. Liq ${m.liquidityUsd ?? "DATA UNAVAILABLE"}. Vol24h ${m.volume24h ?? "DATA UNAVAILABLE"}.`,
    judge_quote: "Read the mint. Then the market.",
    findings: [
      { title: "TOKEN", body: `${bundle.token.name} / ${bundle.token.symbol} — ${bundle.token.address}` },
      { title: "MARKET", body: `Pair ${m.pair ?? "DATA UNAVAILABLE"} · mcap ${m.marketCap ?? "n/a"} · liq ${m.liquidityUsd ?? "n/a"}` },
    ],
    cannotProve: bundle.unavailable.length ? `Unavailable: ${bundle.unavailable.join(", ")}.` : "Off-chain team identity is not in this snapshot.",
    focus: "overview",
    snapshot: bundle.token,
    metrics: bundle.metrics,
    holders: [],
    transfers: [],
    deployerTransfers: [],
    unavailable: bundle.unavailable,
  };
}

export async function POST(req: NextRequest) {
  let question: string;
  let contract: string;
  try {
    const body = await req.json();
    question = typeof body?.question === "string" ? body.question.trim() : "";
    contract = typeof body?.contract === "string" ? body.contract.trim() : "";
    if (contract.startsWith("0x") || contract.startsWith("0X")) {
      contract = "0x" + contract.slice(2).toLowerCase();
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const evm = isAddress(contract);
  const sol = isSolanaAddress(contract);
  if (!evm && !sol) {
    return NextResponse.json({ error: "Paste a Solana token mint (or an EVM 0x address)." }, { status: 400 });
  }
  if (!question) {
    return NextResponse.json({ error: "Ask the court a question about this token." }, { status: 400 });
  }

  let bundle;
  try {
    bundle = sol ? await investigateSolanaToken(contract) : await investigateToken(contract);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "INVALID_OR_UNKNOWN_TOKEN") {
      return NextResponse.json(
        { error: sol ? "Not a recognized Solana mint. Paste the CA exactly." : "Not a recognized EVM token." },
        { status: 404 }
      );
    }
    return NextResponse.json({ error: "Chain data could not be reached. Nothing was invented." }, { status: 502 });
  }

  const risk = scoreRisk(bundle as never);
  let evidence = serializeBundle(bundle as never);
  const market = (bundle as { market?: Record<string, unknown> }).market;
  if (market) {
    evidence += "\n\nLAUNCH / MARKET\n" + Object.entries(market).map(([k, v]) => `${k}: ${v ?? "DATA UNAVAILABLE"}`).join("\n");
  }

  const apiKey = process.env.CEREBRAS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing CEREBRAS_API_KEY on Vercel.", snapshot: bundle.token, metrics: bundle.metrics }, { status: 500 });
  }

  const model = process.env.CEREBRAS_MODEL || "qwen-3.8-27b";

  try {
    const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 900,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `DETERMINISTIC_LABEL: ${risk.label}\nSCORE: ${risk.score}\n\nEVIDENCE:\n${evidence}\n\nQUESTION:\n${question}\n\nReturn JSON now.` },
        ],
      }),
    });

    if (!response.ok) return NextResponse.json(card(bundle as never, risk));

    const data = await response.json();
    const rawText = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.message?.reasoning || "";
    let parsed: Record<string, unknown> = {};
    try {
      if (!rawText) throw new Error("empty");
      parsed = extractJson(rawText) as Record<string, unknown>;
    } catch {
      return NextResponse.json(card(bundle as never, risk));
    }

    const findings = Array.isArray(parsed.findings)
      ? parsed.findings.filter((f) => f && typeof f === "object").slice(0, 6).map((f) => {
          const o = f as Record<string, unknown>;
          return { title: String(o.title || "").slice(0, 80), body: String(o.body || "").slice(0, 400) };
        })
      : [];

    return NextResponse.json({
      verdict: String(parsed.verdict || risk.label).toUpperCase().slice(0, 40),
      confidence: risk.score,
      reasoning: String(parsed.reasoning || "").slice(0, 1200),
      judge_quote: String(parsed.judge_quote || "").slice(0, 200),
      findings,
      cannotProve: String(parsed.cannotProve || "").slice(0, 400),
      focus: "overview",
      snapshot: bundle.token,
      metrics: bundle.metrics,
      holders: [],
      transfers: [],
      deployerTransfers: [],
      unavailable: bundle.unavailable,
    });
  } catch {
    return NextResponse.json(card(bundle as never, risk));
  }
}
