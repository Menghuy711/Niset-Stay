-- ============================================================
--  Niset Stay — e2e / development seed fixture
--
--  WARNING: These accounts and their passwords are PUBLIC test
--  credentials, committed so the Playwright suites and local dev
--  have a known-good dataset. NEVER use these in production.
--
--  Passwords (documented so the suite can reset state):
--    superadmin@nisetstay.com  / superadmin123   (super_admin)
--    admin@nisetstay.com       / admin123        (admin)
--    student@test.com          / password123     (student)
--    student01@test.com        / password123     (student)
--    test3@example.com         / password123     (student)
--    landlord@test.com         / landlord123     (landlord)
--
--  e2e specs depend on these exact emails/roles, and landlord.spec.js
--  also relies on a room titled 'Landlord Studio near RUPP' owned by
--  landlord@test.com. See that row below.
--
--  Run after schema.sql / migration.sql:
--      mysql -u root niset_stay < database/seed.sql
--  Idempotent on re-run: users use INSERT ... ON DUPLICATE KEY, and the named
--  'Landlord Studio near RUPP' fixture is deleted before re-inserting.
-- ============================================================

USE niset_stay;

SET SQL_SAFE_UPDATES = 0;

INSERT INTO users (email, full_name, role, landlord_status, hashed_password) VALUES
('superadmin@nisetstay.com', 'Super Administrator', 'super_admin', NULL,
 '$2a$12$CpYmUDUDYudAhta1jGPKLu/SHGzRB3WJAez8mfBUfy8J.wqhjnQA.'),
('admin@nisetstay.com', 'Administrator', 'admin', NULL,
 '$2a$12$A17olhy6UAqWlNo.rnWAg.Ys4.sT5Jtgd0V0ZSTsOGBysf6A9bk7C'),
('student@test.com', 'Test Student', 'student', NULL,
 '$2a$12$izkYzZjReN8bwGZAq7s6POFh8J9CSawHdKDfo5/0CLpHX56iZy.yS'),
('student01@test.com', 'Student One', 'student', NULL,
 '$2a$12$GXLawHdpbH1fY0s6Damw7OjT7/3Bty6D.I0CwYVbUkJ0LNbvQKS.e'),
('test3@example.com', 'Test Three', 'student', NULL,
 '$2a$12$lQWoZDtvC58XItbpKnoAW.UZX26wPG6j5sv2eGN.KKpRfM5FpAztG'),
('landlord@test.com', 'Landlord Test', 'landlord', 'approved',
 '$2a$12$XhXIX9XDaYKhhzvCqtCXIeBJCtElhSabWhvvfQK2j3lUXnezDL1vi')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), role = VALUES(role),
  landlord_status = VALUES(landlord_status), hashed_password = VALUES(hashed_password);

-- A landlord-owned listing the landlord.e2e suite asserts exists.
-- owner_user_id must reference landlord@test.com's actual id once seeded.
-- Derive the id from a variable so the file self-heals on re-run. Rooms have
-- no natural unique key, so wipe this named fixture before re-inserting it —
-- that is what keeps the file idempotent (and the portal listing unique).
SET @landlord_id = (SELECT id FROM users WHERE email = 'landlord@test.com');

-- Campus reference data for the "near my university" proximity filter.
-- Coordinates are approximate WGS84 pins (same rows as migration.sql step 15).
INSERT INTO universities (name, short_name, latitude, longitude) VALUES
('Royal University of Phnom Penh',      'RUPP',   11.5699000, 104.8916000),
('Institute of Technology of Cambodia', 'ITC',    11.5708000, 104.8990000),
('Royal University of Law and Economics','RULE',  11.5661000, 104.8854000),
('National University of Management',   'NUM',    11.5589000, 104.8997000),
('Pannasastra University of Cambodia',  'PUC',    11.5660000, 104.8790000),
('American University of Phnom Penh',   'AUPP',   11.5529000, 104.8832000),
('Norton University',                   'Norton', 11.5616000, 104.9033000),
('University of Cambodia',              'UC',     11.5450000, 104.9016000)
ON DUPLICATE KEY UPDATE
    short_name = VALUES(short_name),
    latitude = VALUES(latitude),
    longitude = VALUES(longitude);

DELETE FROM rooms WHERE title = 'Landlord Studio near RUPP';

INSERT INTO rooms
(title, address, price, beds, baths, sqft, image_url, badge, description,
 ref_id, thumb_images, map_query, latitude, longitude, amenities,
 owner_name, owner_phone, owner_email, owner_telegram,
 contract_terms, deposit_terms, pet_policy, utilities_terms, owner_user_id)
VALUES
('Landlord Studio near RUPP', 'RUPP Campus, Phnom Penh', 150.00, 1, 1, 400,
 'property-1.jpg', 'Popular',
 'A tidy studio a short walk from RUPP — quiet, safe, and student-friendly.',
 'NS-L01', JSON_ARRAY('property-3.jpg', 'property-4.jpg'),
 'Royal%20University%20of%20Phnom%20Penh', 11.5699000, 104.8916000,
 JSON_ARRAY('Wifi', 'Air Conditioning', 'Study Desk'),
 'Landlord Test', '+855 12 000 001', 'landlord1@nisetstay.com', '@landlord_test',
 'Minimum 6-month contract.', 'One month deposit.', 'No pets.', 'Utilities billed separately.',
 @landlord_id);
