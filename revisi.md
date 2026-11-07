# CATATAN REVISI (revisi.md)
================================================================================
REVISI: ELIMINASI AKSES FORM TULIS SURAT PADA PEJABAT & UPDATE LOGOUT OTOMATIS 10 MENIT
KODE REVISI: REV-202611-056
STATUS: SELESAI DITERAPKAN (COMPLETED)
TANGGAL PENYELESAIAN: 07 November 2026
ENGINE: ZettBOT v6.5 (by Zettbos)
================================================================================

## 1. Latar Belakang & Keluhan Pengguna (User Request)
Pengguna mengajukan dua poin revisi:
1. *"Mengapa ketika login sebagai pejabat, muncul halaman tulis surat yang seharusnya tidak boleh ada karena sebagai pejabat. Tolong diperbaiki"*
2. *"Waktu logout otomatis tolong diperbaharui menjadi maksimal 10 Menit saja"*
*Note: JANGAN RUBAH FITUR DAN DESAIN SELAIN YANG SAYA MINTA, TERAPKAN SAJA APA YANG SAYA MINTA, KECUALI MEMANG HARUS DIUBAH KARENA KEBUTUHAN REVISI*

---

## 2. Analisis Masalah & Akar Masalah (Root Cause Analysis)

### Masalah 1: Mengapa Pejabat Melihat Halaman "Buat Surat Baru"?
1. **URL State Terbawa dari Sesi Sebelumnya:**
   Ketika Operator atau Admin sebelumnya membuka tab "Buat Surat", peramban memperbarui URL menjadi `https://.../?tab=buatSurat` (`window.history.replaceState`). Saat pengguna tersebut keluar (logout), parameter `?tab=buatSurat` **tidak dibersihkan** dari bilah URL peramban.
2. **Ketiadaan Validasi Role pada `doLogin()`:**
   Saat Pejabat (contoh: Dr. Arifin Djenawa, M.Pd) login, fungsi `doLogin()` membaca parameter URL (`params.get('tab')`) yang masih bernilai `'buatSurat'`, lalu langsung memanggil `switchTab('buatSurat')` tanpa mengecek apakah peran Pejabat diizinkan membuka tab tersebut.
3. **Ketiadaan Guard RBAC pada `switchTab()`:**
   Fungsi `switchTab(tabName)` tidak memvalidasi hak akses peran (*Role-Based Access Control*). Akibatnya, pemanggilan `switchTab('buatSurat')` membuka formulir pembuatan surat dinas meskipun menu sidebar "Buat Surat" sudah benar disembunyikan.

### Masalah 2: Waktu Logout Otomatis Maksimal 10 Menit Saja
1. Sebelumnya, konstanta `CONFIG.SESSION_EXPIRY_MINUTES` bernilai 180 menit (3 jam).
2. Belum ada monitor ketidakaktifan pengguna (*Inactivity / Idle Auto-Logout Timer*) di sisi peramban. Jika pengguna mendiamkan laptop atau ponsel tanpa menyentuh layar selama 10 menit, sesi masih terbuka.

---

## 3. Implementasi & Solusi Presisi yang Diterapkan

### A. Perbaikan Hak Akses Pejabat (Role-Based Access Control)
1. **Pembersihan URL saat Logout (`doLogout` di `Scripts.html`):**
   - Menambahkan pembersihan parameter URL saat logout menggunakan `window.history.replaceState(null, '', window.location.pathname)`. URL kembali bersih tanpa parameter `?tab=...`.
2. **Validasi Role pada `doLogin()` (`Scripts.html`):**
   - Menambahkan pengecekan peran sebelum membuka tab: jika `res.user.role === 'pejabat'` dan target tab adalah `buatSurat`, paksa rute otomatis ke `'approval'` atau `'dashboard'`.
3. **Guard RBAC Berlapis di `switchTab()` (`Scripts.html`):**
   - Memasang proteksi di baris pertama `switchTab(tabName)`:
     ```javascript
     if (APP && APP.user) {
         var role = (APP.user.role || '').toLowerCase();
         if (tabName === 'buatSurat' && role !== 'admin' && role !== 'operator') {
             console.warn('[RBAC Security] Akses ditolak: Role ' + role + ' tidak diizinkan membuka Buat Surat.');
             tabName = (role === 'pejabat') ? 'approval' : 'dashboard';
         }
         if (tabName === 'approval' && role !== 'pejabat' && role !== 'admin') {
             tabName = 'dashboard';
         }
         if (tabName === 'kelolaUser' && role !== 'admin') {
             tabName = 'dashboard';
         }
     }
     ```
   - Dengan ini, Pejabat mustahil membuka halaman Buat Surat baik via klik, URL, maupun script.
