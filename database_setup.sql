-- ============================================
-- Niset Stay - Database Setup Script
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create profiles table for role-based access control
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create rooms table (services/products)
CREATE TABLE IF NOT EXISTS rooms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  address TEXT,
  price NUMERIC(10, 2) NOT NULL,
  category TEXT,
  badge TEXT,
  beds INTEGER,
  baths INTEGER,
  sqft INTEGER,
  image_url TEXT,
  thumb_images TEXT[], -- Array of thumbnail image URLs
  map_query TEXT,
  ref_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create bookings table
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

-- 5. Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- 6. SECURITY DEFINER function to check admin role without RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin(p_uid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_uid AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RLS Policies for profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Everyone can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON profiles;

-- Everyone (authenticated and anon) can read profiles
CREATE POLICY "Everyone can view profiles"
  ON profiles FOR SELECT
  TO anon, authenticated
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Admins can manage all profiles
CREATE POLICY "Admins can manage profiles"
  ON profiles FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- 8. RLS Policies for rooms table
DROP POLICY IF EXISTS "Everyone can view rooms" ON rooms;
DROP POLICY IF EXISTS "Admins can insert rooms" ON rooms;
DROP POLICY IF EXISTS "Admins can update rooms" ON rooms;
DROP POLICY IF EXISTS "Admins can delete rooms" ON rooms;

-- Everyone can read rooms
CREATE POLICY "Everyone can view rooms"
  ON rooms FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only admins can insert rooms
CREATE POLICY "Admins can insert rooms"
  ON rooms FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

-- Only admins can update rooms
CREATE POLICY "Admins can update rooms"
  ON rooms FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Only admins can delete rooms
CREATE POLICY "Admins can delete rooms"
  ON rooms FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- 9. RLS Policies for bookings table
DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can insert own bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can update all bookings" ON bookings;

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

-- 10. Function to automatically create profile when user signs up (SECURITY FIX)
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

-- 11. Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 12. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_room_id ON bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_rooms_category ON rooms(category);
CREATE INDEX IF NOT EXISTS idx_rooms_price ON rooms(price);

-- 13. Seed data - Standard student rooms
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
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- Instructions:
-- 1. Copy and run this script in Supabase SQL Editor
-- 2. To make a user an admin, first sign them up normally, then run:
--    UPDATE public.profiles SET role = 'admin' WHERE id = 'YOUR_USER_ID';
-- 3. You can find YOUR_USER_ID in the Supabase Authentication dashboard
-- ============================================
