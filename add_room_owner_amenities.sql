-- ============================================
-- Add room owner info + amenities columns
-- Run in Supabase SQL Editor
-- ============================================

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS owner_name TEXT,
  ADD COLUMN IF NOT EXISTS owner_phone TEXT,
  ADD COLUMN IF NOT EXISTS owner_email TEXT,
  ADD COLUMN IF NOT EXISTS owner_telegram TEXT,
  ADD COLUMN IF NOT EXISTS amenities TEXT[],
  ADD COLUMN IF NOT EXISTS contract_terms TEXT,
  ADD COLUMN IF NOT EXISTS deposit_terms TEXT,
  ADD COLUMN IF NOT EXISTS pet_policy TEXT,
  ADD COLUMN IF NOT EXISTS utilities_terms TEXT;
