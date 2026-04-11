ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_days integer NOT NULL DEFAULT 1;
UPDATE products SET delivery_days = 1 WHERE delivery_days IS NULL;
