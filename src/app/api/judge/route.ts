import { NextRequest, NextResponse } from "next/server";
import {
  isAddress,
  investigateToken,
  serializeBundle,
  scoreRisk,
} from "@/lib/blockscout";
import { isSolanaAddress, investigateSolanaToken } from "@/lib/solana";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are THE JUDGE of AI COURT, an on-chain intelligence tribunal.
You receive REAL on-chain data (Solana RPC for Stonkfun mints, or Blockscout for EVM) plus a user question.
You MUST analyze ONLY that data. Never invent holders, balances, transfers, deployer actions, or wallet relationships.

Distinguish clearly:
FACT — numbers and events present in the data.
INFERENCE — cautious interpretation of those facts.
UNKNOWN — anything not established by the data.

A transfer between two wallets is NOT proof of common ownership.
Do not label a liquidity pool, router, or burn address as an insider whale if it is labeled as protocol/system.

Answer the USER QUESTION specifically. If they asked only for top holders, do not dump a generic essay. If they asked about the deployer, focus there. Full overview only when asked.

Respond with ONLY a JSON object:
{
  "verdict": "SHORT LABEL",
  "confidence": 0-100 integer matching the provided DETERMINISTIC_SCORE unless data is missing (then lower it),
  "reasoning": "2-5 sentences answering the question using facts then inference",
  "judge_quote": "dry one-liner under 20 words",
  "findings": [{"title":"SHORT TITLE","body":"one or two factual sentences"}],
  "cannotProve": "one sentence on what the data cannot establish",
  "focus": "holders|deployer|transfers|connections|overview|risk"
}

