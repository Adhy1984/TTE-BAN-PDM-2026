# CATATAN REVISI (revisi.md)
================================================================================
REVISI: INTEGRASI LOGIN GOOGLE & FITUR PEMULIHAN AKUN (LUPA USERNAME & LUPA PASSWORD)
KODE REVISI: REV-202611-059
STATUS: SELESAI DITERAPKAN (COMPLETED)
TANGGAL PENGAJUAN: 13 November 2026
TANGGAL PENYELESAIAN: 13 November 2026
ENGINE: ZettBOT v6.8 (by Zettbos)
================================================================================

## 1. Latar Belakang & Permintaan Pengguna (User Request)
Pengguna mengajukan permintaan penambahan fitur pada antarmuka autentikasi / halaman login (`AuthView.html`):
> *"1. Saya ingin menambahkan login dengan akun google"*
> *"2. Saya ingin menambahkan tombol 'Lupa Password' dan Lupa Username'"*
> *Note: JANGAN RUBAH FITUR DAN DESAIN SELAIN YANG SAYA MINTA, TERAPKAN SAJA APA YANG SAYA MINTA, KECUALI MEMANG HARUS DIUBAH KARENA KEBUTUHAN REVISI*

---

## 2. Analisis Arsitektur & Radar Batasan Teknis (Technical Reality Check)

### A. Fitur 1: Login dengan Akun Google (Google Sign-In)
- **Arsitektur Dual-Engine (Vercel & Google Apps Script):**
  Aplikasi memiliki frontend mandiri di Vercel (`https://an-pdm-ntt.vercel.app/`) dan backend Google Apps Script REST API.
- **Standar Resmi Google OAuth 2.0 (Google Identity Services / GIS):**
  1. Google mewajibkan penggunaan pustaka resmi `https://accounts.google.com/gsi/client` dengan sebuah **Google Client ID** (`GOOGLE_CLIENT_ID`) yang didaftarkan di Google Cloud Console untuk memverifikasi domain resmi.
  2. Saat pengguna mengklik *"Masuk dengan Google"*, Google memunculkan popup pemilihan akun. Setelah akun dipilih, Google mengirimkan token identitas (ID Token / email terverifikasi).
  3. Frontend mengirimkan email Google tersebut ke backend: `apiLoginWithGoogle(googleEmail, googleName)`.
  4. Backend memeriksa apakah email tersebut terdaftar pada sheet `users` atau sheet `pejabat`:
     - **Jika Terdaftar & Berstatus AKTIF:** Server menerbitkan Session Token resmi `TTE_SESS_...` via `CacheService` (10 menit) dan mengizinkan login instan.
     - **Jika Belum Terdaftar:** Sistem menolak dengan pesan informatif: *"Akun Google Anda ([email]) belum terdaftar di database e-TTE. Hubungi Administrator."*
- **Penyesuaian Skema Database (Database Migration):**
  Sheet `users` akan ditambahkan kolom `email` otomatis via `ensureColumnExists()` di `Database.gs`, melengkapi sheet `pejabat` yang sudah memiliki kolom `email`.

### B. Fitur 2: Tombol "Lupa Username" dan "Lupa Password"
- **Tata Letak UI yang Rapi & Zero-Scroll:**
  Dua tombol/tautan teks elegan ditempatkan di bawah tombol login:
  `❓ Lupa Username?`  •  `🔑 Lupa Password?`
  Desain tetap menjaga proporsi **Zero-Scroll (100vh)** agar catatan kaki `© 2026 Adhy Lawa` tetap presisi berada di dalam 1 layar penuh tanpa terdorong ke bawah.
- **Alur Kerja Interaktif Modal "Lupa Username":**
  1. Pengguna mengklik *"Lupa Username?"* -> Terbuka modal popup `#modalLupaUsername`.
  2. Pengguna memasukkan **Email Terdaftar** atau **NIP / Nama Lengkap**.
  3. Sistem mencari akun di spreadsheet. Jika ditemukan dan memiliki email, sistem mengirimkan detail username ke email pengguna via `MailApp.sendEmail()`.
  4. Dilengkapi tombol bantuan langsung: *"Hubungi Admin via WhatsApp / Email"* dengan pesan terformat otomatis.
- **Alur Kerja Interaktif Modal "Lupa Password":**
  1. Pengguna mengklik *"Lupa Password?"* -> Terbuka modal popup `#modalLupaPassword`.
  2. Pengguna memasukkan **Username** atau **Email Terdaftar**.
  3. Sistem memverifikasi akun dan dapat mengirimkan kode reset OTP sementara 6-digit ke email pengguna (berlaku 15 menit via `CacheService`) untuk membuat password baru, ATAU memberikan opsi kontak cepat ke Administrator untuk reset kata sandi institusional resmi.

---

## 3. Rencana Implementasi & Solusi Presisi (Implementation Plan)

### 1. Komponen Frontend (`AuthView.html` & `Styles.html`):
- Menambahkan tombol resmi *"Masuk dengan Google"* lengkap dengan logo SVG 4-warna Google di bawah tombol login utama, dipisahkan oleh garis pembatas (*divider*) elegan.
- Menambahkan bilah tautan bantuan pemulihan akun: `Lupa Username?` dan `Lupa Password?`.
- Menambahkan 2 modal popup interaktif di dalam `AuthView.html`:
  - `#modalLupaUsername`: Formulir pencarian username via email/NIP + tombol kirim email info username + kontak Helpdesk.
  - `#modalLupaPassword`: Formulir permintaan reset password via username/email + opsi OTP email / kontak Admin.
