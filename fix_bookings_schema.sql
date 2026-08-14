-- ============================================
-- Fix Bookings Table Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Add missing columns to bookings table
ALTER TABLE bookings 
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS occupants INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS move_in DATE,
  ADD COLUMN IF NOT EXISTS room_title TEXT,
  ADD COLUMN IF NOT EXISTS room_image TEXT,
  ADD COLUMN IF NOT EXISTS room_price TEXT;

-- Make check_in_date, check_out_date and total_price nullable 
-- (since monthly rentals use move_in instead of check_in_date)
ALTER TABLE bookings 
  ALTER COLUMN check_in_date DROP NOT NULL,
  ALTER COLUMN check_out_date DROP NOT NULL,
  ALTER COLUMN total_price DROP NOT NULL;

SELECT 'Bookings table schema updated successfully!' as status;
