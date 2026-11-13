const Loan = require('../models/Loan');

describe('Object-Oriented Testing: Class Loan', () => {
    let loan;

    // Dijalankan sebelum setiap test, membuat objek baru
    beforeEach(() => {
        loan = new Loan('L-001', 'KOP-001', 6000000, 6);
    });

    // --- PENGUJIAN STATE & BEHAVIOR AWAL ---
    test('State awal pinjaman harus PENDING', () => {
        expect(loan.status).toBe('PENDING');
        expect(loan.remainingAmount).toBe(0);
    });

    // --- PENGUJIAN METHOD calculateInstallment ---
    test('Method calculateInstallment mengembalikan cicilan yang benar', () => {
        const installment = loan.calculateInstallment();
        expect(installment).toBe(1060000); // (6jt/6) + (6jt*1%)
        expect(loan.remainingAmount).toBe(6360000); // 1.060.000 * 6
    });

    // --- PENGUJIAN METHOD approve() ---
    test('Method approve() harus mengubah state menjadi APPROVED', () => {
        loan.approve();
        expect(loan.status).toBe('APPROVED');
        expect(loan.remainingAmount).toBeGreaterThan(0);
    });

    test('Method approve() harus error jika state bukan PENDING', () => {
        loan.approve(); // Ubah ke APPROVED
        expect(() => loan.approve()).toThrow("Hanya pinjaman PENDING yang bisa disetujui");
    });

    // --- PENGUJIAN METHOD disburse() ---
    test('Method disburse() harus mengembalikan nominal uang dan mengubah state', () => {
        loan.approve();
        const disbursedAmount = loan.disburse();
        
        expect(disbursedAmount).toBe(6000000);
        expect(loan.status).toBe('DISBURSED');
    });

    test('Method disburse() harus error jika status masih PENDING', () => {
        expect(() => loan.disburse()).toThrow("Pinjaman harus disetujui terlebih dahulu");
    });
});