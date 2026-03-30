"use client";

import type { ChatAnswer, ChatTranscript } from "@contracts";
import {
  Bot,
  ChartColumnIncreasing,
  CircleDollarSign,
  CreditCard,
  SendHorizontal,
  ShieldAlert,
  Sparkles,
  WalletCards
} from "lucide-react";
import { useEffect, useId, useMemo, useState, useTransition } from "react";

import { createChatSession, getLatestChatSession, sendChatMessage } from "@/lib/api";
import { formatCurrency, formatDateTime, formatNumber, titleCase } from "@/lib/format";
import { cn } from "@/lib/utils";

import { ExpandableNote } from "./expandable-note";
import { StatusPill } from "./status-pill";

const DEFAULT_PROMPTS = [
  "Where am I overspending right now?",
  "Which card should I pay first?",
  "Why did my score drop?",
  "Which subscriptions should I cancel first?"
];

const QUICK_ACTIONS = [
  {
    label: "Spending review",
    prompt: "Where am I overspending right now?",
    icon: ChartColumnIncreasing
  },
  {
    label: "Debt priority",
    prompt: "Which card should I pay first and why?",
    icon: CreditCard
  },
  {
    label: "Score changes",
    prompt: "Why did my score change and what should I do next?",
    icon: ShieldAlert
  },
  {
    label: "Safe to spend",
    prompt: "How much money can I use this week without creating a problem?",
    icon: CircleDollarSign
  }
] as const;

const SOURCE_FIELD_ORDER = [
  "title",
  "strategy",
  "summary",
  "impact_estimate",
  "projected_payoff_months",
  "projected_interest_cost",
  "why_choose_it"
];

const CAPABILITY_LIST = [
  "Explain your top priority in plain English",
  "Separate facts from estimates",
  "Point to debt, spending, score, and subscription drivers",
  "Resume the latest saved thread for the selected profile"
];

function sourceTitle(card: Record<string, unknown>, index: number) {
  if (typeof card.title === "string") return card.title;
  if (typeof card.strategy === "string") return `${titleCase(card.strategy)} strategy`;
  if (typeof card.category === "string") return titleCase(card.category);
  return `Source card ${index + 1}`;
}

function formatSourceValue(key: string, value: unknown) {
  if (typeof value === "number") {
    if (key.includes("cost") || key.includes("payment") || key.includes("amount")) {
      return formatCurrency(value);
    }
    if (key.includes("month")) {
      return `${formatNumber(value)} months`;
    }
    return formatNumber(value);
  }

  if (typeof value === "string") {
    if (key === "strategy" || key === "category") {
      return titleCase(value);
    }
    return value;
  }

  return null;
}

function sourceRows(card: Record<string, unknown>) {
  const preferred = SOURCE_FIELD_ORDER.flatMap((key) => {
    const formatted = formatSourceValue(key, card[key]);
    return formatted ? [{ label: titleCase(key), value: formatted }] : [];
  });

  if (preferred.length > 0) {
    return preferred.slice(0, 5);
  }

  return Object.entries(card)
    .flatMap(([key, value]) => {
      const formatted = formatSourceValue(key, value);
      return formatted ? [{ label: titleCase(key), value: formatted }] : [];
    })
    .slice(0, 5);
}

