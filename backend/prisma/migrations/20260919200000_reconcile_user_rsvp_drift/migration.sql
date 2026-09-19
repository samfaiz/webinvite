-- Reconcile migration history with schema.prisma.
--
-- These four columns exist in schema.prisma and in production, but no
-- migration ever created them — they were applied out of band (most likely
-- `prisma db push`). The result was that a database built purely from this
-- history was missing them, so a fresh clone could not even register a user
-- (Prisma selects User.canDuplicate, the column does not exist, 500).
--
-- IMPORTANT for existing deployments: production ALREADY has these columns,
-- so running this there would fail with "duplicate column name". Mark it as
-- applied instead, once, without executing:
--
--   npx prisma migrate resolve --applied 20260919200000_reconcile_user_rsvp_drift
--
-- New/empty databases get them from this file as normal.

-- AlterTable
ALTER TABLE "User" ADD COLUMN "canDuplicate" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Rsvp" ADD COLUMN "email" TEXT;
ALTER TABLE "Rsvp" ADD COLUMN "subscribed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Rsvp" ADD COLUMN "confirmedAt" DATETIME;
