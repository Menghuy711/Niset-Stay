-- ============================================================
--  Niset Stay — Migration: Critical + High Priority Fixes
--  Run BEFORE restarting the backend.
--  Compatible with MySQL 5.7+ and 8.0+
-- ============================================================

USE niset_stay;

-- ============================================================
-- 1. FIX: price FLOAT -> DECIMAL(10,2)  (Critical)
-- ============================================================
ALTER TABLE rooms MODIFY price DECIMAL(10,2) NOT NULL;

-- ============================================================
-- 2. FIX: total_price FLOAT -> DECIMAL(10,2)  (Critical)
-- ============================================================
ALTER TABLE bookings MODIFY total_price DECIMAL(10,2);

-- ============================================================
-- 3. FIX: status VARCHAR(50) -> ENUM  (High)
-- ============================================================
ALTER TABLE bookings MODIFY status ENUM('pending', 'confirmed', 'cancelled') NOT NULL DEFAULT 'pending';

-- ============================================================
-- 4. ADD: updated_at to bookings  (High)
-- ============================================================
DELIMITER //
DROP PROCEDURE IF EXISTS add_updated_at_column;
CREATE PROCEDURE add_updated_at_column()
BEGIN
    DECLARE col_count INT;
    SELECT COUNT(*) INTO col_count
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'niset_stay'
      AND TABLE_NAME = 'bookings'
      AND COLUMN_NAME = 'updated_at';
    IF col_count = 0 THEN
        ALTER TABLE bookings ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;
    END IF;
END //
DELIMITER ;

CALL add_updated_at_column();
DROP PROCEDURE add_updated_at_column;

-- ============================================================
-- 5. ADD: missing indexes  (High)
-- ============================================================
DELIMITER //
DROP PROCEDURE IF EXISTS add_indexes;
CREATE PROCEDURE add_indexes()
BEGIN
    DECLARE idx_count INT;

    -- idx_bookings_room
    SELECT COUNT(*) INTO idx_count
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = 'niset_stay'
      AND TABLE_NAME = 'bookings'
      AND INDEX_NAME = 'idx_bookings_room';
    IF idx_count = 0 THEN
        CREATE INDEX idx_bookings_room ON bookings(room_id);
    END IF;

    -- idx_bookings_status
    SELECT COUNT(*) INTO idx_count
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = 'niset_stay'
      AND TABLE_NAME = 'bookings'
      AND INDEX_NAME = 'idx_bookings_status';
    IF idx_count = 0 THEN
        CREATE INDEX idx_bookings_status ON bookings(status);
    END IF;
END //
DELIMITER ;

CALL add_indexes();
DROP PROCEDURE add_indexes;

-- ============================================================
-- 6. FIX: FK ON DELETE -> CASCADE for user, SET NULL for room  (Critical)
--     bookings.user_id cascades (user gone -> bookings gone).
--     bookings.room_id is created as SET NULL here so this step alone is
--     consistent with the final schema (see also audit fix 10 for DBs that
--     already ran an older version of this step with CASCADE).
-- ============================================================
DELIMITER //
DROP PROCEDURE IF EXISTS fix_foreign_keys;
CREATE PROCEDURE fix_foreign_keys()
BEGIN
    DECLARE fk_count INT;

    -- Drop fk_booking_user if exists
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = 'niset_stay'
      AND TABLE_NAME = 'bookings'
      AND CONSTRAINT_NAME = 'fk_booking_user'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY';
    IF fk_count > 0 THEN
        ALTER TABLE bookings DROP FOREIGN KEY fk_booking_user;
    END IF;

    -- Drop fk_booking_room if exists
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = 'niset_stay'
      AND TABLE_NAME = 'bookings'
      AND CONSTRAINT_NAME = 'fk_booking_room'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY';
    IF fk_count > 0 THEN
        ALTER TABLE bookings DROP FOREIGN KEY fk_booking_room;
    END IF;

    -- Recreate: user CASCADE, room SET NULL (deleting a room preserves history)
    ALTER TABLE bookings
        ADD CONSTRAINT fk_booking_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        ADD CONSTRAINT fk_booking_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL;
