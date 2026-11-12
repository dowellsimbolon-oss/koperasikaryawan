// tests/logic.test.js

// Karena kita menguji logika murni, kita bisa mendefinisikannya langsung di sini
// atau mengimpornya dari file terpisah (misal: utils/logic.js)
function hitungCicilan(amount, tenor) {
    if (tenor <= 0) throw new Error("Tenor harus lebih dari 0");
    const pokok = amount / tenor;
    const bunga = amount * 0.01;
    return Math.round(pokok + bunga);
}

function validasiPencairanSimpanan(saldoSukarela, jumlahCair) {
    if (jumlahCair <= 0) return { valid: false, message: "Nominal harus lebih dari 0" };
    if (jumlahCair > saldoSukarela) return { valid: false, message: "Saldo tidak cukup" };
    return { valid: true };
}

describe('Unit Test: Logika Koperasi', () => {
    test('Cicilan Rp 6.000.000 tenor 6 bulan = Rp 1.060.000', () => {
        expect(hitungCicilan(6000000, 6)).toBe(1060000);
    });

    test('Harus error jika tenor 0', () => {
        expect(() => hitungCicilan(5000000, 0)).toThrow("Tenor harus lebih dari 0");
    });

    test('Pencairan dari saldo yang cukup harus valid', () => {
        const result = validasiPencairanSimpanan(500000, 100000);
        expect(result.valid).toBe(true);
    });

    test('Pencairan melebihi saldo harus ditolak', () => {
        const result = validasiPencairanSimpanan(500000, 600000);
        expect(result.valid).toBe(false);
        expect(result.message).toBe("Saldo tidak cukup");
    });
});