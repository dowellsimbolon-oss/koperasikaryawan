// --- DATABASE USER (UNTUK AUTHENTICATION) ---
const dummyUsers = [
  { username: 'admin', password: 'admin123', name: 'Administrator', role: 'Administrator' },
  { username: 'budi', password: '12345', name: 'Budi Santoso', role: 'Karyawan (IT)' }
];

// --- DATA INITIAL (SAMPLE DATA) ---
const initialMembers = [
  { id: 'KOP-001', nama: 'Budi Santoso', dept: 'IT Support', gajiPokok: 8500000 },
  { id: 'KOP-002', nama: 'Siti Rahma', dept: 'Human Resources', gajiPokok: 7800000 },
  { id: 'KOP-003', nama: 'Dewi Lestari', dept: 'Finance', gajiPokok: 9200000 }
];

const initialSavings = [
  { memberId: 'KOP-001', pokok: 500000, wajib: 300000, sukarela: 200000 },
  { memberId: 'KOP-002', pokok: 500000, wajib: 200000, sukarela: 50000 },
  { memberId: 'KOP-003', pokok: 500000, wajib: 400000, sukarela: 150000 }
];

const initialLoans = [];
const initialPayrolls = [];

// --- UTILS FORMATTER ---
function formatRupiah(num) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
}

// --- LOCALSTORAGE STORAGE HANDLER ---
function loadData(key, defaultData) {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(defaultData));
    return defaultData;
  }
  return JSON.parse(data);
}

function saveData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Global Variables Data
let dbMembers = loadData('db_members', initialMembers);
let dbSavings = loadData('db_savings', initialSavings);
let dbLoans = loadData('db_loans', initialLoans);
let dbPayrolls = loadData('db_payrolls', initialPayrolls);

// --- FITUR LOGIN & AUTHENTICATION ---

function checkAuth() {
  const loggedUser = JSON.parse(localStorage.getItem('logged_user'));
  const loginScreen = document.getElementById('login-screen');
  const mainApp = document.getElementById('main-app');

  if (loggedUser) {
    loginScreen.style.display = 'none';
    mainApp.style.display = 'flex';

    // Update UI Badge User
    document.getElementById('user-name').innerText = loggedUser.name;
    document.getElementById('user-role').innerText = loggedUser.role;
    document.getElementById('user-avatar').innerText = loggedUser.name.charAt(0).toUpperCase();

    renderAll();
  } else {
    loginScreen.style.display = 'flex';
    mainApp.style.display = 'none';
  }
}

// Handle Form Submit Login
document.getElementById('form-login').addEventListener('submit', function(e) {
  e.preventDefault();
  const usernameInput = document.getElementById('username').value.trim();
  const passwordInput = document.getElementById('password').value.trim();
  const errorMsg = document.getElementById('login-error');

  const user = dummyUsers.find(u => u.username === usernameInput && u.password === passwordInput);

  if (user) {
    errorMsg.style.display = 'none';
    localStorage.setItem('logged_user', JSON.stringify(user));
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    checkAuth();
  } else {
    errorMsg.style.display = 'block';
  }
});

// Handle Logout
function handleLogout() {
  if (confirm('Apakah Anda yakin ingin keluar dari aplikasi?')) {
    localStorage.removeItem('logged_user');
    checkAuth();
  }
}

// Reset Data Ke Default Sample
function resetDatabase() {
  if (confirm('Apakah Anda yakin ingin mereset seluruh data aplikasi ke awal?')) {
    localStorage.clear();
    location.reload();
  }
}

// --- TAB NAVIGATION ---
function switchTab(tabId, btnElement) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));

  document.getElementById(`tab-${tabId}`).classList.add('active');
  btnElement.classList.add('active');

  renderAll();
}

// --- RENDER FUNCTIONS ---
function renderDashboard() {
  let totalSavings = dbSavings.reduce((sum, item) => sum + item.pokok + item.wajib + item.sukarela, 0);
  let totalLoans = dbLoans.reduce((sum, item) => sum + (item.status === 'APPROVED' ? item.remaining : 0), 0);

  document.getElementById('dash-total-savings').innerText = formatRupiah(totalSavings);
  document.getElementById('dash-total-loans').innerText = formatRupiah(totalLoans);
  document.getElementById('dash-total-members').innerText = `${dbMembers.length} Karyawan`;

  const tbody = document.getElementById('member-list-tbody');
  tbody.innerHTML = '';
  dbMembers.forEach(m => {
    tbody.innerHTML += `
      <tr>
        <td><strong>${m.id}</strong></td>
        <td>${m.nama}</td>
        <td>${m.dept}</td>
        <td>${formatRupiah(m.gajiPokok)}</td>
      </tr>
    `;
  });
}

function renderOptions() {
  const savingsSelect = document.getElementById('savings-member-id');
  const loanSelect = document.getElementById('loan-member-id');

  savingsSelect.innerHTML = '';
  loanSelect.innerHTML = '';

  dbMembers.forEach(m => {
    savingsSelect.innerHTML += `<option value="${m.id}">${m.nama} (${m.id})</option>`;
    loanSelect.innerHTML += `<option value="${m.id}">${m.nama} (${m.id})</option>`;
  });
}

function renderSavings() {
  const tbody = document.getElementById('savings-tbody');
  tbody.innerHTML = '';

  dbSavings.forEach(s => {
    const member = dbMembers.find(m => m.id === s.memberId);
    const total = s.pokok + s.wajib + s.sukarela;

    tbody.innerHTML += `
      <tr>
        <td>${member ? member.nama : s.memberId}</td>
        <td>${formatRupiah(s.pokok)}</td>
        <td>${formatRupiah(s.wajib)}</td>
        <td>${formatRupiah(s.sukarela)}</td>
        <td><strong style="color: #16a34a;">${formatRupiah(total)}</strong></td>
      </tr>
    `;
  });
}

