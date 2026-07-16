import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth";
import { getHotelSnapshot } from "@/server/hotel-snapshot";

export async function GET() {
  try {
    const session = await requireSession();
    return NextResponse.json({ state: await getHotelSnapshot(session.hotelId) });
  } catch (error) {
    const status = error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ message: status === 401 ? "Authentication required." : "Unable to load property data." }, { status });
  }
}
