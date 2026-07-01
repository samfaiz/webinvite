-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Invitation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "slug" TEXT,
    "templateId" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,
    "motifId" TEXT NOT NULL,
    "themeJson" TEXT NOT NULL,
    "contentJson" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "eventDate" DATETIME,
    "expiryDate" DATETIME,
    "ownerEmail" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invitation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Invitation" ("contentJson", "createdAt", "eventDate", "expiryDate", "id", "motifId", "ownerEmail", "publishedAt", "slug", "status", "templateId", "themeId", "themeJson", "updatedAt", "userId", "views") SELECT "contentJson", "createdAt", "eventDate", "expiryDate", "id", "motifId", "ownerEmail", "publishedAt", "slug", "status", "templateId", "themeId", "themeJson", "updatedAt", "userId", "views" FROM "Invitation";
DROP TABLE "Invitation";
ALTER TABLE "new_Invitation" RENAME TO "Invitation";
CREATE UNIQUE INDEX "Invitation_slug_key" ON "Invitation"("slug");
CREATE INDEX "Invitation_userId_idx" ON "Invitation"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