function renderLoans() {
  const tbody = document.getElementById('loans-tbody');
  tbody.innerHTML = '';

  dbLoans.forEach(l => {
    const member = dbMembers.find(m => m.id === l.memberId);
    tbody.innerHTML += `
      <tr>
        <td>${member ? member.nama : l.memberId}</td>
        <td>${formatRupiah(l.amount)}</td>
        <td>${l.tenor} Bln</td>
        <td>${formatRupiah(l.monthly)}</td>
        <td>${formatRupiah(l.remaining)}</td>
        <td><span style="color: ${l.remaining === 0 ? 'green' : 'orange'}; font-weight: 600;">
          ${l.remaining === 0 ? 'LUNAS' : 'AKTIF'}
        </span></td>
      </tr>
    `;
  });
}

function renderPayroll() {
  const tbody = document.getElementById('payroll-tbody');
  tbody.innerHTML = '';

  dbPayrolls.forEach(p => {
    const member = dbMembers.find(m => m.id === p.memberId);
    tbody.innerHTML += `
      <tr>
        <td><strong>${p.period}</strong></td>
        <td>${member ? member.nama : p.memberId}</td>
        <td>${formatRupiah(p.gajiPokok)}</td>
        <td>${formatRupiah(p.potWajib)}</td>
        <td>${formatRupiah(p.potCicilan)}</td>
        <td><strong style="color: #dc2626;">${formatRupiah(p.totalPotongan)}</strong></td>
        <td><strong style="color: #16a34a;">${formatRupiah(p.gajiBersih)}</strong></td>
      </tr>
    `;
  });
}

// --- FORM HANDLERS ---
document.getElementById('form-add-savings').addEventListener('submit', function(e) {
  e.preventDefault();
  const memberId = document.getElementById('savings-member-id').value;
  const type = document.getElementById('savings-type').value;
  const amount = Number(document.getElementById('savings-amount').value);

  let saving = dbSavings.find(s => s.memberId === memberId);
  if (!saving) {
    saving = { memberId, pokok: 0, wajib: 0, sukarela: 0 };
    dbSavings.push(saving);
  }

  saving[type] += amount;
  saveData('db_savings', dbSavings);

  alert('Setoran simpanan berhasil ditambahkan!');
  document.getElementById('savings-amount').value = '';
  renderSavings();
  renderDashboard();
});

function calculateLoanPreview() {
  const amount = Number(document.getElementById('loan-amount').value) || 0;
  const tenor = Number(document.getElementById('loan-tenor').value) || 1;

  const pokok = amount / tenor;
  const bunga = amount * 0.01;
  const totalCicilan = pokok + bunga;

  document.getElementById('prev-pokok').innerText = formatRupiah(pokok);
  document.getElementById('prev-bunga').innerText = formatRupiah(bunga);
  document.getElementById('prev-total').innerText = formatRupiah(totalCicilan);

  return totalCicilan;
}

document.getElementById('form-apply-loan').addEventListener('submit', function(e) {
  e.preventDefault();
  const memberId = document.getElementById('loan-member-id').value;
  const amount = Number(document.getElementById('loan-amount').value);
  const tenor = Number(document.getElementById('loan-tenor').value);

  const monthly = calculateLoanPreview();
  const totalAmountWithInterest = monthly * tenor;

  const newLoan = {
    id: 'L-' + Date.now(),
    memberId,
    amount,
    tenor,
    monthly,
    remaining: totalAmountWithInterest,
    status: 'APPROVED'
  };

  dbLoans.push(newLoan);
  saveData('db_loans', dbLoans);

  alert('Pengajuan Pinjaman Disetujui!');
  document.getElementById('loan-amount').value = '';
  renderLoans();
  renderDashboard();
});

function processPayrollDeduction() {
  const period = document.getElementById('payroll-period').value;
  if (!period) return alert('Pilih periode pemotongan terlebih dahulu!');

  const isExist = dbPayrolls.some(p => p.period === period);
  if (isExist && !confirm(`Periode ${period} sudah pernah diproses. Proses ulang?`)) return;

  const wajibNominal = 100000;

  dbMembers.forEach(m => {
    const loan = dbLoans.find(l => l.memberId === m.id && l.remaining > 0);
    const potCicilan = loan ? Math.min(loan.monthly, loan.remaining) : 0;
    const totalPotongan = wajibNominal + potCicilan;
    const gajiBersih = m.gajiPokok - totalPotongan;

    let saving = dbSavings.find(s => s.memberId === m.id);
    if (saving) {
      saving.wajib += wajibNominal;
    }

    if (loan) {
      loan.remaining -= potCicilan;
    }

    dbPayrolls.push({
      period,
      memberId: m.id,
      gajiPokok: m.gajiPokok,
      potWajib: wajibNominal,
      potCicilan,
      totalPotongan,
      gajiBersih
    });
  });

  saveData('db_savings', dbSavings);
  saveData('db_loans', dbLoans);
  saveData('db_payrolls', dbPayrolls);

  alert(`Pemotongan Gaji Periode ${period} Berhasil Diproses!`);
  renderAll();
}

function renderAll() {
  renderOptions();
  renderDashboard();
  renderSavings();
  renderLoans();
  renderPayroll();
}

// Initial Check Auth on Load
window.onload = () => {
  checkAuth();
};