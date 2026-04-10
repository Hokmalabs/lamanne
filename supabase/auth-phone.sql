-- Index for phone-based auth lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);

-- Ensure phone column exists on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
