-- Guest RSVP: meal preference (handoff screen 1c).
--
-- Additive and nullable: existing RSVPs simply have no preference recorded,
-- which is the truth — they were collected before the question was asked.
-- ADD COLUMN does not rewrite the table, so nothing existing is touched.

-- AlterTable
ALTER TABLE "Rsvp" ADD COLUMN "meal" TEXT;