END //
DELIMITER ;

CALL fix_foreign_keys();
DROP PROCEDURE fix_foreign_keys;

-- ============================================================
-- 7. ADD: trigger for rooms.updated_at safety net  (Medium)
--    NOTE: This trigger duplicates the ON UPDATE CURRENT_TIMESTAMP
--    behavior already on rooms.updated_at and is redundant. It is
--    dropped in Step 10 (apply_audit_fixes). Kept here for
--    databases that ran this migration before Step 10 existed.
-- ============================================================
DELIMITER //
DROP PROCEDURE IF EXISTS add_update_trigger;
CREATE PROCEDURE add_update_trigger()
BEGIN
    DECLARE trig_count INT;
    SELECT COUNT(*) INTO trig_count
    FROM information_schema.TRIGGERS
    WHERE TRIGGER_SCHEMA = 'niset_stay'
      AND TRIGGER_NAME = 'trg_rooms_updated';
    IF trig_count > 0 THEN
        DROP TRIGGER trg_rooms_updated;
    END IF;
END //
DELIMITER ;

CALL add_update_trigger();
DROP PROCEDURE add_update_trigger;

CREATE TRIGGER trg_rooms_updated
BEFORE UPDATE ON rooms
FOR EACH ROW
SET NEW.updated_at = CURRENT_TIMESTAMP;

-- ============================================================
-- 8. ADD: users.phone  (Profile feature — Medium)
-- ============================================================
DELIMITER //
DROP PROCEDURE IF EXISTS add_users_phone;
CREATE PROCEDURE add_users_phone()
BEGIN
    DECLARE col_count INT;
    SELECT COUNT(*) INTO col_count
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'niset_stay'
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'phone';
    IF col_count = 0 THEN
        ALTER TABLE users ADD COLUMN phone VARCHAR(50) NULL AFTER full_name;
    END IF;
END //
DELIMITER ;

CALL add_users_phone();
DROP PROCEDURE add_users_phone;

-- ============================================================
-- 9. ROLES: user -> student + rooms.owner_user_id  (4-role system)
--    Roles: student | landlord | admin | super_admin
-- ============================================================
UPDATE users SET role = 'student' WHERE role = 'user';
ALTER TABLE users MODIFY role ENUM('student', 'landlord', 'admin', 'super_admin') NOT NULL DEFAULT 'student';

DELIMITER //
DROP PROCEDURE IF EXISTS add_rooms_owner;
CREATE PROCEDURE add_rooms_owner()
BEGIN
    DECLARE col_count INT;
    DECLARE fk_count INT;
    SELECT COUNT(*) INTO col_count
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'niset_stay'
      AND TABLE_NAME = 'rooms'
      AND COLUMN_NAME = 'owner_user_id';
    IF col_count = 0 THEN
        ALTER TABLE rooms ADD COLUMN owner_user_id INT NULL AFTER category;
    END IF;
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = 'niset_stay'
      AND TABLE_NAME = 'rooms'
      AND CONSTRAINT_NAME = 'fk_rooms_owner'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY';
    IF fk_count = 0 THEN
        ALTER TABLE rooms
            ADD CONSTRAINT fk_rooms_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END //
DELIMITER ;

CALL add_rooms_owner();
DROP PROCEDURE add_rooms_owner;

