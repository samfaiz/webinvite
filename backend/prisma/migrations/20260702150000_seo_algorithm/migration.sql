-- SEO Algorithm singleton config + version history

-- CreateTable
CREATE TABLE "SeoAlgorithm" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "autoImprove" BOOLEAN NOT NULL DEFAULT false,
    "frequency" TEXT NOT NULL DEFAULT 'weekly',
    "versionsToKeep" INTEGER NOT NULL DEFAULT 90,
    "lastRunAt" DATETIME,
    "lastRunNote" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SeoAlgorithmVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "algorithm" TEXT NOT NULL,
    "learningMemory" TEXT NOT NULL,
    "avgAuditScore" REAL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "SeoAlgorithmVersion_isCurrent_idx" ON "SeoAlgorithmVersion"("isCurrent");

-- CreateIndex
CREATE INDEX "SeoAlgorithmVersion_createdAt_idx" ON "SeoAlgorithmVersion"("createdAt");
