class Loan {
    constructor(id, memberId, amount, tenor, interestRate = 0.01) {
        this.id = id;
        this.memberId = memberId;
        this.amount = amount;
        this.tenor = tenor;
        this.interestRate = interestRate;
        this.status = 'PENDING'; // State awal
        this.remainingAmount = 0;
    }

    // Method menghitung cicilan
    calculateInstallment() {
        if (this.tenor <= 0) throw new Error("Tenor harus lebih dari 0");
        const principal = this.amount / this.tenor;
        const interest = this.amount * this.interestRate;
        this.remainingAmount = Math.round(principal + interest) * this.tenor;
        return Math.round(principal + interest);
    }

    // Method mengubah status (Behavior)
    approve() {
        if (this.status !== 'PENDING') throw new Error("Hanya pinjaman PENDING yang bisa disetujui");
        this.status = 'APPROVED';
        this.calculateInstallment();
        return true;
    }

    // Method mencairkan dana
    disburse() {
        if (this.status !== 'APPROVED') throw new Error("Pinjaman harus disetujui terlebih dahulu");
        this.status = 'DISBURSED';
        return this.amount;
    }
}

module.exports = Loan;