-- ============================================================
-- 10. Audit fixes (Code Audit Report, 2026-09)
--     Single-use reset tokens, FK SET NULL, redundant trigger,
--     explicit owner index
-- ============================================================
DELIMITER //
DROP PROCEDURE IF EXISTS apply_audit_fixes;
CREATE PROCEDURE apply_audit_fixes()
BEGIN
    DECLARE fk_count INT;
    DECLARE trig_count INT;
    DECLARE idx_count INT;
    DECLARE tab_count INT;

    -- a) Drop the redundant rooms.updated_at trigger (column is already
    --    ON UPDATE CURRENT_TIMESTAMP).
    SELECT COUNT(*) INTO trig_count
    FROM information_schema.TRIGGERS
    WHERE TRIGGER_SCHEMA = 'niset_stay'
      AND TRIGGER_NAME = 'trg_rooms_updated';
    IF trig_count > 0 THEN
        DROP TRIGGER trg_rooms_updated;
    END IF;

    -- b) bookings.room_id FK: CASCADE -> SET NULL so deleting a room keeps
    --    its booking history (room_title snapshot remains for display).
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = 'niset_stay'
      AND TABLE_NAME = 'bookings'
      AND CONSTRAINT_NAME = 'fk_booking_room'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY';
    IF fk_count > 0 THEN
        ALTER TABLE bookings DROP FOREIGN KEY fk_booking_room;
    END IF;
    ALTER TABLE bookings
        ADD CONSTRAINT fk_booking_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL;

    -- c) Explicit index on rooms.owner_user_id (landlord listings lookups).
    SELECT COUNT(*) INTO idx_count
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = 'niset_stay'
      AND TABLE_NAME = 'rooms'
      AND INDEX_NAME = 'idx_rooms_owner';
    IF idx_count = 0 THEN
        CREATE INDEX idx_rooms_owner ON rooms(owner_user_id);
    END IF;

    -- d) password_reset_tokens table (single-use, hash-backed reset tokens).
    SELECT COUNT(*) INTO tab_count
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = 'niset_stay'
      AND TABLE_NAME = 'password_reset_tokens';
    IF tab_count = 0 THEN
        CREATE TABLE password_reset_tokens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) NOT NULL,
            token_hash CHAR(64) NOT NULL UNIQUE,
            used_at DATETIME NULL,
            expires_at DATETIME NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_reset_email (email)
        ) ENGINE=InnoDB;
    END IF;
END //
DELIMITER ;

CALL apply_audit_fixes();
DROP PROCEDURE apply_audit_fixes;

-- ============================================================
-- 11. ADD: audit_logs table (sensitive admin/landlord writes)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
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
) ENGINE=InnoDB;

-- ============================================================
-- 12. One active booking per user+room (application + DB safety net)
--     Generated column substitutes for MySQL's missing partial indexes.
--     Guarded so this step is safe to re-run (e.g. against a DB already
--     created from schema.sql, which contains the final shape).
-- ============================================================
DELIMITER //
DROP PROCEDURE IF EXISTS add_active_slot;
CREATE PROCEDURE add_active_slot()
BEGIN
    DECLARE col_count INT;
    SELECT COUNT(*) INTO col_count
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'niset_stay'
      AND TABLE_NAME = 'bookings'
      AND COLUMN_NAME = 'active_slot';
    IF col_count = 0 THEN
        ALTER TABLE bookings
            ADD COLUMN active_slot TINYINT(1) GENERATED ALWAYS AS (
              IF(status IN ('pending', 'confirmed'), 1, NULL)
            ) STORED
            AFTER status;
    END IF;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS add_one_active_booking_index;
CREATE PROCEDURE add_one_active_booking_index()
BEGIN
    DECLARE idx_count INT;
    SELECT COUNT(*) INTO idx_count
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = 'niset_stay'
      AND TABLE_NAME = 'bookings'
      AND INDEX_NAME = 'idx_one_active_booking';
    IF idx_count = 0 THEN
        CREATE UNIQUE INDEX idx_one_active_booking ON bookings (user_id, room_id, active_slot);
    END IF;
END //
DELIMITER ;

CALL add_active_slot();
CALL add_one_active_booking_index();
DROP PROCEDURE add_active_slot;
DROP PROCEDURE add_one_active_booking_index;

-- ============================================================
-- 13. Landlord approval gate: unapproved landlords cannot list
--     rooms; registration sets 'pending' for new landlords.
-- ============================================================
DELIMITER //
DROP PROCEDURE IF EXISTS add_landlord_status;
CREATE PROCEDURE add_landlord_status()
BEGIN
    DECLARE col_count INT;
    SELECT COUNT(*) INTO col_count
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'niset_stay'
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'landlord_status';
    IF col_count = 0 THEN
        ALTER TABLE users
            ADD COLUMN landlord_status ENUM('pending', 'approved', 'rejected') NULL DEFAULT NULL AFTER role;
    END IF;
END //
DELIMITER ;

