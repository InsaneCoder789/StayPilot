import { NextResponse } from "next/server";
import { z } from "zod";

import { requirePropertySession } from "@/lib/auth";
import { executeHotelCommand } from "@/server/hotel-commands";
import { getHotelSnapshot } from "@/server/hotel-snapshot";

const commandSchema = z.object({ action: z.string().min(1).max(80), payload: z.record(z.string(), z.unknown()).default({}) });

export async function POST(request: Request) {
  try {
    const session = await requirePropertySession();
    const parsed = commandSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ ok: false, message: "Invalid command payload." }, { status: 400 });
    const result = await executeHotelCommand({ ...session.user, hotelId: session.hotelId }, parsed.data.action, parsed.data.payload);
    const state = result.ok ? await getHotelSnapshot(session.hotelId) : undefined;
    return NextResponse.json({ ...result, state }, { status: result.ok ? 200 : 400 });
  } catch (error) {
    const unauthorized = error instanceof Error && ["UNAUTHORIZED", "FORBIDDEN"].includes(error.message);
    console.error("Hotel command failed", error);
    return NextResponse.json({ ok: false, message: unauthorized ? "Authentication required." : "The operation could not be completed." }, { status: unauthorized ? 401 : 500 });
  }
}
