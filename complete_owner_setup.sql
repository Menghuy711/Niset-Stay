-- ============================================
-- Add Owner Information to Rooms (Complete Setup)
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Add owner columns to rooms table
ALTER TABLE rooms 
  ADD COLUMN IF NOT EXISTS owner_name TEXT,
  ADD COLUMN IF NOT EXISTS owner_phone TEXT,
  ADD COLUMN IF NOT EXISTS owner_email TEXT,
  ADD COLUMN IF NOT EXISTS owner_telegram TEXT;

-- Step 2: Update all rooms with default owner information
UPDATE rooms SET 
  owner_name = 'Room Owner',
  owner_phone = '+855 (0) 12 345 678',
  owner_email = 'owner@example.com',
  owner_telegram = 'https://t.me/your_username'
WHERE owner_name IS NULL;

-- Step 3: Verify the update
SELECT id, title, owner_name, owner_phone, owner_email, owner_telegram FROM rooms;
