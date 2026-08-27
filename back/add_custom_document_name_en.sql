-- Run once against the existing rh_app database before deploying the updated backend.
-- This is additive: existing offers and custom-document names are preserved.
USE rh_app;

ALTER TABLE custom_required_documents
  ADD COLUMN document_name_en VARCHAR(255) NULL AFTER document_name;
