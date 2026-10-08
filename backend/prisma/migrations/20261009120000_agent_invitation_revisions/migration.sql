-- Agent API: a copy of an invitation before every change made through it,
-- so any change (even a delete) can be undone.
--
-- Additive: a new table only. Nothing existing is altered or rewritten.

-- CreateTable
CREATE TABLE "InvitationRevision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invitationId" TEXT NOT NULL,
    "slug" TEXT,
    "action" TEXT NOT NULL,
    "note" TEXT,
    "snapshotJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "InvitationRevision_invitationId_idx" ON "InvitationRevision"("invitationId");

-- CreateIndex
CREATE INDEX "InvitationRevision_slug_idx" ON "InvitationRevision"("slug");