CALL add_landlord_status();
DROP PROCEDURE add_landlord_status;

-- ============================================================
-- 14. ADD: rooms.latitude / rooms.longitude  (Proximity search)
--     Free-form map_query stays for the embedded map; numeric
--     coordinates power the "near my university" distance filter.
-- ============================================================
DELIMITER //
DROP PROCEDURE IF EXISTS add_rooms_coordinates;
CREATE PROCEDURE add_rooms_coordinates()
BEGIN
    DECLARE col_count INT;
    SELECT COUNT(*) INTO col_count
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'niset_stay'
      AND TABLE_NAME = 'rooms'
      AND COLUMN_NAME = 'latitude';
    IF col_count = 0 THEN
        ALTER TABLE rooms ADD COLUMN latitude DECIMAL(10,7) NULL AFTER map_query;
    END IF;

    SELECT COUNT(*) INTO col_count
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'niset_stay'
      AND TABLE_NAME = 'rooms'
      AND COLUMN_NAME = 'longitude';
    IF col_count = 0 THEN
        ALTER TABLE rooms ADD COLUMN longitude DECIMAL(10,7) NULL AFTER latitude;
    END IF;
END //
DELIMITER ;

CALL add_rooms_coordinates();
DROP PROCEDURE add_rooms_coordinates;

-- ============================================================
-- 15. ADD: universities table + Phnom Penh campus reference seed
--     Approximate WGS84 coordinates (good enough for a ~1 km
--     proximity filter; can be refined per campus later).
-- ============================================================
CREATE TABLE IF NOT EXISTS universities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    short_name VARCHAR(50),
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

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

