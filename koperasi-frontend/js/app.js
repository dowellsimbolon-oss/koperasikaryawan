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

function isAdminOrTreasurer() {
  const loggedUser = JSON.parse(localStorage.getItem('logged_user'));
  if (!loggedUser || !loggedUser.role) return false;
  const role = loggedUser.role.toLowerCase();
  return role.includes('bendahara') || role.includes('pengurus') || role.includes('admin');
}

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
    if (isIndexPage && isAdminOrTreasurer()) {
      window.location.href = 'admin.html';
      return;
    }
    if (isAdminPage && !isAdminOrTreasurer()) {
      window.location.href = 'index.html';
      return;
    }

    if (loginScreen) loginScreen.style.display = 'none';
    if (mainApp) mainApp.style.display = 'flex';

    const userNameEl = document.getElementById('user-name') || document.getElementById('admin-name');
    const userRoleEl = document.getElementById('user-role') || document.getElementById('admin-role');
    const userAvatarEl = document.getElementById('user-avatar');

    if (userNameEl) userNameEl.innerText = loggedUser.name;
    if (userRoleEl) userRoleEl.innerText = loggedUser.role;
    if (userAvatarEl) userAvatarEl.innerText = loggedUser.name ? loggedUser.name.charAt(0).toUpperCase() : 'U';

    adjustUIByRole(loggedUser);
    renderAll();
  } else {
    if (isAdminPage) {
      window.location.href = 'index.html';
      return;
    }
    if (loginScreen) loginScreen.style.display = 'flex';
    if (mainApp) mainApp.style.display = 'none';
  }
}

