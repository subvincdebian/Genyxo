export type Verdict = "supported" | "disputed" | "false" | "unverified";

/** What a check compares the answer with. */
export type CheckScope = "web" | "documents" | "both";

export interface ClaimSource {
  title: string;
  /** Empty for a document. */
  url: string;
  kind?: "web" | "document";
  /** The words in the document that settle the claim. */
  excerpt?: string;
}

export interface CheckedClaim {
  id: string;
  /** Exact words from the answer, used to underline it. */
  quote: string;
  claim: string;
  verdict: Verdict;
  confidence: number;
  explanation: string;
  correction?: string;
  sources: ClaimSource[];
}

export interface FactCheckResult {
  verifier: string;
  verifierLabel: string;
  answerModel: string;
  checkedAt: string;
  claims: CheckedClaim[];
  counts: Record<Verdict, number>;
  scope: CheckScope;
  /** Files the answer was compared with. */
  documents: string[];
  /** 0–100: share of supported claims, unverified counting half. */
  score: number;
  summary: string;
}
