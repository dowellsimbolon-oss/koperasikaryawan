// --- KONFIGURASI API BACKEND ---
const API_BASE_URL = 'https://koperasikaryawan-git-main-frans-dowell.vercel.app';

// --- UTILS FORMATTER ---
function formatRupiah(num) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num || 0);
}

// --- AUTHENTICATION HANDLER ---
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

// Form Submit Login (Post to Express API)
document.getElementById('form-login').addEventListener('submit', async function(e) {
  e.preventDefault();
  const usernameInput = document.getElementById('username').value.trim();
  const passwordInput = document.getElementById('password').value.trim();
  const errorMsg = document.getElementById('login-error');

  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: usernameInput, password: passwordInput })
    });

    const result = await response.json();

    if (response.ok) {
      errorMsg.style.display = 'none';
      localStorage.setItem('logged_user', JSON.stringify(result.user));
      localStorage.setItem('token', result.token);
      document.getElementById('username').value = '';
      document.getElementById('password').value = '';
      checkAuth();
    } else {
      errorMsg.innerText = result.message || 'Login gagal';
      errorMsg.style.display = 'block';
    }
  } catch (error) {
    alert('Tidak dapat terhubung ke server backend! Pastikan server Express berjalan.');
  }
});

// Handle Logout
function handleLogout() {
  if (confirm('Apakah Anda yakin ingin keluar dari aplikasi?')) {
    localStorage.removeItem('logged_user');
    localStorage.removeItem('token');
    checkAuth();
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

// --- RENDER FUNCTIONS (FETCH FROM API) ---

async function renderDashboard() {
  try {
    // 1. Fetch Ringkasan Dashboard
    const resSummary = await fetch(`${API_BASE_URL}/dashboard/summary`);
    const summary = await resSummary.json();

    document.getElementById('dash-total-savings').innerText = formatRupiah(summary.totalSavings);
    document.getElementById('dash-total-loans').innerText = formatRupiah(summary.totalLoans);
    document.getElementById('dash-total-members').innerText = `${summary.totalMembers} Karyawan`;

    // 2. Fetch List Anggota
    const resMembers = await fetch(`${API_BASE_URL}/members`);
    const members = await resMembers.json();

    const tbody = document.getElementById('member-list-tbody');
    tbody.innerHTML = '';
    members.forEach(m => {
      tbody.innerHTML += `
        <tr>
          <td><strong>${m.id}</strong></td>
          <td>${m.nama}</td>
          <td>${m.dept}</td>
          <td>${formatRupiah(m.gajiPokok)}</td>
        </tr>
      `;
    });
  } catch (err) {
    console.error('Error rendering dashboard:', err);
  }
}

async function renderOptions() {
  try {
    const res = await fetch(`${API_BASE_URL}/members`);
    const members = await res.json();

    const savingsSelect = document.getElementById('savings-member-id');
    const loanSelect = document.getElementById('loan-member-id');

    savingsSelect.innerHTML = '';
    loanSelect.innerHTML = '';

    members.forEach(m => {
      savingsSelect.innerHTML += `<option value="${m.id}">${m.nama} (${m.id})</option>`;
      loanSelect.innerHTML += `<option value="${m.id}">${m.nama} (${m.id})</option>`;
    });
  } catch (err) {
    console.error('Error rendering options:', err);
  }
}

async function renderSavings() {
  try {
    const res = await fetch(`${API_BASE_URL}/savings`);
    const savings = await res.json();

    const tbody = document.getElementById('savings-tbody');
    tbody.innerHTML = '';

    savings.forEach(s => {
      const total = s.pokok + s.wajib + s.sukarela;
      tbody.innerHTML += `
        <tr>
          <td>${s.nama} (${s.memberId})</td>
          <td>${formatRupiah(s.pokok)}</td>
          <td>${formatRupiah(s.wajib)}</td>
          <td>${formatRupiah(s.sukarela)}</td>
          <td><strong style="color: #16a34a;">${formatRupiah(total)}</strong></td>
        </tr>
      `;
    });
  } catch (err) {
    console.error('Error rendering savings:', err);
  }
}

async function renderLoans() {
  try {
    const res = await fetch(`${API_BASE_URL}/loans`);
    const loans = await res.json();

    const tbody = document.getElementById('loans-tbody');
    tbody.innerHTML = '';

    loans.forEach(l => {
      tbody.innerHTML += `
        <tr>
          <td>${l.nama} (${l.memberId})</td>
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
  } catch (err) {
    console.error('Error rendering loans:', err);
  }
}

async function renderPayroll() {
  try {
    const res = await fetch(`${API_BASE_URL}/payrolls`);
    const payrolls = await res.json();

    const tbody = document.getElementById('payroll-tbody');
    tbody.innerHTML = '';

    payrolls.forEach(p => {
      tbody.innerHTML += `
        <tr>
          <td><strong>${p.period}</strong></td>
          <td>${p.nama} (${p.memberId})</td>
          <td>${formatRupiah(p.gajiPokok)}</td>
          <td>${formatRupiah(p.potWajib)}</td>
          <td>${formatRupiah(p.potCicilan)}</td>
          <td><strong style="color: #dc2626;">${formatRupiah(p.totalPotongan)}</strong></td>
          <td><strong style="color: #16a34a;">${formatRupiah(p.gajiBersih)}</strong></td>
        </tr>
      `;
    });
  } catch (err) {
    console.error('Error rendering payroll:', err);
  }
}

// --- FORM HANDLERS (SEND TO API) ---

// 1. Form Tambah Simpanan
document.getElementById('form-add-savings').addEventListener('submit', async function(e) {
  e.preventDefault();
  const memberId = document.getElementById('savings-member-id').value;
  const type = document.getElementById('savings-type').value;
  const amount = Number(document.getElementById('savings-amount').value);

  try {
    const res = await fetch(`${API_BASE_URL}/savings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, type, amount })
    });

    if (res.ok) {
      alert('Setoran simpanan berhasil ditambahkan!');
      document.getElementById('savings-amount').value = '';
      renderSavings();
      renderDashboard();
    } else {
      alert('Gagal menambahkan setoran simpanan');
    }
  } catch (err) {
    alert('Terjadi kesalahan koneksi server');
  }
});

