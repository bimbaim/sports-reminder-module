DROP TABLE IF EXISTS notification_logs CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS subscribers CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    contact_email VARCHAR(255),
    phone_number VARCHAR(50),
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    postal_code VARCHAR(20),
    maps_url TEXT,
    logo_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#6366f1' NOT NULL,
    secondary_color VARCHAR(7) DEFAULT '#FFFFFF' NOT NULL,
    theme_mode VARCHAR(20) DEFAULT 'light' NOT NULL,
    custom_cta_text VARCHAR(100) DEFAULT 'Remind Me' NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_tenants_slug ON tenants(slug);

CREATE TABLE subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    email VARCHAR(255) NOT NULL,
    whatsapp_number VARCHAR(50) NOT NULL,
    favorite_sports VARCHAR(50)[] DEFAULT '{football}'::VARCHAR[] NOT NULL,
    favorite_teams VARCHAR(100)[] NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_tenant_subscriber UNIQUE(tenant_id, whatsapp_number)
);

CREATE TABLE matches (
    id VARCHAR(100) PRIMARY KEY,
    sport_category VARCHAR(50) DEFAULT 'football' NOT NULL,
    competitor_a VARCHAR(100) NOT NULL,
    competitor_b VARCHAR(100) NOT NULL,
    event_title VARCHAR(255),
    kickoff_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) DEFAULT 'scheduled' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_matches_kickoff_time ON matches(kickoff_time);

CREATE TABLE notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscriber_id UUID REFERENCES subscribers(id) ON DELETE CASCADE NOT NULL,
    match_id VARCHAR(100) REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
    channel VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' NOT NULL,
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow backend service_role full access" ON tenants FOR ALL TO service_role USING (true);
CREATE POLICY "Allow backend service_role full access" ON subscribers FOR ALL TO service_role USING (true);
CREATE POLICY "Allow backend service_role full access" ON matches FOR ALL TO service_role USING (true);
CREATE POLICY "Allow backend service_role full access" ON notification_logs FOR ALL TO service_role USING (true);