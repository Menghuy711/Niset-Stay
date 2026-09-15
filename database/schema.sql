-- ============================================================
--  Niset Stay — complete MySQL schema
--  Run this single file in MySQL Workbench to set up from scratch.
--
--  SAFETY: this file no longer DROPs the database. If you truly need
--  a clean slate, delete the database first explicitly (e.g. in
--  Workbench or `DROP DATABASE niset_stay;`) and then run this file.
--  Re-running this file against an existing database will fail loudly
--  on the first existing table instead of silently wiping your data.
-- ============================================================

CREATE DATABASE IF NOT EXISTS niset_stay CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE niset_stay;

-- ------------------------------------------------------------
-- users
-- ------------------------------------------------------------
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    phone VARCHAR(50),
    role ENUM('student', 'landlord', 'admin', 'super_admin') NOT NULL DEFAULT 'student',
    -- NULL for non-landlords; landlords register already active (no approval)
    landlord_status ENUM('pending', 'approved', 'rejected') NULL DEFAULT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    image_url VARCHAR(500) NULL,                     -- profile avatar (uploaded file or asset name)
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- rooms (full detail-page fields)
-- ------------------------------------------------------------
CREATE TABLE rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    address VARCHAR(500),
    price DECIMAL(10,2) NOT NULL,                     -- per month, exact precision
    beds INT NOT NULL DEFAULT 1,
    baths INT NOT NULL DEFAULT 1,
    sqft INT NOT NULL DEFAULT 1200,
    image_url VARCHAR(500) DEFAULT 'property-1.jpg',
    badge VARCHAR(100),
    owner_user_id INT,                              -- landlord account that owns this listing
    description TEXT,

    ref_id VARCHAR(50),
    thumb_images JSON,                               -- ["url1","url2"]
    map_query VARCHAR(255),
    latitude DECIMAL(10,7),                          -- room pin (WGS84)
    longitude DECIMAL(10,7),                         -- room pin (WGS84)
    amenities JSON,                                  -- ["Wifi","AC"]
    owner_name VARCHAR(255),
    owner_phone VARCHAR(50),
    owner_email VARCHAR(255),
    owner_telegram VARCHAR(100),
    contract_terms TEXT,
    deposit_terms TEXT,
    pet_policy TEXT,
    utilities_terms TEXT,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- bookings
-- ------------------------------------------------------------
CREATE TABLE bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    room_id INT,

    room_title VARCHAR(255),                         -- snapshot at booking time
    room_image VARCHAR(500),
    room_price VARCHAR(50),

    full_name VARCHAR(255),
    phone VARCHAR(50),
    occupants INT NOT NULL DEFAULT 1,
    move_in DATETIME,
    check_in DATETIME,
    check_out DATETIME,
    total_price DECIMAL(10,2),
    status ENUM('pending', 'confirmed', 'cancelled') NOT NULL DEFAULT 'pending',
    -- Mirrors active status for the (user_id, room_id, active_slot) unique
    -- index below: 1 while pending/confirmed, NULL otherwise. MySQL has no
    -- partial indexes, so a generated column is the portable safety net that
    -- allows multiple cancelled bookings but only one active booking per user+room.
    active_slot TINYINT(1) GENERATED ALWAYS AS (
      IF(status IN ('pending', 'confirmed'), 1, NULL)
    ) STORED,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_booking_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    -- SET NULL (not CASCADE): deleting a room must preserve booking history.
    CONSTRAINT fk_booking_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
);

-- Rooms can be owned by a landlord account
ALTER TABLE rooms
    ADD CONSTRAINT fk_rooms_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL;

-- ------------------------------------------------------------
-- floors (levels defined by a landlord for their property)
-- ------------------------------------------------------------
CREATE TABLE floors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_user_id INT NOT NULL,
    label VARCHAR(100) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_floors_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- students (residents registered with a landlord)