If a field is DATA UNAVAILABLE, say so. Do not fill gaps.`;

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found");
  return JSON.parse(trimmed.slice(start, end + 1));
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
    return NextResponse.json(
      { error: "Paste a Stonkfun / Solana mint or an EVM 0x address." },
      { status: 400 }
    );
  }
  if (!question) {
    return NextResponse.json({ error: "Ask the court a question about this token." }, { status: 400 });
  }
  if (question.length > 2000) {
    return NextResponse.json({ error: "Keep the question under 2000 characters." }, { status: 400 });
  }

  let bundle;
  try {
    bundle = sol ? await investigateSolanaToken(contract) : await investigateToken(contract);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "INVALID_OR_UNKNOWN_TOKEN") {
      return NextResponse.json(
        {
          error: sol
            ? "This is not a recognized Solana token mint. Paste the Stonkfun CA exactly as shown."
            : "This address is not a recognized ERC-20 on Robinhood Chain.",
        },
        { status: 404 }
      );
    }
    if (msg === "BLOCKSCOUT_BLOCKED" || msg === "BLOCKSCOUT_UNAVAILABLE") {
      return NextResponse.json(
        {
          error:
            "Robinhood Chain explorer blocked the request (Cloudflare). The CA may be valid — retry in a minute. No fabricated balances were shown.",
        },
        { status: 502 }
      );
    }
    console.error(err);
    return NextResponse.json(
      { error: "Chain data could not be reached. No fabricated data will be shown." },
      { status: 502 }
    );
  }

  const risk = scoreRisk(bundle);
  const evidence = serializeBundle(bundle);

  const apiKey = process.env.CEREBRAS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "Server is missing CEREBRAS_API_KEY. Add it in Vercel Environment Variables and redeploy.",
        snapshot: bundle.token,
        metrics: bundle.metrics,
      },
      { status: 500 }
    );
  }

  const model = process.env.CEREBRAS_MODEL || "qwen-3.8-27b";

  try {
    const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 900,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `DETERMINISTIC_RISK_LABEL: ${risk.label}\nDETERMINISTIC_SCORE: ${risk.score}\n\nON-CHAIN EVIDENCE:\n${evidence}\n\nUSER QUESTION:\n${question}\n\nReturn JSON now.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return NextResponse.json({
        verdict: risk.label,
        confidence: risk.score,
        reasoning: `On-chain metrics only. Top holder ${bundle.metrics.largestPct ?? "DATA UNAVAILABLE"}%. Top 10 ${bundle.metrics.top10Pct ?? "DATA UNAVAILABLE"}%. AI call failed; numbers are from the chain.`,
        judge_quote: "The ledger is in. The prose can wait.",
        findings: bundle.holders.slice(0, 3).map((h, i) => ({
          title: `HOLDER ${i + 1}`,
          body: `${h.address} holds ${h.percent.toFixed(2)}% (${h.balance}).`,
        })),
        cannotProve: bundle.unavailable.length
          ? `Unavailable: ${bundle.unavailable.join(", ")}.`
          : "Wallet identity and off-chain intent are not in this data.",
        focus: "overview",
        snapshot: bundle.token,
        metrics: bundle.metrics,
        holders: bundle.holders.slice(0, 15),
        transfers: bundle.transfers.slice(0, 10),
        deployerTransfers: bundle.deployerTransfers.slice(0, 10),
        unavailable: bundle.unavailable,
      });
    }

    const data = await response.json();
    const rawText =
      data?.choices?.[0]?.message?.content ||
      data?.choices?.[0]?.message?.reasoning ||
      "";

    let parsed: Record<string, unknown> = {};
    try {
      if (!rawText) throw new Error("empty");
      parsed = extractJson(rawText) as Record<string, unknown>;
    } catch {
      parsed = {
        verdict: risk.label,
        reasoning: `On-chain metrics only. Top holder ${bundle.metrics.largestPct ?? "DATA UNAVAILABLE"}%. Top 10 ${bundle.metrics.top10Pct ?? "DATA UNAVAILABLE"}%.`,
        judge_quote: "The ledger is in. The prose can wait.",
        findings: bundle.holders.slice(0, 3).map((h, i) => ({
          title: `HOLDER ${i + 1}`,
          body: `${h.address} holds ${h.percent.toFixed(2)}% (${h.balance}).`,
        })),
        cannotProve: bundle.unavailable.length
          ? `Unavailable: ${bundle.unavailable.join(", ")}.`
          : "Wallet identity and off-chain intent are not in this data.",
        focus: "overview",
      };
    }

    const findings = Array.isArray(parsed.findings)
      ? parsed.findings
          .filter((f) => f && typeof f === "object")
          .slice(0, 6)
          .map((f) => {
            const o = f as Record<string, unknown>;
            return {
              title: String(o.title || "").slice(0, 80),
              body: String(o.body || "").slice(0, 400),
            };
          })
      : [];

    return NextResponse.json({
      verdict: String(parsed.verdict || risk.label).toUpperCase().slice(0, 40),
      confidence: risk.score,
      reasoning: String(parsed.reasoning || "").slice(0, 1200),
      judge_quote: String(parsed.judge_quote || "").slice(0, 200),
      findings,
      cannotProve: String(parsed.cannotProve || "").slice(0, 400),
      focus: String(parsed.focus || "overview").slice(0, 40),
      snapshot: bundle.token,
      metrics: bundle.metrics,
      holders: bundle.holders.slice(0, 15),
      transfers: bundle.transfers.slice(0, 10),
      deployerTransfers: bundle.deployerTransfers.slice(0, 10),
      unavailable: bundle.unavailable,
    });
  } catch (err) {
    console.error("Judge route error:", err);
    return NextResponse.json({
      verdict: risk.label,
      confidence: risk.score,
      reasoning: `On-chain metrics only. Top holder ${bundle.metrics.largestPct ?? "DATA UNAVAILABLE"}%. Top 10 ${bundle.metrics.top10Pct ?? "DATA UNAVAILABLE"}%.`,
      judge_quote: "The ledger is in. The prose can wait.",
      findings: bundle.holders.slice(0, 3).map((h, i) => ({
        title: `HOLDER ${i + 1}`,
        body: `${h.address} holds ${h.percent.toFixed(2)}% (${h.balance}).`,
      })),
      cannotProve: "AI formatting failed. Holder percentages below are from the chain.",
      focus: "overview",
      snapshot: bundle.token,
      metrics: bundle.metrics,
      holders: bundle.holders.slice(0, 15),
      transfers: bundle.transfers.slice(0, 10),
      deployerTransfers: bundle.deployerTransfers.slice(0, 10),
      unavailable: bundle.unavailable,
    });
  }
}
