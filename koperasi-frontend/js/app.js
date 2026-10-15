/// --- KONFIGURASI API BACKEND ---
const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://127.0.0.1:5000' 
    : 'https://koperasikaryawan-amos.vercel.app'; 

// --- UTILS FORMATTER & HEADERS ---
function formatRupiah(num) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num || 0);
}

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

// Cek apakah user yang login adalah Bendahara, Pengurus, atau Admin
function isAdminOrTreasurer() {
  const loggedUser = JSON.parse(localStorage.getItem('logged_user'));
  if (!loggedUser || !loggedUser.role) return false;
  const role = loggedUser.role.toLowerCase();
  return role.includes('bendahara') || role.includes('pengurus') || role.includes('admin');
}

// Helper untuk Toggle State Button Loading
function setButtonLoading(btnId, btnTextId, btnSpinnerId, isLoading, defaultText = "Kirim") {
  const btn = document.getElementById(btnId);
  const textEl = document.getElementById(btnTextId);
  const spinnerEl = document.getElementById(btnSpinnerId);

  if (btn) btn.disabled = isLoading;
  if (textEl) textEl.textContent = isLoading ? "Memproses..." : defaultText;
  if (spinnerEl) spinnerEl.style.display = isLoading ? "inline-block" : "none";
}

function toggleGlobalSpinner(show) {
  const spinner = document.getElementById('loading-spinner');
  if (spinner) spinner.style.display = show ? 'flex' : 'none';
}

// --- AUTHENTICATION HANDLER ---
function checkAuth() {
  const loggedUser = JSON.parse(localStorage.getItem('logged_user'));
  const loginScreen = document.getElementById('login-screen');
  const mainApp = document.getElementById('main-app');

  const isAdminPage = window.location.pathname.includes('admin.html');
  const isIndexPage = window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/');

  if (loggedUser) {
    // Jika berada di halaman utama tapi user adalah admin, arahkan ke admin.html
    if (isIndexPage && isAdminOrTreasurer()) {
      window.location.href = 'admin.html';
      return;
    }
    // Jika berada di admin.html tapi user adalah anggota biasa, arahkan ke index.html
    if (isAdminPage && !isAdminOrTreasurer()) {
      window.location.href = 'index.html';
      return;
    }

    if (loginScreen) loginScreen.style.display = 'none';
    if (mainApp) mainApp.style.display = 'flex';

    // Update UI Badge User
    const userNameEl = document.getElementById('user-name') || document.getElementById('admin-name');
    const userRoleEl = document.getElementById('user-role') || document.getElementById('admin-role');
    const userAvatarEl = document.getElementById('user-avatar');

    if (userNameEl) userNameEl.innerText = loggedUser.name;
    if (userRoleEl) userRoleEl.innerText = loggedUser.role;
    if (userAvatarEl) userAvatarEl.innerText = loggedUser.name ? loggedUser.name.charAt(0).toUpperCase() : 'U';

    // Pengaturan form khusus anggota biasa
    adjustUIByRole(loggedUser);

    renderAll();
  } else {
    // Jika belum login dan berada di admin.html, arahkan ke index.html
    if (isAdminPage) {
      window.location.href = 'index.html';
      return;
    }
    if (loginScreen) loginScreen.style.display = 'flex';
    if (mainApp) mainApp.style.display = 'none';
  }
}

// Pengaturan Tampilan Berdasarkan Role
function adjustUIByRole(loggedUser) {
  const admin = isAdminOrTreasurer();

  const cardAddSavings = document.getElementById('card-add-savings');
  const payrollActionSection = document.getElementById('payroll-action-section');

  if (cardAddSavings) cardAddSavings.style.display = admin ? 'block' : 'none';
  if (payrollActionSection) payrollActionSection.style.display = admin ? 'block' : 'none';

  const loanMemberSelect = document.getElementById('loan-member-id');
  
  if (!admin && loggedUser) {
    if (loanMemberSelect) {
      loanMemberSelect.innerHTML = `<option value="${loggedUser.id}">${loggedUser.name} (${loggedUser.id})</option>`;
      loanMemberSelect.disabled = true;
    }
  }
}

