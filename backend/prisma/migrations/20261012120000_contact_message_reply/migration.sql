-- Contact inbox: keep the reply the admin sent from the panel.
--
-- Additive: one new nullable column. Nothing existing is altered.
ALTER TABLE "ContactMessage" ADD COLUMN "replyText" TEXT;