-- ============================================================
-- 16. ADD: landlord property management schema
--     floors, students, bills + room floor/status/student columns.
--     Safe to re-run: guarded by information_schema checks. A DB that
--     already received an earlier "tenants" draft is converted in place.
-- ============================================================
DELIMITER //
DROP PROCEDURE IF EXISTS add_property_management_schema;
CREATE PROCEDURE add_property_management_schema()
BEGIN
    DECLARE tab_count INT;
    DECLARE col_count INT;
    DECLARE fk_count INT;
    DECLARE idx_count INT;

    -- a) floors table
    SELECT COUNT(*) INTO tab_count
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = 'niset_stay' AND TABLE_NAME = 'floors';
    IF tab_count = 0 THEN
        CREATE TABLE floors (
            id INT AUTO_INCREMENT PRIMARY KEY,
            owner_user_id INT NOT NULL,
            label VARCHAR(100) NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_floors_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
        CREATE INDEX idx_floors_owner ON floors(owner_user_id);
    END IF;

    -- b) convert any legacy "tenants" naming to "students" in place.
    --    Foreign keys must be dropped before columns/table are renamed.
    SELECT COUNT(*) INTO col_count
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'niset_stay' AND TABLE_NAME = 'rooms' AND COLUMN_NAME = 'tenant_id';
    IF col_count > 0 THEN
        SELECT COUNT(*) INTO fk_count
        FROM information_schema.TABLE_CONSTRAINTS
        WHERE CONSTRAINT_SCHEMA = 'niset_stay' AND TABLE_NAME = 'rooms'
          AND CONSTRAINT_NAME = 'fk_rooms_tenant' AND CONSTRAINT_TYPE = 'FOREIGN KEY';
        IF fk_count > 0 THEN
            ALTER TABLE rooms DROP FOREIGN KEY fk_rooms_tenant;
        END IF;

        ALTER TABLE rooms CHANGE COLUMN tenant_id student_id INT NULL;

        SELECT COUNT(*) INTO idx_count
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = 'niset_stay' AND TABLE_NAME = 'rooms' AND INDEX_NAME = 'idx_rooms_tenant';
        IF idx_count > 0 THEN
            ALTER TABLE rooms RENAME INDEX idx_rooms_tenant TO idx_rooms_student;
        END IF;
    END IF;

    SELECT COUNT(*) INTO col_count
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'niset_stay' AND TABLE_NAME = 'bills' AND COLUMN_NAME = 'tenant_id';
    IF col_count > 0 THEN
        SELECT COUNT(*) INTO fk_count
        FROM information_schema.TABLE_CONSTRAINTS
        WHERE CONSTRAINT_SCHEMA = 'niset_stay' AND TABLE_NAME = 'bills'
          AND CONSTRAINT_NAME = 'fk_bills_tenant' AND CONSTRAINT_TYPE = 'FOREIGN KEY';
        IF fk_count > 0 THEN
            ALTER TABLE bills DROP FOREIGN KEY fk_bills_tenant;
        END IF;

        ALTER TABLE bills CHANGE COLUMN tenant_id student_id INT NULL;

        SELECT COUNT(*) INTO idx_count
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = 'niset_stay' AND TABLE_NAME = 'bills' AND INDEX_NAME = 'idx_bills_tenant';
        IF idx_count > 0 THEN
            ALTER TABLE bills RENAME INDEX idx_bills_tenant TO idx_bills_student;
        END IF;
    END IF;

    SELECT COUNT(*) INTO tab_count
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = 'niset_stay' AND TABLE_NAME = 'tenants';
    IF tab_count > 0 THEN
        ALTER TABLE tenants RENAME TO students;
    END IF;

    SELECT COUNT(*) INTO fk_count
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = 'niset_stay' AND TABLE_NAME = 'students'
      AND CONSTRAINT_NAME = 'fk_tenants_owner' AND CONSTRAINT_TYPE = 'FOREIGN KEY';
    IF fk_count > 0 THEN
        ALTER TABLE students DROP FOREIGN KEY fk_tenants_owner;
        ALTER TABLE students ADD CONSTRAINT fk_students_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;

    SELECT COUNT(*) INTO idx_count
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = 'niset_stay' AND TABLE_NAME = 'students' AND INDEX_NAME = 'idx_tenants_owner';
    IF idx_count > 0 THEN
        ALTER TABLE students RENAME INDEX idx_tenants_owner TO idx_students_owner;
    END IF;

    -- c) students table
    SELECT COUNT(*) INTO tab_count
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = 'niset_stay' AND TABLE_NAME = 'students';
    IF tab_count = 0 THEN
        CREATE TABLE students (
            id INT AUTO_INCREMENT PRIMARY KEY,
            owner_user_id INT NOT NULL,
            full_name VARCHAR(255) NOT NULL,
            phone VARCHAR(50),
            email VARCHAR(255),
            notes TEXT,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_students_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
        CREATE INDEX idx_students_owner ON students(owner_user_id);
    END IF;

    -- d) rooms.floor_id / status / student_id
    SELECT COUNT(*) INTO col_count
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'niset_stay' AND TABLE_NAME = 'rooms' AND COLUMN_NAME = 'floor_id';
    IF col_count = 0 THEN
        ALTER TABLE rooms ADD COLUMN floor_id INT NULL AFTER category;
    END IF;

    SELECT COUNT(*) INTO col_count
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'niset_stay' AND TABLE_NAME = 'rooms' AND COLUMN_NAME = 'status';
    IF col_count = 0 THEN
        ALTER TABLE rooms ADD COLUMN status ENUM('available', 'occupied') NOT NULL DEFAULT 'available' AFTER floor_id;
    END IF;

    SELECT COUNT(*) INTO col_count
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'niset_stay' AND TABLE_NAME = 'rooms' AND COLUMN_NAME = 'student_id';
    IF col_count = 0 THEN
        ALTER TABLE rooms ADD COLUMN student_id INT NULL AFTER status;
    END IF;

    -- Deleting a floor removes the floor and every room on it, so the room's
    -- floor FK must cascade. Older drafts used ON DELETE SET NULL; upgrade it.
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = 'niset_stay' AND TABLE_NAME = 'rooms' AND CONSTRAINT_NAME = 'fk_rooms_floor'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
      AND EXISTS (
          SELECT 1 FROM information_schema.REFERENTIAL_CONSTRAINTS rc
           WHERE rc.CONSTRAINT_SCHEMA = 'niset_stay'
             AND rc.TABLE_NAME = 'rooms'
             AND rc.CONSTRAINT_NAME = 'fk_rooms_floor'
             AND rc.DELETE_RULE = 'CASCADE'
      );
    IF fk_count = 0 THEN
        SELECT COUNT(*) INTO col_count
        FROM information_schema.TABLE_CONSTRAINTS
        WHERE CONSTRAINT_SCHEMA = 'niset_stay' AND TABLE_NAME = 'rooms' AND CONSTRAINT_NAME = 'fk_rooms_floor'
          AND CONSTRAINT_TYPE = 'FOREIGN KEY';
        IF col_count > 0 THEN
            ALTER TABLE rooms DROP FOREIGN KEY fk_rooms_floor;
        END IF;

        ALTER TABLE rooms ADD CONSTRAINT fk_rooms_floor FOREIGN KEY (floor_id) REFERENCES floors(id) ON DELETE CASCADE;
    END IF;

    SELECT COUNT(*) INTO fk_count
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = 'niset_stay' AND TABLE_NAME = 'rooms' AND CONSTRAINT_NAME = 'fk_rooms_student'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY';
    IF fk_count = 0 THEN
        ALTER TABLE rooms ADD CONSTRAINT fk_rooms_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL;
    END IF;

    SELECT COUNT(*) INTO idx_count
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = 'niset_stay' AND TABLE_NAME = 'rooms' AND INDEX_NAME = 'idx_rooms_floor';
    IF idx_count = 0 THEN
        CREATE INDEX idx_rooms_floor ON rooms(floor_id);
    END IF;

    SELECT COUNT(*) INTO idx_count
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = 'niset_stay' AND TABLE_NAME = 'rooms' AND INDEX_NAME = 'idx_rooms_student';
    IF idx_count = 0 THEN
        CREATE INDEX idx_rooms_student ON rooms(student_id);
    END IF;

    -- e) bills table
    SELECT COUNT(*) INTO tab_count
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = 'niset_stay' AND TABLE_NAME = 'bills';
    IF tab_count = 0 THEN
        CREATE TABLE bills (
            id INT AUTO_INCREMENT PRIMARY KEY,
            landlord_id INT NOT NULL,
            student_id INT NULL,
            room_id INT NULL,
            amount DECIMAL(10,2) NOT NULL,
            period DATE NOT NULL,
            due_date DATE NOT NULL,
            status ENUM('issued', 'paid') NOT NULL DEFAULT 'issued',
            paid_at DATETIME NULL,
            sent_at DATETIME NULL,
            note VARCHAR(255),
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_bills_landlord FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE,
            CONSTRAINT fk_bills_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL,
            CONSTRAINT fk_bills_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
        ) ENGINE=InnoDB;
        CREATE INDEX idx_bills_landlord ON bills(landlord_id);
        CREATE INDEX idx_bills_student ON bills(student_id);
        CREATE INDEX idx_bills_period ON bills(period);
    END IF;

    SELECT COUNT(*) INTO fk_count
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = 'niset_stay' AND TABLE_NAME = 'bills' AND CONSTRAINT_NAME = 'fk_bills_landlord'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY';
    IF fk_count = 0 THEN
        ALTER TABLE bills ADD CONSTRAINT fk_bills_landlord FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;

    SELECT COUNT(*) INTO fk_count
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = 'niset_stay' AND TABLE_NAME = 'bills' AND CONSTRAINT_NAME = 'fk_bills_student'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY';
    IF fk_count = 0 THEN
        ALTER TABLE bills ADD CONSTRAINT fk_bills_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL;
    END IF;

    SELECT COUNT(*) INTO fk_count
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = 'niset_stay' AND TABLE_NAME = 'bills' AND CONSTRAINT_NAME = 'fk_bills_room'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY';
    IF fk_count = 0 THEN
        ALTER TABLE bills ADD CONSTRAINT fk_bills_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL;
    END IF;

    SELECT COUNT(*) INTO idx_count
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = 'niset_stay' AND TABLE_NAME = 'bills' AND INDEX_NAME = 'idx_bills_landlord';
    IF idx_count = 0 THEN
        CREATE INDEX idx_bills_landlord ON bills(landlord_id);
    END IF;

    SELECT COUNT(*) INTO idx_count
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = 'niset_stay' AND TABLE_NAME = 'bills' AND INDEX_NAME = 'idx_bills_student';
    IF idx_count = 0 THEN
        CREATE INDEX idx_bills_student ON bills(student_id);
    END IF;

    SELECT COUNT(*) INTO idx_count
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = 'niset_stay' AND TABLE_NAME = 'bills' AND INDEX_NAME = 'idx_bills_period';
    IF idx_count = 0 THEN
        CREATE INDEX idx_bills_period ON bills(period);
    END IF;
