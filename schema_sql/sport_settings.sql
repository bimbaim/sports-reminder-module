-- Sport Settings: stores API credentials per sport category
-- Run this AFTER initial_schema.sql

CREATE TABLE IF NOT EXISTS sport_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sport_name VARCHAR(100) NOT NULL,            -- Human label: "Football (Soccer)"
    sport_slug VARCHAR(50) UNIQUE NOT NULL,      -- Dynamic identifier: "football", "nba", "ufc", etc.
    api_url TEXT NOT NULL DEFAULT '',             -- e.g. https://v3.football.api-sports.io
    api_key TEXT NOT NULL DEFAULT '',             -- Secret key for the API
    is_active BOOLEAN DEFAULT false NOT NULL,     -- Toggle on/off per sport
    have_leagues BOOLEAN DEFAULT true NOT NULL,  -- TRUE if sport has sub-leagues (Football), FALSE for standalone (NBA)
    last_synced_at TIMESTAMPTZ,                  -- Last successful sync timestamp
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE sport_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow backend service_role full access" ON sport_settings FOR ALL TO service_role USING (true);

-- Seed default sport rows
INSERT INTO sport_settings (sport_name, sport_slug, api_url, have_leagues) VALUES
  ('Football (Soccer)', 'football', 'https://free-api-live-football-data.p.rapidapi.com', true),
  ('UFC / MMA',         'ufc',      'https://v1.mma.api-sports.io', false),
  ('NBA Basketball',    'nba',      'https://v2.nba.api-sports.io', false),
  ('Formula 1',         'f1',       'https://v1.formula-1.api-sports.io', false)
ON CONFLICT (sport_slug) DO UPDATE SET 
  sport_name = EXCLUDED.sport_name,
  api_url = EXCLUDED.api_url,
  have_leagues = EXCLUDED.have_leagues;
