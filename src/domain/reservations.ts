const DAY_MS = 86_400_000;

export function normalizeBusinessDate(value: Date | string) {
  const date = value instanceof Date ? new Date(value) : new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid business date.");
  date.setUTCHours(12, 0, 0, 0);
  return date;
}

export function stayNights(checkIn: Date | string, checkOut: Date | string) {
  const arrival = normalizeBusinessDate(checkIn);
  const departure = normalizeBusinessDate(checkOut);
  const nights = Math.round((departure.getTime() - arrival.getTime()) / DAY_MS);
  if (nights < 1) throw new Error("Checkout must be after check-in.");
  return nights;
}

export function staysOverlap(
  first: { checkIn: Date | string; checkOut: Date | string },
  second: { checkIn: Date | string; checkOut: Date | string },
) {
  const firstStart = normalizeBusinessDate(first.checkIn).getTime();
  const firstEnd = normalizeBusinessDate(first.checkOut).getTime();
  const secondStart = normalizeBusinessDate(second.checkIn).getTime();
  const secondEnd = normalizeBusinessDate(second.checkOut).getTime();
  return firstStart < secondEnd && secondStart < firstEnd;
}
