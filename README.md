# AI Court — $JUDGE

The internet has no judge. Now it does.

Submit any dispute — a tweet, a logo battle, an argument, a project idea — and
get back a structured AI verdict: **VERDICT / CONFIDENCE / RULING / JUDGE'S QUOTE**.

This is intentionally a small, single-page MVP:

- **No database.** The last 10 cases live in the browser's `localStorage`.
- **No accounts, no wallets, no uploads.**
- **One API route** (`/api/judge`) that calls the Anthropic API and returns
  structured JSON.
- **One AI call per verdict.** That's the whole product.

## Stack

Next.js 14 (App Router) + React + Tailwind CSS. No other dependencies.

## Setup

```bash
npm install
cp .env.example .env.local
# then edit .env.local and paste in your key:
# ANTHROPIC_API_KEY=sk-ant-...
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Get an API key at [console.anthropic.com](https://console.anthropic.com).

By default the app calls the `claude-sonnet-5` model. You can point it at a
different model by setting `ANTHROPIC_MODEL` in `.env.local` — check
[Anthropic's model list](https://docs.claude.com/en/docs/about-claude/models)
for current model names, since these change over time.

## Deploying

This is a standard Next.js app, so it deploys as-is to Vercel or any Node
host:

1. Push this folder to a GitHub repo.
2. Import it into [Vercel](https://vercel.com/new).
3. Add the `ANTHROPIC_API_KEY` environment variable in the Vercel project
   settings.
4. Deploy.

## Project structure

```
src/
  app/
    page.tsx              — the whole homepage/UI, client-side state machine
    layout.tsx             — fonts + metadata
    globals.css            — base styles
    api/judge/route.ts     — the one server endpoint; calls Anthropic, returns JSON
  components/
    Masthead.tsx            — nameplate header
    CaseForm.tsx             — textarea + example chips + submit
    CourtSession.tsx         — "COURT IS NOW IN SESSION" loading state
    VerdictCard.tsx           — verdict display + share/copy
    RecentDocket.tsx           — localStorage case list
    TokenStrip.tsx              — $JUDGE footer (branding only, no token logic)
  lib/
    types.ts                    — Case / Verdict types
    storage.ts                   — localStorage read/write (max 10 cases)
```

## What was deliberately left out

Per the brief, this MVP does **not** include: blockchain APIs, wallet
analytics, a database, user accounts, uploads, wallet connection, an appeals
system, or complex auth. All of that can be layered on later — this ships the
core loop first: **write case → summon judge → AI call → verdict → share.**

## Safety behavior

The judge won't render a factual verdict on unproven accusations against a
named real person (e.g. "did X steal money") — it returns an
`INSUFFICIENT EVIDENCE`-style verdict instead. For subjective and
internet-culture disputes, it's free to be playful and opinionated — that's
the product.
