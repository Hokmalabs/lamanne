-- =====================================================
-- LAMANNE - Données de seed
-- Exécuter après schema.sql
-- =====================================================

-- Catégories (idempotent via ON CONFLICT)
INSERT INTO categories (name, slug, icon) VALUES
  ('Téléphonie', 'telephonie', 'smartphone'),
  ('Électroménager', 'electromenager', 'refrigerator'),
  ('Télévision', 'television', 'tv'),
  ('Informatique', 'informatique', 'laptop')
ON CONFLICT (slug) DO NOTHING;

-- Produits
INSERT INTO products (category_id, name, description, price, stock, is_active) VALUES
  (
    (SELECT id FROM categories WHERE slug = 'telephonie'),
    'iPhone 15 Pro',
    'Apple iPhone 15 Pro — puce A17 Pro, appareil photo 48 MP, titane naturel, 128 Go',
    850000,
    8,
    true
  ),
  (
    (SELECT id FROM categories WHERE slug = 'telephonie'),
    'Samsung Galaxy S24',
    'Samsung Galaxy S24 — écran Dynamic AMOLED 6,2", puce Exynos 2400, 128 Go',
    620000,
    12,
    true
  ),
  (
    (SELECT id FROM categories WHERE slug = 'television'),
    'Samsung TV 65" 4K',
    'Samsung Crystal UHD 65 pouces 4K Smart TV — HDR, PurColor, Processeur Crystal 4K',
    420000,
    5,
    true
  ),
  (
    (SELECT id FROM categories WHERE slug = 'informatique'),
    'MacBook Air M2',
    'Apple MacBook Air 13" — puce M2, 8 Go RAM, SSD 256 Go, autonomie 18h',
    1200000,
    6,
    true
  ),
  (
    (SELECT id FROM categories WHERE slug = 'electromenager'),
    'Climatiseur Midea 1.5CV',
    'Climatiseur Midea 1.5 CV Inverter — économie d'énergie, télécommande, installation incluse',
    380000,
    10,
    true
  ),
  (
    (SELECT id FROM categories WHERE slug = 'electromenager'),
    'Réfrigérateur Samsung 350L',
    'Réfrigérateur Samsung 350 litres No Frost — double portes, distributeur d'eau, couleur inox',
    290000,
    9,
    true
  );
