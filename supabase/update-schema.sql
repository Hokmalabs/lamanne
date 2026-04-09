-- =====================================================
-- LAMANNE - Mise a jour du schema (Phase 3)
-- Executer dans l'editeur SQL de Supabase
-- =====================================================

-- Nouvelles colonnes sur products
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_lot boolean DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS lot_details text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS max_tranches integer DEFAULT 12;
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_tranches integer DEFAULT 1;

-- Nouvelles colonnes sur cotisations
ALTER TABLE cotisations ADD COLUMN IF NOT EXISTS cancellation_reason text;
ALTER TABLE cotisations ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE cotisations ADD COLUMN IF NOT EXISTS refund_status text
  CHECK (refund_status IN ('none','requested','approved','rejected')) DEFAULT 'none';
ALTER TABLE cotisations ADD COLUMN IF NOT EXISTS refund_requested_at timestamptz;
ALTER TABLE cotisations ADD COLUMN IF NOT EXISTS refund_amount integer DEFAULT 0;

-- Colonne role sur profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

-- Mise a jour des produits seed avec max_tranches
UPDATE products SET max_tranches = 6,  min_tranches = 1 WHERE name = 'iPhone 15 Pro';
UPDATE products SET max_tranches = 6,  min_tranches = 1 WHERE name = 'Samsung Galaxy S24';
UPDATE products SET max_tranches = 10, min_tranches = 1 WHERE name LIKE '%Samsung TV%';
UPDATE products SET max_tranches = 12, min_tranches = 1 WHERE name LIKE '%MacBook%';
UPDATE products SET max_tranches = 6,  min_tranches = 1 WHERE name LIKE '%Climatiseur%';
UPDATE products SET max_tranches = 6,  min_tranches = 1 WHERE name LIKE '%Refrigerateur%';

-- Mettre un compte en admin (remplace l''email par le tien)
UPDATE profiles
  SET role = 'admin'
  WHERE id = (SELECT id FROM auth.users WHERE email = 'joelyemian3@gmail.com');

-- =====================================================
-- POLICIES manquantes (a ajouter si pas encore presentes)
-- =====================================================

-- Permettre la lecture des profils par les admins (via service role)
-- La verification du role admin se fait cote serveur via service_role key

-- Policy: les admins peuvent tout lire dans cotisations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'cotisations'
      AND policyname = 'Les admins voient toutes les cotisations'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Les admins voient toutes les cotisations"
        ON cotisations FOR SELECT
        USING (
          auth.uid() = user_id
          OR EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
          )
        );
    $policy$;
  END IF;
END;
$$;

-- Policy: admins peuvent modifier toutes les cotisations (pour remboursements/retraits)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'cotisations'
      AND policyname = 'Les admins modifient toutes les cotisations'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Les admins modifient toutes les cotisations"
        ON cotisations FOR UPDATE
        USING (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
          )
        );
    $policy$;
  END IF;
END;
$$;

-- Policy: admins peuvent lire tous les profils
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles'
      AND policyname = 'Les admins voient tous les profils'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Les admins voient tous les profils"
        ON profiles FOR SELECT
        USING (
          auth.uid() = id
          OR EXISTS (
            SELECT 1 FROM profiles p2
            WHERE p2.id = auth.uid() AND p2.role = 'admin'
          )
        );
    $policy$;
  END IF;
END;
$$;

-- Policy: admins peuvent gerer les produits (INSERT, UPDATE)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'products'
      AND policyname = 'Les admins gerent les produits'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Les admins gerent les produits"
        ON products FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
          )
        );
    $policy$;
  END IF;
END;
$$;

-- Bucket Supabase Storage pour les images produits
-- A executer dans le dashboard Supabase > Storage > New bucket
-- Nom: products, Public: true
-- OU via SQL:
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  CREATE POLICY "Images produits publiques"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'products');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Admins uploadent les images"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'products'
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
