-- ============================================
-- Niset Stay - Complete Database Setup Script
-- Run this in Supabase SQL Editor
-- Fresh Installation - August 2026
-- ============================================

-- 1. Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Drop existing tables if they exist (CAUTION: This will delete all data)
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 3. Drop existing functions and triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin(UUID) CASCADE;

-- 4. Create profiles table for role-based access control
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create rooms table (services/products)
CREATE TABLE rooms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  address TEXT,
  price NUMERIC(10, 2) NOT NULL,
  category TEXT,
  badge TEXT,
  beds INTEGER DEFAULT 1,
  baths INTEGER DEFAULT 1,
  sqft INTEGER,
  image_url TEXT,
  thumb_images TEXT[],
  map_query TEXT,
  ref_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create bookings table
CREATE TABLE bookings (
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

-- 7. Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- 8. Create SECURITY DEFINER function to check admin role without RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin(p_uid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_uid AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. RLS Policies for profiles table
CREATE POLICY "Everyone can view profiles"
  ON profiles FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can manage profiles"
  ON profiles FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- 10. RLS Policies for rooms table
CREATE POLICY "Everyone can view rooms"
  ON rooms FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can insert rooms"
  ON rooms FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update rooms"
  ON rooms FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete rooms"
  ON rooms FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- 11. RLS Policies for bookings table
CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can insert own bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update all bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete bookings"
  ON bookings FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- 12. Function to automatically create profile when user signs up (SECURITY FIX)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    'user'  -- ALWAYS set to 'user' to prevent privilege escalation
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 14. Create indexes for better performance
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_room_id ON bookings(room_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_rooms_category ON rooms(category);
CREATE INDEX idx_rooms_price ON rooms(price);
CREATE INDEX idx_profiles_role ON profiles(role);

-- 15. Insert seed data - Standard student rooms
INSERT INTO rooms (title, description, address, price, category, badge, beds, baths, sqft, image_url, thumb_images, map_query, ref_id)
VALUES 
  (
    'Time Square BKK room',
    'Modern student room in the heart of BKK area, close to universities. Fully furnished with air conditioning, high-speed WiFi, and all utilities included. Perfect for students looking for comfort and convenience.',
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
    'Comfortable accommodation near Boeung Kak lake area. Ideal for students with easy access to public transportation and nearby universities. Includes bed, desk, and wardrobe.',
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
    'Affordable room in Teuk Thla, perfect for students on a budget. Quiet neighborhood with 24/7 security. Close to shopping centers and restaurants.',
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
    'Premium student accommodation near Wat Phnom. Spacious room with 2 beds, perfect for sharing. Modern amenities and excellent location in the city center.',
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
    'Budget-friendly room with great amenities. Includes free WiFi, air conditioning, and access to shared kitchen. Great community atmosphere.',
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
    'Central location with easy access to campus. Modern building with elevator, parking, and laundry facilities. Perfect for students who value convenience.',
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
    'Quiet study environment in Tuol Svay Prey. Perfect for serious students who need a peaceful place to focus. Walking distance to major universities.',
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
    'Premium location near riverside. Stunning views and modern facilities. Includes gym access and rooftop lounge. For students who want the best.',
    'Tonle Bassac, Chamkar Mon, Phnom Penh, Cambodia',
    180.00,
    'Student Room',
    NULL,
    2, 1, 1120,
    'property-8.jpg',
    ARRAY['property-3.jpg', 'property-4.jpg', 'property-5.jpg', 'property-6.jpg'],
    'Tonle%20Bassac%20Phnom%20Penh',
    'C21_R02462'
  ),
  (
    'Khroom',
    'Stylish room in the popular BKK1 neighborhood. Close to cafes, restaurants, and nightlife. Perfect for social students who want to be in the heart of the action.',
    'BKK1, Chamkar Mon, Phnom Penh, Cambodia',
    77.50,
    'Student Room',
    NULL,
    1, 1, 2350,
    'property-9.jpg',
    ARRAY['property-3.jpg', 'property-4.jpg', 'property-5.jpg', 'property-6.jpg'],
    'BKK1%20Phnom%20Penh',
    'C21_R02463'
  ),
  (
    'Mekong Breeze Residence',
    'Peaceful location in Kandal with river views. Away from the city noise but still accessible. Includes parking and outdoor space.',
    'Areyksat, Kandal, Cambodia',
    100.00,
    'Student Room',
    NULL,
    2, 1, 1950,
    'property-10.jpg',
    ARRAY['property-3.jpg', 'property-4.jpg', 'property-5.jpg', 'property-6.jpg'],
    'Areyksat%20Kandal',
    'C21_R02464'
  ),
  (
    'Lotus Student Apartment',
    'Purpose-built student housing with study rooms, gym, and social spaces. All-inclusive rent with utilities and WiFi. Community events regularly.',
    'Tuol Sangke, Russey Keo, Phnom Penh, Cambodia',
    85.00,
    'Student Room',
    NULL,
    1, 1, 1580,
    'property-11.jpg',
    ARRAY['property-3.jpg', 'property-4.jpg', 'property-5.jpg', 'property-6.jpg'],
    'Tuol%20Sangke%20Phnom%20Penh',
    'C21_R02465'
  ),
  (
    'Sunrise Comfort Room',
    'Modern room near Olympic Stadium. Great for sports enthusiasts with nearby running tracks and fitness facilities. Safe and secure area.',
    'Olympic Area, Prampir Meakkakra, Phnom Penh, Cambodia',
    95.00,
    'Student Room',
    NULL,
    2, 1, 1120,
    'property-3.jpg',
    ARRAY['property-3.jpg', 'property-4.jpg', 'property-5.jpg', 'property-6.jpg'],
    'Olympic%20Phnom%20Penh',
    'C21_R02466'
  );

-- ============================================
-- Setup Complete!
-- 
-- Next Steps:
-- 1. To make yourself an admin, first sign up through the app
-- 2. Then find your user ID in: Supabase Dashboard → Authentication → Users
-- 3. Run this command with your actual user ID:
--
--    UPDATE public.profiles 
--    SET role = 'admin' 
--    WHERE id = 'YOUR_USER_ID_HERE';
--
-- 4. Refresh the page and navigate to /admin
-- ============================================

-- Verify installation
SELECT 'Setup completed successfully!' as status,
       (SELECT COUNT(*) FROM rooms) as total_rooms,
       (SELECT COUNT(*) FROM profiles) as total_profiles,
       (SELECT COUNT(*) FROM bookings) as total_bookings;
