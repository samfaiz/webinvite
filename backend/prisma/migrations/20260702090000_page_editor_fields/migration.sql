-- Adds rich-editor fields for ContentDoc: sort order (nav position), canonical
-- URL, FAQs (answer-engine optimisation), and split OG title/description.

-- AlterTable
ALTER TABLE "ContentDoc" ADD COLUMN "ogTitle" TEXT;
ALTER TABLE "ContentDoc" ADD COLUMN "ogDescription" TEXT;
ALTER TABLE "ContentDoc" ADD COLUMN "canonicalUrl" TEXT;
ALTER TABLE "ContentDoc" ADD COLUMN "faqsJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "ContentDoc" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "ContentDoc_type_sortOrder_idx" ON "ContentDoc"("type", "sortOrder");
