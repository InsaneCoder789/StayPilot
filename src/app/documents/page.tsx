"use client";

import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { CustomSelect } from "@/components/custom-select";
import { EmptyState } from "@/components/empty-state";
import { useHotel } from "@/components/hotel-provider";
import { StatusBadge } from "@/components/status-badge";
import type { DocumentRecord } from "@/lib/hotel-data";

const documentTypes: DocumentRecord["type"][] = ["INVOICE", "CREDIT_NOTE", "POLICY", "GUEST_FORM", "ROOM_CARD_LOG", "AUDIT", "HANDOVER", "RECEIPT", "BLUEPRINT", "OTHER"];

export default function DocumentsPage() {
  const { state, uploadDocument, createDocumentTemplate, sendCommunication } = useHotel();
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [upload, setUpload] = useState({ title: "", type: "OTHER" as DocumentRecord["type"], linkedRef: "" });
  const [template, setTemplate] = useState({ name: "", type: "GUEST_FORM" as DocumentRecord["type"], subject: "", content: "" });
  const [communication, setCommunication] = useState({ channel: "EMAIL" as "EMAIL" | "SMS" | "WHATSAPP", recipient: "", subject: "", body: "", linkedRef: "" });

  return (
    <AppShell activeHref="/documents" eyebrow="Documents" title="Secure document and communication center" description="Store original files, generate verified financial PDFs, maintain reusable templates, and deliver guest communications from one hotel-scoped register.">
      <section className="grid gap-6 2xl:grid-cols-3">
        <div className="suite-card p-6"><span className="suite-eyebrow">Secure vault</span><h2 className="mt-4 text-2xl font-semibold">Upload document</h2><div className="mt-5 grid gap-3">
          <input className="suite-input" value={upload.title} onChange={(event) => setUpload((current) => ({ ...current, title: event.target.value }))} placeholder="Document title" />
          <CustomSelect value={upload.type} onChange={(value) => setUpload((current) => ({ ...current, type: value as DocumentRecord["type"] }))} options={documentTypes.map((value) => ({ value, label: value.replaceAll("_", " ") }))} />
          <input className="suite-input" value={upload.linkedRef} onChange={(event) => setUpload((current) => ({ ...current, linkedRef: event.target.value }))} placeholder="Booking, guest, or operational reference" />
          <label className="suite-subcard cursor-pointer p-4 text-sm"><span className="block text-[var(--muted)]">PDF, image, text, CSV, or DOCX · max 10 MB</span><span className="mt-2 block truncate font-medium">{file?.name ?? "Choose an original file"}</span><input type="file" className="sr-only" accept=".pdf,.jpg,.jpeg,.png,.txt,.csv,.docx" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
          <button className="suite-button suite-button-primary" onClick={async () => { if (!file) { setMessage("Choose a file to upload."); return; } const result = await uploadDocument({ file, ...upload }); setMessage(result.message); if (result.ok) { setFile(null); setUpload({ title: "", type: "OTHER", linkedRef: "" }); } }}>Upload and verify integrity</button>
        </div></div>

        <div className="suite-card p-6"><span className="suite-eyebrow">Templates</span><h2 className="mt-4 text-2xl font-semibold">Reusable document text</h2><div className="mt-5 grid gap-3">
          <input className="suite-input" value={template.name} onChange={(event) => setTemplate((current) => ({ ...current, name: event.target.value }))} placeholder="Unique template name" />
          <CustomSelect value={template.type} onChange={(value) => setTemplate((current) => ({ ...current, type: value as DocumentRecord["type"] }))} options={documentTypes.map((value) => ({ value, label: value.replaceAll("_", " ") }))} />
          <input className="suite-input" value={template.subject} onChange={(event) => setTemplate((current) => ({ ...current, subject: event.target.value }))} placeholder="Email subject, optional" />
          <textarea className="suite-input min-h-28" value={template.content} onChange={(event) => setTemplate((current) => ({ ...current, content: event.target.value }))} placeholder="Use clear approved hotel language" />
          <button className="suite-button suite-button-primary" onClick={async () => { const result = await createDocumentTemplate(template); setMessage(result.message); if (result.ok) setTemplate((current) => ({ ...current, name: "", subject: "", content: "" })); }}>Save controlled template</button>
        </div></div>

        <div className="suite-card p-6"><span className="suite-eyebrow">Guest delivery</span><h2 className="mt-4 text-2xl font-semibold">Send communication</h2><div className="mt-5 grid gap-3">
          <CustomSelect value={communication.channel} onChange={(value) => setCommunication((current) => ({ ...current, channel: value as typeof communication.channel }))} options={["EMAIL", "SMS", "WHATSAPP"].map((value) => ({ value, label: value }))} />
          <input className="suite-input" value={communication.recipient} onChange={(event) => setCommunication((current) => ({ ...current, recipient: event.target.value }))} placeholder="Recipient email or phone" />
          <input className="suite-input" value={communication.subject} onChange={(event) => setCommunication((current) => ({ ...current, subject: event.target.value }))} placeholder="Subject" />
          <textarea className="suite-input min-h-24" value={communication.body} onChange={(event) => setCommunication((current) => ({ ...current, body: event.target.value }))} placeholder="Message body" />
          <input className="suite-input" value={communication.linkedRef} onChange={(event) => setCommunication((current) => ({ ...current, linkedRef: event.target.value }))} placeholder="Booking or invoice reference" />
          <button className="suite-button suite-button-primary" onClick={async () => { const result = await sendCommunication(communication); setMessage(result.message); if (result.ok) setCommunication((current) => ({ ...current, recipient: "", subject: "", body: "", linkedRef: "" })); }}>Send or secure draft</button>
        </div></div>
      </section>

      {message ? <p className="mt-4 text-sm text-[var(--muted)]">{message}</p> : null}

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <div className="suite-card p-6"><div className="flex items-end justify-between gap-3"><div><span className="suite-eyebrow">Authoritative register</span><h2 className="mt-4 text-2xl font-semibold">Hotel documents</h2></div><p className="text-xs text-[var(--muted)]">{state.documents.length} records</p></div>
          {state.documents.length === 0 ? <div className="mt-6"><EmptyState title="No documents on file" description="Uploaded originals and generated operational documents will appear here." /></div> : <div className="mt-6 grid gap-3">{state.documents.map((document) => <article key={document.id} className="suite-subcard grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-medium">{document.title}</h3><StatusBadge value={document.type} /></div><p className="mt-2 text-xs text-[var(--muted)]">{document.linkedRef} · {document.createdAt}{document.sizeBytes ? ` · ${(document.sizeBytes / 1024).toFixed(1)} KB` : " · Generated PDF"}</p></div><a href={`/api/documents/${document.id}/download`} className="suite-button suite-button-secondary">Download verified file</a></article>)}</div>}
        </div>
        <div className="grid gap-6">
          <div className="suite-card p-6"><h2 className="text-xl font-semibold">Approved templates</h2><div className="mt-4 grid gap-3">{state.documentTemplates.slice(0, 8).map((item) => <article key={item.id} className="suite-subcard p-4"><p className="font-medium">{item.name}</p><p className="mt-2 text-xs text-[var(--muted)]">{item.type.replaceAll("_", " ")} · {item.updatedAt}</p></article>)}</div></div>
          <div className="suite-card p-6"><h2 className="text-xl font-semibold">Delivery history</h2><div className="mt-4 grid gap-3">{state.communications.slice(0, 10).map((item) => <article key={item.id} className="suite-subcard p-4"><div className="flex items-center justify-between gap-3"><p className="truncate text-sm">{item.recipient}</p><StatusBadge value={item.status} /></div><p className="mt-2 text-xs text-[var(--muted)]">{item.channel} · {item.createdAt}</p></article>)}</div></div>
        </div>
      </section>
    </AppShell>
  );
}
