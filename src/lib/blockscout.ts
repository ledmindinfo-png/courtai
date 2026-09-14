const BASES = [
  "https://robinhoodchain.blockscout.com/api/v2",
  "https://www.robinhoodchain.blockscout.com/api/v2",
];
const RPC = process.env.ROBINHOOD_RPC || "https://rpc.mainnet.chain.robinhood.com";
const UA =
  "Mozilla/5.0 (compatible; AICourt/1.0; +https://blockscout.com)";

export const KNOWN_SYSTEM = new Set(
  [
    "0x0000000000000000000000000000000000000000",
    "0x000000000000000000000000000000000000dead",
    "0xffffffffffffffffffffffffffffffffffffffff",
    "0x8366a39cc670b4001a1121b8f6a443a643e40951", // Uniswap v4 PoolManager
    "0x8876789976decbfcbbbe364623c63652db8c0904", // Universal Router
  ].map((a) => a.toLowerCase())
);

export function isAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

export function shorten(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

async function getJson<T>(path: string): Promise<{ data: T | null; error?: string }> {
  let last = "network";
  for (const base of BASES) {
    try {
      const res = await fetch(`${base}${path}`, {
        headers: {
          Accept: "application/json",
          "User-Agent": UA,
        },
        cache: "no-store",
      });
      const text = await res.text();
      if (res.status === 404) return { data: null, error: "not_found" };
      if (text.trim().startsWith("<") || text.includes("Just a moment")) {
        last = "blocked";
        continue;
      }
      if (!res.ok) {
        last = `http_${res.status}`;
        continue;
      }
      try {
        return { data: JSON.parse(text) as T };
      } catch {
        last = "bad_json";
      }
    } catch {
      last = "network";
    }
  }
  return { data: null, error: last };
}

function decodeAbiString(hex: string): string | null {
  try {
    const h = hex.replace(/^0x/, "");
    if (h.length < 128) return null;
    const len = parseInt(h.slice(64, 128), 16);
    const data = h.slice(128, 128 + len * 2);
    const bytes = data.match(/../g) || [];
    return bytes.map((b) => String.fromCharCode(parseInt(b, 16))).join("").replace(/\u0000/g, "");
  } catch {
    return null;
  }
}

async function rpcCall(to: string, data: string): Promise<string | null> {
  try {
    const res = await fetch(RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [{ to, data }, "latest"],
      }),
      cache: "no-store",
    });
    const json = await res.json();
    return typeof json?.result === "string" ? json.result : null;
  } catch {
    return null;
  }
}

async function tokenFromRpc(address: string) {
  const [nameHex, symbolHex, decHex, supplyHex] = await Promise.all([
    rpcCall(address, "0x06fdde03"),
    rpcCall(address, "0x95d89b41"),
    rpcCall(address, "0x313ce567"),
    rpcCall(address, "0x18160ddd"),
  ]);
  if (!supplyHex && !decHex && !nameHex) return null;
  const decimals = decHex && decHex !== "0x" ? parseInt(decHex, 16) : null;
  let supply: string | null = null;
  if (supplyHex && supplyHex !== "0x") {
    try {
      supply = BigInt(supplyHex).toString();
    } catch {
      supply = null;
    }
  }
  return {
    name: nameHex ? decodeAbiString(nameHex) : null,
    symbol: symbolHex ? decodeAbiString(symbolHex) : null,
    decimals,
    total_supply: supply,
  };
}

function formatUnits(raw: string | number | undefined, decimals: number | null): string {
  if (raw === undefined || raw === null) return "DATA UNAVAILABLE";
  try {
    const s = String(raw);
    const d = decimals ?? 0;
    if (!/^\d+$/.test(s)) return s;
    if (d === 0) return s;
    const pad = s.padStart(d + 1, "0");
    const whole = pad.slice(0, -d);
    const frac = pad.slice(-d).replace(/0+$/, "");
    return frac ? `${Number(whole).toLocaleString("en-US")}.${frac.slice(0, 6)}` : Number(whole).toLocaleString("en-US");
  } catch {
    return String(raw);
  }
}

