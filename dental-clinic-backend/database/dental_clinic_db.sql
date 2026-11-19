-- Dental Clinic backend: database setup for XAMPP MySQL/MariaDB.
-- Only the database is needed. Spring Boot (spring.jpa.hibernate.ddl-auto=update) creates every
-- table on first start, and the DataInitializer creates the admin user + starter master data.
-- Run it in phpMyAdmin > SQL tab, or:  C:\xampp\mysql\bin\mysql -u root < database\dental_clinic_db.sql

CREATE DATABASE IF NOT EXISTS dental_clinic_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Optional: wipe everything and start again (tables are re-created on next backend start)
-- DROP DATABASE dental_clinic_db;
