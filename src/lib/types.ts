export interface VerdictFinding {
  title: string;
  body: string;
}

export interface HolderRow {
  address: string;
  balance: string;
  percent: number;
  isContract: boolean;
  label?: string;
}

export interface TransferRow {
  hash: string;
  from: string;
  to: string;
  amount: string;
  timestamp?: string;
}

export interface InvestigationMetrics {
  top5Pct: number | null;
  top10Pct: number | null;
  top20Pct: number | null;
  largestPct: number | null;
  whaleCount: number | null;
  deployerRecipientCount: number | null;
  deployerTransferCount: number | null;
}

export interface TokenSnapshot {
  address: string;
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  totalSupply: string | null;
  holdersCount: number | null;
  transfersCount: number | null;
  deployer: string | null;
  creationTx: string | null;
  verified: boolean | null;
}

export interface Verdict {
  verdict: string;
  confidence: number;
  reasoning: string;
  judge_quote: string;
  findings?: VerdictFinding[];
  cannotProve?: string;
  focus?: string;
}

export interface Case {
  id: string;
  caseNumber: number;
  question: string;
  contract: string;
  snapshot?: TokenSnapshot;
  metrics?: InvestigationMetrics;
  verdict: Verdict;
  createdAt: number;
}
