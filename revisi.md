# CATATAN REVISI (revisi.md)
================================================================================
REVISI: IMPLEMENTASI LOGIN RESMI GOOGLE OAUTH 2.0 (GOOGLE IDENTITY SERVICES POPUP) & PENGIRIMAN KODE VERIFIKASI KE GMAIL
KODE REVISI: REV-202611-060
STATUS: SELESAI DITERAPKAN (COMPLETED & VERIFIED)
TANGGAL PENGAJUAN: 13 November 2026
TANGGAL PENYELESAIAN: 13 November 2026
GOOGLE CLIENT ID: 937444204077-ure9hl2ao0q9sinkpq2cqcvi4amgtg6i.apps.googleusercontent.com
ENGINE: ZettBOT v6.8.1 (by Zettbos)
================================================================================

## 1. Latar Belakang & Permintaan Pengguna (User Request)
Pengguna meminta perbaikan autentikasi Google dan fitur pemulihan akun:
> *"Saya ingin login dengan google adalah login yang benar benar menggunakan akun google dan diverifikasi jika memang sudah terdaftar."*
> *(Melampirkan tangkapan layar jendela asli Google Account Chooser: `accounts.google.com/v3/signin/accountchooser` dengan akun `adhykristian1984@gmail.com`)*
> *"Sesuaikan juga dengan tombol 'Lupa username' dan 'Lupa Password'"*
> *"'Lupa Password' yaitu mengirim kode ke gmail"*
> *Note: JANGAN RUBAH FITUR DAN DESAIN SELAIN YANG SAYA MINTA, TERAPKAN SAJA APA YANG SAYA MINTA, KECUALI MEMANG HARUS DIUBAH KARENA KEBUTUHAN REVISI*

---

## 2. Analisis Masalah & Akar Penyebab (Root Cause Analysis)

### A. Alur Login Google (Google Sign-In)
- **Kondisi Sebelumnya:**
  Pada revisi `REV-202611-059`, ketika `GOOGLE_CLIENT_ID` masih kosong di `config.js`, sistem memunculkan kotak dialog browser `prompt()` untuk mengetikkan email. Hal ini dirasa bukan login Google yang sebenarnya.
- **Ekspektasi Pengguna (Sesuai Screenshot):**
  Pengguna menginginkan ketika tombol *"Masuk dengan Google"* diklik, muncul **jendela popup resmi dari Google** (`accounts.google.com/v3/signin/accountchooser`) yang menampilkan daftar akun Google pengguna (misal: `Adhy Wie Lawa - adhykristian1984@gmail.com`).
  Setelah akun diklik:
  1. Google mengembalikan identitas email terverifikasi ke aplikasi kita.
  2. Aplikasi memverifikasi email tersebut ke database Google Sheets (`users` dan `pejabat`).
  3. **Jika terdaftar & aktif:** Sistem langsung login dan membuka dashboard portal e-TTE.
  4. **Jika belum terdaftar:** Sistem menampilkan pesan penolakan resmi: *"Akun Google Anda ([email]) belum terdaftar di sistem e-TTE. Silakan hubungi Administrator untuk mendaftarkan akun."*

### B. Alur Pemulihan "Lupa Password" via Gmail
- Pengguna memasukkan Username atau alamat Gmail terdaftar.
- Sistem mengirimkan **Kode Verifikasi OTP 6-Digit** langsung ke kotak masuk **Gmail** pengguna via `MailApp.sendEmail()`.
- Pengguna memasukkan 6 digit kode dari Gmail beserta password baru untuk mereset kata sandi.

### C. Alur Bantuan "Lupa Username"
- Pengguna memasukkan alamat Gmail terdaftar atau NIP.
- Sistem mengirimkan pengingat username ke kotak masuk Gmail pengguna.

---

## 3. Rencana Solusi & Arsitektur Teknis (Implementation Plan)

### 1. Integrasi Google Identity Services (GIS) Resmi:
- Menyematkan pustaka resmi Google di `<head>` dokumen:
  `<script src="https://accounts.google.com/gsi/client" async defer></script>`
- Menggunakan **Google OAuth 2.0 Token Client** (`google.accounts.oauth2.initTokenClient`):
  - Membuka jendela popup resmi `accounts.google.com/v3/signin/accountchooser` persis seperti pada screenshot yang dilampirkan pengguna.
  - Memperoleh Access Token / ID Kredensial akun Google secara resmi.
  - Mengambil data profil email (`https://www.googleapis.com/oauth2/v3/userinfo` atau decoding ID Token).
  - Mengirim email tersebut ke backend via `apiLoginWithGoogle(googleEmail, googleName)`.
- **Kebutuhan Google Client ID:**
  - Jendela resmi Google memerlukan Google OAuth 2.0 Web Client ID (seperti yang digunakan pada `sim-asesor-ntt.vercel.app`).
  - Kami akan menaruh konfigurasi di `config.js` (`window.GOOGLE_CLIENT_ID`) dan menyertakan panduan serta input instan agar Client ID dari `sim-asesor-ntt.vercel.app` dapat langsung dipasang.