function adjustUIByRole(loggedUser) {
  const admin = isAdminOrTreasurer();
  const cardAddSavings = document.getElementById('card-add-savings');
  const payrollActionSection = document.getElementById('payroll-action-section');

  if (cardAddSavings) cardAddSavings.style.display = admin ? 'block' : 'none';
  if (payrollActionSection) payrollActionSection.style.display = admin ? 'block' : 'none';

  const loanMemberSelect = document.getElementById('loan-member-id');
  if (!admin && loggedUser && loanMemberSelect) {
    loanMemberSelect.innerHTML = `<option value="${loggedUser.id}">${loggedUser.name} (${loggedUser.id})</option>`;
    loanMemberSelect.disabled = true;
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
        body: JSON.stringify({ username: usernameInput, password: passwordInput })
      });

      const result = await response.json();

      if (response.ok) {
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
  if (typeof Swal !== 'undefined') {
    Swal.fire({
      title: 'Keluar Aplikasi?',
      text: 'Sesi Anda akan diakhiri, Anda harus login kembali untuk masuk.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#4b5563',
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
  } else {
    if (confirm('Apakah Anda yakin ingin keluar dari aplikasi?')) {
      localStorage.removeItem('logged_user');
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      window.location.href = 'index.html';
    }
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

// --- RENDER FUNCTIONS ---
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
        
        const myApprovedLoans = loansList.filter(l => 
            (l.memberId === loggedUser.id || l.member_id === loggedUser.id) && 
            (l.status === 'APPROVED' || l.status === 'AKTIF')
        );

        let myRemainingLoan = 0;
        if (myApprovedLoans.length > 0) {
            myRemainingLoan = myApprovedLoans.reduce((total, loan) => total + Number(loan.remaining_amount || loan.remaining || 0), 0);
        }

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
  const loggedUser = JSON.parse(localStorage.getItem('logged_user')) || {};
  const tbody = document.getElementById('savings-tbody');
  if (!tbody) return;

  try {
    const res = await fetch(`${API_BASE_URL}/savings`, { headers: getAuthHeaders() });
    if (!res.ok) return;

    const result = await res.json();
    const savings = Array.isArray(result) ? result : (result.data || result.savings || []);

    tbody.innerHTML = '';
    const dataToRender = admin ? savings : savings.filter(s => String(s.memberId || s.member_id || s.id) === String(loggedUser.id));

    if (dataToRender.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-400">Belum ada data simpanan.</td></tr>`;
      return;
    }

    dataToRender.forEach(s => {
      const pokok = Number(s.pokok || 0);
      const wajib = Number(s.wajib || 0);
      const sukarela = Number(s.sukarela || 0);
      const total = pokok + wajib + sukarela;
      const nama = s.nama || s.member_name || loggedUser.nama || '-';
      const id = s.memberId || s.member_id || s.id || loggedUser.id || '-';

      tbody.innerHTML += `
        <tr class="border-b border-slate-100 hover:bg-slate-50">
          <td class="p-3.5 font-medium">${nama} <span class="text-xs text-slate-400">(${id})</span></td>
          <td class="p-3.5">${formatRupiah(pokok)}</td>
          <td class="p-3.5">${formatRupiah(wajib)}</td>
          <td class="p-3.5">${formatRupiah(sukarela)}</td>
          <td class="p-3.5"><strong class="text-emerald-600">${formatRupiah(total)}</strong></td>
        </tr>
      `;
    });
  } catch (err) {
    console.error('Error rendering savings:', err);
  }
}

async function renderLoans() {
  const admin = isAdminOrTreasurer();
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

      if (statusValue === 'REJECTED') {
        statusHtml = `<span style="color: #dc2626; font-weight: 600;">DITOLAK</span>`;
        remainingDisplay = '-';
      } else if (statusValue === 'PENDING') {
        statusHtml = `<span style="color: #d97706; font-weight: 600;">PENDING</span>`;
        remainingDisplay = '-';
      } else if (statusValue === 'LUNAS' || remaining === 0) {
        statusHtml = `<span style="color: #16a34a; font-weight: 600;">LUNAS</span>`;
        remainingDisplay = '-';
      } else {
        statusHtml = `<span style="color: #d97706; font-weight: 600;">AKTIF</span>`;
      }

      const namaPeminjam = l.nama || l.member_name || loggedUser.name || 'Anggota';
      const idPeminjam = l.memberId || l.member_id || loggedUser.id || '-';

     
      // Logika Tombol Aksi
      let aksiHtml = '-';
      
      if (statusValue === 'PENDING_PAYOFF') {
        if (admin) {
          // Tombol untuk Bendahara jika karyawan mengajukan pelunasan
          aksiHtml = `<button onclick="approvePayoff('${l.id}')" class="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700">Verifikasi Bayar</button>`;
        } else {
          // Tampilan Karyawan yang sedang mengajukan
          aksiHtml = `<span class="text-xs text-slate-500 italic">Menunggu Verifikasi</span>`;
        }
      } else if (statusValue === 'APPROVED' && remaining > 0) {
        // Tombol untuk Karyawan jika pinjaman aktif
        if (!admin) {
          aksiHtml = `<button onclick="requestPayoff('${l.id}')" class="bg-amber-500 text-white px-3 py-1 rounded text-xs hover:bg-amber-600">Ajukan Lunasi</button>`;
        }
      }

      tbody.innerHTML += `
        <tr class="border-b border-slate-100">
          <td class="p-3.5">${namaPeminjam} (${idPeminjam})</td>
          <td class="p-3.5">${formatRupiah(l.amount || l.jumlah || 0)}</td>
          <td class="p-3.5">${l.tenor || 0} Bln</td>
          <td class="p-3.5">${formatRupiah(l.monthly_installment || l.monthly || 0)}</td>
          <td class="p-3.5 font-medium">${remainingDisplay}</td>
          <td class="p-3.5">${statusHtml}</td>
          <td class="p-3.5 text-center">${aksiHtml}</td>
        </tr>
      `;
    });
     } catch (err) { // <-- Ini penutup try-catch (yang tadi hilang)
    console.error('Error rendering loans:', err);
  }
}