export function ChatPanel({
  personaId,
  initialTranscript,
  context
}: {
  personaId: string;
  initialTranscript: ChatTranscript | null;
  context: {
    healthScore: number;
    safeToSpendThisWeek: number;
    topAction: string;
  };
}) {
  const [sessionId, setSessionId] = useState<string | null>(initialTranscript?.session.id ?? null);
  const [transcript, setTranscript] = useState<ChatTranscript | null>(initialTranscript);
  const [message, setMessage] = useState("");
  const [answer, setAnswer] = useState<ChatAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const textareaId = useId();
  const helperId = useId();

  useEffect(() => {
    setSessionId(initialTranscript?.session.id ?? null);
    setTranscript(initialTranscript);
    setAnswer(null);
    setMessage("");
    setError(null);
  }, [initialTranscript, personaId]);

  const trimmedMessage = message.trim();
  const messages = transcript?.messages ?? [];
  const suggestedPrompts = answer?.suggested_prompts ?? DEFAULT_PROMPTS;
  const latestAssistantMessage = useMemo(
    () => [...messages].reverse().find((entry) => entry.role === "assistant") ?? null,
    [messages]
  );

  function submitMessage(nextMessage: string) {
    const outgoing = nextMessage.trim();
    if (!outgoing) return;

    startTransition(() => {
      void (async () => {
        try {
          const activeSession = sessionId ? { id: sessionId } : await createChatSession(personaId);
          const nextAnswer = await sendChatMessage(personaId, activeSession.id, outgoing);
          const nextTranscript = await getLatestChatSession(personaId);

          setSessionId(activeSession.id);
          setTranscript(nextTranscript);
          setAnswer(nextAnswer);
          setMessage("");
          setError(null);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Unable to get a response.");
        }
      })();
    });
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="rounded-[28px] border border-[rgba(18,32,43,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(247,239,226,0.92))] p-4 shadow-[var(--pa-shadow-md)] md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[rgba(15,23,32,0.08)] pb-4">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-[linear-gradient(135deg,rgba(31,116,104,0.18),rgba(18,32,43,0.1))] p-3 text-[var(--pa-primary)]">
              <Bot aria-hidden="true" className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--pa-text-soft)]">Grounded assistant</p>
              <h2 className="mt-2 font-display text-[1.5rem] text-[var(--pa-text)]">AI Accountant</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--pa-text-muted)]">
                Ask in plain English about spending, debt, score changes, or what to do next.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusPill tone="safe">Grounded to profile</StatusPill>
            {sessionId ? <StatusPill>{messages.length} messages</StatusPill> : <StatusPill>New thread</StatusPill>}
          </div>
        </div>

        <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[var(--pa-border)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--pa-text)] transition-[background-color,border-color,color,transform] duration-150 hover:-translate-y-0.5 hover:border-[rgba(15,23,32,0.18)] hover:bg-[var(--pa-primary-soft)]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pa-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              disabled={isPending}
              type="button"
              onClick={() => submitMessage(action.prompt)}
            >
              <action.icon aria-hidden="true" className="h-4 w-4 text-[var(--pa-primary)]" />
              {action.label}
            </button>
          ))}
        </div>

        <div className="mt-5 rounded-[24px] border border-[var(--pa-border)] bg-[rgba(255,255,255,0.76)]">
          <div className="max-h-[680px] min-h-[520px] overflow-y-auto px-4 py-5 md:px-5">
            {messages.length > 0 ? (
              <div className="space-y-4">
                {messages.map((entry) => {
                  const isAssistant = entry.role === "assistant";
                  return (
                    <article
                      key={entry.id}
                      className={cn("flex", isAssistant ? "justify-start" : "justify-end")}
                    >
                      <div
                        className={cn(
                          "max-w-[90%] rounded-[24px] px-4 py-4 shadow-[var(--pa-shadow-sm)] md:max-w-[82%]",
                          isAssistant
                            ? "border border-[rgba(31,116,104,0.16)] bg-[linear-gradient(180deg,rgba(223,241,235,0.84),rgba(255,255,255,0.98))]"
                            : "border border-[rgba(18,32,43,0.12)] bg-[linear-gradient(180deg,rgba(19,36,47,0.98),rgba(18,32,43,0.92))] text-white"
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className={cn("text-[11px] uppercase tracking-[0.18em]", isAssistant ? "text-[var(--pa-text-soft)]" : "text-white/55")}>
                            {isAssistant ? "Assistant" : "You"}
                          </p>
                          <p className={cn("text-xs", isAssistant ? "text-[var(--pa-text-soft)]" : "text-white/55")}>{formatDateTime(entry.created_at)}</p>
                        </div>
                        <p className={cn("mt-3 text-sm leading-7", isAssistant ? "text-[var(--pa-text)]" : "text-white/86")}>{entry.content}</p>
                        {isAssistant && entry.cited_metrics.length > 0 ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {entry.cited_metrics.map((metric) => (
                              <StatusPill key={metric}>{metric}</StatusPill>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-[440px] flex-col items-center justify-center text-center">
                <div className="rounded-full bg-[var(--pa-primary-soft)]/55 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--pa-primary)]">
                  Start a grounded conversation
                </div>
                <h3 className="mt-5 max-w-xl text-balance font-display text-[2rem] leading-tight text-[var(--pa-text)]">
                  Ask one money question and get a structured answer back.
                </h3>
                <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--pa-text-muted)]">
                  Try a starter prompt below or type your own question about spending, debt, score pressure, or next steps.
                </p>
                <div className="mt-6 grid w-full max-w-3xl gap-3 md:grid-cols-2">
                  {DEFAULT_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      className="rounded-[22px] border border-[var(--pa-border)] bg-white px-4 py-4 text-left text-sm leading-6 text-[var(--pa-text)] transition-[background-color,border-color,color,transform] duration-150 hover:-translate-y-0.5 hover:border-[rgba(15,23,32,0.18)] hover:bg-[var(--pa-primary-soft)]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pa-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                      disabled={isPending}
                      type="button"
                      onClick={() => submitMessage(prompt)}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-[rgba(15,23,32,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(247,239,226,0.88))] px-4 py-4 md:px-5">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                submitMessage(trimmedMessage);
              }}
            >
              <label className="sr-only" htmlFor={textareaId}>
                Ask a grounded question
              </label>
              <div className="rounded-[24px] border border-[var(--pa-border)] bg-white p-3 shadow-[var(--pa-shadow-sm)]">
                <textarea
                  id={textareaId}
                  name="message"
                  aria-describedby={helperId}
                  className="min-h-24 w-full resize-none bg-transparent px-2 py-1 text-sm text-[var(--pa-text)] focus-visible:outline-none"
                  placeholder="Ask about next steps, spending pressure, debt payoff, or score changes…"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p id={helperId} className="text-sm text-[var(--pa-text-muted)]">
                    Responses separate facts, estimates, assumptions, and source cards.
                  </p>
                  <button
                    className="inline-flex items-center gap-2 rounded-full bg-[var(--pa-surface-ink)] px-5 py-3 text-sm font-semibold text-white transition-[background-color,transform] duration-150 hover:-translate-y-0.5 hover:bg-[#18212a] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pa-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                    disabled={!trimmedMessage || isPending}
                    type="submit"
                  >
                    <SendHorizontal aria-hidden="true" className="h-4 w-4" />
                    {isPending ? "Thinking…" : "Send"}
                  </button>
                </div>
              </div>
              <p className="sr-only" aria-live="polite">
                {isPending ? "Sending question…" : error ?? ""}
              </p>
              {error ? <p className="mt-3 text-sm text-[var(--pa-danger)]">{error}</p> : null}
            </form>
          </div>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="rounded-[24px] border border-[var(--pa-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(247,239,226,0.92))] p-5 shadow-[var(--pa-shadow-sm)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--pa-text-soft)]">Current profile snapshot</p>
              <h3 className="mt-2 font-display text-[1.15rem] text-[var(--pa-text)]">What the assistant sees first</h3>
            </div>
            <Sparkles aria-hidden="true" className="h-5 w-5 text-[var(--pa-primary)]" />
          </div>
          <div className="mt-4 space-y-3">
            <Snapshot label="Money health" value={`${formatNumber(context.healthScore)}/100`} />
            <Snapshot label="Money left this week" value={formatCurrency(context.safeToSpendThisWeek)} />
            <Snapshot label="Current top focus" value={context.topAction} />
          </div>
        </div>

        <div className="rounded-[24px] border border-[var(--pa-border)] bg-[var(--pa-surface)] p-5 shadow-[var(--pa-shadow-sm)]">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--pa-text-soft)]">What you can ask</p>
          <div className="mt-4 space-y-3">
            {CAPABILITY_LIST.map((item) => (
              <div key={item} className="rounded-[18px] border border-[var(--pa-border)] bg-white/84 px-4 py-3 text-sm leading-6 text-[var(--pa-text-muted)]">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[24px] border border-[var(--pa-border)] bg-[var(--pa-surface)] p-5 shadow-[var(--pa-shadow-sm)]">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--pa-text-soft)]">Suggested next asks</p>
            <StatusPill>{suggestedPrompts.length}</StatusPill>
          </div>
          <div className="mt-4 space-y-2">
            {suggestedPrompts.map((prompt) => (
              <button
                key={prompt}
                className="w-full rounded-2xl border border-[var(--pa-border)] bg-white px-4 py-3 text-left text-sm text-[var(--pa-text-muted)] transition-[background-color,border-color,color] duration-150 hover:border-[rgba(15,23,32,0.2)] hover:bg-[var(--pa-primary-soft)]/30 hover:text-[var(--pa-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pa-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pa-surface)]"
                disabled={isPending}
                type="button"
                onClick={() => submitMessage(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {answer ? (
          <div className="rounded-[24px] border border-[var(--pa-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(247,239,226,0.92))] p-5 shadow-[var(--pa-shadow-sm)]">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--pa-text-soft)]">Latest answer details</p>
            {latestAssistantMessage ? (
              <p className="mt-3 text-sm leading-7 text-[var(--pa-text-muted)]">{latestAssistantMessage.content}</p>
            ) : null}

            <div className="mt-4 grid gap-4">
              <InspectorBlock items={answer.facts} title="Facts" />
              <InspectorBlock items={answer.estimates} title="Estimates" />
            </div>

            {answer.assumptions.length > 0 ? (
              <ExpandableNote
                className="mt-4"
                detail={
                  <ul className="space-y-2">
                    {answer.assumptions.map((assumption) => (
                      <li key={assumption}>{assumption}</li>
                    ))}
                  </ul>
                }
                label="Assumptions"
                summary="Review the assumptions behind this answer."
              />
            ) : null}

            {answer.source_cards.length > 0 ? (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--pa-text-soft)]">Source cards</p>
                  <StatusPill>{answer.source_cards.length} used</StatusPill>
                </div>
                <div className="space-y-3">
                  {answer.source_cards.map((card, index) => {
                    const rows = sourceRows(card);
                    return (
                      <article key={`${sourceTitle(card, index)}-${index}`} className="rounded-[20px] border border-[var(--pa-border)] bg-white px-4 py-4">
                        <p className="font-semibold text-[var(--pa-text)]">{sourceTitle(card, index)}</p>
                        <div className="mt-3 space-y-2 text-sm text-[var(--pa-text-muted)]">
                          {rows.length > 0 ? (
                            rows.map((row) => (
                              <div key={`${row.label}-${row.value}`} className="flex items-start justify-between gap-4">
                                <span className="text-[var(--pa-text-soft)]">{row.label}</span>
                                <span className="text-right font-medium text-[var(--pa-text)]">{row.value}</span>
                              </div>
                            ))
                          ) : (
                            <p>No source fields are available for structured rendering.</p>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </aside>
    </section>
  );
}

function Snapshot({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[18px] border border-[var(--pa-border)] bg-white/84 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-[var(--pa-text)]">{value}</p>
    </div>
  );
}

function InspectorBlock({
  title,
  items
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-[20px] border border-[var(--pa-border)] bg-white px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--pa-text-soft)]">{title}</p>
      <ul className="mt-3 space-y-2 text-sm text-[var(--pa-text-muted)]">
        {items.length > 0 ? items.map((item) => <li key={item}>{item}</li>) : <li>No {title.toLowerCase()} were added for this answer.</li>}
      </ul>
    </div>
  );
}