// Form Submit Login
const formLogin = document.getElementById('form-login');
if (formLogin) {
  formLogin.addEventListener('submit', async function(e) {
    e.preventDefault();
    const usernameInput = document.getElementById('username').value.trim();
    const passwordInput = document.getElementById('password').value.trim();
    const errorMsg = document.getElementById('login-error');

    setButtonLoading('btn-login', 'btn-text', 'btn-spinner', true, 'Masuk/Sign');
    if (errorMsg) errorMsg.style.display = 'none';

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: usernameInput,
          password: passwordInput
        })
      });

      const result = await response.json();

      if (response.ok) {
        // Simpan token dan redirect setelah sukses login
        localStorage.setItem('token', result.token);
        localStorage.setItem('logged_user', JSON.stringify(result.user));

        const role = (result.user.role || '').toLowerCase();
        if (role.includes('bendahara') || role.includes('pengurus') || role.includes('admin')) {
          window.location.href = 'admin.html';
        } else {
          window.location.href = 'index.html';
        }
      } else {
        if (errorMsg) {
          errorMsg.textContent = result.message || 'Login gagal! Username atau password salah.';
          errorMsg.style.display = 'block';
        }
      }
    } catch (error) {
      console.error('Login Error:', error);
      if (errorMsg) {
        errorMsg.textContent = 'Terjadi kesalahan pada koneksi server.';
        errorMsg.style.display = 'block';
      }
    } finally {
      setButtonLoading('btn-login', 'btn-text', 'btn-spinner', false, 'Masuk/Sign');
    }
  });
}

