-- Add widget_settings column to tenants table for component-specific overrides
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS widget_settings JSONB DEFAULT '{}'::jsonb;