END //
DELIMITER ;

CALL add_property_management_schema();
DROP PROCEDURE add_property_management_schema;

-- ============================================================
-- 17. ADD: management fees add-on schema
--     landlord_addons (subscription: monthly/yearly, active/cancelled)
--     + management_fees invoices. Safe to re-run: every table/index is
--     declared via CREATE TABLE IF NOT EXISTS with inline keys.
-- ============================================================
CREATE TABLE IF NOT EXISTS landlord_addons (
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
    INDEX idx_addons_owner (owner_user_id),
    CONSTRAINT fk_addons_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS management_fees (
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
    INDEX idx_mf_landlord (landlord_id),
    INDEX idx_mf_room (room_id),
    CONSTRAINT fk_mf_landlord FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_mf_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
);

-- ============================================================
-- 18. ADD: students details + itemized billing schema
--     students.student_type/nationality/id_document_url/visa_expiry_date/
--     contract_start/contract_end; billing_config (rates + first payment
--     settings); bills.usage_from/usage_to; bill_items (line items with
--     meter readings). Safe to re-run: every DDL is guarded.
-- ============================================================
DELIMITER //
DROP PROCEDURE IF EXISTS add_students_billing_schema;
CREATE PROCEDURE add_students_billing_schema()
BEGIN
    DECLARE col_count INT;
    DECLARE tab_count INT;

    SELECT COUNT(*) INTO tab_count
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = 'niset_stay' AND TABLE_NAME = 'billing_config';
    IF tab_count = 0 THEN
        CREATE TABLE billing_config (
            landlord_id INT PRIMARY KEY,
            home_name VARCHAR(255),
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
    END IF;

    SELECT COUNT(*) INTO tab_count
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = 'niset_stay' AND TABLE_NAME = 'bill_items';
    IF tab_count = 0 THEN
        CREATE TABLE bill_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            bill_id INT NOT NULL,
            kind ENUM('rent', 'electricity', 'water', 'trash', 'additional', 'oneoff') NOT NULL,
            label VARCHAR(255),
            quantity DECIMAL(10,2) NULL,
            rate DECIMAL(10,2) NULL,
            amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            prev_reading DECIMAL(10,2) NULL,
            curr_reading DECIMAL(10,2) NULL,
            CONSTRAINT fk_bill_items_bill FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
        );
    END IF;

    SELECT COUNT(*) INTO col_count
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'niset_stay' AND TABLE_NAME = 'students' AND COLUMN_NAME = 'student_type';
    IF col_count = 0 THEN
        ALTER TABLE students
            ADD COLUMN student_type ENUM('daily', 'monthly') NOT NULL DEFAULT 'monthly' AFTER notes,
            ADD COLUMN nationality VARCHAR(100) NULL AFTER student_type,
            ADD COLUMN id_document_url VARCHAR(255) NULL AFTER nationality,
            ADD COLUMN visa_expiry_date DATE NULL AFTER id_document_url,
            ADD COLUMN contract_start DATE NULL AFTER visa_expiry_date,
            ADD COLUMN contract_end DATE NULL AFTER contract_start;
    END IF;

    SELECT COUNT(*) INTO col_count
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'niset_stay' AND TABLE_NAME = 'bills' AND COLUMN_NAME = 'usage_from';
    IF col_count = 0 THEN
        ALTER TABLE bills
            ADD COLUMN usage_from DATE NULL AFTER period,
            ADD COLUMN usage_to DATE NULL AFTER usage_from;
    END IF;

    SELECT COUNT(*) INTO col_count
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = 'niset_stay' AND TABLE_NAME = 'bill_items' AND INDEX_NAME = 'idx_bill_items_bill';
    IF col_count = 0 THEN
        CREATE INDEX idx_bill_items_bill ON bill_items(bill_id);
    END IF;

    SELECT COUNT(*) INTO col_count
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = 'niset_stay' AND TABLE_NAME = 'students' AND INDEX_NAME = 'idx_students_type';
    IF col_count = 0 THEN
        CREATE INDEX idx_students_type ON students(student_type);
    END IF;
END //
DELIMITER ;

CALL add_students_billing_schema();
DROP PROCEDURE add_students_billing_schema;

-- ============================================================
-- 19. ADD: users.image_url (profile avatar)
--     Safe to re-run: guarded by information_schema check.
-- ============================================================
DELIMITER //
DROP PROCEDURE IF EXISTS add_users_image_url;
CREATE PROCEDURE add_users_image_url()
BEGIN
    DECLARE col_count INT;
    SELECT COUNT(*) INTO col_count
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'niset_stay'
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'image_url';
    IF col_count = 0 THEN
        ALTER TABLE users ADD COLUMN image_url VARCHAR(500) NULL AFTER is_active;
    END IF;
END //
DELIMITER ;

CALL add_users_image_url();
DROP PROCEDURE add_users_image_url;

-- ============================================================
-- 20. ADD: billing_config.home_address (home info shown on invoices)
--     Safe to re-run: guarded by information_schema check.
-- ============================================================
DELIMITER //
DROP PROCEDURE IF EXISTS add_home_address;
CREATE PROCEDURE add_home_address()
BEGIN
    DECLARE col_count INT;
    SELECT COUNT(*) INTO col_count
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'niset_stay'
      AND TABLE_NAME = 'billing_config'
      AND COLUMN_NAME = 'home_address';
    IF col_count = 0 THEN
        ALTER TABLE billing_config ADD COLUMN home_address VARCHAR(500) NULL AFTER home_name;
    END IF;
END //
DELIMITER ;

CALL add_home_address();
DROP PROCEDURE add_home_address;

-- ============================================================
-- 21. ADD: feedback_messages (profile "send a note to the team")
--     Safe to re-run: guarded by information_schema check.
-- ============================================================
DELIMITER //
DROP PROCEDURE IF EXISTS add_feedback_messages;
CREATE PROCEDURE add_feedback_messages()
BEGIN
    DECLARE tbl_count INT;
    SELECT COUNT(*) INTO tbl_count
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = 'niset_stay'
      AND TABLE_NAME = 'feedback_messages';
    IF tbl_count = 0 THEN
        CREATE TABLE feedback_messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NULL,
            message TEXT NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_feedback_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        );
    END IF;
