import type {
  CashFlowResponse,
  ChatAnswer,
  ChatTranscript,
  ChatSession,
  CreditSummaryResponse,
  DashboardResponse,
  DebtStrategyRun,
  FinancialHealthScore,
  InvestmentGuidance,
  MonthlyReview,
  PersonaSummary,
  SafeToSpendSnapshot,
  SimulationHistoryItem,
  SimulationRequest,
  SimulationResult,
  SubscriptionSummary
} from "@contracts";

import type { DashboardResponseCompat } from "@/lib/investment";

function deriveBranchPreviewApiBase() {
  const gitRef = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF;
  const branchUrl = process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL;

  // Preview web deployments should talk to the matching API branch alias, not the shared production API.
  if (!gitRef || gitRef === "main" || !branchUrl?.startsWith("web-git-")) {
    return null;
  }

  return `https://${branchUrl.replace(/^web-git-/, "api-git-")}/api/v1`;
}

function isProtectedBranchPreviewApi(baseUrl: string) {
  return baseUrl.startsWith("https://api-git-");
}

function buildApiHeaders(baseUrl: string, initHeaders?: HeadersInit) {
  const headers = new Headers(initHeaders);

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (typeof window === "undefined" && isProtectedBranchPreviewApi(baseUrl)) {
    const bypassSecret =
      process.env.API_VERCEL_AUTOMATION_BYPASS_SECRET ??
      process.env.API_PROTECTION_BYPASS_SECRET ??
      process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

    if (bypassSecret) {
      headers.set("x-vercel-protection-bypass", bypassSecret);
    }
  }

  return headers;
}

const BRANCH_PREVIEW_API_BASE = deriveBranchPreviewApiBase();
const CONFIGURED_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";
const API_BASE = BRANCH_PREVIEW_API_BASE ?? CONFIGURED_API_BASE;

function normalizeCreditSummaryResponse(payload: CreditSummaryResponse): CreditSummaryResponse {
  return {
    ...payload,
    cards: payload.cards.map((card) => ({
      ...card,
      balance_history: Array.isArray(card.balance_history) ? card.balance_history : [],
      deferred_interest_offers: Array.isArray(card.deferred_interest_offers) ? card.deferred_interest_offers : []
    }))
  };
}

async function fetchJsonFromBase<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    cache: "no-store",
    headers: buildApiHeaders(baseUrl, init?.headers)
  });

  if (!response.ok) {
    const hint =
      response.status === 401 || response.status === 403
        ? " Protected preview API access may require a Vercel automation bypass secret."
        : "";
    throw new Error(`API request failed for ${path} with ${response.status}.${hint}`);
  }

  return response.json() as Promise<T>;
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const targets = [API_BASE];

  // Branch previews can be blocked from talking to a protected API preview if the bypass secret
  // is not wired into the web project yet. Fall back to the shared API so the preview stays reviewable.
  if (BRANCH_PREVIEW_API_BASE && CONFIGURED_API_BASE !== BRANCH_PREVIEW_API_BASE) {
    targets.push(CONFIGURED_API_BASE);
  }

  let lastError: unknown = null;

  for (const baseUrl of targets) {
    try {
      return await fetchJsonFromBase<T>(baseUrl, path, init);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`API request failed for ${path}`);
}

export async function getPersonas() {
  return fetchJson<PersonaSummary[]>("/personas");
}

export async function getDashboard(personaId: string) {
  return fetchJson<DashboardResponseCompat>(`/dashboard?persona_id=${personaId}`);
}

export async function getCashFlow(personaId: string) {
  return fetchJson<CashFlowResponse>(`/cash-flow?persona_id=${personaId}`);
}

export async function getSubscriptions(personaId: string) {
  return fetchJson<SubscriptionSummary[]>(`/subscriptions?persona_id=${personaId}`);
}

export async function getDebtStrategies(personaId: string) {
  return fetchJson<DebtStrategyRun>(`/debt-strategies?persona_id=${personaId}`);
}

export async function getInvestmentGuidance(personaId: string) {
  return fetchJson<InvestmentGuidance>(`/investment-guidance?persona_id=${personaId}`);
}

export async function getFinancialHealth(personaId: string) {
  return fetchJson<FinancialHealthScore>(`/financial-health?persona_id=${personaId}`);
}

export async function getSafeToSpend(personaId: string) {
  return fetchJson<SafeToSpendSnapshot>(`/safe-to-spend?persona_id=${personaId}`);
}

export async function getMonthlyReviews(personaId: string) {
  return fetchJson<MonthlyReview[]>(`/monthly-reviews?persona_id=${personaId}`);
}

export async function getCreditSummary(personaId: string) {
  const payload = await fetchJson<CreditSummaryResponse>(`/credit-summaries?persona_id=${personaId}`);
  return normalizeCreditSummaryResponse(payload);
}

export async function getSanitizationPolicy() {
  return fetchJson<{
    llm_mode: string;
    safe_for_llm: string[];
    masked_for_llm: string[];
    blocked_for_llm: string[];
    notes: string[];
  }>("/privacy/sanitization-policy");
}

export async function createChatSession(personaId: string) {
  return fetchJson<ChatSession>(`/chat/sessions?persona_id=${personaId}`, { method: "POST" });
}

export async function getLatestChatSession(personaId: string) {
  return fetchJson<ChatTranscript | null>(`/chat/sessions/latest?persona_id=${personaId}`);
}

export async function sendChatMessage(personaId: string, sessionId: string, message: string) {
  return fetchJson<ChatAnswer>("/chat/messages", {
    method: "POST",
    body: JSON.stringify({
      persona_id: personaId,
      session_id: sessionId,
      message
    })
  });
}

export async function runSimulation(payload: SimulationRequest) {
  return fetchJson<SimulationResult>("/simulate", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getSimulationHistory(personaId: string, limit = 4) {
  return fetchJson<SimulationHistoryItem[]>(`/simulations?persona_id=${personaId}&limit=${limit}`);
}

export async function getCancellationLink(personaId: string, subscriptionId: string) {
  return fetchJson<{
    subscription_id: string;
    merchant_label: string;
    help_url: string;
    cancellation_url: string;
    support_email: string;
    steps: string[];
    confidence: number;
  }>(`/subscriptions/${subscriptionId}/cancellation-link?persona_id=${personaId}`);
}

export async function getCancellationDraft(personaId: string, subscriptionId: string) {
  return fetchJson<{
    subscription_id: string;
    merchant_label: string;
    subject: string;
    body: string;
    disclaimer: string;
  }>(`/subscriptions/${subscriptionId}/draft-cancellation?persona_id=${personaId}`, { method: "POST" });
}
