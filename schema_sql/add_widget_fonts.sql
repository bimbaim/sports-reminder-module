-- Migration to add font customization to tenants
-- Run this in your Supabase SQL Editor

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS font_family VARCHAR(50) DEFAULT 'Inter';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS font_size VARCHAR(20) DEFAULT '14px';
