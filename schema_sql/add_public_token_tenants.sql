-- 1. Tambahkan kolom public_token ke tabel tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS public_token VARCHAR(100);

-- 2. Buat fungsi otomatis untuk generate token unik dengan prefiks 'pub_live_'
CREATE OR REPLACE FUNCTION generate_tenant_token() 
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.public_token IS NULL THEN
        NEW.public_token := 'pub_live_' || lower(substring(md5(random()::text || clock_timestamp()::text) from 1 for 24));
    END IF;
    RETURN NEW;
    END;
$$ LANGUAGE plpgsql;

-- 3. Pasang trigger agar setiap ada tenant baru, token otomatis terisi aman
DROP TRIGGER IF EXISTS trg_generate_tenant_token ON tenants;
CREATE TRIGGER trg_generate_tenant_token
BEFORE INSERT ON tenants
FOR EACH ROW
EXECUTE FUNCTION generate_tenant_token();

-- 4. Jalankan update sekali saja untuk mengisi data token bagi tenant lama yang sudah ada
UPDATE tenants 
SET public_token = 'pub_live_' || lower(substring(md5(random()::text || id::text) from 1 for 24))
WHERE public_token IS NULL;

-- 5. Buat kolom menjadi UNIQUE dan NOT NULL untuk menjamin keamanan integritas data
ALTER TABLE tenants ALTER COLUMN public_token SET NOT NULL;
ALTER TABLE tenants ADD CONSTRAINT unique_public_token UNIQUE (public_token);