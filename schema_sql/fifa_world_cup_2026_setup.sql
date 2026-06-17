-- Migration to add score columns and seed FIFA World Cup 2026 settings
-- Run this in your Supabase SQL Editor

-- 1. Add score columns to matches table
ALTER TABLE matches ADD COLUMN IF NOT EXISTS score_home INT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS score_away INT;

-- 2. Add FIFA World Cup 2026 to sport_settings
INSERT INTO sport_settings (sport_name, sport_slug, api_url, have_leagues)
VALUES (
    'FIFA World Cup 2026', 
    'fifa-world-cup-2026', 
    'https://world-cup-2026-live-api.p.rapidapi.com', 
    true
)
ON CONFLICT (sport_slug) DO UPDATE SET
    sport_name = EXCLUDED.sport_name,
    api_url = EXCLUDED.api_url,
    have_leagues = EXCLUDED.have_leagues;