function toBig(raw: string | number | undefined): bigint | null {
  try {
    if (raw === undefined || raw === null) return null;
    const s = String(raw).split(".")[0];
    if (!/^\d+$/.test(s)) return null;
    return BigInt(s);
  } catch {
    return null;
  }
}

function pct(part: bigint | null, total: bigint | null): number | null {
  if (part === null || total === null || total === BigInt(0)) return null;
  return Number((part * BigInt(10000)) / total) / 100;
}

type TokenApi = {
  address_hash?: string;
  address?: string;
  name?: string;
  symbol?: string;
  decimals?: string;
  total_supply?: string;
  holders_count?: string | number;
  holders?: string | number;
  transfers_count?: string | number;
};

type HolderApi = {
  items?: Array<{
    address?: {
      hash?: string;
      is_contract?: boolean;
      name?: string | null;
      implementations?: Array<{ name?: string }>;
    };
    value?: string;
  }>;
};

type TransferApi = {
  items?: Array<{
    tx_hash?: string;
    timestamp?: string;
    from?: { hash?: string };
    to?: { hash?: string };
    total?: { value?: string };
    method?: string;
  }>;
};

type ContractApi = {
  is_verified?: boolean;
  creator_address_hash?: string;
  creation_transaction_hash?: string;
};

export async function getTokenInfo(address: string) {
  return getJson<TokenApi>(`/tokens/${address}`);
}

export async function getTokenHolders(address: string) {
  return getJson<HolderApi>(`/tokens/${address}/holders`);
}

export async function getTokenTransfers(address: string) {
  return getJson<TransferApi>(`/tokens/${address}/transfers`);
}

export async function getContractInfo(address: string) {
  return getJson<ContractApi>(`/smart-contracts/${address}`);
}

export function classifyLabel(addr: string, name?: string | null, isContract?: boolean): string | undefined {
  const lower = addr.toLowerCase();
  if (KNOWN_SYSTEM.has(lower) || /dead|burn/i.test(name || "")) return "BURN / SYSTEM";
  if (/pool|router|uniswap|liquidity|amm|pair/i.test(name || "")) return "LIQUIDITY / PROTOCOL";
  if (isContract) return "CONTRACT";
  return undefined;
}

