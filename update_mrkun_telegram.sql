-- ============================================
-- Update All Rooms with Mr. Kun's Telegram
-- Run this in Supabase SQL Editor
-- ============================================

UPDATE rooms SET 
  owner_name = 'Mr. Kun',
  owner_phone = '+855 (0) 12 345 678',
  owner_email = 'contact@example.com',
  owner_telegram = 'https://t.me/mrkun629'
WHERE owner_name IS NULL OR owner_telegram = 'https://t.me/your_username';

SELECT id, title, owner_name, owner_phone, owner_email, owner_telegram FROM rooms;