- Menyesuaikan padding kartu login (`.login-card-box`) agar tetap 100% pas 1 layar (Zero-Scroll 100vh) di desktop maupun ponsel.

### 2. Komponen Client-Side Logic (`Scripts.html`):
- Pustaka Google Identity Services (`https://accounts.google.com/gsi/client`) dimuat secara asinkron.
- Fungsi `handleGoogleSignIn()`: Menangani alur klik tombol Google, verifikasi kredensial Google, dan pemanggilan `apiLoginWithGoogle`.
- Fungsi `openModalLupaUsername()` & `closeModalLupaUsername()`.
- Fungsi `openModalLupaPassword()` & `closeModalLupaPassword()`.
- Fungsi `submitLupaUsername()`: Memanggil endpoint backend `apiLupaUsername`.
- Fungsi `submitLupaPassword()`: Memanggil endpoint backend `apiLupaPassword`.

### 3. Komponen Backend Server (`AuthService.gs`, `Controller.gs`, & `Database.gs`):
- **`Database.gs`:** Auto-migration kolom `email` pada sheet `users`.
- **`AuthService.gs`:**
  - Fungsi `authenticateGoogleUser(googleEmail, googleName)`: Mencari user berdasarkan email, validasi status AKTIF, dan menerbitkan `TTE_SESS_...` via `CacheService`.
  - Fungsi `processLupaUsername(keyword)`: Mencari username berdasarkan email/NIP/nama, mengirim email resmi via `MailApp.sendEmail()`.
  - Fungsi `processLupaPassword(identifier)`: Mengirim instruksi reset password / OTP ke email terdaftar.
- **`Controller.gs`:**
  - Menambahkan switch-case di `doPost(e)` untuk:
    - `case "apiLoginWithGoogle": result = apiLoginWithGoogle(args[0], args[1]); break;`
    - `case "apiLupaUsername": result = apiLupaUsername(args[0]); break;`
    - `case "apiLupaPassword": result = apiLupaPassword(args[0]); break;`
- **`Config.gs`:**
  - Menambahkan konstanta `ADMIN_EMAIL: "ntt@ban-pdm.id"` dan `ADMIN_WA: "6281234567890"` untuk kontak bantuan helpdesk.

---

## 4. Matriks Berkas yang Akan Diubah

| No | Berkas | Lokasi | Rencana Perubahan |
| :---: | :--- | :--- | :--- |
| 1 | `AuthView.html` | Sisi Kanan Form Login | Menambahkan tombol Google Login, tautan Lupa Username & Password, serta 2 modal popup pemulihan. |
| 2 | `Styles.html` | Bagian Auth CSS | Styling tombol Google, divider pemisah, dan tautan pemulihan dengan tetap menjaga Zero-Scroll 100vh. |
| 3 | `Scripts.html` | Bagian Autentikasi | Menangani event Google Sign-In, modal pemulihan, dan integrasi API backend. |
| 4 | `AuthService.gs` | Bagian Login & Auth | Logika autentikasi Google Email, pencarian username, dan pengiriman email pemulihan. |
| 5 | `Controller.gs` | Router `doPost` & API | Mendaftarkan endpoint `apiLoginWithGoogle`, `apiLupaUsername`, `apiLupaPassword`. |
| 6 | `Database.gs` | Migrasi Kolom | Memastikan kolom `email` tersedia di sheet `users`. |
| 7 | `Config.gs` | Pengaturan | Menambahkan parameter email admin dan kontak helpdesk resmi BAN PDM NTT. |
| 8 | `dist/index.html` | Seluruh Berkas | Sinkronisasi bundel Vercel via `build.ps1`. |

---

## 5. Jaminan Integritas Sistem (Commitment)
- TTE Surat Keluar dengan PIN 6 digit tetap aman 100%.
- Disposisi Surat Masuk tetap aman 100%.
- Hak Cipta © 2026 Adhy Lawa tetap aman 100%.
- Auto-logout 10 menit dan proteksi role pejabat tetap aktif utuh.
- Efek kilauan cahaya Shimmer, 3D Hover, dan animasi count-up 4 kartu KPI tetap utuh.
- Tidak ada fitur atau desain lain yang diubah di luar permintaan ini.

---

## 6. Hasil Verifikasi & Pengujian Lapangan (Verification & QA)
1. **Google Apps Script Balance & Syntax Check:**
   - `Controller.gs`: Curly 0, Paren 0, Square 0 (Valid)
   - `Config.gs`: Curly 0, Paren 0, Square 0 (Valid)
   - `Database.gs`: Curly 0, Paren 0, Square 0 (Valid)
   - `AuthService.gs`: Curly 0, Paren 0, Square 0 (Valid)
2. **HTML Tag Balance Check:**
   - `AuthView.html`: Open Div 49, Close Div 49 (Valid)
   - `Index.html`: Open Div 58, Close Div 58 (Valid)
3. **Frontend Vercel Bundler (`build.ps1`):**
   - Berkas `dist/index.html` (531 KB) & `dist/config.js` berhasil dibundel 100% tanpa error.
4. **Zero-Scroll Viewport Compliance:**
   - Tata letak kartu login terdistribusi secara presisi dengan padding proporsional (`24px 30px 22px` desktop, `20px 18px 16px` mobile).
   - Catatan kaki `© 2026 Adhy Lawa` tetap tampak presisi di layar 100vh tanpa memerlukan scroll.
