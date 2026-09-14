const RPC = process.env.SOLANA_RPC || "https://api.mainnet-beta.solana.com";

export function isSolanaAddress(value: string): boolean {
  const v = value.trim();
  if (!v || v.startsWith("0x") || v.startsWith("0X")) return false;
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v);
}

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || "SOLANA_RPC_ERROR");
  return json.result as T;
}

function pct(part: number, total: number): number | null {
  if (!total) return null;
  return Number(((part / total) * 100).toFixed(2));
}

export async function investigateSolanaToken(mint: string) {
  const unavailable: string[] = [];
  let supplyUi = 0;
  let decimals: number | null = null;
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

  let largest: Array<{ address: string; uiAmount: number }> = [];
  try {
    const top = await rpc<{ value: Array<{ address: string; uiAmount: number | null; amount: string }> }>(
      "getTokenLargestAccounts",
      [mint]
    );
    largest = (top.value || []).map((x) => ({
      address: x.address,
      uiAmount: x.uiAmount ?? 0,
    }));
  } catch {
    unavailable.push("holders");
  }

  const holders = largest.map((h) => ({
    address: h.address,
    balance: h.uiAmount.toLocaleString("en-US"),
    percent: pct(h.uiAmount, supplyUi) ?? 0,
    isContract: false,
    label: undefined as string | undefined,
  }));

  const sumPct = (n: number) => {
    if (!holders.length) return null;
    return Number(holders.slice(0, n).reduce((a, h) => a + h.percent, 0).toFixed(2));
  };

  return {
    token: {
      address: mint,
      name: "Stonkfun token",
      symbol: null,
      decimals,
      totalSupply: supplyUi ? supplyUi.toLocaleString("en-US") : null,
      holdersCount: 0,
      transfersCount: 0,
      deployer: null,
      creationTx: null,
      verified: null,
    },
    holders,
    transfers: [],
    metrics: {
      top5Pct: sumPct(5),
      top10Pct: sumPct(10),
      top20Pct: sumPct(20),
      largestPct: holders[0]?.percent ?? null,
      whaleCount: holders.filter((h) => h.percent >= 1).length,
      deployerRecipientCount: 0,
      deployerTransferCount: 0,
    },
    deployerTransfers: [],
    unavailable: [
      ...unavailable,
      "deployer",
      "transfers",
      "token name/symbol metadata",
    ],
  };
}
