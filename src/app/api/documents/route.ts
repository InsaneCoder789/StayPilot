import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import type { DocumentType } from "@/generated/prisma/client";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "text/plain", "text/csv", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);
const documentTypes = new Set<DocumentType>(["INVOICE", "CREDIT_NOTE", "POLICY", "GUEST_FORM", "ROOM_CARD_LOG", "AUDIT", "HANDOVER", "RECEIPT", "BLUEPRINT", "OTHER"]);

export async function POST(request: Request) {
  try {
    const auth = await requireSession();
    const form = await request.formData();
    const file = form.get("file");
    const title = String(form.get("title") ?? "").trim();
    const linkedRef = String(form.get("linkedRef") ?? "").trim();
    const type = String(form.get("type") ?? "OTHER") as DocumentType;
    if (!(file instanceof File) || !title || !linkedRef || !documentTypes.has(type)) return NextResponse.json({ ok: false, message: "File, title, type, and reference are required." }, { status: 400 });
    if (file.size <= 0 || file.size > MAX_FILE_BYTES || !allowedTypes.has(file.type)) return NextResponse.json({ ok: false, message: "Upload a supported PDF, image, text, CSV, or DOCX file up to 10 MB." }, { status: 400 });
    const content = new Uint8Array(await file.arrayBuffer());
    const checksum = createHash("sha256").update(content).digest("hex");
    const document = await getDb().$transaction(async (tx) => {
      const row = await tx.document.create({ data: { hotelId: auth.hotelId, title, type, linkedRef, fileName: file.name.slice(0, 240), mimeType: file.type, storageKey: "POSTGRES", checksum, sizeBytes: file.size, content, uploadedBy: auth.user.name } });
      await tx.auditLog.create({ data: { hotelId: auth.hotelId, userId: auth.user.id, actorName: auth.user.name, action: "UPLOAD_DOCUMENT", entityType: "Document", entityId: row.id, target: `${title} · ${checksum.slice(0, 12)}` } });
      return row;
    });
    return NextResponse.json({ ok: true, message: "Document uploaded and integrity checked.", documentId: document.id });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "UNAUTHORIZED";
    if (!unauthorized) console.error("Document upload failed", error);
    return NextResponse.json({ ok: false, message: unauthorized ? "Authentication required." : "Document upload failed." }, { status: unauthorized ? 401 : 500 });
  }
}
