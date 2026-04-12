-- Commercial stats: monthly_target column
-- Run this in Supabase SQL Editor

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS monthly_target integer NOT NULL DEFAULT 0;

-- monthly_target = how much (in FCFA) the commercial should collect per month
-- Set it per commercial from admin/equipe
