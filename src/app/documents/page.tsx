"use client";

import { AppShell } from "@/components/app-shell";
import { useHotel } from "@/components/hotel-provider";
import { exportDocumentPdf } from "@/lib/pdf";

export default function DocumentsPage() {
  const { state } = useHotel();

  return (
    <AppShell
      activeHref="/documents"
      eyebrow="Documents"
      title="Hotel document center"
      description="Track operational documents and export them as PDFs for audit, guest paperwork, and policy reference."
    >
      <div className="grid gap-4">
        {state.documents.map((document) => (
          <article
            key={document.id}
            className="rounded-[28px] border border-[var(--line)] bg-[var(--surface-strong)] p-6"
          >
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h3 className="text-2xl font-semibold tracking-[-0.03em]">
                  {document.title}
                </h3>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {document.type} • {document.linkedRef} • {document.createdAt}
                </p>
              </div>
              <button
                onClick={() => exportDocumentPdf(state.hotel, document)}
                className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-medium text-[#111111]"
              >
                Export PDF
              </button>
            </div>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
