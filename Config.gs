/**
 * ====================================================================
 * APLIKASI TANDA TANGAN ELEKTRONIK (TTE) BERBASIS QR-CODE
 * File: Config.gs
 * ====================================================================
 */

const CONFIG = {
  // ID Google Spreadsheet database yang diberikan oleh pengguna
  SPREADSHEET_ID: "1Vgz-BTW3Mx-veAWfeDST4IAm9XUWldXW6_wSWvY8BGY",
  
  // ID Google Drive Folder untuk menyimpan arsip PDF resmi
  DRIVE_FOLDER_ID: "1-sdC6uaHqA88CT4U4YdgWgpTsYpYeys_",
  
  // URL Web App Resmi (opsional, jika dikosongkan akan otomatis dideteksi saat deployment)
  WEB_APP_URL: "",
  
  // Identitas & Pengaturan Instansi (Format Kop Surat BAN PDM)
  APP_NAME: "e-TTE Signature Portal",
  INSTITUTION_NAME: "BADAN AKREDITASI NASIONAL PDM PROVINSI NTT",
  INSTITUTION_SUB: "PROVINSI NUSA TENGGARA TIMUR",
  INSTITUTION_ADDRESS: "Kompleks BPMP NTT, Jalan Jenderal Soeharto No. 57A, Naikoten Satu, Kota Kupang, Nusa Tenggara Timur 85118",
  INSTITUTION_CONTACT: "Email: ntt@ban-pdm.id",
  
  // Format Kop Surat Resmi BAN PDM (Sesuai contoh mapping_2025_st_visitasi.php)
  KOP_LINE_1: "BADAN AKREDITASI NASIONAL",
  KOP_LINE_2: "PENDIDIKAN ANAK USIA DINI, PENDIDIKAN DASAR, DAN PENDIDIKAN MENENGAH",
  KOP_LINE_3: "PROVINSI NUSA TENGGARA TIMUR",
  KOP_ADDRESS: "Kompleks BPMP NTT, Jalan Jenderal Soeharto No. 57A, Naikoten Satu, Kota Kupang, Nusa Tenggara Timur 85118",
  KOP_CONTACT: "Email: ntt@ban-pdm.id",
  KOP_COLOR: "#4682B4", // Steel Blue khas BAN PDM
  KOP_LOGO_URL: "https://upload.wikimedia.org/wikipedia/commons/4/44/Logo_BAN-PDM.png", // Logo resmi BAN PDM transparan resolusi tinggi
  KOP_LOGO_FILE_ID: "1i0mlAsPH68rhdMFfpEwliokxIk0p_6-Z", // ID file logo dari Google Drive (fallback)
  FAVICON_TTE_URL: "https://cdn-icons-png.flaticon.com/512/2921/2921222.png", // Favicon resmi portal TTE (Digital Signature & Verified Seal)
  KOTA_SURAT: "Kupang",
  
  // Nama-nama Sheet Database
  SHEET_USERS: "users",
  SHEET_PEJABAT: "pejabat",
  SHEET_SURAT: "surat",
  SHEET_SURAT_MASUK: "surat_masuk",
  SHEET_LOG: "log_verifikasi",
  SHEET_SETTINGS: "pengaturan",
  
  // Konfigurasi QR Code & TTE
  QR_SIZE: "250x250",
  QR_API_BASE: "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=",
  
  // Token kadaluarsa sesi (dalam menit)
  SESSION_EXPIRY_MINUTES: 180
};
