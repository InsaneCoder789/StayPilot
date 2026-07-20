import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { renderDocumentPdf } from "@/server/document-pdf";

function safeName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 180) || "document";
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSession();
    const { id } = await context.params;
    const document = await getDb().document.findFirst({ where: { id, hotelId: auth.hotelId } });
    if (!document) return NextResponse.json({ ok: false, message: "Document not found." }, { status: 404 });
    if (document.content && document.fileName && document.mimeType) {
      return new Response(document.content, { headers: { "Content-Type": document.mimeType, "Content-Length": String(document.content.byteLength), "Content-Disposition": `attachment; filename="${safeName(document.fileName)}"`, "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store" } });
    }
    const generated = await renderDocumentPdf(auth.hotelId, document.id);
    return new Response(generated.bytes, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${safeName(generated.fileName)}"`, "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store" } });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "UNAUTHORIZED";
    if (!unauthorized) console.error("Document download failed", error);
    return NextResponse.json({ ok: false, message: unauthorized ? "Authentication required." : "Document download failed." }, { status: unauthorized ? 401 : 500 });
  }
}
