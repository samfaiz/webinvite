-- CreateTable
CREATE TABLE "Design" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "community" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "colorsJson" TEXT NOT NULL,
    "fontsJson" TEXT NOT NULL,
    "particlesJson" TEXT NOT NULL,
    "backgroundsJson" TEXT NOT NULL,
    "previewUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Design_community_idx" ON "Design"("community");
