-- Sport Settings: stores API credentials per sport category
-- Run this AFTER initial_schema.sql

CREATE TABLE IF NOT EXISTS sport_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sport_name VARCHAR(100) NOT NULL,            -- Human label: "Football (Soccer)"
    api_url TEXT NOT NULL DEFAULT '',             -- e.g. https://v3.football.api-sports.io
    api_key TEXT NOT NULL DEFAULT '',             -- Secret key for the API
    is_active BOOLEAN DEFAULT false NOT NULL,     -- Toggle on/off per sport
    last_synced_at TIMESTAMPTZ,                  -- Last successful sync timestamp
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE sport_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow backend service_role full access" ON sport_settings FOR ALL TO service_role USING (true);

-- Seed default sport rows
INSERT INTO sport_settings (sport_name, api_url) VALUES
  ('Football (Soccer)', 'https://free-api-live-football-data.p.rapidapi.com'),
  ('UFC / MMA',         'https://v1.mma.api-sports.io'),
  ('NBA Basketball',    'https://v2.nba.api-sports.io'),
  ('Formula 1',         'https://v1.formula-1.api-sports.io')
ON CONFLICT (id) DO NOTHING;
