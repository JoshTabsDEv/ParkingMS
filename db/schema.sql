CREATE DATABASE IF NOT EXISTS parking_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE parking_management;

CREATE TABLE IF NOT EXISTS parking_slots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  label VARCHAR(20) NOT NULL UNIQUE,
  level VARCHAR(30) NOT NULL,
  type ENUM('standard', 'compact', 'electric', 'accessible') DEFAULT 'standard',
  status ENUM('available', 'occupied', 'maintenance') DEFAULT 'available',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parking_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slot_id INT NOT NULL,
  vehicle_plate VARCHAR(20) NOT NULL,
  vehicle_type VARCHAR(30) NOT NULL,
  driver_name VARCHAR(120) NOT NULL,
  check_in TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  check_out TIMESTAMP NULL DEFAULT NULL,
  hourly_rate DECIMAL(10, 2) NOT NULL DEFAULT 40.00,
  amount_due DECIMAL(10, 2) DEFAULT 0.00,
  status ENUM('active', 'closed') DEFAULT 'active',
  CONSTRAINT fk_slot FOREIGN KEY (slot_id) REFERENCES parking_slots (id) ON DELETE CASCADE
);

INSERT INTO parking_slots (label, level, type, status)
VALUES
  ('A-01', 'Basement 1', 'standard', 'available'),
  ('A-02', 'Basement 1', 'standard', 'available'),
  ('B-01', 'Ground', 'accessible', 'available'),
  ('C-09', 'Roof', 'electric', 'maintenance')
ON DUPLICATE KEY UPDATE level = VALUES(level);