// --- FUNGSI PAYROLL YANG SUDAH DIPERBAIKI ---
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
    
    // Filter data
    let dataToRender = admin 
      ? payrolls 
      : payrolls.filter(p => String(p.member_id || p.memberId) === String(loggedUser.id));

    // Khusus Admin: Filter tabel berdasarkan periode yang sedang dipilih di form
    if (admin) {
      const periodInput = document.getElementById('payroll-period');
      if (periodInput && periodInput.value) {
        const selectedPeriod = periodInput.value;
        dataToRender = dataToRender.filter(p => (p.periode || p.period) === selectedPeriod);
      }
    }

    if (dataToRender.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-slate-400">Belum ada data slip gaji.</td></tr>`;
      if (document.getElementById('dash-last-salary')) document.getElementById('dash-last-salary').innerText = "Rp 0";
      if (document.getElementById('dash-last-period')) document.getElementById('dash-last-period').innerText = "Belum ada data gaji";
      return;
    }

    // Urutkan data dari periode terbaru
    dataToRender.sort((a, b) => (b.periode || b.period || '').localeCompare(a.periode || a.period || ''));

    // === UPDATE KARTU RINGKASAN GAJI TERAKHIR (Khusus Anggota) ===
    if (!admin && document.getElementById('dash-last-salary')) {
        const latestPayroll = dataToRender[0];
        const gajiBersihTerakhir = Number(latestPayroll.gajiBersih || latestPayroll.gaji_bersih || 0);
        document.getElementById('dash-last-salary').innerText = formatRupiah(gajiBersihTerakhir);
        document.getElementById('dash-last-period').innerText = `Periode: ${latestPayroll.periode || latestPayroll.period || '-'}`;
    }

    // Render Tabel (Membedakan antara Admin dan Karyawan)
    dataToRender.forEach(p => {
      const periodeDisplay = p.periode || p.period || '-';
      const namaAnggota = p.nama || p.member_name || loggedUser.name || '-';
      
      const gajiPokok = Number(p.gajiPokok || p.gaji_pokok || 0);
      const potWajib = Number(p.potWajib || p.pot_wajib || 0);
      const potCicilan = Number(p.potCicilan || p.pot_cicilan || 0);
      const totalPotongan = Number(p.totalPotongan || p.total_potongan || (potWajib + potCicilan));
      const gajiBersih = Number(p.gajiBersih || p.gaji_bersih || (gajiPokok - totalPotongan));

      if (admin) {
        // Tampilan Admin (Ada Nama Anggota, Tanpa Tombol Aksi)
        tbody.innerHTML += `
          <tr class="border-b border-slate-100 hover:bg-slate-50">
            <td class="p-3.5 font-medium">${periodeDisplay}</td>
            <td class="p-3.5">${namaAnggota}</td>
            <td class="p-3.5">${formatRupiah(gajiPokok)}</td>
            <td class="p-3.5">${formatRupiah(potWajib)}</td>
            <td class="p-3.5">${formatRupiah(potCicilan)}</td>
            <td class="p-3.5 font-medium text-rose-600">- ${formatRupiah(totalPotongan)}</td>
            <td class="p-3.5 font-bold text-emerald-600">${formatRupiah(gajiBersih)}</td>
          </tr>
        `;
      } else {
        // Tampilan Karyawan (Tanpa Nama, Ada Tombol Detail)
        tbody.innerHTML += `
          <tr class="border-b border-slate-100 hover:bg-slate-50">
            <td class="p-3.5 font-medium">${periodeDisplay}</td>
            <td class="p-3.5">${formatRupiah(gajiPokok)}</td>
            <td class="p-3.5">${formatRupiah(potWajib)}</td>
            <td class="p-3.5">${formatRupiah(potCicilan)}</td>
            <td class="p-3.5 font-medium text-rose-600">- ${formatRupiah(totalPotongan)}</td>
            <td class="p-3.5 font-bold text-emerald-600">${formatRupiah(gajiBersih)}</td>
            <td class="p-3.5 text-center">
              <button onclick="showSlipDetail('${periodeDisplay}', '${namaAnggota}', ${gajiPokok}, ${potWajib}, ${potCicilan}, ${gajiBersih})" class="bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition">Detail</button>
            </td>
          </tr>
        `;
      }
    });
  } catch (err) {
    console.error('Error rendering payroll:', err);
  }
}