// Handle Logout
function handleLogout() {
  if (confirm('Apakah Anda yakin ingin keluar dari aplikasi?')) {
    localStorage.removeItem('logged_user');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = 'index.html';
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

// --- RENDER FUNCTIONS DENGAN FILTER ROLE ---
async function renderDashboard() {
  const admin = isAdminOrTreasurer();
  const loggedUser = JSON.parse(localStorage.getItem('logged_user'));

  try {
    if (admin) {
      const resSummary = await fetch(`${API_BASE_URL}/dashboard/summary`, { headers: getAuthHeaders() });
      if (resSummary.ok) {
        const summary = await resSummary.json();
        const elSavings = document.getElementById('dash-total-savings');
        const elLoans = document.getElementById('dash-total-loans');
        const elMembers = document.getElementById('dash-total-members');
        if (elSavings) elSavings.innerText = formatRupiah(summary.totalSavings);
        if (elLoans) elLoans.innerText = formatRupiah(summary.totalLoans);
        if (elMembers) elMembers.innerText = `${summary.totalMembers} Karyawan`;
      }

      const resMembers = await fetch(`${API_BASE_URL}/members`, { headers: getAuthHeaders() });
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
    } else {
      const [resSavings, resLoans] = await Promise.all([
        fetch(`${API_BASE_URL}/savings`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/loans`, { headers: getAuthHeaders() })
      ]);

      if (resSavings.ok && resLoans.ok) {
        const savingsList = await resSavings.json();
        const loansList = await resLoans.json();

        const mySavings = savingsList.find(s => (s.memberId === loggedUser.id || s.member_id === loggedUser.id || s.id === loggedUser.id)) || { pokok: 0, wajib: 0, sukarela: 0 };
        const myTotalSavings = (Number(mySavings.pokok) || 0) + (Number(mySavings.wajib) || 0) + (Number(mySavings.sukarela) || 0);
        
        const myLoan = loansList.find(l => (l.memberId === loggedUser.id || l.member_id === loggedUser.id)) || { remaining_amount: 0, remaining: 0 };
        const myRemainingLoan = Number(myLoan.remaining_amount || myLoan.remaining || 0);

        const elSavings = document.getElementById('dash-total-savings');
        const elLoans = document.getElementById('dash-total-loans');
        const elMembers = document.getElementById('dash-total-members');
        if (elSavings) elSavings.innerText = formatRupiah(myTotalSavings);
        if (elLoans) elLoans.innerText = formatRupiah(myRemainingLoan);
        if (elMembers) elMembers.innerText = "Akun Pribadi";

        const tbody = document.getElementById('member-list-tbody');
        if (tbody) {
          document.querySelector('h3.section-title, #table-title')?.replaceChildren(document.createTextNode('Informasi Keuangan Pribadi Anda'));
          tbody.innerHTML = `
            <tr>
              <td><strong>Status NIK</strong></td>
              <td>${loggedUser.id}</td>
              <td><strong>Nama</strong></td>
              <td>${loggedUser.name}</td>
            </tr>
            <tr>
              <td><strong>Total Simpanan</strong></td>
              <td style="color: #16a34a; font-weight: bold;">${formatRupiah(myTotalSavings)}</td>
              <td><strong>Sisa Pinjaman Aktif</strong></td>
              <td style="color: #dc2626; font-weight: bold;">${formatRupiah(myRemainingLoan)}</td>
            </tr>
          `;
        }
      }
    }
  } catch (err) {
    console.error('Error rendering dashboard:', err);
  }
}

async function renderOptions() {
  const admin = isAdminOrTreasurer();
  if (!admin) return;

  try {
    const res = await fetch(`${API_BASE_URL}/members`, { headers: getAuthHeaders() });
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
  const admin = isAdminOrTreasurer();
  const loggedUser = JSON.parse(localStorage.getItem('logged_user'));

  try {
    const res = await fetch(`${API_BASE_URL}/savings`, { headers: getAuthHeaders() });
    if (!res.ok) return;

    const savings = await res.json();
    const tbody = document.getElementById('savings-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    const dataToRender = admin ? savings : savings.filter(s => s.memberId === loggedUser.id || s.member_id === loggedUser.id || s.id === loggedUser.id);

    dataToRender.forEach(s => {
      const total = (Number(s.pokok) || 0) + (Number(s.wajib) || 0) + (Number(s.sukarela) || 0);
      tbody.innerHTML += `
        <tr>
          <td>${s.nama || s.member_id || loggedUser.name} (${s.memberId || s.member_id || loggedUser.id})</td>
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
  const admin = isAdminOrTreasurer();
  const loggedUser = JSON.parse(localStorage.getItem('logged_user'));

  try {
    const res = await fetch(`${API_BASE_URL}/loans`, { headers: getAuthHeaders() });
    if (!res.ok) return;

    const loans = await res.json();
    const tbody = document.getElementById('loans-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    const dataToRender = admin ? loans : loans.filter(l => l.memberId === loggedUser.id || l.member_id === loggedUser.id);

    dataToRender.forEach(l => {
      const remaining = Number(l.remaining_amount || l.remaining || 0);
      tbody.innerHTML += `
        <tr>
          <td>${l.nama || l.member_id || loggedUser.name} (${l.memberId || l.member_id || loggedUser.id})</td>
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
  const admin = isAdminOrTreasurer();
  const loggedUser = JSON.parse(localStorage.getItem('logged_user'));

  try {
    const res = await fetch(`${API_BASE_URL}/payrolls`, { headers: getAuthHeaders() });
    if (!res.ok) return;

    const payrolls = await res.json();
    const tbody = document.getElementById('payroll-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    const dataToRender = admin ? payrolls : payrolls.filter(p => p.memberId === loggedUser.id || p.member_id === loggedUser.id);

    dataToRender.forEach(p => {
      tbody.innerHTML += `
        <tr>
          <td><strong>${p.period}</strong></td>
          <td>${p.nama || p.member_id || loggedUser.name} (${p.memberId || p.member_id || loggedUser.id})</td>
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

// Global Render
async function renderAll() {
  toggleGlobalSpinner(true);
  try {
    await Promise.all([
      renderOptions(),
      renderDashboard(),
      renderSavings(),
      renderLoans(),
      renderPayroll()
    ]);
    if (isAdminOrTreasurer()) {
      await loadPendingLoans();
    }
  } catch (err) {
    console.error("Error fetching data:", err);
  } finally {
    toggleGlobalSpinner(false);
  }
}

// --- FORM HANDLERS ---
const formSavings = document.getElementById('form-add-savings');
if (formSavings) {
  formSavings.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!isAdminOrTreasurer()) return alert('Akses ditolak. Hanya bendahara yang dapat menambah simpanan.');

    const memberId = document.getElementById('savings-member-id').value;
    const type = document.getElementById('savings-type').value;
    const amount = Number(document.getElementById('savings-amount').value);

    setButtonLoading('btn-save-savings', 'btn-save-savings-text', 'btn-save-savings-spinner', true, 'Simpan Setoran');

    try {
      const res = await fetch(`${API_BASE_URL}/savings`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ memberId, type, amount })
      });

      if (res.ok) {
        Swal.fire({
          title: 'Berhasil!',
          text: 'Setoran simpanan berhasil ditambahkan!',
          icon: 'success',
          confirmButtonText: 'OK',
          confirmButtonColor: '#1e3a8a'
        });
        document.getElementById('savings-amount').value = '';
        await renderAll();
      } else {
        const errData = await res.json();
        Swal.fire({
          title: 'Gagal!',
          text: errData.message || 'Gagal menambahkan setoran simpanan',
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#dc2626'
        });
      }
    } catch (err) {
      Swal.fire({
        title: 'Kesalahan!',
        text: 'Terjadi kesalahan koneksi server',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#dc2626'
      });
    } finally {
      setButtonLoading('btn-save-savings', 'btn-save-savings-text', 'btn-save-savings-spinner', false, 'Simpan Setoran');
    }
  });
}

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

const formLoan = document.getElementById('form-apply-loan');
if (formLoan) {
  formLoan.addEventListener('submit', async function(e) {
    e.preventDefault();
    const loggedUser = JSON.parse(localStorage.getItem('logged_user'));
    
    const memberId = isAdminOrTreasurer() ? document.getElementById('loan-member-id').value : loggedUser.id;
    const amount = Number(document.getElementById('loan-amount').value);
    const tenor = Number(document.getElementById('loan-tenor').value);

    setButtonLoading('btn-apply-loan', 'btn-apply-loan-text', 'btn-apply-loan-spinner', true, 'Ajukan Pinjaman');

    try {
      const res = await fetch(`${API_BASE_URL}/loans`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ memberId, amount, tenor })
      });

      if (res.ok) {
        alert('Pengajuan Pinjaman Berhasil!');
        document.getElementById('loan-amount').value = '';
        await renderAll();
      } else {
        const errData = await res.json();
        alert(errData.message || 'Gagal mengajukan pinjaman');
      }
    } catch (err) {
      alert('Terjadi kesalahan koneksi server');
    } finally {
      setButtonLoading('btn-apply-loan', 'btn-apply-loan-text', 'btn-apply-loan-spinner', false, 'Ajukan Pinjaman');
    }
  });
}

async function processPayrollDeduction() {
  if (!isAdminOrTreasurer()) return alert('Akses ditolak. Fitur ini khusus Pengurus/Bendahara.');

  const periodInput = document.getElementById('payroll-period');
  const period = periodInput ? periodInput.value : '';
  if (!period) return alert('Pilih periode pemotongan terlebih dahulu!');

  if (!confirm(`Proses pemotongan gaji untuk periode ${period}?`)) return;

  setButtonLoading('btn-process-payroll', 'btn-process-payroll-text', 'btn-process-payroll-spinner', true, 'Proses Potong Gaji');

  try {
    const res = await fetch(`${API_BASE_URL}/payrolls/process`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ period })
    });

    const result = await res.json();
    if (res.ok) {
      alert(result.message);
      await renderAll();
    } else {
      alert(result.message || 'Gagal memproses pemotongan gaji');
    }
  } catch (err) {
    alert('Terjadi kesalahan koneksi server');
  } finally {
    setButtonLoading('btn-process-payroll', 'btn-process-payroll-text', 'btn-process-payroll-spinner', false, 'Proses Potong Gaji');
  }
}

