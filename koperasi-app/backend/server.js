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
  res.json({ message: 'API Backend Koperasi Berhasil Berjalan!' });
});

// Handler Logika Login
async function handleLogin(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username dan password wajib diisi!' });
    }

    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0) {
      return res.status(400).json({ message: 'Username atau password salah!' });
    }

    const user = rows[0];
    let isValidPass = false;
    
    if (user.password && (user.password.startsWith('$2b$') || user.password.startsWith('$2a$'))) {
        isValidPass = await bcrypt.compare(password, user.password);
    } else {
        isValidPass = (password === user.password);
    }

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

app.post(['/login', '/api/login', '/auth/login', '/api/auth/login'], handleLogin);

// 1. DASHBOARD SUMMARY
app.get(['/dashboard/summary', '/api/dashboard/summary'], async (req, res) => {
  try {
    const [[savingsRes]] = await db.query('SELECT COALESCE(SUM(pokok + wajib + sukarela), 0) AS totalSavings FROM savings');
    const [[loansRes]] = await db.query('SELECT COALESCE(SUM(remaining_amount), 0) AS totalLoans FROM loans WHERE status IN ("APPROVED", "DISBURSED")');
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

app.post(['/members', '/api/members'], authenticateToken, async (req, res) => {
    const { nik, nama, dept, gaji_pokok, username, password, role } = req.body;
    
    // Validasi input wajib
    if (!nik || !nama || !username || !password) {
        return res.status(400).json({ success: false, message: 'NIK, Nama, Username, dan Password wajib diisi!' });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Generate ID Anggota Baru (KOP-XXX)
        const [lastMember] = await connection.query(`
            SELECT id FROM members 
            WHERE id LIKE 'KOP-%' 
            ORDER BY CAST(SUBSTRING(id, 5) AS UNSIGNED) DESC 
            LIMIT 1
        `);
        
        let nextIdNum = 1;
        if (lastMember.length > 0) {
            const lastId = lastMember[0].id; 
            const numPart = parseInt(lastId.replace('KOP-', ''), 10);
            if (!isNaN(numPart)) nextIdNum = numPart + 1;
        }
        const id = `KOP-${String(nextIdNum).padStart(3, '0')}`;

        // 2. Simpan ke tabel members
        await connection.query(
            'INSERT INTO members (id, nik, nama, dept, gaji_pokok) VALUES (?, ?, ?, ?, ?)',
            [id, nik, nama, dept, gaji_pokok]
        );

        // 3. ENKRIPSI PASSWORD MENGGUNAKAN BCRYPT
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. Simpan ke tabel users dengan password yang sudah di-hash
        await connection.query(
            'INSERT INTO users (id, username, password, name, role) VALUES (?, ?, ?, ?, ?)',
            [id, username, hashedPassword, nama, role || 'Karyawan / Anggota']
        );

        // 5. Buat baris awal di tabel savings
        await connection.query(
            'INSERT INTO savings (member_id, pokok, wajib, sukarela) VALUES (?, 0, 0, 0)',
            [id]
        );

        await connection.commit();

        res.status(201).json({ 
            success: true, 
            message: `Anggota ${nama} berhasil ditambahkan dengan ID ${id}!`,
            memberId: id 
        });
    } catch (error) {
        await connection.rollback();
        console.error('TiDB Error:', error);

        if (error.code === 'ER_DUP_ENTRY' || error.message.includes('Duplicate entry')) {
            return res.status(400).json({ success: false, message: `NIK atau Username sudah terdaftar di sistem!` });
        }

        res.status(500).json({ success: false, message: 'Gagal menambahkan anggota: ' + error.message });
    } finally {
        connection.release();
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

app.post(['/savings', '/api/savings'], authenticateToken, async (req, res) => {
    const { memberId, member_id, type, amount } = req.body;
    const mId = memberId || member_id;

    try {
        if (!mId || !type || !amount) {
            return res.status(400).json({ success: false, message: 'Data setoran simpanan tidak lengkap!' });
        }

        const numAmount = Number(amount);
        let columnToUpdate = '';

        if (type.toLowerCase() === 'pokok') columnToUpdate = 'pokok';
        else if (type.toLowerCase() === 'wajib') columnToUpdate = 'wajib';
        else if (type.toLowerCase() === 'sukarela') columnToUpdate = 'sukarela';
        else return res.status(400).json({ success: false, message: 'Jenis simpanan tidak valid!' });

        const [existing] = await db.query('SELECT * FROM savings WHERE member_id = ?', [mId]);

        if (existing.length > 0) {
            await db.query(
                `UPDATE savings SET ${columnToUpdate} = ${columnToUpdate} + ? WHERE member_id = ?`,
                [numAmount, mId]
            );
        } else {
            const initialPokok = columnToUpdate === 'pokok' ? numAmount : 0;
            const initialWajib = columnToUpdate === 'wajib' ? numAmount : 0;
            const initialSukarela = columnToUpdate === 'sukarela' ? numAmount : 0;

            await db.query(
                'INSERT INTO savings (member_id, pokok, wajib, sukarela) VALUES (?, ?, ?, ?)',
                [mId, initialPokok, initialWajib, initialSukarela]
            );
        }

        res.status(201).json({
            success: true,
            message: `Setoran simpanan ${type} sebesar Rp ${numAmount.toLocaleString('id-ID')} berhasil ditambahkan!`
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Gagal menyimpan setoran: ' + error.message });
    }
});

// ==========================================
// ENDPOINT PENCAIRAN SIMPANAN SUKARELA
// ==========================================

// A. Karyawan Mengajukan Pencairan
app.post(['/savings/withdraw', '/api/savings/withdraw'], authenticateToken, async (req, res) => {
    const { amount } = req.body;
    const memberId = req.user.id;

    try {
        const numAmount = Number(amount);
        if (!numAmount || numAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Nominal pencairan tidak valid!' });
        }

        const [savings] = await db.query('SELECT sukarela FROM savings WHERE member_id = ?', [memberId]);
        if (savings.length === 0) return res.status(404).json({ success: false, message: 'Data simpanan tidak ditemukan' });

        const saldoSukarela = Number(savings[0].sukarela || 0);
        if (numAmount > saldoSukarela) {
            return res.status(400).json({ success: false, message: `Saldo sukarela Anda tidak cukup. Saldo saat ini: Rp ${saldoSukarela.toLocaleString('id-ID')}` });
        }

        const [pending] = await db.query("SELECT id FROM savings_withdrawals WHERE member_id = ? AND status = 'PENDING'", [memberId]);
        if (pending.length > 0) {
            return res.status(400).json({ success: false, message: 'Anda masih memiliki pengajuan pencairan yang menunggu verifikasi Bendahara.' });
        }

        const wdId = `WD-${Date.now()}-${memberId}`;

        await db.query(
            "INSERT INTO savings_withdrawals (id, member_id, jumlah, status) VALUES (?, ?, ?, 'PENDING')",
            [wdId, memberId, numAmount]
        );

        res.status(201).json({ success: true, message: 'Pengajuan pencairan berhasil. Silakan tunggu verifikasi Bendahara.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Gagal mengajukan pencairan: ' + error.message });
    }
});

// B. Bendahara Menyetujui Pencairan
app.post(['/savings/withdraw/:id/approve', '/api/savings/withdraw/:id/approve'], authenticateToken, async (req, res) => {
    const withdrawalId = req.params.id;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [withdrawals] = await connection.query("SELECT * FROM savings_withdrawals WHERE id = ? AND status = 'PENDING'", [withdrawalId]);
        if (withdrawals.length === 0) throw new Error('Pengajuan tidak ditemukan atau sudah diproses.');

        const wd = withdrawals[0];

        await connection.query(
            "UPDATE savings SET sukarela = sukarela - ? WHERE member_id = ?",
            [wd.jumlah, wd.member_id]
        );

        await connection.query("UPDATE savings_withdrawals SET status = 'APPROVED' WHERE id = ?", [withdrawalId]);

        await connection.commit();
        res.json({ success: true, message: 'Pencairan disetujui dan saldo telah dipotong!' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ success: false, message: 'Gagal memproses pencairan: ' + error.message });
    } finally {
        connection.release();
    }
});

// C. Admin Melihat Daftar Pengajuan
app.get(['/savings/withdrawals/pending', '/api/savings/withdrawals/pending'], authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT w.id, w.member_id AS memberId, m.nama, w.jumlah, w.status, w.created_at 
            FROM savings_withdrawals w
            JOIN members m ON w.member_id = m.id
            WHERE w.status = 'PENDING'
            ORDER BY w.created_at ASC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json([]);
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

app.post(['/loans', '/api/loans'], authenticateToken, async (req, res) => {
    const { memberId, member_id, amount, tenor, purpose } = req.body;
    const mId = memberId || member_id;

    try {
        if (!mId || !amount || !tenor) {
            return res.status(400).json({ success: false, message: 'Data pinjaman tidak lengkap!' });
        }

         const [activeLoans] = await db.query(
            "SELECT id FROM loans WHERE member_id = ? AND status IN ('PENDING', 'APPROVED', 'DISBURSED', 'PENDING_PAYOFF')",
            [mId]
        );

        if (activeLoans.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Gagal! Anda masih memiliki pinjaman yang sedang berjalan atau menunggu persetujuan. Silakan lunasi terlebih dahulu.' 
            });
        }

        const numAmount = Number(amount);
        const numTenor = Number(tenor);
        
        const principalPerMonth = numAmount / numTenor;
        const interestPerMonth = numAmount * 0.01;
        const monthlyInstallment = Math.round(principalPerMonth + interestPerMonth);
        
        const totalRemaining = 0; 

        const [rows] = await db.query('SELECT COUNT(*) as total FROM loans');
        const nextIdNum = rows[0].total + 1;
        const loanId = `L-${String(nextIdNum).padStart(3, '0')}`;

        await db.query(
            'INSERT INTO loans (id, member_id, amount, tenor, monthly_installment, remaining_amount, purpose, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [loanId, mId, numAmount, numTenor, monthlyInstallment, totalRemaining, purpose || 'Pinjaman Koperasi', 'PENDING']
        );

        res.status(201).json({
            success: true,
            message: 'Pengajuan pinjaman berhasil dikirim dan menunggu persetujuan pengurus!'
        });
    } catch (error) {
        console.error('Loan Error:', error);
        res.status(500).json({ success: false, message: 'Gagal mengajukan pinjaman: ' + error.message });
    }
});

app.get(['/loans/pending', '/api/loans/pending'], authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT l.id, l.member_id AS memberId, m.nama AS nama, m.nama AS memberName, m.nik AS nik,
             CAST(l.amount AS UNSIGNED) AS amount, l.tenor, 
             CAST(l.monthly_installment AS UNSIGNED) AS monthlyInstallment,
             CAST(l.monthly_installment AS UNSIGNED) AS monthly, l.purpose, l.status
      FROM loans l
      JOIN members m ON l.member_id = m.id
      WHERE l.status = 'PENDING'
      ORDER BY l.id DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json([]);
  }
});

// Endpoint Approve Pinjaman (Mengubah status jadi APPROVED - Siap Cair)
app.post(['/loans/approve', '/api/loans/approve'], authenticateToken, async (req, res) => {
    try {
        const loanId = req.body.id || req.body.loanId || req.body.loan_id;
        if (!loanId) {
            return res.status(400).json({ success: false, message: 'ID Pinjaman tidak disertakan!' });
        }
        
        const [loans] = await db.query('SELECT tenor, monthly_installment FROM loans WHERE id = ?', [loanId]);
        if (loans.length === 0) {
            return res.status(404).json({ success: false, message: 'Data pinjaman tidak ditemukan!' });
        }

        const loan = loans[0];
        const calculatedRemaining = Number(loan.monthly_installment) * Number(loan.tenor);

        await db.query(
            `UPDATE loans SET status = 'APPROVED', remaining_amount = ? WHERE id = ?`,
            [calculatedRemaining, loanId]
        );

        res.json({ success: true, message: 'Pengajuan pinjaman disetujui. Silakan lakukan pencairan dana.' });
    } catch (error) {
        console.error('Approve Loan Error:', error);
        res.status(500).json({ success: false, message: 'Gagal menyetujui pinjaman: ' + error.message });
    }
});

// Endpoint Disburse Pinjaman (Pencairan Dana oleh Bendahara)
app.post(['/loans/:id/disburse', '/api/loans/:id/disburse'], authenticateToken, async (req, res) => {
    try {
        const loanId = req.params.id;
        
        const [result] = await db.query(
            "UPDATE loans SET status = 'DISBURSED' WHERE id = ? AND status = 'APPROVED'",
            [loanId]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({ success: false, message: 'Pinjaman belum disetujui atau sudah dicairkan.' });
        }

        res.json({ success: true, message: 'Dana pinjaman berhasil dicairkan!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Gagal mencairkan dana: ' + error.message });
    }
});

app.post(['/loans/reject', '/api/loans/reject'], authenticateToken, async (req, res) => {
    try {
        const loanId = req.body.id || req.body.loanId || req.body.loan_id;
        if (!loanId) return res.status(400).json({ success: false, message: 'ID Pinjaman tidak disertakan!' });
        
        const [result] = await db.query(`UPDATE loans SET status = 'REJECTED', remaining_amount = 0 WHERE id = ?`, [loanId]);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Data pinjaman tidak ditemukan!' });

        res.json({ success: true, message: 'Pengajuan pinjaman berhasil ditolak.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Gagal menolak pinjaman: ' + error.message });
    }
});

// Endpoint Ajukan Pelunasan (Karyawan)
app.post(['/loans/:id/request-payoff', '/api/loans/:id/request-payoff'], authenticateToken, async (req, res) => {
    try {
        const loanId = req.params.id;
        
        const [loans] = await db.query("SELECT * FROM loans WHERE id = ? AND status IN ('APPROVED', 'DISBURSED')", [loanId]);
        if (loans.length === 0) {
            return res.status(400).json({ success: false, message: 'Pinjaman tidak ditemukan atau sudah tidak aktif.' });
        }

        await db.query(
            "UPDATE loans SET status = 'PENDING_PAYOFF' WHERE id = ?",
            [loanId]
        );

        res.json({ success: true, message: 'Pengajuan pelunasan berhasil. Silakan serahkan pembayaran ke Bendahara.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Gagal mengajukan pelunasan: ' + error.message });
    }
});

// Endpoint Setujui Pelunasan (Bendahara)
app.post(['/loans/:id/approve-payoff', '/api/loans/:id/approve-payoff'], authenticateToken, async (req, res) => {
    try {
        const loanId = req.params.id;
        
        const [result] = await db.query(
            "UPDATE loans SET remaining_amount = 0, status = 'LUNAS' WHERE id = ?",
            [loanId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Data pinjaman tidak ditemukan!' });
        }

        res.json({ success: true, message: 'Pembayaran diterima. Pinjaman telah lunas!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Gagal memproses pelunasan: ' + error.message });
    }
});

// 5. PAYROLL DEDUCTION (POTONGAN GAJI)
app.get(['/payrolls', '/api/payrolls', '/payroll-deductions', '/api/payroll-deductions', '/payroll'], authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.id, p.member_id AS memberId, m.nama AS nama, m.nama AS member_name, 
             COALESCE(NULLIF(p.periode, ''), 'September 2026') AS periode,
             COALESCE(NULLIF(p.periode, ''), 'September 2026') AS period, 
             CAST(p.gaji_pokok AS UNSIGNED) AS gajiPokok,
             CAST(p.pot_wajib AS UNSIGNED) AS potWajib,
             CAST(p.pot_cicilan AS UNSIGNED) AS potCicilan,
             CAST(p.total_potongan AS UNSIGNED) AS totalPotongan,
             CAST(p.gaji_bersih AS UNSIGNED) AS gajiBersih
      FROM payrolls p
      JOIN members m ON p.member_id = m.id
      ORDER BY p.periode DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json([]);
  }
});

app.post([
  '/payrolls',
  '/api/payrolls',
  '/payrolls/process',
  '/api/payrolls/process',
  '/payroll-deductions',
  '/api/payroll-deductions'
], authenticateToken, async (req, res) => {
  try {
    const body = req.body || {};
    const periode = body.periode || body.period;
    
    if (!periode) {
      return res.status(400).json({ success: false, message: 'Periode pemotongan wajib diisi!' });
    }

    const [members] = await db.query('SELECT id, gaji_pokok, simpanan_wajib FROM members');

    for (const member of members) {
      // Cek pinjaman aktif (status APPROVED atau DISBURSED)
      const [loanRows] = await db.query(
        "SELECT SUM(monthly_installment) as total_cicilan FROM loans WHERE member_id = ? AND status IN ('APPROVED', 'DISBURSED')",
        [member.id]
      );
      const potCicilan = Number(loanRows[0].total_cicilan || 0);

      const gajiPokok = Number(member.gaji_pokok || 0);
      const potWajib = Number(member.simpanan_wajib || 0);
      const totalPotongan = potWajib + potCicilan;
      const gajiBersih = gajiPokok - totalPotongan;

      const payrollId = `PAY-${member.id}-${periode.replace(/\s+/g, '-')}`;

      await db.query(
        `INSERT INTO payrolls (id, member_id, periode, gaji_pokok, pot_wajib, pot_cicilan, total_potongan, gaji_bersih) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         gaji_pokok = VALUES(gaji_pokok), pot_wajib = VALUES(pot_wajib), 
         pot_cicilan = VALUES(pot_cicilan), total_potongan = VALUES(total_potongan), 
         gaji_bersih = VALUES(gaji_bersih)`,
        [payrollId, member.id, periode, gajiPokok, potWajib, potCicilan, totalPotongan, gajiBersih]
      );

      // Kurangi sisa pinjaman jika ada cicilan
      if (potCicilan > 0) {
          const [activeLoans] = await db.query(
              "SELECT id, remaining_amount FROM loans WHERE member_id = ? AND status IN ('APPROVED', 'DISBURSED') AND remaining_amount > 0",
              [member.id]
          );

          for (const loan of activeLoans) {
              const newRemaining = Math.max(0, Number(loan.remaining_amount) - potCicilan);
              const newStatus = newRemaining === 0 ? 'LUNAS' : 'DISBURSED';

              await db.query(
                  "UPDATE loans SET remaining_amount = ?, status = ? WHERE id = ?",
                  [newRemaining, newStatus, loan.id]
              );
          }
      }
    }

    res.json({ success: true, message: `Pemotongan gaji untuk periode ${periode} berhasil diproses dan diperbarui!` });
  } catch (error) {
    console.error('Payroll Process Error:', error);
    res.status(500).json({ success: false, message: 'Gagal memproses pemotongan gaji: ' + error.message });
  }
});

// ================= API UBAH PROFIL USER =================
app.put(['/users/profile', '/api/users/profile'], authenticateToken, async (req, res) => {
    const { oldPassword, newUsername, newPassword } = req.body;
    const userId = req.user.id; 

    try {
        const [users] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
        }

        const user = users[0];
        
        // 1. Cek password lama (mendukung password lama yang belum ter-hash)
        let isOldPassValid = false;
        if (user.password && (user.password.startsWith('$2b$') || user.password.startsWith('$2a$'))) {
            isOldPassValid = await bcrypt.compare(oldPassword, user.password);
        } else {
            isOldPassValid = (oldPassword === user.password);
        }

        if (!isOldPassValid) {
            return res.status(400).json({ success: false, message: 'Password lama salah!' });
        }

        let updateQuery = 'UPDATE users SET ';
        let params = [];
        let hasChange = false;
        
        if (newUsername && newUsername.trim() !== '') {
            updateQuery += 'username = ?, ';
            params.push(newUsername.trim());
            hasChange = true;
        }
        
        if (newPassword && newPassword.trim() !== '') {
            
            // 2. ENKRIPSI PASSWORD BARU MENGGUNAKAN BCRYPT
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword.trim(), salt);
            
            updateQuery += 'password = ?, ';
            params.push(hashedPassword); // Masukkan password yang sudah di-hash
            hasChange = true;
        }

        if (!hasChange) {
            return res.status(400).json({ success: false, message: 'Tidak ada data yang diubah.' });
        }
        
        updateQuery = updateQuery.slice(0, -2) + ' WHERE id = ?';
        params.push(userId);

        await db.query(updateQuery, params);
        
        res.json({ success: true, message: 'Profil berhasil diperbarui! Silakan login ulang.' });
    } catch (error) {
        console.error('Update Profile Error:', error);
        res.status(500).json({ success: false, message: 'Gagal memperbarui profil: ' + error.message });
    }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: err.message || 'Terjadi kesalahan pada server.' });
});

// Menjalankan listener lokal
if (!process.env.VERCEL) {
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`Server Backend Koperasi berjalan di http://localhost:${PORT}`);
  });
}

// Export Express App untuk Vercel
module.exports = app;