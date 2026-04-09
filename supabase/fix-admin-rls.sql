-- =====================================================
-- LAMANNE - Fix RLS policies sur profiles
-- Executer dans l'editeur SQL de Supabase
-- =====================================================

-- S'assurer que RLS est activé sur profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Politique : chaque utilisateur peut lire son propre profil
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles'
      AND policyname = 'users can read own profile'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "users can read own profile"
        ON profiles FOR SELECT
        USING (auth.uid() = id);
    $policy$;
  END IF;
END;
$$;

-- Politique : chaque utilisateur peut mettre à jour son propre profil
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles'
      AND policyname = 'users can update own profile'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "users can update own profile"
        ON profiles FOR UPDATE
        USING (auth.uid() = id);
    $policy$;
  END IF;
END;
$$;

-- Vérifier les policies existantes sur profiles
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles';
