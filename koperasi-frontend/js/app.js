// --- KONFIGURASI API BACKEND ---
const API_BASE_URL = 'https://koperasikaryawan-amos.vercel.app/api';

// --- UTILS FORMATTER & HEADERS ---
function formatRupiah(num) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num || 0);
}

// Helper untuk mengambil Header dengan Token JWT
function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

// --- AUTHENTICATION HANDLER ---
function checkAuth() {
  const loggedUser = JSON.parse(localStorage.getItem('logged_user'));
  const loginScreen = document.getElementById('login-screen');
  const mainApp = document.getElementById('main-app');

  if (loggedUser) {
    if (loginScreen) loginScreen.style.display = 'none';
    if (mainApp) mainApp.style.display = 'flex';

    // Update UI Badge User
    const userNameEl = document.getElementById('user-name');
    const userRoleEl = document.getElementById('user-role');
    const userAvatarEl = document.getElementById('user-avatar');

    if (userNameEl) userNameEl.innerText = loggedUser.name;
    if (userRoleEl) userRoleEl.innerText = loggedUser.role;
    if (userAvatarEl) userAvatarEl.innerText = loggedUser.name ? loggedUser.name.charAt(0).toUpperCase() : 'U';

    renderAll();
  } else {
    if (loginScreen) loginScreen.style.display = 'flex';
    if (mainApp) mainApp.style.display = 'none';
  }
}

// Form Submit Login (Dilengkapi Loading Spinner pada Tombol)
document.getElementById('form-login').addEventListener('submit', async function(e) {
  e.preventDefault();
  const usernameInput = document.getElementById('username').value.trim();
  const passwordInput = document.getElementById('password').value.trim();
  const errorMsg = document.getElementById('login-error');

  const btnLogin = document.getElementById('btn-login');
  const btnText = document.getElementById('btn-text');
  const btnSpinner = document.getElementById('btn-spinner');

  // 1. Tampilkan state loading & nonaktifkan tombol
  if (btnLogin) btnLogin.disabled = true;
  if (btnText) btnText.textContent = "Memproses...";
  if (btnSpinner) btnSpinner.style.display = "inline-block";
  if (errorMsg) errorMsg.style.display = 'none';

  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: usernameInput, password: passwordInput })
    });

    const result = await response.json();

    if (response.ok) {
      if (errorMsg) errorMsg.style.display = 'none';
      localStorage.setItem('logged_user', JSON.stringify(result.user));
      localStorage.setItem('token', result.token);
      document.getElementById('username').value = '';
      document.getElementById('password').value = '';
      checkAuth();
    } else {
      if (errorMsg) {
        errorMsg.innerText = result.error || result.message || 'Login gagal';
        errorMsg.style.display = 'block';
      } else {
        alert(result.error || result.message || 'Login gagal');
      }
    }
  } catch (error) {
    if (errorMsg) {
      errorMsg.innerText = 'Tidak dapat terhubung ke server backend!';
      errorMsg.style.display = 'block';
    } else {
      alert('Tidak dapat terhubung ke server backend! Pastikan server Express berjalan.');
    }
  } finally {
    // 2. Kembalikan tombol seperti semula setelah selesai
    if (btnLogin) btnLogin.disabled = false;
    if (btnText) btnText.textContent = "Masuk/Sign";
    if (btnSpinner) btnSpinner.style.display = "none";
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

  const targetTab = document.getElementById(`tab-${tabId}`);
  if (targetTab) targetTab.classList.add('active');
  if (btnElement) btnElement.classList.add('active');

  renderAll();
}

// --- RENDER FUNCTIONS (FETCH FROM API) ---

async function renderDashboard() {
  const spinner = document.getElementById('loading-spinner');
  if (spinner) spinner.style.display = 'flex'; // Munculkan spinner data

  try {
    // 1. Fetch Ringkasan Dashboard
    const resSummary = await fetch(`${API_BASE_URL}/dashboard/summary`, {
      headers: getAuthHeaders()
    });
    if (resSummary.ok) {
      const summary = await resSummary.json();
      document.getElementById('dash-total-savings').innerText = formatRupiah(summary.totalSavings);
      document.getElementById('dash-total-loans').innerText = formatRupiah(summary.totalLoans);
      document.getElementById('dash-total-members').innerText = `${summary.totalMembers} Karyawan`;
    }

    // 2. Fetch List Anggota
    const resMembers = await fetch(`${API_BASE_URL}/members`, {
      headers: getAuthHeaders()
    });
    if (resMembers.ok) {
      const members = await resMembers.json();
      const tbody = document.getElementById('member-list-tbody');
      if (tbody) {
        tbody.innerHTML = '';
        members.forEach(m => {
          tbody.innerHTML += `
            <tr>
              <td><strong>${m.id}</strong></td>
              <td>${m.nama}</td>
              <td>${m.dept}</td>
              <td>${formatRupiah(m.gajiPokok || m.gaji_pokok)}</td>
            </tr>
          `;
        });
      }
    }
  } catch (err) {
    console.error('Error rendering dashboard:', err);
  } finally {
    if (spinner) spinner.style.display = 'none'; // Sembunyikan spinner data
  }
}

async function renderOptions() {
  try {
    const res = await fetch(`${API_BASE_URL}/members`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) return;

    const members = await res.json();
    const savingsSelect = document.getElementById('savings-member-id');
    const loanSelect = document.getElementById('loan-member-id');

    if (savingsSelect) savingsSelect.innerHTML = '';
    if (loanSelect) loanSelect.innerHTML = '';

    members.forEach(m => {
      if (savingsSelect) savingsSelect.innerHTML += `<option value="${m.id}">${m.nama} (${m.id})</option>`;
      if (loanSelect) loanSelect.innerHTML += `<option value="${m.id}">${m.nama} (${m.id})</option>`;
    });
  } catch (err) {
    console.error('Error rendering options:', err);
  }
}