// Form Tambah Anggota / User Baru
const formAddMember = document.getElementById('form-add-member');
if (formAddMember) {
  formAddMember.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = formAddMember.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.textContent : 'Simpan Anggota Baru';

    const payload = {
      nik: document.getElementById('new-nik').value.trim(),
      nama: document.getElementById('new-nama').value.trim(),
      dept: document.getElementById('new-dept').value.trim(),
      gaji_pokok: Number(document.getElementById('new-gaji').value) || 0,
      username: document.getElementById('new-username').value.trim(),
      password: document.getElementById('new-password').value,
      role: document.getElementById('new-role').value
    };

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Menyimpan...';
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/members`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      
      const result = await res.json();
      
      if (res.ok) {
        Swal.fire({
          title: 'Berhasil!',
          text: result.message || 'Anggota baru berhasil ditambahkan',
          icon: 'success',
          confirmButtonText: 'OK',
          confirmButtonColor: '#1e3a8a'
        });
        formAddMember.reset();
        await renderAll();
      } else {
        Swal.fire({
          title: 'Gagal!',
          text: result.message || 'Gagal menambahkan anggota',
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#dc2626'
        });
      }
    } catch (err) {
      console.error('Error saat menambah anggota:', err);
      Swal.fire({
        title: 'Kesalahan!',
        text: 'Terjadi kesalahan koneksi server: ' + (err.message || ''),
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#dc2626'
      });
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    }
  });
}

// Fungsi memuat daftar pinjaman 'Pending'
async function loadPendingLoans() {
  const tbody = document.getElementById('table-pending-loans');
  if (!tbody) return;

  try {
    const res = await fetch(`${API_BASE_URL}/loans/pending`, { headers: getAuthHeaders() });
    const result = await res.json();

    const dataLoans = result.success ? result.data : (Array.isArray(result) ? result : []);

    if (dataLoans.length > 0) {
      tbody.innerHTML = dataLoans.map(loan => `
        <tr class="border-b hover:bg-gray-50">
          <td class="p-3 font-medium">${loan.member_id || loan.memberId}</td>
          <td class="p-3">${loan.nama || '-'}</td>
          <td class="p-3 font-semibold text-blue-900">Rp ${Number(loan.jumlah || loan.amount).toLocaleString('id-ID')}</td>
          <td class="p-3">${loan.tenor} Bulan</td>
          <td class="p-3 text-center space-x-2">
            <button onclick="handleLoanAction('${loan.id}', 'APPROVED')" class="bg-emerald-600 text-white px-3 py-1 rounded-md text-sm hover:bg-emerald-700 transition">
              Setujui
            </button>
            <button onclick="handleLoanAction('${loan.id}', 'REJECTED')" class="bg-rose-600 text-white px-3 py-1 rounded-md text-sm hover:bg-rose-700 transition">
              Tolak
            </button>
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-gray-500">Tidak ada pengajuan pinjaman baru.</td></tr>`;
    }
  } catch (err) {
    console.error('Gagal memuat daftar pinjaman:', err);
  }
}

