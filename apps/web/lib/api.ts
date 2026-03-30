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

const API_BASE =
  deriveBranchPreviewApiBase() ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://127.0.0.1:8000/api/v1";

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    throw new Error(`API request failed for ${path}`);
  }

  return response.json() as Promise<T>;
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
  return fetchJson<CreditSummaryResponse>(`/credit-summaries?persona_id=${personaId}`);
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