export async function investigateToken(address: string) {
  const unavailable: string[] = [];
  const [tokenRes, holdersRes, transfersRes, contractRes] = await Promise.all([
    getTokenInfo(address),
    getTokenHolders(address),
    getTokenTransfers(address),
    getContractInfo(address),
  ]);

  let tokenData = tokenRes.data;
  if (!tokenData || tokenRes.error) {
    const rpcTok = await tokenFromRpc(address);
    if (rpcTok && (rpcTok.symbol || rpcTok.total_supply)) {
      tokenData = rpcTok;
      unavailable.push("blockscout token index (used RPC fallback)");
    }
  }
  if (!tokenData) {
    if (tokenRes.error === "not_found") throw new Error("INVALID_OR_UNKNOWN_TOKEN");
    if (tokenRes.error === "blocked" || tokenRes.error?.startsWith("http_")) {
      throw new Error("BLOCKSCOUT_BLOCKED");
    }
    throw new Error("BLOCKSCOUT_UNAVAILABLE");
  }
  if (tokenRes.error && tokenRes.error !== "not_found") unavailable.push("token metadata");
  if (holdersRes.error) unavailable.push("holders");
  if (transfersRes.error) unavailable.push("transfers");
  if (contractRes.error) unavailable.push("contract creator");

  const t = tokenData;
  const decimals = t.decimals != null ? Number(t.decimals) : null;
  const totalSupplyRaw = toBig(t.total_supply);
  const holdersCount = t.holders_count ?? t.holders;
  const transfersCount = t.transfers_count;

  const holders = (holdersRes.data?.items || []).map((h) => {
    const addr = h.address?.hash || "";
    const bal = toBig(h.value);
    const percent = pct(bal, totalSupplyRaw);
    const isContract = Boolean(h.address?.is_contract);
    const name = h.address?.name || h.address?.implementations?.[0]?.name || null;
    return {
      address: addr,
      balance: formatUnits(h.value, decimals),
      percent: percent ?? 0,
      isContract,
      label: classifyLabel(addr, name, isContract),
    };
  });

  const transfers = (transfersRes.data?.items || []).slice(0, 25).map((tx) => ({
    hash: tx.tx_hash || "",
    from: tx.from?.hash || "",
    to: tx.to?.hash || "",
    amount: formatUnits(tx.total?.value, decimals),
    timestamp: tx.timestamp,
  }));

  const deployer = contractRes.data?.creator_address_hash || null;
  const creationTx = contractRes.data?.creation_transaction_hash || null;
  const verified = contractRes.data?.is_verified ?? null;

  const deployerTransfers = deployer
    ? transfers.filter(
        (tx) => tx.from.toLowerCase() === deployer.toLowerCase()
      )
    : [];

  const circulatingHolders = holders.filter((h) => h.label !== "BURN / SYSTEM");

  const sumPct = (n: number) => {
    if (!circulatingHolders.length) return null;
    return Number(
      circulatingHolders
        .slice(0, n)
        .reduce((acc, h) => acc + (h.percent || 0), 0)
        .toFixed(2)
    );
  };

  const metrics = {
    top5Pct: sumPct(5),
    top10Pct: sumPct(10),
    top20Pct: sumPct(20),
    largestPct: circulatingHolders[0]?.percent ?? null,
    whaleCount: circulatingHolders.filter((h) => (h.percent || 0) >= 1 && h.label !== "LIQUIDITY / PROTOCOL").length,
    deployerRecipientCount: new Set(deployerTransfers.map((t) => t.to.toLowerCase())).size,
    deployerTransferCount: deployerTransfers.length,
  };

  return {
    token: {
      address,
      name: t.name || null,
      symbol: t.symbol || null,
      decimals,
      totalSupply: t.total_supply ? formatUnits(t.total_supply, decimals) : null,
      holdersCount: holdersCount != null ? Number(holdersCount) : null,
      transfersCount: transfersCount != null ? Number(transfersCount) : null,
      deployer,
      creationTx,
      verified,
    },
    holders,
    transfers,
    metrics,
    deployerTransfers,
    unavailable,
  };
}

export function scoreRisk(bundle: Awaited<ReturnType<typeof investigateToken>>): {
  label: string;
  score: number;
} {
  const m = bundle.metrics;
  if (m.top10Pct == null && !bundle.holders.length) {
    return { label: "INSUFFICIENT DATA", score: 20 };
  }
  let score = 20;
  if ((m.largestPct || 0) >= 20) score += 25;
  else if ((m.largestPct || 0) >= 10) score += 15;
  else if ((m.largestPct || 0) >= 5) score += 8;

  if ((m.top10Pct || 0) >= 60) score += 25;
  else if ((m.top10Pct || 0) >= 40) score += 16;
  else if ((m.top10Pct || 0) >= 25) score += 8;

  if ((m.whaleCount || 0) <= 2 && (m.top10Pct || 0) > 30) score += 10;
  if ((m.deployerTransferCount || 0) >= 3) score += 8;

  const connected = detectDirectHolderTransfers(bundle);
  if (connected >= 2) score += 10;

  score = Math.max(5, Math.min(95, score));
  let label = "LOW RISK SIGNALS";
  if (score >= 75) label = "HIGH RISK";
  else if (score >= 55) label = "ELEVATED RISK";
  else if (score >= 35) label = "MODERATE RISK";
  return { label, score };
}

