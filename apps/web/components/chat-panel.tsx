"use client";

import type { ChatAnswer } from "@contracts";
import { Bot, SendHorizontal } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { createChatSession, sendChatMessage } from "@/lib/api";

import { SectionCard } from "./section-card";
import { StatusPill } from "./status-pill";

export function ChatPanel({ personaId }: { personaId: string }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [message, setMessage] = useState("How much can I safely spend this week?");
  const [answer, setAnswer] = useState<ChatAnswer | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    startTransition(() => {
      void (async () => {
        try {
          const session = await createChatSession(personaId);
          if (!cancelled) {
            setSessionId(session.id);
            setError(null);
          }
        } catch (cause) {
          if (!cancelled) {
            setError(cause instanceof Error ? cause.message : "Unable to start chat.");
          }
        }
      })();
    });
    return () => {
      cancelled = true;
    };
  }, [personaId]);

  return (
    <SectionCard
      eyebrow="Grounded Assistant"
      title="AI Accountant Chat"
      description="The assistant answers from structured account data and cites the metrics behind each response."
    >
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[24px] border border-[var(--pa-border)] bg-[var(--pa-surface)] p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-[var(--pa-primary-soft)] p-3 text-[var(--pa-primary)]">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-lg text-[var(--pa-text)]">Assistant</p>
              <p className="text-sm text-[var(--pa-text-muted)]">Facts and estimates are separated in every answer.</p>
            </div>
          </div>
          {answer ? (
            <div className="space-y-5">
              <p className="text-base leading-7 text-[var(--pa-text)]">{answer.answer}</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-[var(--pa-border)] bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--pa-text-soft)]">Facts</p>
                  <ul className="mt-3 space-y-2 text-sm text-[var(--pa-text-muted)]">
                    {answer.facts.map((fact) => (
                      <li key={fact}>{fact}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-[var(--pa-border)] bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--pa-text-soft)]">Estimates</p>
                  <ul className="mt-3 space-y-2 text-sm text-[var(--pa-text-muted)]">
                    {answer.estimates.map((estimate) => (
                      <li key={estimate}>{estimate}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {answer.cited_metrics.map((metric) => (
                  <StatusPill key={metric}>{metric}</StatusPill>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--pa-text-muted)]">
              {error ?? "Ask about safe to spend, debt strategy, subscriptions, score drivers, or near-term cash risk."}
            </p>
          )}
        </div>
        <div className="space-y-4">
          <div className="rounded-[24px] border border-[var(--pa-border)] bg-white p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--pa-text-soft)]">Ask a grounded question</p>
            <textarea
              className="mt-3 min-h-32 w-full resize-none rounded-2xl border border-[var(--pa-border)] bg-[var(--pa-surface)] px-4 py-3 text-sm text-[var(--pa-text)] outline-none"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
            <button
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--pa-surface-ink)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
              disabled={!sessionId || isPending}
              onClick={() => {
                if (!sessionId) return;
                startTransition(() => {
                  void (async () => {
                    try {
                      const nextAnswer = await sendChatMessage(personaId, sessionId, message);
                      setAnswer(nextAnswer);
                      setError(null);
                    } catch (cause) {
                      setError(cause instanceof Error ? cause.message : "Unable to get a response.");
                    }
                  })();
                });
              }}
            >
              <SendHorizontal className="h-4 w-4" />
              {isPending ? "Working..." : "Ask"}
            </button>
          </div>
          <div className="rounded-[24px] border border-[var(--pa-border)] bg-[var(--pa-surface)] p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--pa-text-soft)]">Suggested prompts</p>
            <div className="mt-3 space-y-2">
              {[
                "Where am I overspending right now?",
                "Which card should I pay first?",
                "Why did my score drop?",
                "Which subscriptions should I cancel first?"
              ].map((prompt) => (
                <button
                  key={prompt}
                  className="w-full rounded-2xl border border-[var(--pa-border)] bg-white px-4 py-3 text-left text-sm text-[var(--pa-text-muted)]"
                  onClick={() => setMessage(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
