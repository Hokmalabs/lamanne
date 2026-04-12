-- Referral system migration
-- Run this in Supabase SQL Editor

-- 1. Add referral columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS referral_bonus integer NOT NULL DEFAULT 0;

-- 2. Auto-generate referral code on profile insert
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
DECLARE
  code text;
  exists_already boolean;
BEGIN
  LOOP
    -- 6-char alphanumeric code (uppercase)
    code := upper(substr(md5(random()::text), 1, 6));
    SELECT EXISTS (
      SELECT 1 FROM profiles WHERE referral_code = code
    ) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  NEW.referral_code := code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_referral_code ON profiles;
CREATE TRIGGER trg_generate_referral_code
  BEFORE INSERT ON profiles
  FOR EACH ROW
  WHEN (NEW.referral_code IS NULL)
  EXECUTE FUNCTION generate_referral_code();

-- 3. Backfill existing profiles that don't have a referral code
DO $$
DECLARE
  r RECORD;
  code text;
  exists_already boolean;
BEGIN
  FOR r IN SELECT id FROM profiles WHERE referral_code IS NULL LOOP
    LOOP
      code := upper(substr(md5(random()::text), 1, 6));
      SELECT EXISTS (SELECT 1 FROM profiles WHERE referral_code = code) INTO exists_already;
      EXIT WHEN NOT exists_already;
    END LOOP;
    UPDATE profiles SET referral_code = code WHERE id = r.id;
  END LOOP;
END $$;