// Fungsi untuk menampilkan Pop-up Slip Gaji
function showSlipDetail(periode, nama, gajiPokok, potWajib, potCicilan, gajiBersih) {
    Swal.fire({
        title: `Slip Gaji - ${periode}`,
        html: `
            <div class="text-left text-sm mt-4">
                <p class="mb-2"><b>Nama Karyawan:</b> ${nama}</p>
                <hr class="my-2 border-slate-200">
                <div class="flex justify-between py-1">
                    <span>Gaji Pokok</span>
                    <span class="font-semibold">${formatRupiah(gajiPokok)}</span>
                </div>
                <div class="flex justify-between py-1 text-rose-600">
                    <span>Potongan Wajib</span>
                    <span>- ${formatRupiah(potWajib)}</span>
                </div>
                <div class="flex justify-between py-1 text-rose-600">
                    <span>Potongan Cicilan</span>
                    <span>- ${formatRupiah(potCicilan)}</span>
                </div>
                <hr class="my-2 border-slate-200">
                <div class="flex justify-between py-2 text-lg font-bold text-emerald-600">
                    <span>Gaji Bersih Diterima</span>
                    <span>${formatRupiah(gajiBersih)}</span>
                </div>
            </div>
        `,
        confirmButtonText: 'Tutup',
        confirmButtonColor: '#1e3a8a'
    });
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
// Handler Simpanan
const formSavings = document.getElementById('form-add-savings');
if (formSavings) {
  formSavings.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!isAdminOrTreasurer()) return alert('Akses ditolak.');

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

// Handler Pinjaman Karyawan
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

// Handler Proses Potong Gaji (Admin)
async function processPayrollDeduction() {
  if (!isAdminOrTreasurer()) {
    return Swal.fire({
      title: 'Akses Ditolak',
      text: 'Fitur ini khusus Pengurus/Bendahara.',
      icon: 'error',
      confirmButtonColor: '#10B981'
    });
  }

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
  
  if (!period) {
    return Swal.fire({
      title: 'Peringatan',
      text: 'Silakan pilih periode pemotongan terlebih dahulu!',
      icon: 'warning',
      confirmButtonColor: '#10B981'
    });
  }

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

// Handler Tambah Anggota Baru (Admin)
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
      const res = await fetch(`${API_BASE_URL}/members`, {
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

// Handler Persetujuan Pinjaman (Admin)
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
        const dataLoans = result.success ? result.data : (Array.isArray(result) ? result : (result.loans || []));

        if (dataLoans.length > 0) {
            tbody.innerHTML = dataLoans.map(loan => `
                <tr class="border-b hover:bg-gray-50">
                    <td class="p-3 font-medium">${loan.member_id || loan.memberId || '-'}</td>
                    <td class="p-3">${loan.nama || loan.member_name || '-'}</td>
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
            Swal.fire({
                icon: 'success',
                title: 'Berhasil!',
                text: `Pengajuan pinjaman berhasil ${actionText}!`,
                timer: 2000,
                showConfirmButton: false
            });
            loadPendingLoans();
            renderLoans(); // Refresh tabel pinjaman
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

// Inisialisasi Awal & Event Listener
document.addEventListener('DOMContentLoaded', () => {
    if (typeof checkAuth === 'function') checkAuth();

    const periodInput = document.getElementById('payroll-period');
    if (periodInput) {
      periodInput.addEventListener('change', () => {
        renderPayroll();
      });
    }

    if (typeof loadPendingLoans === 'function') {
        loadPendingLoans();
    }
});

// Handler Ubah Profil (Karyawan)
const formUpdateProfile = document.getElementById('form-update-profile');

if (formUpdateProfile) {
    formUpdateProfile.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const oldPassword = document.getElementById('profile-old-password').value;
        const newUsername = document.getElementById('profile-new-username').value;
        const newPassword = document.getElementById('profile-new-password').value;

        if (!oldPassword) {
            return Swal.fire('Peringatan', 'Password lama wajib diisi!', 'warning');
        }

        if (!newUsername && !newPassword) {
            return Swal.fire('Peringatan', 'Isi username baru atau password baru untuk melakukan perubahan.', 'warning');
        }

        const btn = document.getElementById('btn-update-profile');
        const btnText = document.getElementById('btn-update-profile-text');
        btn.disabled = true;
        btnText.textContent = 'Menyimpan...';

        try {
            const res = await fetch(`${API_BASE_URL}/users/profile`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ oldPassword, newUsername, newPassword })
            });

            const result = await res.json();

            if (res.ok && result.success) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Berhasil!',
                    text: result.message,
                    confirmButtonText: 'Login Ulang',
                    allowOutsideClick: false
                });
                
                localStorage.removeItem('logged_user');
                localStorage.removeItem('token');
                window.location.href = 'index.html'; 
            } else {
                Swal.fire('Gagal', result.message || 'Gagal memperbarui profil', 'error');
            }
        } catch (err) {
            console.error('Update Profile Error:', err);
            Swal.fire('Kesalahan', 'Terjadi kesalahan koneksi server.', 'error');
        } finally {
            btn.disabled = false;
            btnText.textContent = 'Simpan Perubahan';
        }
    });
}

// Expose Fungsi
window.handleLoanAction = handleLoanAction;
window.calculateLoanPreview = calculateLoanPreview;
window.handleLogout = handleLogout;
window.processPayrollDeduction = processPayrollDeduction;
window.showSlipDetail = showSlipDetail;

// Fungsi Karyawan Mengajukan Pelunasan
async function requestPayoff(loanId) {
    const confirm = await Swal.fire({
        title: 'Ajukan Pelunasan?',
        text: 'Pastikan Anda sudah menyiapkan uang dan akan menyerahkannya ke Bendahara.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#F59E0B',
        cancelButtonColor: '#4b5563',
        confirmButtonText: 'Ya, Ajukan',
        cancelButtonText: 'Batal'
    });

    if (!confirm.isConfirmed) return;

    try {
        const res = await fetch(`${API_BASE_URL}/loans/${loanId}/request-payoff`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        const result = await res.json();

        if (res.ok && result.success) {
            Swal.fire('Berhasil!', result.message, 'success');
            renderAll(); 
        } else {
            Swal.fire('Gagal', result.message, 'error');
        }
    } catch (err) {
        Swal.fire('Kesalahan', 'Terjadi kesalahan koneksi server', 'error');
    }
}

// Fungsi Bendahara Menyetujui Pelunasan
async function approvePayoff(loanId) {
    const confirm = await Swal.fire({
        title: 'Verifikasi Pembayaran',
        text: 'Apakah Anda sudah menerima uang pelunasan dari karyawan ini?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#10B981',
        cancelButtonColor: '#EF4444',
        confirmButtonText: 'Ya, Uang Diterima',
        cancelButtonText: 'Batal'
    });

    if (!confirm.isConfirmed) return;

    try {
        const res = await fetch(`${API_BASE_URL}/loans/${loanId}/approve-payoff`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        const result = await res.json();

        if (res.ok && result.success) {
            Swal.fire('Berhasil!', result.message, 'success');
            renderAll();
        } else {
            Swal.fire('Gagal', result.message, 'error');
        }
    } catch (err) {
        Swal.fire('Kesalahan', 'Terjadi kesalahan koneksi server', 'error');
    }
}

// Expose fungsi baru
window.requestPayoff = requestPayoff;
window.approvePayoff = approvePayoff;