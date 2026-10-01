CREATE DATABASE IF NOT EXISTS db_koperasi;
USE db_koperasi;

-- Table User Aplikasi
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table Anggota Karyawan
CREATE TABLE IF NOT EXISTS members (
  id VARCHAR(20) PRIMARY KEY,
  nik VARCHAR(20) UNIQUE NOT NULL,
  nama VARCHAR(100) NOT NULL,
  dept VARCHAR(50) NOT NULL,
  gaji_pokok DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table Saldo Simpanan Karyawan
CREATE TABLE IF NOT EXISTS savings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id VARCHAR(20) UNIQUE NOT NULL,
  pokok DECIMAL(12, 2) DEFAULT 0,
  wajib DECIMAL(12, 2) DEFAULT 0,
  sukarela DECIMAL(12, 2) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

-- Table Pinjaman Karyawan
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

-- Table Riwayat Payroll Deduction
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

-- Seed Data Awal
INSERT INTO users (username, password, name, role) VALUES
('bendahara', 'bendahara123', 'Susanti', 'Bendahara Koperasi'),
('pengurus', 'pengurus123', 'Ivan Sihite', 'Pengurus Koperasi'),
('karyawan', 'karyawan123', 'Frans Dowell', 'Karyawan / Anggota');

INSERT INTO members (id, nik, nama, dept, gaji_pokok) VALUES
('KOP-001', '317101', 'Budi Santoso', 'IT Support', 8500000),
('KOP-002', '317102', 'Siti Rahma', 'Human Resources', 7800000),
('KOP-003', '317103', 'Dewi Lestari', 'Finance', 9200000);

INSERT INTO savings (member_id, pokok, wajib, sukarela) VALUES
('KOP-001', 500000, 300000, 200000),
('KOP-002', 500000, 200000, 50000),
('KOP-003', 500000, 400000, 150000);