-- ------------------------------------------------------------
-- A registered student may or may not be assigned to a room yet. Occupancy is
-- derived from rooms.status, NOT from the student count.
CREATE TABLE students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_user_id INT NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_students_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Optional details: stay type (daily/monthly), nationality, ID/passport image,
-- visa expiry, and contract window. Flags (visa expiring/expired, contract
-- expired) are derived and surfaced by the API, not stored.
ALTER TABLE students
    ADD COLUMN student_type ENUM('daily', 'monthly') NOT NULL DEFAULT 'monthly' AFTER notes,
    ADD COLUMN nationality VARCHAR(100) NULL AFTER student_type,
    ADD COLUMN id_document_url VARCHAR(255) NULL AFTER nationality,
    ADD COLUMN visa_expiry_date DATE NULL AFTER id_document_url,
    ADD COLUMN contract_start DATE NULL AFTER visa_expiry_date,
    ADD COLUMN contract_end DATE NULL AFTER contract_start;

-- ------------------------------------------------------------
-- rooms: floor + occupancy status + assigned student
-- ------------------------------------------------------------
-- status mirrors assignment: 'available' unless a student is assigned.
ALTER TABLE rooms
    ADD COLUMN floor_id INT NULL AFTER badge,
    ADD COLUMN status ENUM('available', 'occupied') NOT NULL DEFAULT 'available' AFTER floor_id,
    ADD COLUMN student_id INT NULL AFTER status,
    ADD CONSTRAINT fk_rooms_floor FOREIGN KEY (floor_id) REFERENCES floors(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_rooms_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL;

-- ------------------------------------------------------------
-- bills (rent/utility invoices issued by a landlord)
-- ------------------------------------------------------------
CREATE TABLE bills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    landlord_id INT NOT NULL,
    student_id INT NULL,
    room_id INT NULL,
    amount DECIMAL(10,2) NOT NULL,
    period DATE NOT NULL,                          -- first day of the billing month
    due_date DATE NOT NULL,
    status ENUM('issued', 'paid') NOT NULL DEFAULT 'issued',
    paid_at DATETIME NULL,
    sent_at DATETIME NULL,
    note VARCHAR(255),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_bills_landlord FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_bills_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL,
    CONSTRAINT fk_bills_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
);

-- Usage window for itemized bills. `amount` stays the running total and
-- `period` stays the billing month, so dashboards and existing reports keep
-- working; the fine-grained items live in billing.bill_items.
ALTER TABLE bills
    ADD COLUMN usage_from DATE NULL AFTER period,
    ADD COLUMN usage_to DATE NULL AFTER usage_from;

-- ------------------------------------------------------------
-- billing_config (one row per landlord: the rates every bill starts from)
-- ------------------------------------------------------------
CREATE TABLE billing_config (
    landlord_id INT PRIMARY KEY,
    home_name VARCHAR(255),
    home_address VARCHAR(500),
    default_room_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    electricity_rate DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    water_rate DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    trash_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    default_billing_day INT NOT NULL DEFAULT 1,
    first_bill_exclude_utilities TINYINT(1) NOT NULL DEFAULT 0,
    upfront_months INT NOT NULL DEFAULT 0,
    additional_fees JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_billing_config_landlord FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- bill_items (line items on a bill, including meter readings)
-- ------------------------------------------------------------
CREATE TABLE bill_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bill_id INT NOT NULL,
    kind ENUM('rent', 'electricity', 'water', 'trash', 'additional', 'oneoff') NOT NULL,
    label VARCHAR(255),
    quantity DECIMAL(10,2) NULL,                   -- months for rent/oneoff
    rate DECIMAL(10,2) NULL,                       -- $/kWh, $/m3, or item unit price
    amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    prev_reading DECIMAL(10,2) NULL,
    curr_reading DECIMAL(10,2) NULL,
    CONSTRAINT fk_bill_items_bill FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
);

CREATE INDEX idx_bill_items_bill ON bill_items(bill_id);
CREATE INDEX idx_students_type ON students(student_type);

CREATE INDEX idx_floors_owner ON floors(owner_user_id);
CREATE INDEX idx_students_owner ON students(owner_user_id);
CREATE INDEX idx_rooms_floor ON rooms(floor_id);
CREATE INDEX idx_rooms_student ON rooms(student_id);
CREATE INDEX idx_bills_landlord ON bills(landlord_id);
CREATE INDEX idx_bills_student ON bills(student_id);
CREATE INDEX idx_bills_period ON bills(period);

CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_room ON bookings(room_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE UNIQUE INDEX idx_one_active_booking ON bookings (user_id, room_id, active_slot);
CREATE INDEX idx_rooms_created ON rooms(created_at);
CREATE INDEX idx_rooms_owner ON rooms(owner_user_id);

-- ------------------------------------------------------------
-- landlord_addons (subscriptions for paid add-ons like management fees)
-- ------------------------------------------------------------
-- One row per owner + add-on. Status is stored ('active'|'cancelled') and the
-- 'expired' state is derived when an active subscription's expires_at passes.
CREATE TABLE landlord_addons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_user_id INT NOT NULL,
    addon VARCHAR(64) NOT NULL DEFAULT 'management_fees',
    plan ENUM('monthly', 'yearly') NOT NULL,
    started_at DATE NOT NULL,
    expires_at DATE NOT NULL,
    status ENUM('active', 'cancelled') NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_addon_owner (owner_user_id, addon),
    CONSTRAINT fk_addons_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- management_fees (invoices to room owners for maintenance & service)
-- ------------------------------------------------------------
-- Each invoice bills the OWNER of a room (not the student). Existing invoices
-- stay readable after the add-on lapses; creating new ones needs an active
-- add-on. Only pending invoices may be deleted.
CREATE TABLE management_fees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    landlord_id INT NOT NULL,
    room_id INT NULL,
    owner_name VARCHAR(255),
    owner_contact VARCHAR(255),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    due_date DATE NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    line_items JSON NULL,
    total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status ENUM('pending', 'paid') NOT NULL DEFAULT 'pending',
    paid_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_mf_landlord FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE,
    -- SET NULL (not CASCADE): deleting a room must preserve the fee history.
    CONSTRAINT fk_mf_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
);

CREATE INDEX idx_addons_owner ON landlord_addons(owner_user_id);
CREATE INDEX idx_mf_landlord ON management_fees(landlord_id);
CREATE INDEX idx_mf_room ON management_fees(room_id);

-- ------------------------------------------------------------
-- universities (campus reference data for proximity search)
-- ------------------------------------------------------------
CREATE TABLE universities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    short_name VARCHAR(50),
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- password reset tokens (single-use, hash-backed)
-- ------------------------------------------------------------
-- Stores a SHA-256 hash of each password reset token so an account can only
-- be reset once per request, within a 15-minute window. The raw token is
-- never persisted.
CREATE TABLE password_reset_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,             -- sha256 hex of the raw token
    used_at DATETIME NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_reset_email (email)
);

-- ------------------------------------------------------------
-- audit logs (every sensitive admin/landlord write)
-- ------------------------------------------------------------
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    actor_id INT NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_table VARCHAR(50),
    target_id INT,
    detail JSON,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_actor (actor_id),
    INDEX idx_audit_action (action),
    INDEX idx_audit_created (created_at)
);

-- ------------------------------------------------------------
-- feedback_messages (notes sent to the team from the profile page)
-- ------------------------------------------------------------
CREATE TABLE feedback_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    message TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_feedback_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- Trigger: keep rooms.updated_at in sync even for raw SQL updates
-- ------------------------------------------------------------
-- NOTE: dropped — the updated_at column already has ON UPDATE
-- CURRENT_TIMESTAMP, which renders this trigger redundant.
--
-- DELIMITER //
-- CREATE TRIGGER trg_rooms_updated
-- BEFORE UPDATE ON rooms
-- FOR EACH ROW
-- BEGIN
--     SET NEW.updated_at = CURRENT_TIMESTAMP;
-- END //
-- DELIMITER ;

-- ------------------------------------------------------------
-- Seed data
-- ------------------------------------------------------------
-- This file is structure-only. All development / e2e fixture rows
-- (including the PUBLIC known-password accounts and the landlord-owned
-- room that the Playwright suites rely on) live in database/seed.sql,
-- which must be run separately:
--
--     mysql -u root niset_stay < database/seed.sql
--
-- schema/seed separation guarantees a production schema import can never
-- silently create super-admin and admin logins with documented passwords.
