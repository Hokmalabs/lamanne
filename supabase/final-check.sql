-- ============================================================
-- LAMANNE — Final schema check
-- Run this in Supabase SQL Editor to ensure all columns exist
-- ============================================================

-- profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS assigned_commercial uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- cotisations
ALTER TABLE cotisations ADD COLUMN IF NOT EXISTS deadline timestamptz;
ALTER TABLE cotisations ADD COLUMN IF NOT EXISTS refund_status text NOT NULL DEFAULT 'none';
ALTER TABLE cotisations ADD COLUMN IF NOT EXISTS refund_amount integer NOT NULL DEFAULT 0;
ALTER TABLE cotisations ADD COLUMN IF NOT EXISTS cancellation_reason text;
ALTER TABLE cotisations ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE cotisations ADD COLUMN IF NOT EXISTS refund_requested_at timestamptz;

-- products
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_lot boolean NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS lot_details text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS max_tranches integer NOT NULL DEFAULT 12;
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_tranches integer NOT NULL DEFAULT 1;

-- refund_requests table (used by /api/commercial/remboursement)
CREATE TABLE IF NOT EXISTS refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotisation_id uuid NOT NULL REFERENCES cotisations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  commercial_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  amount integer NOT NULL DEFAULT 0,
  motif text,
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

-- RLS for refund_requests
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Admin can manage refund_requests"
  ON refund_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY IF NOT EXISTS "Commercial can insert refund_requests for own clients"
  ON refund_requests FOR INSERT
  WITH CHECK (commercial_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Client can view own refund_requests"
  ON refund_requests FOR SELECT
  USING (client_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_assigned_commercial ON profiles(assigned_commercial);
CREATE INDEX IF NOT EXISTS idx_profiles_suspended ON profiles(is_suspended) WHERE is_suspended = true;
CREATE INDEX IF NOT EXISTS idx_cotisations_user_id ON cotisations(user_id);
CREATE INDEX IF NOT EXISTS idx_cotisations_status ON cotisations(status);
CREATE INDEX IF NOT EXISTS idx_payments_cotisation_id ON payments(cotisation_id);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at);
CREATE INDEX IF NOT EXISTS idx_refund_requests_client ON refund_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON refund_requests(status);
