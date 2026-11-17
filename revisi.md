# CATATAN REVISI (revisi.md)
================================================================================
REVISI: KOREKSI DEFINITIF DOMAIN VERCEL RESMI (HTTPS://E-TTEBANPDMNTT.VERCEL.APP/) & RESOLUSI TUNTAS 404 VERIFIKASI DOKUMEN
KODE REVISI: REV-202611-068
STATUS: SELESAI DITERAPKAN (COMPLETED & VERIFIED)
TANGGAL PENGAJUAN: 17 November 2026
TANGGAL SELESAI: 17 November 2026
ENGINE: ZettBOT v6.8.9 (by Zettbos)
================================================================================

## 1. Latar Belakang & Masalah Riil (Problem Statement)
Pengguna melaporkan bahwa scan QR Code dokumen masih memunculkan halaman galat Vercel:
> *"mengapa saya masih gagal verifikasi dokumen. Masih saja muncul erorr seperti diatas. Tolong diperbaiki lagi"*  
> *(Melampirkan foto `media_1794897494293_33b54d03.jpg`: QR Code memuat `https://tte-banpdmntt.vercel.app?p=verify&id=TTE-20261117-W2YU`, dan `media_1794897494295_ff05bf3a.jpg`: Vercel mengembalikan pesan "404 DEPLOYMENT_NOT_FOUND sin1::nlx5t-1794897427001-d9068d173e2f")*

Pengguna kemudian memberikan alamat domain Vercel yang valid dan aktif:
> *"ini alamat linknya https://e-ttebanpdmntt.vercel.app/"*

---

## 2. Analisis Masalah & Solusi yang Diterapkan

### A. Akar Masalah "404 DEPLOYMENT_NOT_FOUND" pada Vercel
1. Pada iterasi sebelumnya, domain diperkirakan sebagai `tte-banpdmntt.vercel.app` (karena nama domain asli `e-ttebanpdmntt.vercel.app` terpotong sebagian di bilah alamat Google Chrome HP sempit).
2. Server edge Vercel di Singapura (`sin1`) mengembalikan `404 DEPLOYMENT_NOT_FOUND` karena subdomain `tte-banpdmntt` tidak pernah terdaftar pada Vercel.
3. Sekarang, pengguna telah memberikan tautan definitif yang 100% valid dan aktif:
   **`https://e-ttebanpdmntt.vercel.app/`**

---

### B. Solusi Definitif yang Diterapkan
1. **Pembaruan Konfigurasi Utama (`Config.gs` & `config.js`):**
   - Menetapkan konstanta `WEB_APP_URL: "https://e-ttebanpdmntt.vercel.app"` pada `Config.gs`.
   - Menetapkan variabel `window.WEB_APP_URL = "https://e-ttebanpdmntt.vercel.app";` pada `config.js`.
2. **Pembaruan Generator QR Code (`DocumentService.gs`):**
   - Mengalibrasi `getVerificationUrl(docId, customBaseUrl)` agar selalu memprioritaskan domain Vercel resmi pengguna (`https://e-ttebanpdmntt.vercel.app`).
   - Setiap dokumen baru yang ditandatangani dijamin 100% mencetak QR Code dengan format:
     `https://e-ttebanpdmntt.vercel.app/?p=verify&id=TTE-...`
3. **Penyempurnaan Pengalihan Otomatis Backend (`Controller.gs`):**
   - Pada handler `doGet(e)`, jika ada yang mengakses link Google Script lama (`script.google.com/macros/s/.../exec?p=verify&id=...`), sistem langsung mengalihkan otomatis ke:
     `https://e-ttebanpdmntt.vercel.app/?p=verify&id=...`
4. **Pembaruan Salin Link & Penyematan TTE (`Scripts.html`):**
   - Memperbarui `copyVerifyLink()` dan `apiApproveAndSignSurat()` agar mengalirkan origin Vercel resmi (`https://e-ttebanpdmntt.vercel.app`).
5. **Kompilasi Bundler Mandiri Vercel (`build.ps1`):**
   - Menghasilkan berkas `dist/index.html` dan `dist/config.js` yang telah terintegrasi 100% dengan domain `https://e-ttebanpdmntt.vercel.app`.

---

## 3. Komponen yang Dimodifikasi & Diverifikasi
| No | Berkas | Perubahan yang Dilakukan | Status |
|---|---|---|---|
| 1 | `Config.gs` | Menetapkan `WEB_APP_URL: "https://e-ttebanpdmntt.vercel.app"` | ✅ Selesai |
| 2 | `config.js` | Menetapkan `window.WEB_APP_URL = "https://e-ttebanpdmntt.vercel.app"` | ✅ Selesai |
| 3 | `DocumentService.gs` | Mengunci fallback domain QR Code ke `https://e-ttebanpdmntt.vercel.app` | ✅ Selesai |
| 4 | `Controller.gs` | Mengarahkan auto-redirect `doGet` ke `https://e-ttebanpdmntt.vercel.app` | ✅ Selesai |
| 5 | `Scripts.html` | Mengupdate `clientOrigin` di `copyVerifyLink` dan `apiApproveAndSignSurat` | ✅ Selesai |
| 6 | `dist/config.js` | Salinan konfigurasi endpoint Vercel terbaru | ✅ Selesai |
| 7 | `dist/index.html` | Bundling frontend mandiri via `build.ps1` | ✅ Selesai |

---

## 4. Jaminan Integritas Sistem (Sesuai Catatan Pengguna)
- ✅ Format cetak resmi PDF Google Drive (`@media print`) tetap 100% standar ISO A4 dinas asli.
- ✅ Alur penandatanganan TTE pejabat dengan PIN rahasia 6 digit tetap berfungsi utuh.
- ✅ Autentikasi Google OAuth popup resmi dan proteksi server-side token `CacheService` tetap aktif.
- ✅ Notifikasi modal pop-up kegagalan login Google eksklusif (SweetAlert style) tetap aktif.
- ✅ Zero-Scroll 100vh pada layar login dan hak cipta `© 2026 Adhy Lawa` tetap terjaga utuh.
- ✅ Tidak merubah desain maupun fitur lain selain pembaruan domain Vercel yang valid.