// Kalkulator Estimasi Pinjaman (Client Side Preview)
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

// 2. Form Pengajuan Pinjaman
document.getElementById('form-apply-loan').addEventListener('submit', async function(e) {
  e.preventDefault();
  const memberId = document.getElementById('loan-member-id').value;
  const amount = Number(document.getElementById('loan-amount').value);
  const tenor = Number(document.getElementById('loan-tenor').value);

  try {
    const res = await fetch(`${API_BASE_URL}/loans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, amount, tenor })
    });

    if (res.ok) {
      alert('Pengajuan Pinjaman Disetujui!');
      document.getElementById('loan-amount').value = '';
      renderLoans();
      renderDashboard();
    } else {
      alert('Gagal mengajukan pinjaman');
    }
  } catch (err) {
    alert('Terjadi kesalahan koneksi server');
  }
});

// 3. Proses Pemotongan Gaji (Payroll Deduction)
async function processPayrollDeduction() {
  const period = document.getElementById('payroll-period').value;
  if (!period) return alert('Pilih periode pemotongan terlebih dahulu!');

  if (!confirm(`Proses pemotongan gaji untuk periode ${period}?`)) return;

  try {
    const res = await fetch(`${API_BASE_URL}/payrolls/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period })
    });

    const result = await res.json();
    if (res.ok) {
      alert(result.message);
      renderAll();
    } else {
      alert(result.message || 'Gagal memproses pemotongan gaji');
    }
  } catch (err) {
    alert('Terjadi kesalahan koneksi server');
  }
}

// Render Semua Komponen
function renderAll() {
  renderOptions();
  renderDashboard();
  renderSavings();
  renderLoans();
  renderPayroll();
}

// Initial Check Auth saat Halaman Dimuat
window.onload = () => {
  checkAuth();
};