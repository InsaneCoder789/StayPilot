"use client";

import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { useHotel } from "@/components/hotel-provider";

export default function KnowledgePage() {
  const { answerOperationsQuestion, answerPolicyQuestion, state } = useHotel();
  const [policyQuery, setPolicyQuery] = useState("");
  const [policyAnswer, setPolicyAnswer] = useState<{
    answer: string;
    sources: string[];
  } | null>(null);
  const [opsQuery, setOpsQuery] = useState("");
  const [opsAnswer, setOpsAnswer] = useState("");

  return (
    <AppShell
      activeHref="/ai-assistant"
      eyebrow="Knowledge"
      title="Hotel knowledge and operations lookup"
      description="Search hotel policies and ask operational questions against the current live dataset."
    >
      <div className="grid gap-4 2xl:grid-cols-2">
        <section className="suite-card p-6">
          <h3 className="text-2xl font-semibold tracking-[-0.03em]">
            Policy search
          </h3>
          <div className="mt-4 flex gap-3">
            <input
              value={policyQuery}
              onChange={(event) => setPolicyQuery(event.target.value)}
              placeholder="Ask about cancellation, late checkout, fire SOP..."
              className="suite-input flex-1 rounded-full"
            />
            <button
              onClick={() => setPolicyAnswer(answerPolicyQuestion(policyQuery))}
              className="suite-button suite-button-primary"
            >
              Search
            </button>
          </div>
          {policyAnswer ? (
            <div className="suite-subcard mt-4 p-4">
              <p className="text-sm leading-7 text-[var(--ink-soft)]">
                {policyAnswer.answer}
              </p>
              {policyAnswer.sources.length ? (
                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  Source: {policyAnswer.sources.join(", ")}
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="mt-5 space-y-3">
            {state.policies.map((policy) => (
              <div
                key={policy.id}
                className="suite-subcard px-4 py-4"
              >
                <p className="font-medium">{policy.title}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">{policy.category}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="suite-card p-6">
          <h3 className="text-2xl font-semibold tracking-[-0.03em]">
            Operations lookup
          </h3>
          <div className="mt-4 flex gap-3">
            <input
              value={opsQuery}
              onChange={(event) => setOpsQuery(event.target.value)}
              placeholder="Ask about dirty rooms, pending payments, completed checkouts..."
              className="suite-input flex-1 rounded-full"
            />
            <button
              onClick={() => setOpsAnswer(answerOperationsQuestion(opsQuery))}
              className="suite-button suite-button-primary"
            >
              Run
            </button>
          </div>
          {opsAnswer ? (
            <div className="suite-subcard mt-4 p-4">
              <p className="text-sm leading-7 text-[var(--ink-soft)]">{opsAnswer}</p>
            </div>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}