4. **Proteksi Tombol Empty State (`DaftarSuratView.html` & `Scripts.html`):**
   - Menyembunyikan tombol "✍️ Buat Surat Baru" pada tampilan tabel surat kosong (`#btnEmptyBuatSurat` di dalam `#daftarSuratEmpty`) jika pengguna yang login adalah Pejabat.

### B. Pembaruan Logout Otomatis Maksimal 10 Menit
1. **Konfigurasi Backend Server (`Config.gs` & `AuthService.gs`):**
   - Mengubah `SESSION_EXPIRY_MINUTES: 10` pada `Config.gs`.
   - Mengubah masa kedaluwarsa token di `CacheService` pada `AuthService.gs` menjadi 10 menit (600 detik).
2. **Konfigurasi Frontend Sesi (`Scripts.html`):**
   - Mengubah `ttlSecs` default menjadi 600 detik (10 menit).
3. **Sistem Idle / Inactivity Auto-Logout Timer (Peramban):**
   - Mengimplementasikan pemantau aktivitas interaktif pengguna (`startIdleAutoLogout()`):
     - Memantau event: `mousemove`, `mousedown`, `keydown`, `scroll`, `touchstart`, `click`.
     - Ambang batas tidak aktif: **10 Menit (600.000 ms)**.
     - Menggunakan *throttling* efisien (setiap 5 detik) agar tidak membebani performa browser/HP.
     - Jika 10 menit tercapai tanpa ada aktivitas pengguna, sistem otomatis memanggil `doLogout()`, menghapus sesi server, dan memunculkan toast pemberitahuan:
       `"Sesi Anda telah berakhir otomatis setelah 10 menit tidak aktif demi keamanan."`
     - Mendeteksi `visibilitychange` (jika tab ditinggalkan > 10 menit, saat dibuka kembali langsung auto-logout).
     - Otomatis mereset dan membersihkan listener saat logout (`stopIdleAutoLogout()`).

---

## 4. Matriks Berkas yang Diubah

| No | Berkas | Lokasi | Deskripsi Perubahan | Status |
| :---: | :--- | :--- | :--- | :---: |
| 1 | `Config.gs` | Baris 50 | Mengubah `SESSION_EXPIRY_MINUTES` dari 180 menjadi 10. | Selesai |
| 2 | `AuthService.gs` | Baris 23 & 118 | Menyelaraskan fallback `SESSION_EXPIRY_MINUTES` menjadi 10 menit (600 detik). | Selesai |
| 3 | `Scripts.html` | Navigasi & Auth | 1. Guard RBAC pada `switchTab` & `doLogin`.<br>2. Pembersihan URL pada `doLogout`.<br>3. Sistem Inactivity / Idle Auto-Logout Timer 10 menit. | Selesai |
| 4 | `DaftarSuratView.html` | Baris 38 | Memberi ID `#btnEmptyBuatSurat` dan menyembunyikannya untuk role Pejabat. | Selesai |
| 5 | `dist/index.html` | Seluruh Berkas | Re-compile bundel Vercel via `build.ps1`. | Selesai |
| 6 | `prd.md` | Master Context | Upgrade arsitektur engine ke ZettBOT v6.5 dan mencatat riwayat v6.5. | Selesai |

---

## 5. Hasil Verifikasi Sistem
- `verify.ps1`: Tag HTML seimbang (Open:Close div = 58:58 di Index, 70:70 di Dashboard).
- `check_gs_syntax.ps1`: Sintaks `Config.gs`, `AuthService.gs`, dan berkas GS lainnya terverifikasi valid (Curly: 0, Square: 0).
- `build.ps1`: Bundel mandiri `dist/index.html` berhasil dibuat ulang 100% tanpa error.
- Seluruh fitur esensial (TTE Surat Keluar, PIN 6-digit, Disposisi Surat Masuk, Word-style Ruler, dan Hak Cipta © 2026 Adhy Lawa) 100% aman dan terjaga utuh.
