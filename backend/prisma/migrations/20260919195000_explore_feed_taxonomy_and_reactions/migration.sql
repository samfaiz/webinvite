-- Explore feed: taxonomy + per-user reactions.
--
-- Deliberately hand-written and strictly additive. `prisma migrate dev`
-- wanted to rebuild Design, Rsvp and User via the RedefineTables strategy,
-- because schema.prisma has drifted ahead of this migration history
-- (User.canDuplicate and Rsvp.email/subscribed/confirmedAt exist in the
-- schema and in production but were never migrated). Its INSERT..SELECT
-- omitted exactly those columns, so running it would have silently dropped
-- every duplicate permission and every stored guest email. ADD COLUMN does
-- not rewrite the table, so nothing existing is touched here.

-- AlterTable: explore taxonomy + denormalised reaction counters
ALTER TABLE "Design" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'wedding';
ALTER TABLE "Design" ADD COLUMN "country" TEXT NOT NULL DEFAULT 'india';
ALTER TABLE "Design" ADD COLUMN "likes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Design" ADD COLUMN "saves" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Design_category_country_idx" ON "Design"("category", "country");

-- CreateTable: one row per (design, user, kind)
CREATE TABLE "DesignReaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "designId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DesignReaction_designId_fkey" FOREIGN KEY ("designId") REFERENCES "Design" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DesignReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DesignReaction_userId_kind_idx" ON "DesignReaction"("userId", "kind");
CREATE UNIQUE INDEX "DesignReaction_designId_userId_kind_key" ON "DesignReaction"("designId", "userId", "kind");
