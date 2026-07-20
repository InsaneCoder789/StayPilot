-- PostgreSQL enforces room-allocation safety even when concurrent requests race.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Booking"
ADD CONSTRAINT "Booking_active_room_dates_excl"
EXCLUDE USING gist (
  "hotelId" WITH =,
  "roomId" WITH =,
  tsrange("checkInAt", "checkOutAt", '[)') WITH &&
)
WHERE (
  "roomId" IS NOT NULL
  AND "status" IN ('PENDING', 'CONFIRMED', 'CHECKED_IN')
);
