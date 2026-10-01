require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'koperasi_secret_key_2026';

// Koneksi Database MySQL (TiDB Cloud / MySQL)
const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 4000,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'db_koperasi',
  ssl: {
    rejectUnauthorized: true
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Middleware Authentikasi JWT (Opsional untuk route terlindungi)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Akses ditolak. Token tidak ditemukan.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token tidak valid.' });
    req.user = user;
    next();
  });
};

// ================= API ENDPOINTS =================

// 1. AUTHENTICATION (LOGIN)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Username atau password salah!' });
    }

    const user = rows[0];
    const isValidPass = (password === user.password) || await bcrypt.compare(password, user.password);

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
    res.status(500).json({ error: error.message });
  }
});

// 2. DASHBOARD SUMMARY
app.get('/api/dashboard/summary', async (req, res) => {
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

// 3. MEMBERS (ANGGOTA)
app.get('/api/members', async (req, res) => {
  try {
    const [members] = await db.query('SELECT id, nik, nama, dept, gaji_pokok AS gajiPokok FROM members');
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. SIMPANAN (SAVINGS)
app.get('/api/savings', async (req, res) => {
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

app.post('/api/savings', async (req, res) => {
  try {
    const { memberId, type, amount } = req.body;
    
    if (!['pokok', 'wajib', 'sukarela'].includes(type)) {
      return res.status(400).json({ message: 'Tipe simpanan tidak valid' });
    }

    const query = `
      INSERT INTO savings (member_id, ${type}) VALUES (?, ?)
      ON DUPLICATE KEY UPDATE ${type} = ${type} + VALUES(${type})
    `;
    await db.query(query, [memberId, amount]);

    res.json({ message: 'Setoran simpanan berhasil ditambahkan' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. PINJAMAN (LOANS)
app.get('/api/loans', async (req, res) => {
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

app.post('/api/loans', async (req, res) => {
  try {
    const { memberId, amount, tenor } = req.body;

    const pokok = amount / tenor;
    const bunga = amount * 0.01; // 1% Bunga per bulan
    const monthly = pokok + bunga;
    const remaining = monthly * tenor;
    const loanId = 'L-' + Date.now();

    await db.query(`
      INSERT INTO loans (id, member_id, amount, tenor, monthly_installment, remaining_amount, status)
      VALUES (?, ?, ?, ?, ?, ?, 'APPROVED')
    `, [loanId, memberId, amount, tenor, monthly, remaining]);

    res.status(201).json({ message: 'Pengajuan pinjaman disetujui', loanId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. PAYROLL DEDUCTION
app.get('/api/payrolls', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.id, p.period, p.member_id AS memberId, m.nama, 
             CAST(p.gaji_pokok AS UNSIGNED) AS gajiPokok,
             CAST(p.pot_wajib AS UNSIGNED) AS potWajib, 
             CAST(p.pot_cicilan AS UNSIGNED) AS potCicilan, 
             CAST(p.total_potongan AS UNSIGNED) AS totalPotongan, 
             CAST(p.gaji_bersih AS UNSIGNED) AS gajiBersih
      FROM payrolls p
      JOIN members m ON p.member_id = m.id
      ORDER BY p.processed_at DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/payrolls/process', async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { period } = req.body;
    if (!period) return res.status(400).json({ message: 'Periode harus diisi' });

    await connection.beginTransaction();

    const [members] = await connection.query('SELECT id, gaji_pokok FROM members');
    const wajibNominal = 100000;

    for (const m of members) {
      // 1. Tambah Simpanan Wajib Rutin
      await connection.query(`
        INSERT INTO savings (member_id, wajib) VALUES (?, ?)
        ON DUPLICATE KEY UPDATE wajib = wajib + VALUES(wajib)
      `, [m.id, wajibNominal]);

      // 2. Cek Pinjaman Aktif
      const [loans] = await connection.query(
        'SELECT id, monthly_installment, remaining_amount FROM loans WHERE member_id = ? AND remaining_amount > 0 AND status = "APPROVED" LIMIT 1',
        [m.id]
      );

      let potCicilan = 0;
      if (loans.length > 0) {
        const activeLoan = loans[0];
        potCicilan = Math.min(Number(activeLoan.monthly_installment), Number(activeLoan.remaining_amount));
        const newRemaining = Number(activeLoan.remaining_amount) - potCicilan;
        const newStatus = newRemaining <= 0 ? 'PAID_OFF' : 'APPROVED';

        await connection.query(
          'UPDATE loans SET remaining_amount = ?, status = ? WHERE id = ?',
          [newRemaining, newStatus, activeLoan.id]
        );
      }

      // 3. Simpan Rekap Payroll
      const totalPotongan = wajibNominal + potCicilan;
      const gajiBersih = Number(m.gaji_pokok) - totalPotongan;

      await connection.query(`
        INSERT INTO payrolls (period, member_id, gaji_pokok, pot_wajib, pot_cicilan, total_potongan, gaji_bersih)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [period, m.id, m.gaji_pokok, wajibNominal, potCicilan, totalPotongan, gajiBersih]);
    }

    await connection.commit();
    res.json({ message: `Pemotongan gaji periode ${period} berhasil diproses` });

  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// START SERVER
app.listen(PORT, () => {
  console.log(`Server Backend Koperasi berjalan di http://localhost:${PORT}`);
});

module.exports = app;