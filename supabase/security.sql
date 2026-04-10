-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read) WHERE read = false;

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read their own notifications
CREATE POLICY IF NOT EXISTS "users_read_own_notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can update (mark read) their own notifications
CREATE POLICY IF NOT EXISTS "users_update_own_notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Rate limiting helper: track API usage (optional, for future use)
-- Zod validation is handled at the application layer in API routes.

-- Ensure profiles RLS is active
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Payments: users can only see their own payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "users_read_own_payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    cotisation_id IN (
      SELECT id FROM cotisations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "users_insert_own_payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (
    cotisation_id IN (
      SELECT id FROM cotisations WHERE user_id = auth.uid()
    )
  );
