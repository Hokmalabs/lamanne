-- =====================================================
-- LAMANNE - Vérification et création des RLS policies
-- Executer dans l'éditeur SQL de Supabase
-- =====================================================

-- Activer RLS sur les tables si pas encore fait
ALTER TABLE cotisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- ─── Policies cotisations ────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'cotisations' AND policyname = 'users can insert own cotisations'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "users can insert own cotisations"
        ON cotisations FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    $policy$;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'cotisations' AND policyname = 'users can read own cotisations'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "users can read own cotisations"
        ON cotisations FOR SELECT
        USING (auth.uid() = user_id);
    $policy$;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'cotisations' AND policyname = 'users can update own cotisations'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "users can update own cotisations"
        ON cotisations FOR UPDATE
        USING (auth.uid() = user_id);
    $policy$;
  END IF;
END;
$$;

-- ─── Policies payments ───────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'payments' AND policyname = 'users can insert own payments'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "users can insert own payments"
        ON payments FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    $policy$;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'payments' AND policyname = 'users can read own payments'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "users can read own payments"
        ON payments FOR SELECT
        USING (auth.uid() = user_id);
    $policy$;
  END IF;
END;
$$;

-- ─── Vérifier toutes les policies actives ────────────────────────
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('cotisations', 'payments', 'profiles', 'products')
ORDER BY tablename, policyname;
