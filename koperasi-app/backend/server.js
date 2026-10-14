require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// 1. MIDDLEWARE CORS & BODY PARSER
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'koperasi_secret_key_2026';

// 2. KONFIGURASI DATABASE MYSQL / TIDB CLOUD
const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10) || 4000,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'db_koperasi',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// SSL Kompatibel untuk TiDB Cloud / Remote DB di Vercel
if (process.env.DB_HOST && !['localhost', '127.0.0.1'].includes(process.env.DB_HOST)) {
  dbConfig.ssl = { rejectUnauthorized: false };
}

const db = mysql.createPool(dbConfig);

// 3. MIDDLEWARE AUTENTIKASI JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Akses ditolak. Token tidak ditemukan.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token tidak valid atau telah kadaluwarsa.' });
    req.user = user;
    next();
  });
};

// ================= API ENDPOINTS =================

// 0. HEALTH CHECK
app.get(['/', '/api'], (req, res) => {
  res.json({ message: 'API Backend Koperasi Berhasil Berjalan di Vercel!' });
});

// Handler Logika Login yang Disempurnakan
async function handleLogin(req, res) {
  try {
    const { username, password } = req.body;
    console.log("Mencoba login untuk username:", username);

    if (!username || !password) {
      return res.status(400).json({ message: 'Username dan password wajib diisi!' });
    }

    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    console.log("Hasil query user dari DB:", rows);

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Username atau password salah!' });
    }

    const user = rows[0];
    console.log("Data user ditemukan di DB:", user.username);

    let isValidPass = false;
    // Karena password di database Anda tersimpan sebagai teks biasa (plain text)
    if (user.password && (user.password.startsWith('$2b$') || user.password.startsWith('$2a$'))) {
        isValidPass = await bcrypt.compare(password, user.password);
    } else {
        isValidPass = (password === user.password);
    }

    console.log("Hasil validasi password (isValidPass):", isValidPass);

    if (!isValidPass) {
        return res.status(400).json({ message: 'Username atau password salah!' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      message: 'Login berhasil',
      token,
      user: { id: user.id, username: user.username, name: user.name, role: user.role }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Daftarkan rute login secara spesifik
app.post(['/login', '/api/auth/login', '/api/login'], handleLogin);

// 1. DASHBOARD SUMMARY
app.get(['/dashboard/summary', '/api/dashboard/summary'], async (req, res) => {
  try {
    const [[savingsRes]] = await db.query('SELECT COALESCE(SUM(pokok + wajib + sukarela), 0) AS totalSavings FROM savings');
    const [[loansRes]] = await db.query('SELECT COALESCE(SUM(remaining_amount), 0) AS totalLoans FROM loans WHERE status = "APPROVED"');
    const [[membersRes]] = await db.query('SELECT COUNT(*) AS totalMembers FROM members');

    res.json({
      totalSavings: Number(savingsRes.totalSavings),
      totalLoans: Number(loansRes.totalLoans),
      totalMembers: Number(membersRes.totalMembers)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. MEMBERS (ANGGOTA)
app.get(['/members', '/api/members'], authenticateToken, async (req, res) => {
  try {
    const [members] = await db.query('SELECT id, nik, nama, dept, gaji_pokok AS gajiPokok FROM members');
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/members', async (req, res) => {
    const { nik, nama, dept, gaji_pokok, username, password, role } = req.body;
    
    try {
        const [rows] = await db.query('SELECT COUNT(*) as total FROM members');
        const nextIdNum = rows[0].total + 1;
        const id = `KOP-${String(nextIdNum).padStart(3, '0')}`;

        await db.query(
            'INSERT INTO members (id, nik, nama, dept, gaji_pokok) VALUES (?, ?, ?, ?, ?)',
            [id, nik, nama, dept, gaji_pokok]
        );

        await db.query(
            'INSERT INTO users (id, username, password, name, role) VALUES (?, ?, ?, ?, ?)',
            [id, username, password, nama, role || 'Karyawan / Anggota']
        );

        await db.query(
            'INSERT INTO savings (member_id, pokok, wajib, sukarela) VALUES (?, 0, 0, 0)',
            [id]
        );

        res.status(201).json({ 
            success: true, 
            message: `Anggota ${nama} berhasil ditambahkan dengan ID ${id}!`,
            memberId: id 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal menambahkan anggota: ' + error.message 
        });
    }
});

// 3. SIMPANAN (SAVINGS)
app.get(['/savings', '/api/savings'], authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT s.member_id AS memberId, m.nama, 
             CAST(s.pokok AS UNSIGNED) AS pokok, 
             CAST(s.wajib AS UNSIGNED) AS wajib, 
             CAST(s.sukarela AS UNSIGNED) AS sukarela
      FROM savings s
      JOIN members m ON s.member_id = m.id
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. PINJAMAN (LOANS)
app.get(['/loans', '/api/loans'], authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT l.id, l.member_id AS memberId, m.nama, 
             CAST(l.amount AS UNSIGNED) AS amount, 
             l.tenor, 
             CAST(l.monthly_installment AS UNSIGNED) AS monthly, 
             CAST(l.remaining_amount AS UNSIGNED) AS remaining, 
             l.status
      FROM loans l
      JOIN members m ON l.member_id = m.id
      ORDER BY l.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: err.message || 'Terjadi kesalahan pada server.' });
});

// Menjalankan listener lokal
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server Backend Koperasi berjalan di http://localhost:${PORT}`);
  });
}

// Export Express App untuk Vercel
module.exports = app;