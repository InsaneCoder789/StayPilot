import "server-only";

import type { Prisma } from "@/generated/prisma/client";

export async function nextDocumentCode(
  tx: Prisma.TransactionClient,
  hotelId: string,
  kind: string,
  prefix: string,
  digits = 6,
) {
  const sequence = await tx.documentSequence.upsert({
    where: { hotelId_kind: { hotelId, kind } },
    create: { hotelId, kind, currentValue: 1 },
    update: { currentValue: { increment: 1 } },
  });
  return `${prefix}-${new Date().getUTCFullYear()}-${String(sequence.currentValue).padStart(digits, "0")}`;
}
