-- Migration: Add subscriber consent tracking columns
ALTER TABLE subscribers
ADD COLUMN IF NOT EXISTS is_consented BOOLEAN DEFAULT FALSE NOT NULL;

ALTER TABLE subscribers
ADD COLUMN IF NOT EXISTS consented_at TIMESTAMPTZ;
