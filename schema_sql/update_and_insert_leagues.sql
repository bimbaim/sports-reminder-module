-- 1. Hapus tabel lama untuk menghindari konflik relasi data
DROP TABLE IF EXISTS notification_logs CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS leagues CASCADE;

-- 2. Master Tabel Liga (Mendukung semua jenis kategori olahraga)
CREATE TABLE leagues (
    id INT PRIMARY KEY,                         -- Menggunakan ID dari API pihak ketiga
    sport_category VARCHAR(50) NOT NULL,        -- football, ufc, f1, nba, nfl, mlb, nhl, rugby
    name VARCHAR(150) NOT NULL,                 -- Contoh: "Premier League", "Formula 1", "UFC"
    localized_name VARCHAR(150),                -- Nama alternatif atau nama lokal resmi
    country_code VARCHAR(10),                   -- ENG, USA, INT (International)
    logo_url TEXT,                              -- Link gambar logo liga/kompetisi dari API
    is_popular BOOLEAN DEFAULT true NOT NULL,   -- Untuk mempermudah filter daftar liga populer di widget
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indeks untuk mempercepat pencarian berdasarkan kategori olahraga saat memuat form widget
CREATE INDEX idx_leagues_sport ON leagues(sport_category);


-- 3. Tabel Jadwal Pertandingan Universal (Mendukung 8+ Liga di Gambar)
CREATE TABLE matches (
    id VARCHAR(100) PRIMARY KEY,
    league_id INT REFERENCES leagues(id) ON DELETE CASCADE NOT NULL,
    
    -- Menggunakan nama kompetitor yang fleksibel untuk tim, pembalap, maupun petarung
    competitor_a VARCHAR(150),                  -- "Arsenal" (Football), "Jon Jones" (UFC), atau NULL untuk event balap F1
    competitor_b VARCHAR(150),                  -- "Chelsea" (Football), "Stipe Miocic" (UFC), atau NULL untuk event balap F1
    
    -- Kolom opsional khusus untuk memberikan detail nama sirkuit F1 atau nama ajang/event khusus
    event_title VARCHAR(255),                   -- Contoh: "Monaco Grand Prix" (F1) atau "UFC 300 Main Card"
    
    kickoff_time TIMESTAMPTZ NOT NULL,          -- Waktu mulai pertandingan/balapan/event
    status VARCHAR(50) DEFAULT 'scheduled' NOT NULL, -- scheduled, live, finished
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indeks untuk mempercepat cron job membaca jadwal terdekat dan filter berdasarkan liga
CREATE INDEX idx_matches_kickoff ON matches(kickoff_time);
CREATE INDEX idx_matches_league ON matches(league_id);


-- 4. Tabel Log Transaksi Notifikasi Pengingat (Antrean BullMQ)
CREATE TABLE notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscriber_id UUID REFERENCES subscribers(id) ON DELETE CASCADE NOT NULL,
    match_id VARCHAR(100) REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
    channel VARCHAR(50) NOT NULL,               -- whatsapp, email
    status VARCHAR(50) DEFAULT 'pending' NOT NULL, -- pending, success, failed
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. Aktifkan Fitur Keamanan Row Level Security (RLS)
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow backend service_role full access" ON leagues FOR ALL TO service_role USING (true);
CREATE POLICY "Allow backend service_role full access" ON matches FOR ALL TO service_role USING (true);
CREATE POLICY "Allow backend service_role full access" ON notification_logs FOR ALL TO service_role USING (true);