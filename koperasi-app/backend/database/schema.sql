CREATE DATABASE IF NOT EXISTS db_koperasi;
USE db_koperasi;

-- ==========================================
-- 1. PEMBUATAN STRUKTUR TABEL (DDL)
-- ==========================================
CREATE TABLE IF NOT EXISTS members (
    id VARCHAR(20) PRIMARY KEY,
    nik VARCHAR(20) UNIQUE NOT NULL,
    nama VARCHAR(100) NOT NULL,
    dept VARCHAR(50) NOT NULL,
    gaji_pokok DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(20) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id) REFERENCES members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS savings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id VARCHAR(20) UNIQUE NOT NULL,
    pokok DECIMAL(12, 2) DEFAULT 0,
    wajib DECIMAL(12, 2) DEFAULT 0,
    sukarela DECIMAL(12, 2) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS loans (
    id VARCHAR(30) PRIMARY KEY,
    member_id VARCHAR(20) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    tenor INT NOT NULL,
    monthly_installment DECIMAL(12, 2) NOT NULL,
    remaining_amount DECIMAL(12, 2) NOT NULL,
    status ENUM('APPROVED', 'PAID_OFF') DEFAULT 'APPROVED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payrolls (
    id INT AUTO_INCREMENT PRIMARY KEY,
    period VARCHAR(7) NOT NULL,
    member_id VARCHAR(20) NOT NULL,
    gaji_pokok DECIMAL(12, 2) NOT NULL,
    pot_wajib DECIMAL(12, 2) NOT NULL,
    pot_cicilan DECIMAL(12, 2) NOT NULL,
    total_potongan DECIMAL(12, 2) NOT NULL,
    gaji_bersih DECIMAL(12, 2) NOT NULL,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

-- ==========================================
-- 2. SEED DATA MENGGUNAKAN REPLACE (AMAN DARI DUPLIKAT)
-- ==========================================
REPLACE INTO members (id, nik, nama, dept, gaji_pokok) VALUES
('KOP-001', '317101', 'Susanti', 'Bendahara Koperasi', 8500000),
('KOP-002', '317102', 'Ivan Sihite', 'Pengurus Koperasi', 7800000),
('KOP-003', '317103', 'Dewi Lestari', 'Finance', 9200000),
('KOP-004', '317105', 'Frans Dowell', 'IT', 7500000);

REPLACE INTO users (id, username, password, name, role) VALUES
('KOP-001', 'bendahara', 'bendahara123', 'Susanti', 'Bendahara Koperasi'),
('KOP-002', 'pengurus', 'pengurus123', 'Ivan Sihite', 'Pengurus Koperasi'),
('KOP-003', 'dewi', 'dewi123', 'Dewi Lestari', 'Karyawan / Anggota'),
('KOP-004', 'karyawan', 'karyawan123', 'Frans Dowell', 'Karyawan / Anggota');

REPLACE INTO savings (member_id, pokok, wajib, sukarela) VALUES
('KOP-001', 500000, 300000, 200000),
('KOP-002', 500000, 200000, 50000),
('KOP-003', 500000, 400000, 150000),
<<<<<<< HEAD
('KOP-004', 500000, 300000, 100000);
=======
('KOP-004', 500000, 300000, 100000);
>>>>>>> 9f4155a (Update notifikasi SweetAlert dan perbaikan data)
