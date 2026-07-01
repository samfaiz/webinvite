-- CreateTable
CREATE TABLE "SeoProposal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "source" TEXT NOT NULL DEFAULT 'audit',
    "score" INTEGER,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "issuesJson" TEXT NOT NULL DEFAULT '[]',
    "rationale" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" DATETIME,
    CONSTRAINT "SeoProposal_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "ContentDoc" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SeoMemory" (
    "contentId" TEXT NOT NULL PRIMARY KEY,
    "notesJson" TEXT NOT NULL DEFAULT '[]',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SeoMemory_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "ContentDoc" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SeoProposal_status_idx" ON "SeoProposal"("status");

-- CreateIndex
CREATE INDEX "SeoProposal_contentId_idx" ON "SeoProposal"("contentId");
