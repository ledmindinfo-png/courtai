const RPCS = [
  process.env.SOLANA_RPC,
  "https://api.mainnet-beta.solana.com",
  "https://solana-rpc.publicnode.com",
].filter(Boolean) as string[];

export function isSolanaAddress(value: string): boolean {
  const v = value.trim();
  if (!v || v.startsWith("0x") || v.startsWith("0X")) return false;
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v);
}

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  let last = "SOLANA_RPC_ERROR";
  for (const url of RPCS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        cache: "no-store",
      });
      const json = await res.json();
      if (json.error) {
        last = json.error.message || last;
        continue;
      }
      return json.result as T;
    } catch (e) {
      last = e instanceof Error ? e.message : last;
    }
  }
  throw new Error(last);
}

type DexPair = {
  dexId?: string;
  url?: string;
  priceUsd?: string;
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
  baseToken?: { name?: string; symbol?: string };
  quoteToken?: { symbol?: string };
  liquidity?: { usd?: number };
  volume?: { h24?: number };
  priceChange?: { h24?: number };
};

async function dexInfo(mint: string): Promise<DexPair | null> {
  try {
    const res = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${mint}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    const pairs: DexPair[] = Array.isArray(data) ? data : data?.pairs || [];
    if (!pairs.length) return null;
    return pairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
  } catch {
    return null;
  }
}

export async function investigateSolanaToken(mint: string) {
  const unavailable: string[] = [];
  let name: string | null = null;
  let symbol: string | null = null;
  let decimals: number | null = null;
  let supplyUi = 0;

  try {
    const acc = await rpc<{
      value?: {
        data?: {
          parsed?: {
            info?: {
              decimals?: number;
              supply?: string;
              extensions?: Array<{ extension?: string; state?: { name?: string; symbol?: string } }>;
            };
          };
        };
      };
    }>("getAccountInfo", [mint, { encoding: "jsonParsed" }]);
    const info = acc?.value?.data?.parsed?.info;
    if (!info) throw new Error("no mint");
    decimals = info.decimals ?? null;
    if (info.supply && decimals != null) supplyUi = Number(info.supply) / 10 ** decimals;
    const meta = info.extensions?.find((e) => e.extension === "tokenMetadata")?.state;
    if (meta?.name) name = meta.name;
    if (meta?.symbol) symbol = meta.symbol;
  } catch {
    try {
      const supply = await rpc<{ value: { amount: string; decimals: number; uiAmount: number | null } }>(
        "getTokenSupply",
        [mint]
      );
      decimals = supply.value.decimals;
      supplyUi = supply.value.uiAmount ?? Number(supply.value.amount) / 10 ** supply.value.decimals;
    } catch {
      throw new Error("INVALID_OR_UNKNOWN_TOKEN");
    }
  }

  const pair = await dexInfo(mint);
  if (!pair) unavailable.push("market pair");
  if (pair?.baseToken?.name) name = pair.baseToken.name;
  if (pair?.baseToken?.symbol) symbol = pair.baseToken.symbol;

  const pairLine = pair
    ? `${pair.baseToken?.symbol || symbol || "TOKEN"}/${pair.quoteToken?.symbol || "?"} on ${pair.dexId || "dex"}`
    : "DATA UNAVAILABLE";

  return {
    token: {
      address: mint,
      name: name || "Solana token",
      symbol,
      decimals,
      totalSupply: supplyUi ? supplyUi.toLocaleString("en-US") : null,
      holdersCount: 0,
      transfersCount: 0,
      deployer: null,
      creationTx: pair?.pairCreatedAt ? new Date(pair.pairCreatedAt).toISOString() : null,
      verified: false,
    },
    holders: [],
    transfers: [],
    metrics: {
      top5Pct: 0,
      top10Pct: 0,
      top20Pct: 0,
      largestPct: 0,
      whaleCount: 0,
      deployerRecipientCount: 0,
      deployerTransferCount: 0,
    },
    deployerTransfers: [],
    unavailable: [...unavailable, "holder list", "deployer"],
    market: {
      launchpad: "Solana ecosystem",
      network: "Solana",
      pair: pairLine,
      priceUsd: pair?.priceUsd || null,
      marketCap: pair?.marketCap ?? pair?.fdv ?? null,
      liquidityUsd: pair?.liquidity?.usd ?? null,
      volume24h: pair?.volume?.h24 ?? null,
      change24h: pair?.priceChange?.h24 ?? null,
      dexUrl: pair?.url || null,
    },
  };
}
