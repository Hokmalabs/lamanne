-- =====================================================
-- LAMANNE - Schéma de base de données Supabase
-- =====================================================

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: profiles
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TABLE: categories
-- =====================================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL DEFAULT 'package',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TABLE: products
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price INTEGER NOT NULL CHECK (price > 0),
  images TEXT[] NOT NULL DEFAULT '{}',
  stock INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TABLE: cotisations
-- =====================================================
CREATE TABLE IF NOT EXISTS cotisations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  total_price INTEGER NOT NULL CHECK (total_price > 0),
  amount_paid INTEGER NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  amount_remaining INTEGER NOT NULL CHECK (amount_remaining >= 0),
  nb_tranches INTEGER NOT NULL DEFAULT 1 CHECK (nb_tranches > 0),
  tranche_amount INTEGER NOT NULL CHECK (tranche_amount > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  withdrawal_code TEXT UNIQUE,
  withdrawn_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TABLE: payments
-- =====================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cotisation_id UUID NOT NULL REFERENCES cotisations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  payment_method TEXT NOT NULL DEFAULT 'mobile_money',
  transaction_ref TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TABLE: notifications
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Activer RLS sur toutes les tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLICIES: profiles
-- =====================================================
CREATE POLICY "Les utilisateurs peuvent voir leur propre profil"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Les utilisateurs peuvent modifier leur propre profil"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Les utilisateurs peuvent créer leur profil"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- POLICIES: categories (lecture publique)
-- =====================================================
CREATE POLICY "Les catégories sont visibles par tous"
  ON categories FOR SELECT
  USING (TRUE);

-- =====================================================
-- POLICIES: products (lecture publique pour les produits actifs)
-- =====================================================
CREATE POLICY "Les produits actifs sont visibles par tous"
  ON products FOR SELECT
  USING (is_active = TRUE);

-- =====================================================
-- POLICIES: cotisations
-- =====================================================
CREATE POLICY "Les utilisateurs voient leurs cotisations"
  ON cotisations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs créent leurs cotisations"
  ON cotisations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs modifient leurs cotisations"
  ON cotisations FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- POLICIES: payments
-- =====================================================
CREATE POLICY "Les utilisateurs voient leurs paiements"
  ON payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs créent leurs paiements"
  ON payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- POLICIES: notifications
-- =====================================================
CREATE POLICY "Les utilisateurs voient leurs notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs marquent leurs notifications comme lues"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- TRIGGERS: Créer profil automatiquement à l'inscription
-- =====================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- DONNÉES DE TEST (catégories)
-- =====================================================
INSERT INTO categories (name, slug, icon) VALUES
  ('Téléphones', 'telephones', 'smartphone'),
  ('Téléviseurs', 'televiseurs', 'tv'),
  ('Électroménager', 'electromenager', 'refrigerator'),
  ('Informatique', 'informatique', 'laptop'),
  ('Audio', 'audio', 'headphones'),
  ('Mobilier', 'mobilier', 'sofa')
ON CONFLICT (slug) DO NOTHING;
