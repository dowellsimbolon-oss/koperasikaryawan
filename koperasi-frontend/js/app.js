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

let isFetchingSavings = false;

async function renderSavings() {
  if (isFetchingSavings) return;
  isFetchingSavings = true;

  const admin = typeof isAdminOrTreasurer === 'function' ? isAdminOrTreasurer() : false;
  const loggedUser = JSON.parse(localStorage.getItem('logged_user')) || {};

  const tbody = document.getElementById('savings-tbody');
  if (!tbody) {
    isFetchingSavings = false;
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/savings`, { headers: getAuthHeaders() });
    if (!res.ok) {
      isFetchingSavings = false;
      return;
    }

    const result = await res.json();
    
    // Amankan pengambilan data apakah berupa Array langsung atau terbungkus di dalam object .data
    const savingsArray = Array.isArray(result) ? result : (result.success && Array.isArray(result.data) ? result.data : []);

    tbody.innerHTML = '';
    
    const dataToRender = admin 
      ? savingsArray 
      : savingsArray.filter(s => String(s.memberId || s.member_id || s.id) === String(loggedUser.id));

    if (dataToRender.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-400">Belum ada data simpanan.</td></tr>`;
      isFetchingSavings = false;
      return;
    }

    dataToRender.forEach(s => {
      // Antisipasi perbedaan nama kolom di database (pokok vs simpanan_pokok, dll)
      const pokok = Number(s.pokok || s.simpanan_pokok || 0);
      const wajib = Number(s.wajib || s.simpanan_wajib || 0);
      const sukarela = Number(s.sukarela || s.simpanan_sukarela || 0);
      const total = pokok + wajib + sukarela;

      const namaAnggota = s.nama || s.member_name || loggedUser.nama || '-';
      const idAnggota = s.memberId || s.member_id || s.id || loggedUser.id || '-';

      tbody.innerHTML += `
        <tr class="border-b border-slate-100 hover:bg-slate-50">
          <td class="p-3.5 font-medium">${namaAnggota} <span class="text-xs text-slate-400">(${idAnggota})</span></td>
          <td class="p-3.5">${formatRupiah(pokok)}</td>
          <td class="p-3.5">${formatRupiah(wajib)}</td>
          <td class="p-3.5">${formatRupiah(sukarela)}</td>
          <td class="p-3.5"><strong class="text-emerald-600">${formatRupiah(total)}</strong></td>
        </tr>
      `;
    });
  } catch (err) {
    console.error('Error rendering savings:', err);
    tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-red-400">Gagal memuat data simpanan.</td></tr>`;
  } finally {
    isFetchingSavings = false;
  }
}

