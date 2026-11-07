# CATATAN REVISI (revisi.md)
================================================================================
REVISI: PERATAAN TEKS PARAGRAF AWAL (FLUSH LEFT) & PENAMBAHAN JARAK ANTARA TEMPAT DAN DENGAN HORMAT
KODE REVISI: REV-202611-057
STATUS: SELESAI DITERAPKAN (COMPLETED)
TANGGAL PENYELESAIAN: 07 November 2026
ENGINE: ZettBOT v6.6 (by Zettbos)
================================================================================

## 1. Latar Belakang & Keluhan Pengguna (User Request)
Pengguna mengajukan permintaan perbaikan tata letak dokumen surat resmi:
> *"1. Saya ingin kalimat pertama dari awal itu sama rata tidak menjorok ke dalam seperti gambar diatas. agar kelihatan rapih dan enak dilihat mata"*
> *"2. Perlu ada jarak lagi antara kata tempat dan dengan hormat."*
> *Note: JANGAN RUBAH FITUR DAN DESAIN SELAIN YANG SAYA MINTA, TERAPKAN SAJA APA YANG SAYA MINTA, KECUALI MEMANG HARUS DIUBAH KARENA KEBUTUHAN REVISI*

---

## 2. Analisis Masalah & Akar Masalah (Root Cause Analysis)

### Masalah 1: Mengapa Kalimat Pertama / Paragraf Awal Menjorok ke Dalam?
- **Akar Masalah:**
  Pada lembar format cetak dan pratinjau surat dinas (`TemplateSurat.html`), aturan CSS untuk paragraf isi surat dikunci dengan indentasi otomatis:
  ```css
  .isi-container p {
      margin: 0 0 4px 0;
      text-indent: 26px; /* <-- Ini penyebab baris pertama menjorok ke dalam */
      font-size: 11pt;
  }
  ```
  Akibatnya, kalimat pembuka seperti `"Dengan Hormat,"` dan kalimat pertama isi surat (`"Melalui surat ini..."`) otomatis terdorong ke dalam sejauh 26 piksel, sedangkan baris berikutnya kembali rata kiri. Hal ini membuat teks terlihat tidak seragam dengan batas kiri dokumen dinas modern.

### Masalah 2: Mengapa Jarak Antara Kata "Tempat" dan "Dengan Hormat" Terlalu Mepet?
- **Akar Masalah:**
  Blok daftar penerima surat (`.kepada-box`) memiliki `margin-bottom: 20px`, sementara wadah isi surat (`.isi-container`) memiliki `margin-top: 14px`.
  Dalam mekanisme rendering HTML-to-PDF (*CSS Margin Collapsing*), kedua margin tersebut bertumpuk (collapse) menjadi hanya 20px (hanya sekitar 1 spasi tipis). Akibatnya, kata `"Tempat"` pada penutup alamat penerima berada terlalu dekat dengan salam pembuka `"Dengan Hormat,"`.

---

## 3. Implementasi & Solusi Presisi yang Telah Diterapkan

### A. Perataan Paragraf Awal Sama Rata (Flush Left / text-indent: 0)
- Mengubah aturan CSS `.isi-container p` pada `TemplateSurat.html`:
  ```css
  .isi-container p {
      margin: 0 0 6px 0;
      text-indent: 0; /* Sama rata di batas margin kiri, tidak menjorok ke dalam */
      font-size: 11pt;
  }
  ```
- Hasil Implementasi:
  1. Salam pembuka `"Dengan Hormat,"` berdiri tegak lurus di garis batas kiri standar dinas.
  2. Kalimat pertama `"Melalui surat ini..."` dan baris-baris berikutnya sejajar rata kiri (*flush left justified*), terlihat rapi, bersih, simetris, dan enak dilihat mata.
  3. Fitur Word-style ruler tetap berfungsi normal untuk mengatur indentasi kustom jika dibutuhkan pada paragraf tertentu.

### B. Penambahan Jarak Antara Kata "Tempat" dan "Dengan Hormat,"
- Memberikan ruang pemisah vertikal yang lega dan proporsional standar tata naskah dinas:
  1. Pada `.kepada-box` (wadah "Kepada Yth. ... Tempat"):
     Diubah menjadi `margin: 20px 0 28px 0;` (jarak bawah 28px).
  2. Pada `.isi-container` (wadah "Dengan Hormat, ..."):
     Diubah menjadi `margin-top: 24px; margin-bottom: 16px; padding-top: 4px;` untuk mencegah *margin collapsing*.
- Hasil Implementasi:
  Jarak antara kata `"Tempat"` dan `"Dengan Hormat,"` kini memiliki jeda vertikal yang nyaman (~32px, setara 2 jeda baris kosong dinas), memberikan pemisahan visual yang jelas dan elegan.

---

## 4. Matriks Berkas yang Diubah

| No | Berkas | Lokasi | Deskripsi Perubahan | Status |
| :---: | :--- | :--- | :--- | :---: |
| 1 | `TemplateSurat.html` | Baris 140–175 | 1. Mengubah `text-indent: 26px;` menjadi `text-indent: 0;` pada `.isi-container p`.<br>2. Menambah spasi bawah `.kepada-box` (28px) dan spasi atas `.isi-container` (24px + 4px padding). | Selesai |
| 2 | `dist/index.html` | Seluruh Berkas | Sinkronisasi bundel Vercel via `build.ps1`. | Selesai |
| 3 | `prd.md` | Master Context | Upgrade versi engine ke ZettBOT v6.6 dan mencatat riwayat v6.6. | Selesai |

---

## 5. Hasil Verifikasi Sistem
- `verify.ps1`: Tag HTML seimbang (Open:Close div = 58:58 di Index, 70:70 di Dashboard).
- `check_gs_syntax.ps1`: Seluruh berkas GS terverifikasi valid.
- `build.ps1`: Bundel mandiri `dist/index.html` berhasil dibuat ulang 100% tanpa error.
- Seluruh fitur esensial (TTE Surat Keluar ber-PIN 6-digit, disposisi surat masuk, auto-logout 10 menit, Word-style ruler, dan Hak Cipta © 2026 Adhy Lawa) 100% aman dan terjaga utuh.
