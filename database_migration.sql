-- ============================================
-- Niset Stay - Database Migration Script
-- Run this in Supabase SQL Editor to update existing tables
-- ============================================

-- 1. Add new columns to profiles table (if they don't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='phone') THEN
    ALTER TABLE profiles ADD COLUMN phone TEXT;
  END IF;
END $$;

-- 2. Add new columns to rooms table (if they don't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rooms' AND column_name='address') THEN
    ALTER TABLE rooms ADD COLUMN address TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rooms' AND column_name='badge') THEN
    ALTER TABLE rooms ADD COLUMN badge TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rooms' AND column_name='beds') THEN
    ALTER TABLE rooms ADD COLUMN beds INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rooms' AND column_name='baths') THEN
    ALTER TABLE rooms ADD COLUMN baths INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rooms' AND column_name='sqft') THEN
    ALTER TABLE rooms ADD COLUMN sqft INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rooms' AND column_name='thumb_images') THEN
    ALTER TABLE rooms ADD COLUMN thumb_images TEXT[];
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rooms' AND column_name='map_query') THEN
    ALTER TABLE rooms ADD COLUMN map_query TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rooms' AND column_name='ref_id') THEN
    ALTER TABLE rooms ADD COLUMN ref_id TEXT;
  END IF;
END $$;

-- 3. Create bookings table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  total_price NUMERIC(10, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS on bookings if not already enabled
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can insert own bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can update all bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can delete bookings" ON bookings;

-- Users can view their own bookings
CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Users can insert their own bookings
CREATE POLICY "Users can insert own bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can update all bookings
CREATE POLICY "Admins can update all bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Admins can delete bookings
CREATE POLICY "Admins can delete bookings"
  ON bookings FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- 6. Update the handle_new_user function to fix security issue
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.user_metadata->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.user_metadata->>'phone', NULL),
    'user'  -- ALWAYS set to 'user' to prevent privilege escalation
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create indexes for better performance (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_room_id ON bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_rooms_category ON rooms(category);
CREATE INDEX IF NOT EXISTS idx_rooms_price ON rooms(price);

-- 8. Insert seed data only if rooms table is empty
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM rooms LIMIT 1) THEN
    INSERT INTO rooms (title, description, address, price, category, badge, beds, baths, sqft, image_url, thumb_images, map_query, ref_id)
    VALUES 
      (
        'Time Square BKK room',
        'Modern student room in the heart of BKK area, close to universities',
        'Boeng Keng Kang I, Boeng Keng Kang, Phnom Penh, Cambodia',
        95.00,
        'Student Room',
        'New',
        1, 1, 1430,
        'property-1.jpg',
        ARRAY['property-3.jpg', 'property-4.jpg', 'property-5.jpg', 'property-6.jpg'],
        'Boeng%20Keng%20Kang%20Phnom%20Penh',
        'C21_R02113'
      ),
      (
        'Camboroom',
        'Comfortable accommodation near Boeung Kak lake area',
        'Boeung Kak I, Tuol Kouk, Phnom Penh, Cambodia',
        115.00,
        'Student Room',
        NULL,
        1, 1, 1630,
        'property-2.jpg',
        ARRAY['property-3.jpg', 'property-4.jpg', 'property-5.jpg', 'property-6.jpg'],
        'Boeung%20Kak%20Phnom%20Penh',
        'C21_R02456'
      ),
      (
        'The Real Estate Group',
        'Affordable room in Teuk Thla, perfect for students',
        'Teuk Thla, Sen Sok, Phnom Penh, Cambodia',
        85.00,
        'Student Room',
        NULL,
        1, 1, 1240,
        'property-3.jpg',
        ARRAY['property-7.jpg', 'property-8.jpg', 'property-9.jpg', 'property-10.jpg'],
        'Teuk%20Thla%20Phnom%20Penh',
        'C21_R02457'
      ),
      (
        'YG condo',
        'Premium student accommodation near Wat Phnom',
        'Wat Phnom, Daun Penh, Phnom Penh, Cambodia',
        120.00,
        'Student Room',
        NULL,
        2, 1, 1260,
        'property-4.jpg',
        ARRAY['property-11.jpg', 'property-12.jpg', 'property-13.jpg', 'property-14.jpg'],
        'Wat%20Phnom%20Phnom%20Penh',
        'C21_R02458'
      ),
      (
        'Khmer24',
        'Budget-friendly room with great amenities',
        'Prek Leap, Chroy Changvar, Phnom Penh, Cambodia',
        100.00,
        'Student Room',
        NULL,
        1, 1, 2350,
        'property-5.jpg',
        ARRAY['property-3.jpg', 'property-4.jpg', 'property-5.jpg', 'property-6.jpg'],
        'Prek%20Leap%20Phnom%20Penh',
        'C21_R02459'
      ),
      (
        'KWE Town Center',
        'Central location with easy access to campus',
        'Boeung Kak I, Tuol Kouk, Phnom Penh, Cambodia',
        105.55,
        'Student Room',
        NULL,
        2, 1, 1950,
        'property-6.jpg',
        ARRAY['property-3.jpg', 'property-4.jpg', 'property-5.jpg', 'property-6.jpg'],
        'Boeung%20Kak%20Phnom%20Penh',
        'C21_R02460'
      ),
      (
        'All Pros Real Estate',
        'Quiet study environment in Tuol Svay Prey',
        'Tuol Svay Prey I, Boeng Keng Kang, Phnom Penh, Cambodia',
        115.00,
        'Student Room',
        NULL,
        1, 1, 1580,
        'property-7.jpg',
        ARRAY['property-3.jpg', 'property-4.jpg', 'property-5.jpg', 'property-6.jpg'],
        'Tuol%20Svay%20Prey%20Phnom%20Penh',
        'C21_R02461'
      ),
      (
        'FIT Room',
        'Premium location near riverside',
        'Tonle Bassac, Chamkar Mon, Phnom Penh, Cambodia',
        180.00,
        'Student Room',
        NULL,
        2, 1, 1120,
        'property-8.jpg',
        ARRAY['property-3.jpg', 'property-4.jpg', 'property-5.jpg', 'property-6.jpg'],
        'Tonle%20Bassac%20Phnom%20Penh',
        'C21_R02462'
      );
  END IF;
END $$;

-- ============================================
-- Migration Complete!
-- 
-- Next steps:
-- 1. To make a user an admin, run:
--    UPDATE public.profiles SET role = 'admin' WHERE id = 'YOUR_USER_ID';
-- 2. Find YOUR_USER_ID in: Authentication → Users in Supabase dashboard
-- ============================================
