# e-TTE Signature Portal (BAN PDM PROVINSI NTT)
**Sistem Tanda Tangan Elektronik (TTE) Surat Resmi Berbasis QR-Code**  
*Dual-Engine Architecture: Frontend di Vercel (GitHub) & Backend di Google Apps Script REST API*

---

## 🚀 Panduan Deployment: Menghubungkan ke GitHub & Vercel

Aplikasi ini menggunakan **Arsitektur Hybrid Dual-Engine**:
- **Frontend:** Berjalan di atas jaringan global CDN **Vercel** via repositori **GitHub** (Loading cepat, URL mandiri, auto-deploy).
- **Backend & Database:** Berjalan di atas **Google Apps Script (GAS)**, terhubung ke **Google Spreadsheet** (database) dan **Google Drive** (penyimpanan PDF surat resmi).

---

### Langkah 1: Update & Deploy Backend Google Apps Script (REST API)

1. Buka proyek Google Apps Script Anda di [script.google.com](https://script.google.com).
2. Perbarui 2 berkas berikut dengan kode terbaru dari proyek ini:
   - `Controller.gs` (memuat router `doPost` dan `doGet` REST API)
   - `Scripts.html` (memuat adapter *dual-engine* mandiri)
3. Simpan seluruh berkas (`Ctrl + S`).
4. Klik tombol biru **Terapkan (Deploy)** > **Kelola deployment (Manage deployments)**.
5. Klik ikon **Pensil (Edit)** pada deployment Web App Anda.
6. Pada bagian **Versi**, pilih **Versi baru (New version)**.
7. Pastikan setelan akses:
   - **Jalankan sebagai (Execute as):** `Saya (email Anda)`
   - **Yang memiliki akses (Who has access):** `Siapa saja (Anyone)` *(Wajib agar Vercel dapat memanggil API)*.
8. Klik **Terapkan (Deploy)**.
9. **Salin URL Web App Anda** (Contoh format: `https://script.google.com/macros/s/AKfycb.../exec`).

---

### Langkah 2: Masukkan URL Backend ke Berkas `config.js`

1. Buka berkas `config.js` di dalam folder proyek ini.
2. Tempelkan URL Web App Google Apps Script yang Anda salin tadi:
   ```javascript
   window.GAS_API_URL = "https://script.google.com/macros/s/AKfycb.../exec";
   ```
3. Simpan berkas `config.js`.
4. *(Opsi otomatis)* Jalankan `powershell -ExecutionPolicy Bypass -File build.ps1` untuk menyinkronkan ke folder `dist`.

---

### Langkah 3: Unggah Proyek ke GitHub

Anda dapat mengunggah proyek ini ke GitHub dengan salah satu cara berikut:

#### Opsi A: Menggunakan GitHub Desktop (Paling Mudah & Visual)
1. Unduh dan buka **GitHub Desktop** ([desktop.github.com](https://desktop.github.com)).
2. Klik menu **File** > **Add Local Repository...**.
3. Pilih folder proyek ini: `Aplikasi TTE Surat`.
4. Jika muncul pesan *This directory does not appear to be a Git repository*, klik **create a repository here**.
5. Beri nama repository (misal: `aplikasi-tte-surat`), lalu klik **Create Repository**.
6. Klik tombol **Publish repository** di bilah atas untuk mengunggahnya ke akun GitHub Anda (bisa diset Public atau Private).

#### Opsi B: Unggah Langsung via Browser GitHub (Tanpa Perlu Instal Git)
1. Buka [github.com](https://github.com) dan login ke akun Anda.
2. Klik tombol hijau **New** untuk membuat repository baru.
3. Beri nama (misal: `aplikasi-tte-surat`), pilih Public atau Private, lalu klik **Create repository**.
4. Pada halaman baru yang muncul, klik tautan **uploading an existing file**.
5. Tarik (*drag & drop*) seluruh file dari folder proyek ini ke halaman browser tersebut.
6. Klik tombol hijau **Commit changes**.

---

### Langkah 4: Hubungkan & Deploy ke Vercel (1-Click)

1. Buka [vercel.com](https://vercel.com) dan masuk menggunakan akun GitHub Anda.
2. Di dashboard Vercel, klik tombol **Add New...** > pilih **Project**.
3. Cari repository `aplikasi-tte-surat` yang baru saja Anda buat di GitHub, lalu klik **Import**.
4. Vercel akan secara otomatis mendeteksi konfigurasi `vercel.json` dan `package.json`:
   - **Framework Preset:** *Other*
   - **Build Command:** `node build.js` (otomatis terisi)
   - **Output Directory:** `dist` (otomatis terisi)
5. Klik tombol **Deploy**.
6. Tunggu proses build selama ~10-20 detik.
7. **Selesai! 🎉** Vercel akan memberikan domain publik resmi Anda (contoh: `https://aplikasi-tte-surat.vercel.app`).

---

### Fitur Kunci Arsitektur Dual-Engine:
- **Zero CORS Blockage:** Menggunakan *Simple POST Payload* yang kebal terhadap blokir preflight browser.
- **Dual Compatibility:** Aplikasi tetap dapat dibuka langsung dari URL Google Apps Script bawaan maupun dari domain Vercel.
- **Data Integrity:** Seluruh data surat, pengguna, dan disposisi tetap tersimpan di Google Spreadsheet instansi Anda, dan berkas PDF tetap berada di Google Drive resmi BAN PDM Prov. NTT.

