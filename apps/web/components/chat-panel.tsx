"use client";

import type { ChatAnswer, ChatTranscript } from "@contracts";
import { Bot, SendHorizontal } from "lucide-react";
import { useId, useState, useTransition } from "react";

import { createChatSession, getLatestChatSession, sendChatMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

import { SectionCard } from "./section-card";
import { StatusPill } from "./status-pill";

const SUGGESTED_PROMPTS = [
  "Where am I overspending right now?",
  "Which card should I pay first?",
  "Why did my score drop?",
  "Which subscriptions should I cancel first?"
];

function messageTone(role: "user" | "assistant") {
  return role === "assistant"
    ? "border-[var(--pa-primary-soft)] bg-[var(--pa-primary-soft)]/55"
    : "border-[var(--pa-border)] bg-white";
}

export function ChatPanel({
  personaId,
  initialTranscript
}: {
  personaId: string;
  initialTranscript: ChatTranscript | null;
}) {
  const [sessionId, setSessionId] = useState<string | null>(initialTranscript?.session.id ?? null);
  const [transcript, setTranscript] = useState<ChatTranscript | null>(initialTranscript);
  const [message, setMessage] = useState("");
  const [answer, setAnswer] = useState<ChatAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const textareaId = useId();
  const helperId = useId();
  const trimmedMessage = message.trim();
  const messages = transcript?.messages ?? [];
  const suggestedPrompts = answer?.suggested_prompts ?? SUGGESTED_PROMPTS;

  function submitMessage(nextMessage: string) {
    startTransition(() => {
      void (async () => {
        try {
          const activeSession = sessionId ? { id: sessionId } : await createChatSession(personaId);
          const nextAnswer = await sendChatMessage(personaId, activeSession.id, nextMessage);
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
    <SectionCard
      eyebrow="Grounded Assistant"
      title="AI Accountant Chat"
      description="The assistant answers from structured account data and resumes the latest saved conversation for the current persona."
    >
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[24px] border border-[var(--pa-border)] bg-[var(--pa-surface)] p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-[var(--pa-primary-soft)] p-3 text-[var(--pa-primary)]">
              <Bot aria-hidden="true" className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-lg text-[var(--pa-text)]">Conversation</p>
              <p className="text-sm text-[var(--pa-text-muted)]">
                {transcript
                  ? `Continuing the latest saved session from ${formatDateTime(transcript.session.created_at)}.`
                  : "Start a conversation to save grounded guidance for this persona."}
              </p>
            </div>
          </div>
          {messages.length > 0 ? (
            <div className="space-y-3">
              {messages.slice(-6).map((entry) => (
                <article key={entry.id} className={`rounded-2xl border p-4 ${messageTone(entry.role)}`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--pa-text-soft)]">
                      {entry.role === "assistant" ? "Assistant" : "You"}
                    </p>
                    <p className="text-xs text-[var(--pa-text-soft)]">{formatDateTime(entry.created_at)}</p>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-[var(--pa-text)]">{entry.content}</p>
                  {entry.cited_metrics.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {entry.cited_metrics.map((metric) => (
                        <StatusPill key={metric}>{metric}</StatusPill>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--pa-text-muted)]">
              Ask about Safe to Spend, debt strategy, subscriptions, score drivers, or near-term cash risk.
            </p>
          )}
          {answer ? (
            <div className="mt-5 space-y-5 border-t border-[var(--pa-border)] pt-5">
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
            </div>
          ) : null}
        </div>
        <div className="space-y-4">
          <form
            className="rounded-[24px] border border-[var(--pa-border)] bg-white p-5"
            onSubmit={(event) => {
              event.preventDefault();
              if (!trimmedMessage) return;
              submitMessage(trimmedMessage);
            }}
          >
            <label className="block" htmlFor={textareaId}>
              <span className="text-xs uppercase tracking-[0.22em] text-[var(--pa-text-soft)]">Ask a grounded question</span>
            </label>
            <textarea
              id={textareaId}
              name="message"
              aria-describedby={helperId}
              className="mt-3 min-h-32 w-full resize-none rounded-2xl border border-[var(--pa-border)] bg-[var(--pa-surface)] px-4 py-3 text-sm text-[var(--pa-text)] transition-[border-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pa-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              placeholder="Ask about Safe to Spend, debt strategy, subscriptions, or near-term risk…"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
            <p id={helperId} className="mt-2 text-sm text-[var(--pa-text-muted)]">
              Questions are answered from seeded structured data, with facts and estimates separated in the response.
            </p>
            <button
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--pa-surface-ink)] px-5 py-3 text-sm font-semibold text-white transition-[background-color,transform] duration-150 hover:-translate-y-0.5 hover:bg-[#18212a] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pa-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              disabled={!trimmedMessage || isPending}
              type="submit"
            >
              <SendHorizontal aria-hidden="true" className="h-4 w-4" />
              {isPending ? "Working…" : "Ask"}
            </button>
            <p className="sr-only" aria-live="polite">
              {isPending ? "Sending question…" : error ?? ""}
            </p>
            {error ? <p className="mt-3 text-sm text-[var(--pa-danger)]">{error}</p> : null}
          </form>
          <div className="rounded-[24px] border border-[var(--pa-border)] bg-[var(--pa-surface)] p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--pa-text-soft)]">Suggested prompts</p>
            <div className="mt-3 space-y-2">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  className="w-full rounded-2xl border border-[var(--pa-border)] bg-white px-4 py-3 text-left text-sm text-[var(--pa-text-muted)] transition-[background-color,border-color,color] duration-150 hover:border-[rgba(15,23,32,0.2)] hover:bg-[var(--pa-primary-soft)]/30 hover:text-[var(--pa-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pa-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pa-surface)]"
                  type="button"
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