async function renderSavings() {
  try {
    const res = await fetch(`${API_BASE_URL}/savings`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) return;

    const savings = await res.json();
    const tbody = document.getElementById('savings-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    savings.forEach(s => {
      const total = (Number(s.pokok) || 0) + (Number(s.wajib) || 0) + (Number(s.sukarela) || 0);
      tbody.innerHTML += `
        <tr>
          <td>${s.nama || s.member_id} (${s.memberId || s.member_id})</td>
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
    const res = await fetch(`${API_BASE_URL}/loans`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) return;

    const loans = await res.json();
    const tbody = document.getElementById('loans-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    loans.forEach(l => {
      const remaining = Number(l.remaining_amount || l.remaining || 0);
      tbody.innerHTML += `
        <tr>
          <td>${l.nama || l.member_id} (${l.memberId || l.member_id})</td>
          <td>${formatRupiah(l.amount)}</td>
          <td>${l.tenor} Bln</td>
          <td>${formatRupiah(l.monthly_installment || l.monthly)}</td>
          <td>${formatRupiah(remaining)}</td>
          <td><span style="color: ${remaining === 0 ? 'green' : 'orange'}; font-weight: 600;">
            ${remaining === 0 ? 'LUNAS' : 'AKTIF'}
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
    const res = await fetch(`${API_BASE_URL}/payrolls`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) return;

    const payrolls = await res.json();
    const tbody = document.getElementById('payroll-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    payrolls.forEach(p => {
      tbody.innerHTML += `
        <tr>
          <td><strong>${p.period}</strong></td>
          <td>${p.nama || p.member_id} (${p.memberId || p.member_id})</td>
          <td>${formatRupiah(p.gajiPokok || p.gaji_pokok)}</td>
          <td>${formatRupiah(p.potWajib || p.pot_wajib)}</td>
          <td>${formatRupiah(p.potCicilan || p.pot_cicilan)}</td>
          <td><strong style="color: #dc2626;">${formatRupiah(p.totalPotongan || p.total_potongan)}</strong></td>
          <td><strong style="color: #16a34a;">${formatRupiah(p.gajiBersih || p.gaji_bersih)}</strong></td>
        </tr>
      `;
    });
  } catch (err) {
    console.error('Error rendering payroll:', err);
  }
}

// --- FORM HANDLERS (SEND TO API) ---

// 1. Form Tambah Simpanan
const formSavings = document.getElementById('form-add-savings');
if (formSavings) {
  formSavings.addEventListener('submit', async function(e) {
    e.preventDefault();
    const memberId = document.getElementById('savings-member-id').value;
    const type = document.getElementById('savings-type').value;
    const amount = Number(document.getElementById('savings-amount').value);

    try {
      const res = await fetch(`${API_BASE_URL}/savings`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ memberId, type, amount })
      });

      if (res.ok) {
        alert('Setoran simpanan berhasil ditambahkan!');
        document.getElementById('savings-amount').value = '';
        renderSavings();
        renderDashboard();
      } else {
        const errData = await res.json();
        alert(errData.message || 'Gagal menambahkan setoran simpanan');
      }
    } catch (err) {
      alert('Terjadi kesalahan koneksi server');
    }
  });
}

// Kalkulator Estimasi Pinjaman (Client Side Preview)
function calculateLoanPreview() {
  const amount = Number(document.getElementById('loan-amount').value) || 0;
  const tenor = Number(document.getElementById('loan-tenor').value) || 1;

  const pokok = amount / tenor;
  const bunga = amount * 0.01;
  const totalCicilan = pokok + bunga;

  const elPokok = document.getElementById('prev-pokok');
  const elBunga = document.getElementById('prev-bunga');
  const elTotal = document.getElementById('prev-total');

  if (elPokok) elPokok.innerText = formatRupiah(pokok);
  if (elBunga) elBunga.innerText = formatRupiah(bunga);
  if (elTotal) elTotal.innerText = formatRupiah(totalCicilan);

  return totalCicilan;
}

// 2. Form Pengajuan Pinjaman
const formLoan = document.getElementById('form-apply-loan');
if (formLoan) {
  formLoan.addEventListener('submit', async function(e) {
    e.preventDefault();
    const memberId = document.getElementById('loan-member-id').value;
    const amount = Number(document.getElementById('loan-amount').value);
    const tenor = Number(document.getElementById('loan-tenor').value);

    try {
      const res = await fetch(`${API_BASE_URL}/loans`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ memberId, amount, tenor })
      });

      if (res.ok) {
        alert('Pengajuan Pinjaman Disetujui!');
        document.getElementById('loan-amount').value = '';
        renderLoans();
        renderDashboard();
      } else {
        const errData = await res.json();
        alert(errData.message || 'Gagal mengajukan pinjaman');
      }
    } catch (err) {
      alert('Terjadi kesalahan koneksi server');
    }
  });
}

// 3. Proses Pemotongan Gaji (Payroll Deduction)
async function processPayrollDeduction() {
  const periodInput = document.getElementById('payroll-period');
  const period = periodInput ? periodInput.value : '';
  if (!period) return alert('Pilih periode pemotongan terlebih dahulu!');

  if (!confirm(`Proses pemotongan gaji untuk periode ${period}?`)) return;

  try {
    const res = await fetch(`${API_BASE_URL}/payrolls/process`, {
      method: 'POST',
      headers: getAuthHeaders(),
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