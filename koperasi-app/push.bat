@echo off
cls
echo ====================================
echo   OTOMATIS PUSH KE GITHUB KOPERASI
echo ====================================
git add .
set /p pesan="Masukkan Pesan Commit/Catatan: "
git commit -m "%pesan%"
echo Sedang mengirim (push) ke GitHub...
git push origin main
echo ====================================
echo Selesai! Perubahan sudah masuk ke GitHub.
pause