export function detectDirectHolderTransfers(bundle: Awaited<ReturnType<typeof investigateToken>>): number {
  const top = new Set(
    bundle.holders
      .filter((h) => h.label !== "LIQUIDITY / PROTOCOL" && h.label !== "BURN / SYSTEM")
      .slice(0, 10)
      .map((h) => h.address.toLowerCase())
  );
  let n = 0;
  for (const tx of bundle.transfers) {
    if (top.has(tx.from.toLowerCase()) && top.has(tx.to.toLowerCase()) && tx.from.toLowerCase() !== tx.to.toLowerCase()) {
      n += 1;
    }
  }
  return n;
}

export function serializeBundle(bundle: Awaited<ReturnType<typeof investigateToken>>): string {
  const t = bundle.token;
  const lines: string[] = [];
  lines.push("TOKEN");
  lines.push(`Name: ${t.name ?? "DATA UNAVAILABLE"}`);
  lines.push(`Symbol: ${t.symbol ?? "DATA UNAVAILABLE"}`);
  lines.push(`Address: ${t.address}`);
  lines.push(`Decimals: ${t.decimals ?? "DATA UNAVAILABLE"}`);
  lines.push(`Supply: ${t.totalSupply ?? "DATA UNAVAILABLE"}`);
  lines.push(`Holders: ${t.holdersCount ?? "DATA UNAVAILABLE"}`);
  lines.push(`Transfers counted: ${t.transfersCount ?? "DATA UNAVAILABLE"}`);
  lines.push(`Verified: ${t.verified === null ? "DATA UNAVAILABLE" : t.verified}`);
  lines.push(`Deployer: ${t.deployer ?? "DATA UNAVAILABLE"}`);
  lines.push(`Creation tx: ${t.creationTx ?? "DATA UNAVAILABLE"}`);
  lines.push("");
  lines.push("TOP HOLDERS");
  if (!bundle.holders.length) lines.push("DATA UNAVAILABLE");
  bundle.holders.slice(0, 20).forEach((h, i) => {
    lines.push(
      `${i + 1}. ${h.address}  ${h.percent.toFixed(2)}%  bal=${h.balance}  ${h.isContract ? "contract" : "eoa"} ${h.label || ""}`
    );
  });
  lines.push("");
  lines.push("CONCENTRATION");
  lines.push(`Top 5: ${bundle.metrics.top5Pct ?? "DATA UNAVAILABLE"}%`);
  lines.push(`Top 10: ${bundle.metrics.top10Pct ?? "DATA UNAVAILABLE"}%`);
  lines.push(`Top 20: ${bundle.metrics.top20Pct ?? "DATA UNAVAILABLE"}%`);
  lines.push(`Largest: ${bundle.metrics.largestPct ?? "DATA UNAVAILABLE"}%`);
  lines.push(`Meaningful whales (>=1%, excluding LP/burn): ${bundle.metrics.whaleCount ?? "DATA UNAVAILABLE"}`);
  lines.push("");
  lines.push("DEPLOYER TOKEN TRANSFERS (from retrieved window)");
  if (!bundle.token.deployer) lines.push("DATA UNAVAILABLE");
  else if (!bundle.deployerTransfers.length) lines.push("None in retrieved transfer window.");
  bundle.deployerTransfers.forEach((tx) => {
    lines.push(`${tx.hash} ${tx.from} -> ${tx.to} amount=${tx.amount} at ${tx.timestamp || "?"}`);
  });
  lines.push("");
  lines.push("RECENT / LARGE TRANSFERS (retrieved window)");
  if (!bundle.transfers.length) lines.push("DATA UNAVAILABLE");
  bundle.transfers.slice(0, 15).forEach((tx) => {
    lines.push(`${tx.hash} ${tx.from} -> ${tx.to} amount=${tx.amount} at ${tx.timestamp || "?"}`);
  });
  if (bundle.unavailable.length) {
    lines.push("");
    lines.push("UNAVAILABLE FIELDS: " + bundle.unavailable.join(", "));
  }
  return lines.join("\n");
}