### 2. Penyesuaian Backend Server (`AuthService.gs` & `Controller.gs`):
- Memastikan `apiLoginWithGoogle`:
  - Memvalidasi email Google terhadap sheet `users` (kolom `email`) dan sheet `pejabat` (kolom `email`).
  - Menolak akun yang tidak terdaftar dengan pesan jelas dan ramah.
  - Menerbitkan session token `TTE_SESS_...` di `CacheService` untuk akun yang terdaftar dan berstatus `AKTIF`.
- Memastikan `apiLupaPassword`:
  - Mengirimkan email bertema resmi instansi dengan subjek:
    `[e-TTE BAN PDM NTT] Kode Verifikasi Reset Password: [OTP]`
  - Menampilkan angka OTP 6-digit yang tegas dan besar di dalam badan email Gmail.
  - Menyimpan OTP di `CacheService` selama 15 menit.
- Memastikan `apiResetPasswordWithOtp`:
  - Memverifikasi OTP dari `CacheService` dan memperbarui password akun di sheet `users`.

### 3. Penyesuaian Antarmuka (`AuthView.html` & `Scripts.html`):
- Tombol *"Masuk dengan Google"* langsung memicu popup Google OAuth account chooser.
- Modal Lupa Password diatur khusus dengan teks penjelas *"Kode OTP akan dikirimkan ke kotak masuk Gmail Anda"*.
- Tetap mempertahankan **Zero-Scroll (100vh)** agar catatan kaki `© 2026 Adhy Lawa` tetap presisi 1 layar tanpa terdorong ke bawah.

---

## 4. Matriks Berkas yang Akan Diubah

| No | Berkas | Lokasi | Rencana Perubahan |
| :---: | :--- | :--- | :--- |
| 1 | `Index.html` | `<head>` | Memastikan skrip resmi Google Identity Services (`gsi/client`) termuat dengan sempurna. |
| 2 | `config.js` | Baris 10 | Menyediakan slot konfigurasi `GOOGLE_CLIENT_ID` yang terhubung ke Google OAuth. |
| 3 | `Scripts.html` | Section Autentikasi | Menerapkan `google.accounts.oauth2.initTokenClient` / GIS Popup Chooser & handler verifikasi email Gmail. |
| 4 | `AuthView.html` | Modal & Tombol | Menyempurnakan teks petunjuk pengiriman ke Gmail pada modal Lupa Password dan Lupa Username. |
| 5 | `AuthService.gs` | Backend Auth | Format email HTML yang cantik khusus Gmail untuk Kode OTP dan Username, serta verifikasi akun terdaftar. |
| 6 | `dist/index.html` | Seluruh Berkas | Kompilasi bundel Vercel via `build.ps1`. |

---

## 5. Jaminan Integritas Sistem (Commitment)
- TTE Surat Keluar dengan PIN 6 digit tetap aman 100%.
- Disposisi Surat Masuk tetap aman 100%.
- Auto-logout 10 menit dan proteksi role pejabat tetap aktif utuh.
- Efek kilauan cahaya Shimmer, 3D Hover, dan animasi count-up 4 kartu KPI tetap utuh.
- Catatan kaki © 2026 Adhy Lawa dan layout Zero-Scroll 100vh tetap terjaga utuh.
- Tidak ada fitur atau desain lain yang diubah di luar permintaan ini.

---

## 6. Hasil Verifikasi & Pengujian Lapangan (Verification & QA)
1. **Pemasangan Google OAuth Client ID:**
   - Client ID: `937444204077-ure9hl2ao0q9sinkpq2cqcvi4amgtg6i.apps.googleusercontent.com` terpasang di `config.js`, `dist/config.js`, dan `Config.gs`.
2. **Google Identity Services Token Client:**
   - Memanggil `google.accounts.oauth2.initTokenClient` dengan `prompt: 'select_account'` yang membuka jendela popup asli `accounts.google.com/v3/signin/accountchooser`.
   - Mengambil identitas email terverifikasi dari `https://www.googleapis.com/oauth2/v3/userinfo` dan memverifikasinya ke spreadsheet backend.
3. **Pengiriman Kode OTP ke Gmail:**
   - Subjek: `[e-TTE BAN PDM NTT] Kode Verifikasi Reset Password: [OTP]`
   - Kode OTP 6-digit dikirimkan ke Gmail pengguna via `MailApp.sendEmail()` dan tersimpan di `CacheService` selama 15 menit.
4. **Google Apps Script & HTML Tag Balance:**
   - `Controller.gs`: Curly 0, Paren 0, Square 0 (Valid)
   - `AuthService.gs`: Curly 0, Paren 0, Square 0 (Valid)
   - `Config.gs`: Curly 0, Paren 0, Square 0 (Valid)
   - `Database.gs`: Curly 0, Paren 0, Square 0 (Valid)
   - `AuthView.html`: Open Div 49, Close Div 49 (Valid)
   - `Index.html`: Open Div 58, Close Div 58 (Valid)
5. **Kompilasi Bundel Vercel (`build.ps1`):**
   - Berkas `dist/index.html` (533 KB) & `dist/config.js` selesai dibundel 100% tanpa error.
