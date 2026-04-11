-- Fix: add created_by column to cotisations
ALTER TABLE cotisations ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cotisations_created_by ON cotisations(created_by);
