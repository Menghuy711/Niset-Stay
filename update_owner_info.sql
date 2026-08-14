-- ============================================
-- Update All Rooms with Owner Information
-- Run this in Supabase SQL Editor
-- ============================================

-- Update ALL rooms with default owner information
-- You can modify the values below for each room
UPDATE rooms SET 
  owner_name = 'Room Owner',
  owner_phone = '+855 (0) 12 345 678',
  owner_email = 'owner@example.com',
  owner_telegram = 'https://t.me/your_username'
WHERE owner_name IS NULL;

-- Verify the update
SELECT id, title, owner_name, owner_phone, owner_telegram FROM rooms;