// Fungsi eksekusi persetujuan/penolakan
async function handleLoanAction(loanId, action) {
  const isApprove = action === 'APPROVED';
  const confirmAction = await Swal.fire({
    title: isApprove ? 'Setujui Pinjaman?' : 'Tolak Pinjaman?',
    text: `Apakah Anda yakin ingin ${isApprove ? 'menyetujui' : 'menolak'} pengajuan ini?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: isApprove ? '#059669' : '#dc2626',
    cancelButtonColor: '#6b7280',
    confirmButtonText: isApprove ? 'Ya, Setujui' : 'Ya, Tolak',
    cancelButtonText: 'Batal'
  });

  if (!confirmAction.isConfirmed) return;

  try {
    const res = await fetch(`${API_BASE_URL}/loans/approve`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ loan_id: loanId, action: action })
    });

    const result = await res.json();

    if (res.ok) {
      Swal.fire({
        title: 'Berhasil!',
        text: result.message || 'Status pinjaman diperbarui',
        icon: 'success',
        confirmButtonColor: '#1e3a8a'
      });
      await loadPendingLoans();
      await renderAll();
    } else {
      Swal.fire('Gagal!', result.message || 'Terjadi kesalahan.', 'error');
    }
  } catch (err) {
    Swal.fire('Error!', 'Terjadi kesalahan koneksi server.', 'error');
  }
}

// Initial Check Auth saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
});

const btnLogout = document.getElementById('btn-logout');
if (btnLogout) {
    btnLogout.addEventListener('click', (e) => {
        e.preventDefault();
        handleLogout();
    });
}

// Definisikan fungsi handleLogout agar bisa dipanggil dari event listener maupun window
function handleLogout() {
    Swal.fire({
        title: 'Keluar Aplikasi?',
        text: 'Sesi Anda akan diakhiri, Anda harus login kembali untuk masuk.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626', // Warna merah untuk tombol konfirmasi
        cancelButtonColor: '#4b5563',  // Warna abu-abu untuk tombol batal
        confirmButtonText: 'Ya, Keluar',
        cancelButtonText: 'Batal',
        reverseButtons: true
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.removeItem('logged_user');
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            window.location.href = 'index.html';
        }
    });
}

// Expose fungsi ke window untuk akses onclick di HTML
window.handleLoanAction = handleLoanAction;
window.processPayrollDeduction = processPayrollDeduction;
window.calculateLoanPreview = calculateLoanPreview;
window.handleLogout = handleLogout;