async function renderLoans() {
  const admin = typeof isAdminOrTreasurer === 'function' ? isAdminOrTreasurer() : true;
  const loggedUser = JSON.parse(localStorage.getItem('logged_user')) || {};

  try {
    const res = await fetch(`${API_BASE_URL}/loans`, { headers: getAuthHeaders() });
    if (!res.ok) return;

    const loans = await res.json();
    const tbody = document.getElementById('loans-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    const dataToRender = admin ? loans : loans.filter(l => (l.memberId === loggedUser.id || l.member_id === loggedUser.id));

    if (dataToRender.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-slate-400">Belum ada data pinjaman.</td></tr>`;
      return;
    }

    dataToRender.forEach(l => {
      const remaining = Number(l.remaining_amount || l.remaining || 0);
      const statusValue = (l.status || '').toUpperCase();
      
      let statusHtml = '';
      let remainingDisplay = formatRupiah(remaining);

      if (statusValue === 'REJECTED' || statusValue === 'DITOLAK') {
        statusHtml = `<span style="color: #dc2626; font-weight: 600;">DITOLAK</span>`;
        remainingDisplay = '-'; // Sisa tagihan dikosongkan/strip jika ditolak
      } else if (statusValue === 'PENDING') {
        statusHtml = `<span style="color: #d97706; font-weight: 600;">PENDING</span>`;
      } else {
        statusHtml = `<span style="color: ${remaining === 0 ? '#16a34a' : '#d97706'}; font-weight: 600;">
          ${remaining === 0 ? 'LUNAS' : 'AKTIF'}
        </span>`;
      }

      const namaPeminjam = l.nama || l.member_name || loggedUser.name || 'Anggota';
      const idPeminjam = l.memberId || l.member_id || loggedUser.id || '-';

      tbody.innerHTML += `
        <tr class="border-b border-slate-100">
          <td class="p-3.5">${namaPeminjam} (${idPeminjam})</td>
          <td class="p-3.5">${formatRupiah(l.amount || l.jumlah || 0)}</td>
          <td class="p-3.5">${l.tenor || 0} Bln</td>
          <td class="p-3.5">${formatRupiah(l.monthly_installment || l.monthly || 0)}</td>
          <td class="p-3.5 font-medium">${remainingDisplay}</td>
          <td class="p-3.5">${statusHtml}</td>
        </tr>
      `;
    });
  } catch (err) {
    console.error('Error rendering loans:', err);
  }
}

async function renderPayroll() {
  const admin = typeof isAdminOrTreasurer === 'function' ? isAdminOrTreasurer() : false;
  const loggedUser = JSON.parse(localStorage.getItem('logged_user')) || {};

  try {
    const res = await fetch(`${API_BASE_URL}/payroll`, { headers: getAuthHeaders() });
    if (!res.ok) return;

    let payrolls = await res.json();
    const tbody = document.getElementById('payroll-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    // 1. Filter hak akses
    let dataToRender = admin 
      ? payrolls 
      : payrolls.filter(p => p.member_id === loggedUser.id || p.id === loggedUser.id);

    // 2. KHUSUS ADMIN: Filter tabel agar hanya menampilkan periode yang sedang dipilih di form
    if (admin) {
      const periodInput = document.getElementById('payroll-period');
      if (periodInput && periodInput.value) {
        const selectedPeriod = periodInput.value; // contoh: "2026-11"
        dataToRender = dataToRender.filter(p => (p.periode || p.period) === selectedPeriod);
      }
    }

    // Deduplikasi data
    const uniqueMap = new Map();
    dataToRender.forEach(p => {
      const key = `${p.member_id}-${p.periode || p.period}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, p);
      }
    });
    dataToRender = Array.from(uniqueMap.values());

    if (dataToRender.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-slate-400">Belum ada data slip gaji untuk periode ini.</td></tr>`;
      return;
    }

    dataToRender.forEach(p => {
      const periodeDisplay = p.periode || p.period || '-';
      const namaAnggota = p.nama || p.member_name || '-';
      const gajiPokok = Number(p.gaji_pokok || 0);
      const potWajib = Number(p.pot_wajib || p.potongan_wajib || 0);
      const potCicilan = Number(p.pot_cicilan || p.potongan_cicilan || 0);
      const totalPotongan = Number(p.total_potongan || (potWajib + potCicilan));
      const gajiBersih = Number(p.gaji_bersih || (gajiPokok - totalPotongan));

      tbody.innerHTML += `
        <tr class="border-b border-slate-100 hover:bg-slate-50">
          <td class="p-3.5 font-medium">${periodeDisplay}</td>
          <td class="p-3.5">${namaAnggota}</td>
          <td class="p-3.5">${formatRupiah(gajiPokok)}</td>
          <td class="p-3.5">${formatRupiah(potWajib)}</td>
          <td class="p-3.5">${formatRupiah(potCicilan)}</td>
          <td class="p-3.5 font-medium">${formatRupiah(totalPotongan)}</td>
          <td class="p-3.5 font-bold text-blue-900">${formatRupiah(gajiBersih)}</td>
        </tr>
      `;
    });
  } catch (err) {
    console.error('Error rendering payroll:', err);
  }
}

// Tambahkan pemantau agar tabel otomatis ikut berubah saat bulan di form diganti
document.addEventListener('DOMContentLoaded', () => {
  const periodInput = document.getElementById('payroll-period');
  if (periodInput) {
    periodInput.addEventListener('change', () => {
      renderPayroll();
    });
  }
});

async function triggerProcessPayroll() {
  // 1. Ambil nilai dari input dengan id="payroll-period" yang ada di HTML Anda
  const periodInput = document.getElementById('payroll-period');
  const selectedPeriod = periodInput ? periodInput.value : '';

  if (!selectedPeriod) {
    alert('Silakan pilih periode pemotongan terlebih dahulu!');
    return;
  }

  try {
    // 2. Kirim nilai periode tersebut (format: "2026-09") ke backend
    const res = await fetch(`${API_BASE_URL}/payrolls/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ period: selectedPeriod })
    });

    const result = await res.json();
    
    if (res.ok && result.success) {
      alert(result.message);
      // 3. Muat ulang tabel agar data periode yang baru langsung tampil
      renderPayroll(); 
    } else {
      alert(result.message || 'Gagal memproses pemotongan gaji.');
    }
  } catch (err) {
    console.error('Error processing payroll:', err);
    alert('Terjadi kesalahan koneksi server.');
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
        // Mengganti alert sukses dengan SweetAlert2
        if (typeof Swal !== 'undefined') {
          Swal.fire({
            icon: 'success',
            title: 'Berhasil!',
            text: 'Pengajuan pinjaman berhasil dikirim dan menunggu persetujuan.',
            timer: 2000,
            showConfirmButton: false
          });
        } else {
          alert('Pengajuan Pinjaman Berhasil!');
        }

        document.getElementById('loan-amount').value = '';
        await renderAll();
      } else {
        const errData = await res.json();
        const errorMsg = errData.message || 'Gagal mengajukan pinjaman';
        
        // Mengganti alert error dengan SweetAlert2
        if (typeof Swal !== 'undefined') {
          Swal.fire({ icon: 'error', title: 'Gagal', text: errorMsg });
        } else {
          alert(errorMsg);
        }
      }
    } catch (err) {
      if (typeof Swal !== 'undefined') {
        Swal.fire({ icon: 'error', title: 'Kesalahan Server', text: 'Terjadi kesalahan koneksi server' });
      } else {
        alert('Terjadi kesalahan koneksi server');
      }
    } finally {
      setButtonLoading('btn-apply-loan', 'btn-apply-loan-text', 'btn-apply-loan-spinner', false, 'Ajukan Pinjaman');
    }
  });
}

async function processPayrollDeduction() {
  if (!isAdminOrTreasurer()) {
    return Swal.fire({
      title: 'Akses Ditolak',
      text: 'Fitur ini khusus Pengurus/Bendahara.',
      icon: 'error',
      confirmButtonColor: '#10B981'
    });
  }

  // Ambil elemen input periode secara langsung saat tombol diklik
  const periodInput = document.getElementById('payroll-period');
  if (!periodInput) {
    return Swal.fire({
      title: 'Error',
      text: 'Elemen input periode tidak ditemukan!',
      icon: 'error',
      confirmButtonColor: '#10B981'
    });
  }

  let period = periodInput.value;
  
  // Validasi jika input kosong
  if (!period) {
    return Swal.fire({
      title: 'Peringatan',
      text: 'Silakan pilih periode pemotongan terlebih dahulu!',
      icon: 'warning',
      confirmButtonColor: '#10B981'
    });
  }

  // Pastikan format periode bersih (misal: "2026-09")
  // Jika input bertipe 'month' mengembalikan format YYYY-MM, kita gunakan langsung
  console.log("PERIODE YANG DIPILIH DI FORM:", period);

  const confirmResult = await Swal.fire({
    title: 'Konfirmasi Pemotongan Gaji',
    text: `Proses pemotongan gaji untuk periode ${period}?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#10B981',
    cancelButtonColor: '#EF4444',
    confirmButtonText: 'Ya, Lanjutkan',
    cancelButtonText: 'Batal'
  });

  if (!confirmResult.isConfirmed) return;

  setButtonLoading('btn-process-payroll', 'btn-process-payroll-text', 'btn-process-payroll-spinner', true, 'Proses Potong Gaji');

  try {
    const res = await fetch(`${API_BASE_URL}/payrolls/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ period: period })
    });

    const result = await res.json();
    if (res.ok && result.success) {
      await Swal.fire({
        title: 'Berhasil!',
        text: result.message || `Pemotongan gaji untuk periode ${period} berhasil diproses!`,
        icon: 'success',
        confirmButtonColor: '#10B981'
      });
      await renderPayroll(); 
      await renderAll();
    } else {
      await Swal.fire({
        title: 'Gagal',
        text: result.message || 'Gagal memproses pemotongan gaji',
        icon: 'error',
        confirmButtonColor: '#10B981'
      });
    }
  } catch (err) {
    console.error('Process Payroll Error:', err);
    await Swal.fire({
      title: 'Kesalahan Koneksi',
      text: 'Terjadi kesalahan koneksi server',
      icon: 'error',
      confirmButtonColor: '#10B981'
    });
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

// 1. Fungsi memuat daftar pinjaman 'Pending' secara dinamis
let isFetchingLoans = false;

async function loadPendingLoans() {
    if (isFetchingLoans) return;
    isFetchingLoans = true;

    const tbody = document.getElementById('table-pending-loans');
    if (!tbody) {
        isFetchingLoans = false;
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/loans/pending`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Gagal mengambil data pinjaman');
        
        const result = await res.json();
        const dataLoans = result.success ? result.data : (Array.isArray(result) ? result : []);

        if (dataLoans.length > 0) {
            tbody.innerHTML = dataLoans.map(loan => `
                <tr class="border-b hover:bg-gray-50">
                    <td class="p-3 font-medium">${loan.member_id || loan.memberId || '-'}</td>
                    <td class="p-3">${loan.nama || '-'}</td>
                    <td class="p-3 font-semibold text-blue-900">Rp ${Number(loan.jumlah || loan.amount || 0).toLocaleString('id-ID')}</td>
                    <td class="p-3">${loan.tenor || 0} Bulan</td>
                    <td class="p-3 text-center space-x-2">
                        <button onclick="handleLoanAction('${loan.id}', 'APPROVED')" class="bg-emerald-600 text-white px-3 py-1 rounded hover:bg-emerald-700">Setujui</button>
                        <button onclick="handleLoanAction('${loan.id}', 'REJECTED')" class="bg-rose-600 text-white px-3 py-1 rounded hover:bg-rose-700">Tolak</button>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-400">Tidak ada pengajuan pinjaman pending.</td></tr>`;
        }
    } catch (err) {
        console.error('Error loading pending loans:', err);
        tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-red-400">Gagal memuat data pinjaman.</td></tr>`;
    } finally {
        isFetchingLoans = false;
    }
}

// 2. Fungsi Tombol Aksi (Setujui / Tolak) dengan pesan & endpoint yang benar
async function handleLoanAction(loanId, actionStatus) {
    const endpoint = actionStatus === 'APPROVED' ? 'approve' : 'reject';
    const actionText = actionStatus === 'APPROVED' ? 'disetujui' : 'ditolak';

    try {
        const res = await fetch(`${API_BASE_URL}/loans/${loanId}/${endpoint}`, {
            method: 'POST',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: loanId })
        });
        const result = await res.json();

        if (result.success) {
            // Notifikasi visual sukses dengan SweetAlert2
            Swal.fire({
                icon: 'success',
                title: 'Berhasil!',
                text: `Pengajuan pinjaman berhasil ${actionText}!`,
                timer: 2000,
                showConfirmButton: false
            });
            loadPendingLoans(); // Refresh tabel seketika
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Gagal',
                text: result.message || 'Terjadi kesalahan'
            });
        }
    } catch (err) {
        console.error('Error action loan:', err);
        alert('Terjadi kesalahan koneksi server.');
    }
}


// 3. Inisialisasi Halaman & Polling Real-Time setiap 3 Detik
document.addEventListener('DOMContentLoaded', () => {
    if (typeof checkAuth === 'function') checkAuth();

    if (typeof loadPendingLoans === 'function') {
        loadPendingLoans(); // Muat data pertama kali saat halaman admin dibuka

    }
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

document.addEventListener('DOMContentLoaded', () => {
  const periodInput = document.getElementById('payroll-period');
  if (periodInput) {
    periodInput.addEventListener('change', () => {
      renderPayroll(); // Otomatis merefresh tabel saat periode diubah
    });
  }
});