END //
DELIMITER ;

CALL add_feedback_messages();
DROP PROCEDURE add_feedback_messages;

-- ============================================================
-- 22. CHANGE: landlord approval step removed
--     Landlords register already 'approved' — there is no admin review.
--     Existing 'pending' / 'rejected' accounts are leftovers of the old
--     flow; free them all so every landlord can use the portal immediately.
--     Safe to re-run (idempotent UPDATE).
-- ============================================================
UPDATE users
   SET landlord_status = 'approved'
 WHERE role = 'landlord'
   AND landlord_status IN ('pending', 'rejected');

-- ============================================================
-- 23. DROP: rooms.category (redundant on a student-housing-only platform)
--     Removed field entirely; title/description already describe the room.
--     Safe to re-run: guarded by information_schema check.
-- ============================================================
DELIMITER //
DROP PROCEDURE IF EXISTS drop_rooms_category;
CREATE PROCEDURE drop_rooms_category()
BEGIN
    DECLARE col_count INT;
    SELECT COUNT(*) INTO col_count
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'niset_stay'
      AND TABLE_NAME = 'rooms'
      AND COLUMN_NAME = 'category';
    IF col_count > 0 THEN
        ALTER TABLE rooms DROP COLUMN category;
    END IF;
END //
DELIMITER ;

CALL drop_rooms_category();
DROP PROCEDURE drop_rooms_category;
