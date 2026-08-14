-- ============================================
-- Add Owner Contact Information to Rooms
-- Run this in Supabase SQL Editor
-- ============================================

-- Add owner contact fields to rooms table
ALTER TABLE rooms 
  ADD COLUMN IF NOT EXISTS owner_name TEXT,
  ADD COLUMN IF NOT EXISTS owner_phone TEXT,
  ADD COLUMN IF NOT EXISTS owner_email TEXT,
  ADD COLUMN IF NOT EXISTS owner_telegram TEXT;

-- Update existing rooms with sample owner data
UPDATE rooms SET 
  owner_name = 'Owner Name',
  owner_phone = '+855 (0) 12 345 678',
  owner_email = 'owner@example.com',
  owner_telegram = 'https://t.me/username'
WHERE owner_name IS NULL;

SELECT 'Owner information fields added successfully!' as status;
