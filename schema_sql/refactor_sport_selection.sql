-- 1. Create sport_categories table
CREATE TABLE IF NOT EXISTS sport_categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    have_leagues BOOLEAN DEFAULT true NOT NULL
);

-- 2. Create tenant_favorite_sports junction table
CREATE TABLE IF NOT EXISTS tenant_favorite_sports (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    sport_slug VARCHAR(255) REFERENCES sport_categories(slug) ON DELETE CASCADE NOT NULL,
    CONSTRAINT unique_tenant_sport UNIQUE(tenant_id, sport_slug)
);

-- 3. Add sport_category column to leagues if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leagues' AND column_name='sport_category') THEN
        ALTER TABLE leagues ADD COLUMN sport_category VARCHAR(255);
        CREATE INDEX IF NOT EXISTS idx_leagues_sport_category ON leagues(sport_category);
    END IF;
END $$;

-- 4. Add sport_category column to matches if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matches' AND column_name='sport_category') THEN
        ALTER TABLE matches ADD COLUMN sport_category VARCHAR(255);
        CREATE INDEX IF NOT EXISTS idx_matches_sport_category ON matches(sport_category);
    END IF;
END $$;

-- Initial data seed for sport_categories
INSERT INTO sport_categories (name, slug, have_leagues) VALUES 
('Football', 'football', true),
('Basketball', 'basketball', true),
('Rugby', 'rugby', true),
('Tennis', 'tennis', false),
('MMA', 'mma', false),
('Motorsports', 'motorsports', false)
ON CONFLICT (slug) DO UPDATE SET 
    name = EXCLUDED.name,
    have_leagues = EXCLUDED.have_leagues;
