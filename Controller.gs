/**
 * ====================================================================
 * APLIKASI TANDA TANGAN ELEKTRONIK (TTE) BERBASIS QR-CODE
 * File: Controller.gs
 * ====================================================================
 */

/**
 * Entry point HTTP GET Web App (Mendukung Web Interface & REST API GET)
 */
function doGet(e) {
  // 1. Dukungan REST API via GET (misal untuk ping status atau verifikasi publik)
  if (e && e.parameter && e.parameter.action) {
    try {
      const action = e.parameter.action;
      let result;
      if (action === "ping") {
        result = { success: true, message: "PONG - e-TTE Signature Portal API is Active", timestamp: new Date().toISOString() };
      } else if (action === "apiGetPublicVerification") {
        result = apiGetPublicVerification(e.parameter.id || "", e.parameter.userAgent || "Web-Browser");
      } else if (action === "apiGetAppLogo") {
        result = apiGetAppLogo();
      } else {
        result = { success: false, message: "Aksi GET '" + action + "' tidak didukung. Gunakan POST untuk memanggil API." };
      }
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, message: err.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // 2. Tampilan Web App standar bawaan Google Apps Script
  const template = HtmlService.createTemplateFromFile("Index");
  
  // Normalisasi parameter URL (seperti ?p=verify&id=DOC-123) ke template
  const rawParams = (e && e.parameter) ? e.parameter : {};
  const queryParams = {};
  for (const key in rawParams) {
    queryParams[key.toLowerCase()] = rawParams[key];
  }
  
  template.queryParams = queryParams;
  template.appName = CONFIG.APP_NAME;
  template.institutionName = CONFIG.INSTITUTION_NAME;
  
  return template.evaluate()
    .setTitle(CONFIG.APP_NAME + " - " + CONFIG.INSTITUTION_NAME)
    .setFaviconUrl(CONFIG.FAVICON_TTE_URL || "https://cdn-icons-png.flaticon.com/512/2921/2921222.png")
    .addMetaTag("viewport", "width=device-width, initial-scale=1.0")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Entry point HTTP POST Web App (REST API Router Terpusat untuk Vercel / Klien Eksternal)
 */
function doPost(e) {
  try {
    const rawContent = (e && e.postData && e.postData.contents) ? e.postData.contents : "{}";
    const req = JSON.parse(rawContent);
    const action = req.action;
    const args = Array.isArray(req.args) ? req.args : [];
    
    let result;
    switch (action) {
      case "apiInitialSetup":
        result = apiInitialSetup();
        break;
      case "apiLogin":
        result = apiLogin(args[0], args[1]);
        break;
      case "apiGetDashboardStats":
        result = apiGetDashboardStats(args[0]);
        break;
      case "apiGetSuratList":
        result = apiGetSuratList(args[0], args[1], args[2]);
        break;
      case "apiGetPejabatList":
        result = apiGetPejabatList(args[0]);
        break;
      case "apiCreateSurat":
        result = apiCreateSurat(args[0], args[1]);
        break;
      case "apiUpdateSurat":
        result = apiUpdateSurat(args[0], args[1], args[2]);
        break;
      case "apiApproveAndSignSurat":
        result = apiApproveAndSignSurat(args[0], args[1], args[2]);
        break;
      case "apiSaveSignedUploadPdf":
        result = apiSaveSignedUploadPdf(args[0], args[1], args[2], args[3]);
        break;
      case "apiRejectSurat":
        result = apiRejectSurat(args[0], args[1], args[2]);
        break;
      case "apiDeleteSurat":
        result = apiDeleteSurat(args[0], args[1]);
        break;
      case "apiGetPublicVerification":
        result = apiGetPublicVerification(args[0], args[1]);
        break;
      case "apiGetVerifyUrl":
        result = apiGetVerifyUrl(args[0]);
        break;
      case "apiGetOrEnsurePdf":
        result = apiGetOrEnsurePdf(args[0], args[1]);
        break;
      case "apiRegeneratePdf":
        result = apiRegeneratePdf(args[0], args[1]);
        break;
      case "apiGetAppLogo":
        result = apiGetAppLogo();
        break;
      case "apiGetPreviewHtml":
        result = apiGetPreviewHtml(args[0], args[1]);
        break;
      case "apiGetUsers":
        result = apiGetUsers(args[0]);
        break;
      case "apiSaveUser":
        result = apiSaveUser(args[0], args[1]);
        break;
      case "apiToggleUserStatus":
        result = apiToggleUserStatus(args[0], args[1]);
        break;
      case "apiDeleteUser":
        result = apiDeleteUser(args[0], args[1]);
        break;
      case "apiGetSuratMasuk":
        result = apiGetSuratMasuk(args[0]);
        break;
      case "apiSimpanSuratMasuk":
        result = apiSimpanSuratMasuk(args[0], args[1]);
        break;
      case "apiHapusSuratMasuk":
        result = apiHapusSuratMasuk(args[0], args[1]);
        break;
      case "apiGetPreviewSuratMasuk":
        result = apiGetPreviewSuratMasuk(args[0], args[1]);
        break;
      case "apiSimpanDisposisi":
        result = apiSimpanDisposisi(args[0], args[1], args[2]);
        break;
      default:
        result = { success: false, message: "Aksi API tidak dikenali: " + action };
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: "Terjadi kesalahan pada server API: " + (err.stack || err.message)
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Helper untuk include file HTML parsial (Styles, Scripts, Views)
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * API: Setup awal database dan sheet jika pertama kali deploy
 */
function apiInitialSetup() {
  try {
    return setupDatabase();
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * API: Autentikasi Pengguna (Login)
 */
function apiLogin(username, password) {
  try {
    return authenticateUser(username, password);
  } catch (err) {
    return { success: false, message: "Error login: " + err.message };
  }
}

/**
 * API: Mengambil data statistik dashboard
 */
function apiGetDashboardStats(token) {
  try {
    const user = validateSessionToken(token);
    if (!user) return { success: false, message: "Sesi tidak valid / telah berakhir." };
    
    const allSurat = getSheetRowsAsObjects(CONFIG.SHEET_SURAT);
    
    let total = allSurat.length;
    let draft = 0;
    let menunggu = 0;
    let ditandatangani = 0;
    let ditolak = 0;
    
    allSurat.forEach(s => {
      if (s.status === "DRAFT") draft++;
      else if (s.status === "MENUNGGU_TTD") menunggu++;
      else if (s.status === "DITANDATANGANI") ditandatangani++;
      else if (s.status === "DITOLAK") ditolak++;
    });
    
    // Jika role pejabat, hitung surat yang spesifik menunggu ttd dia
    let pendingForMe = 0;
    if (user.role === "pejabat" && user.pejabatId) {
      pendingForMe = allSurat.filter(s => 
        String(s.pejabat_id).trim() === String(user.pejabatId).trim() && 
        s.status === "MENUNGGU_TTD"
      ).length;
    }

    // Hitung statistik Surat Masuk & Status Disposisi
    ensureSuratMasukSheetExists();
    const allSuratMasuk = getSheetRowsAsObjects(CONFIG.SHEET_SURAT_MASUK || "surat_masuk") || [];
    let pendingDisposisi = 0;
    let sudahDisposisi = 0;
    allSuratMasuk.forEach(sm => {
      const st = String(sm.status_disposisi || sm.STATUS_DISPOSISI || "BELUM_DISPOSISI").trim().toUpperCase();
      const kepada = String(sm.disposisi_kepada || sm.DISPOSISI_KEPADA || "").trim();
      const isDisposed = (st === "SUDAH_DISPOSISI" || kepada !== "");
      if (isDisposed) sudahDisposisi++;
      else pendingDisposisi++;
    });
    
    // Hitung breakdown jenis dokumen untuk visualisasi grafik dashboard
    let suratKeterangan = 0;
    let suratKeputusan = 0;
    allSurat.forEach(s => {
      const kat = String(s.kategori || "").trim();
      const perihal = String(s.perihal || "").toLowerCase();
      const nomor = String(s.nomor_surat || "").toLowerCase();
      if (kat === "Surat Keterangan" || (!kat && (perihal.includes("keterangan") || nomor.includes("/ket/") || nomor.includes("/sket/")))) {
        suratKeterangan++;
      } else if (kat === "Surat Keputusan" || (!kat && (perihal.includes("keputusan") || nomor.includes("/sk/") || nomor.includes("-sk/") || nomor.includes("/kep/")))) {
        suratKeputusan++;
      }
    });
    const suratKeluarDinas = Math.max(0, allSurat.length - suratKeterangan - suratKeputusan);

    // Helper ekstraksi indeks bulan (0 = Jan, 11 = Des)
    function parseMonthIndex(dateVal, createdVal) {
      if (dateVal) {
        const s = String(dateVal).trim();
        const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (isoMatch) {
          const m = parseInt(isoMatch[2], 10) - 1;
          if (m >= 0 && m <= 11) return m;
        }
        const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (slashMatch) {
          const m = parseInt(slashMatch[2], 10) - 1;
          if (m >= 0 && m <= 11) return m;
        }
        const indoMonths = ["januari", "februari", "maret", "april", "mei", "juni", "juli", "agustus", "september", "oktober", "november", "desember"];
        const sLow = s.toLowerCase();
        for (let i = 0; i < indoMonths.length; i++) {
          if (sLow.includes(indoMonths[i])) return i;
        }
        const d = new Date(s);
        if (!isNaN(d.getTime())) return d.getMonth();
      }
      if (createdVal) {
        const d2 = new Date(createdVal);
        if (!isNaN(d2.getTime())) return d2.getMonth();
      }
      return new Date().getMonth();
    }

    // Rekapitulasi volume surat bulanan (12 bulan: Jan s.d. Des)
    const monthlyKeluar = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const monthlyMasuk = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const monthlyTotal = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    // Helper warna tematik konsisten untuk setiap kategori/jenis surat
    const categoryPalette = {
      "Surat Dinas": { color: "#0284c7", bg: "rgba(2, 132, 199, 0.85)" },
      "Surat Masuk": { color: "#d97706", bg: "rgba(217, 119, 6, 0.85)" },
      "Surat Undangan": { color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.85)" },
      "Surat Keputusan": { color: "#ec4899", bg: "rgba(236, 72, 153, 0.85)" },
      "Surat Keterangan": { color: "#10b981", bg: "rgba(16, 185, 129, 0.85)" },
      "Surat Tugas": { color: "#06b6d4", bg: "rgba(6, 182, 212, 0.85)" },
      "Surat Edaran": { color: "#f97316", bg: "rgba(249, 115, 22, 0.85)" },
      "Surat Permohonan": { color: "#6366f1", bg: "rgba(99, 102, 241, 0.85)" },
      "Laporan": { color: "#14b8a6", bg: "rgba(20, 184, 166, 0.85)" },
      "Pemberitahuan": { color: "#eab308", bg: "rgba(234, 179, 8, 0.85)" },
      "Lainnya": { color: "#64748b", bg: "rgba(100, 116, 139, 0.85)" }
    };
    const fallbackColors = [
      { color: "#3b82f6", bg: "rgba(59, 130, 246, 0.85)" },
      { color: "#a855f7", bg: "rgba(168, 85, 247, 0.85)" },
      { color: "#f43f5e", bg: "rgba(244, 63, 94, 0.85)" },
      { color: "#22c55e", bg: "rgba(34, 197, 94, 0.85)" },
      { color: "#e11d48", bg: "rgba(225, 29, 72, 0.85)" }
    ];

    // Koleksi agregasi dinamis kategori dokumen
    const catMap = {};

    function addDocToCategory(catName, mIdx) {
      const name = String(catName || "Surat Dinas").trim() || "Surat Dinas";
      if (!catMap[name]) {
        catMap[name] = {
          name: name,
          count: 0,
          monthly: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        };
      }
      catMap[name].count++;
      if (mIdx >= 0 && mIdx <= 11) {
        catMap[name].monthly[mIdx]++;
      }
    }

    allSurat.forEach(s => {
      const kat = String(s.kategori || "").trim() || "Surat Dinas";
      const m = parseMonthIndex(s.tanggal_surat, s.created_at);
      addDocToCategory(kat, m);
      monthlyKeluar[m]++;
      monthlyTotal[m]++;
    });

    allSuratMasuk.forEach(sm => {
      const kat = "Surat Masuk";
      const m = parseMonthIndex(sm.tanggal_surat || sm.tanggal_terima, sm.created_at);
      addDocToCategory(kat, m);
      monthlyMasuk[m]++;
      monthlyTotal[m]++;
    });

    // Saring HANYA kategori yang memiliki data > 0 ("yang muncul grafiknya")
    let colorIdx = 0;
    const activeCategories = Object.keys(catMap)
      .map(k => catMap[k])
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count)
      .map(item => {
        const theme = categoryPalette[item.name] || fallbackColors[(colorIdx++) % fallbackColors.length];
        return {
          name: item.name,
          count: item.count,
          monthly: item.monthly,
          color: theme.color,
          bg: theme.bg
        };
      });

    return {
      success: true,
      stats: {
        total: total,
        draft: draft,
        menunggu: menunggu,
        ditandatangani: ditandatangani,
        ditolak: ditolak,
        pendingForMe: pendingForMe,
        totalSuratMasuk: allSuratMasuk.length,
        pendingDisposisi: pendingDisposisi,
        sudahDisposisi: sudahDisposisi,
        activeCategories: activeCategories,
        breakdown: {
          suratMasuk: allSuratMasuk.length,
          suratKeluar: suratKeluarDinas,
          suratKeterangan: suratKeterangan,
          suratKeputusan: suratKeputusan
        },
        monthly: {
          labels: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"],
          suratKeluar: monthlyKeluar,
          suratMasuk: monthlyMasuk,
          total: monthlyTotal
        }
      },
      user: user
    };
  } catch (err) {
    return {
      success: false,
      message: "Gagal memuat statistik: " + err.message,
      stats: {
        total: 0, draft: 0, menunggu: 0, ditandatangani: 0, ditolak: 0, pendingForMe: 0, totalSuratMasuk: 0, pendingDisposisi: 0, sudahDisposisi: 0,
        monthly: { labels: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"], suratKeluar: [0,0,0,0,0,0,0,0,0,0,0,0], suratMasuk: [0,0,0,0,0,0,0,0,0,0,0,0], total: [0,0,0,0,0,0,0,0,0,0,0,0] }
      }
    };
  }
}

/**
 * API: Mengambil daftar surat dengan filter status & kategori
 */
function apiGetSuratList(token, statusFilter, kategoriFilter) {
  try {
    const user = validateSessionToken(token);
    if (!user) return { success: false, message: "Sesi tidak valid / telah berakhir.", data: [] };
    
    let allSurat = getSheetRowsAsObjects(CONFIG.SHEET_SURAT);
    const pejabatList = getSheetRowsAsObjects(CONFIG.SHEET_PEJABAT);
    
    // Gabungkan nama pejabat penandatangan
    allSurat = allSurat.map(s => {
      const pjb = pejabatList.find(p => String(p.id_pejabat).trim() === String(s.pejabat_id).trim());
      return {
        ...s,
        kategori: s.kategori || "Surat Dinas",
        nama_pejabat: pjb ? pjb.nama_lengkap : "-",
        jabatan_pejabat: pjb ? pjb.jabatan : "-"
      };
    });
    
    // Filter berdasarkan role
    if (user.role === "pejabat" && user.pejabatId) {
      allSurat = allSurat.filter(s => String(s.pejabat_id).trim() === String(user.pejabatId).trim());
    }
    
    // Filter berdasarkan status jika ada
    if (statusFilter && statusFilter !== "ALL") {
      allSurat = allSurat.filter(s => s.status === statusFilter);
    }

    // Filter berdasarkan kategori jika ada
    if (kategoriFilter && kategoriFilter !== "ALL") {
      allSurat = allSurat.filter(s => (s.kategori || "Surat Dinas") === kategoriFilter);
    }
    
    // Urutkan dari yang terbaru
    allSurat.reverse();
    
    return { success: true, data: allSurat };
  } catch (err) {
    return { success: false, message: "Gagal memuat daftar surat: " + err.message, data: [] };
  }
}

/**
 * API: Mengambil daftar pejabat untuk dropdown pembuat surat
 */
function apiGetPejabatList(token) {
  try {
    const user = validateSessionToken(token);
    if (!user) return { success: false, message: "Sesi tidak valid.", data: [] };
    
    const list = getSheetRowsAsObjects(CONFIG.SHEET_PEJABAT).map(p => ({
      id_pejabat: p.id_pejabat,
      nama_lengkap: p.nama_lengkap,
      jabatan: p.jabatan,
      nip: p.nip
    }));
    
    return { success: true, data: list };
  } catch (err) {
    return { success: false, message: "Gagal memuat daftar pejabat: " + err.message, data: [] };
  }
}

/**
 * API: Menyimpan Surat Baru (Draft atau Langsung Diajukan ke Pejabat)
 */
function apiCreateSurat(token, suratData) {
  try {
    const user = validateSessionToken(token);
    if (!user) return { success: false, message: "Sesi tidak valid." };
    
    if (!suratData || !suratData.nomor_surat || !suratData.perihal || !suratData.pejabat_id) {
      return { success: false, message: "Nomor surat, perihal, dan penandatangan wajib diisi." };
    }
    
    // Buat ID dokumen unik (contoh: DOC-20260909-X9K2)
    const dateStr = Utilities.formatDate(new Date(), "GMT+8", "yyyyMMdd");
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    const docId = "TTE-" + dateStr + "-" + randomStr;
    
    const status = suratData.status || "MENUNGGU_TTD";
    const tipeDokumen = (suratData.tipe_dokumen || "TEMPLATE").toUpperCase();

    let pdfId = "";
    let pdfUrl = "";

    // Jika tipe UPLOAD_PDF, simpan file PDF mentah yang diunggah ke Google Drive
    if (tipeDokumen === "UPLOAD_PDF") {
      if (!suratData.pdf_base64) {
        return { success: false, message: "Berkas PDF wajib diunggah untuk mode Upload Dokumen PDF." };
      }
      try {
        const cleanBase64 = suratData.pdf_base64.replace(/^data:application\/pdf;base64,/, "");
        const pdfBytes = Utilities.base64Decode(cleanBase64);
        const safeNomor = (suratData.nomor_surat || "SURAT").replace(/[\/\\]/g, "_");
        const fileName = "DRAF_UPLOAD_" + safeNomor + "_" + docId + ".pdf";
        const pdfBlob = Utilities.newBlob(pdfBytes, "application/pdf", fileName);
        const savedFile = getTargetDriveFolder().createFile(pdfBlob);
        try {
          savedFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        } catch(e) {}
        pdfId = savedFile.getId();
        pdfUrl = "https://drive.google.com/file/d/" + pdfId + "/view";
      } catch (errUpload) {
        return { success: false, message: "Gagal menyimpan berkas PDF ke Google Drive: " + errUpload.message };
      }
    }
    
    const newRow = {
      id_dokumen: docId,
      tipe_dokumen: tipeDokumen,
      kategori: suratData.kategori || "Surat Dinas",
      nomor_surat: suratData.nomor_surat,
      tanggal_surat: suratData.tanggal_surat || formatDateIndo(new Date()),
      lampiran: suratData.lampiran || "-",
      perihal: suratData.perihal,
      kepada: suratData.kepada || "Yth. Pihak Terkait",
      isi_surat: suratData.isi_surat || (tipeDokumen === "UPLOAD_PDF" ? "[Dokumen PDF Terunggah]" : ""),
      pejabat_id: suratData.pejabat_id,
      status: status,
      waktu_ttd: "",
      pdf_id: pdfId,
      pdf_url: pdfUrl,
      doc_hash: "",
      tte_page: suratData.tte_page || 1,
      tte_x: suratData.tte_x || 0,
      tte_y: suratData.tte_y || 0,
      tte_size: suratData.tte_size ? (parseFloat(suratData.tte_size) || 75) : 75,
      alasan_tolak: "",
      created_at: Utilities.formatDate(new Date(), "GMT+8", "yyyy-MM-dd HH:mm:ss")
    };
    
    appendDataRow(CONFIG.SHEET_SURAT, newRow);
    
    return {
      success: true,
      message: "Surat berhasil dibuat dengan ID: " + docId,
      docId: docId
    };
  } catch (err) {
    return { success: false, message: "Gagal membuat surat: " + err.message };
  }
}

/**
 * API: Memperbarui Surat (Edit Surat)
 * Hanya dapat dilakukan jika status surat masih 'MENUNGGU_TTD' atau 'DITOLAK'.
 * Surat yang sudah 'DITANDATANGANI' tidak boleh diedit demi integritas dokumen TTE.
 */
function apiUpdateSurat(token, docId, suratData) {
  try {
    const user = validateSessionToken(token);
    if (!user) return { success: false, message: "Sesi tidak valid." };
    
    if (!docId) return { success: false, message: "ID Dokumen tidak valid." };
    if (!suratData || !suratData.nomor_surat || !suratData.perihal || !suratData.pejabat_id) {
      return { success: false, message: "Nomor surat, perihal, dan penandatangan wajib diisi." };
    }
    
    const allSurat = getSheetRowsAsObjects(CONFIG.SHEET_SURAT);
    const existing = allSurat.find(s => String(s.id_dokumen).trim() === String(docId).trim());
    if (!existing) return { success: false, message: "Surat dengan ID " + docId + " tidak ditemukan." };
    
    // Proteksi: Surat yang sudah ditandatangani tidak boleh diedit
    if (existing.status === "DITANDATANGANI") {
      return { 
        success: false, 
        message: "Surat yang sudah ditandatangani secara elektronik tidak dapat diedit demi integritas dokumen." 
      };
    }
    
    // Cek hak akses jika role pejabat
    if (user.role === "pejabat" && user.pejabatId && existing.pejabat_id !== user.pejabatId) {
      return { success: false, message: "Anda tidak memiliki hak untuk mengedit surat ini." };
    }

    let pdfId = existing.pdf_id || "";
    let pdfUrl = existing.pdf_url || "";

    // Jika ada upload berkas PDF baru saat edit
    if (suratData.tipe_dokumen === "UPLOAD_PDF" && suratData.pdf_base64) {
      try {
        const cleanBase64 = suratData.pdf_base64.replace(/^data:application\/pdf;base64,/, "");
        const pdfBytes = Utilities.base64Decode(cleanBase64);
        const safeNomor = (suratData.nomor_surat || "SURAT").replace(/[\/\\]/g, "_");
        const fileName = "DRAF_UPLOAD_" + safeNomor + "_" + docId + ".pdf";
        const pdfBlob = Utilities.newBlob(pdfBytes, "application/pdf", fileName);
        const savedFile = getTargetDriveFolder().createFile(pdfBlob);
        try {
          savedFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        } catch(e) {}
        
        // Hapus draf lama jika berbeda
        if (existing.pdf_id && existing.pdf_id !== savedFile.getId()) {
          try { DriveApp.getFileById(existing.pdf_id).setTrashed(true); } catch(e) {}
        }
        pdfId = savedFile.getId();
        pdfUrl = "https://drive.google.com/file/d/" + pdfId + "/view";
      } catch (eUp) {
        Logger.log("Gagal memperbarui file PDF: " + eUp.message);
      }
    }
    
    const updateObj = {
      kategori:      suratData.kategori || existing.kategori || "Surat Dinas",
      nomor_surat:   suratData.nomor_surat,
      tanggal_surat: suratData.tanggal_surat || existing.tanggal_surat,
      lampiran:      suratData.lampiran !== undefined ? suratData.lampiran : (existing.lampiran || "-"),
      perihal:       suratData.perihal,
      kepada:        suratData.kepada || "Yth. Pihak Terkait",
      isi_surat:     suratData.isi_surat || existing.isi_surat || "",
      pejabat_id:    suratData.pejabat_id,
      tipe_dokumen:  suratData.tipe_dokumen || existing.tipe_dokumen || "TEMPLATE",
      tte_page:      suratData.tte_page !== undefined ? suratData.tte_page : (existing.tte_page || 1),
      tte_x:         suratData.tte_x !== undefined ? suratData.tte_x : (existing.tte_x || 0),
      tte_y:         suratData.tte_y !== undefined ? suratData.tte_y : (existing.tte_y || 0),
      tte_size:      suratData.tte_size !== undefined ? (parseFloat(suratData.tte_size) || 75) : (parseFloat(existing.tte_size) || 75),
      pdf_id:        pdfId,
      pdf_url:       pdfUrl,
      status:        "MENUNGGU_TTD", // Jika sebelumnya DITOLAK, reset kembali ke MENUNGGU_TTD
      alasan_tolak:  ""              // Bersihkan catatan penolakan lama
    };
    
    const updated = updateRowByField(CONFIG.SHEET_SURAT, "id_dokumen", docId, updateObj);
    if (!updated) {
      return { success: false, message: "Gagal memperbarui baris data surat di spreadsheet." };
    }
    
    return {
      success: true,
      message: "Surat berhasil diperbarui dan diajukan kembali untuk ditandatangani!",
      docId: docId
    };
  } catch (err) {
    return { success: false, message: "Gagal memperbarui surat: " + err.message };
  }
}

/**
 * API: Menandatangani Surat Secara Elektronik (Oleh Pejabat berwenang dengan PIN TTE)
 */
function apiApproveAndSignSurat(token, docId, pinTte) {
  try {
    const user = validateSessionToken(token);
    if (!user) return { success: false, message: "Sesi Anda tidak valid." };
    
    // Pastikan yang menandatangani adalah pejabat atau admin
    if (user.role !== "pejabat" && user.role !== "admin") {
      return { success: false, message: "Hanya Pejabat Penandatangan yang berhak mengesahkan dokumen ini." };
    }
    
    const allSurat = getSheetRowsAsObjects(CONFIG.SHEET_SURAT);
    const surat = allSurat.find(s => String(s.id_dokumen).trim() === String(docId).trim());
    if (!surat) return { success: false, message: "Dokumen surat tidak ditemukan." };
    
    if (surat.status === "DITANDATANGANI") {
      return { success: false, message: "Surat ini sudah pernah ditandatangani sebelumnya." };
    }
    
    // Tentukan ID pejabat yang menandatangani
    const targetPejabatId = surat.pejabat_id || user.pejabatId;
    
    // Validasi PIN TTE
    const pinValidation = verifyPejabatPin(targetPejabatId, pinTte);
    if (!pinValidation.success) {
      return pinValidation;
    }
    
    const pejabat = pinValidation.pejabat;
    const verifyUrl = getVerificationUrl(docId);

    // =========================================================
    // JIKA TIPE DOKUMEN: UPLOAD_PDF
    // Penempelan stempel dilakukan presisi via client-side pdf-lib
    // =========================================================
    if (surat.tipe_dokumen === "UPLOAD_PDF") {
      if (!surat.pdf_id) {
        return { success: false, message: "Berkas PDF dokumen belum tersedia di Google Drive." };
      }
      const qrBlob = fetchQrCodeBlob(verifyUrl);
      const pdfFile = DriveApp.getFileById(surat.pdf_id);
      const pdfBytes = pdfFile.getBlob().getBytes();

      return {
        success: true,
        requiresClientStamping: true,
        docId: docId,
        nomorSurat: surat.nomor_surat,
        pdfBase64: Utilities.base64Encode(pdfBytes),
        qrBase64: "data:image/png;base64," + Utilities.base64Encode(qrBlob.getBytes()),
        verifyUrl: verifyUrl,
        tte_page: parseInt(surat.tte_page) || 1,
        tte_x: parseFloat(surat.tte_x) || 0,
        tte_y: parseFloat(surat.tte_y) || 0,
        tte_size: parseFloat(surat.tte_size) || 75,
        pejabatNama: pejabat.nama_lengkap || "-",
        pejabatNip: pejabat.nip || "-",
        pejabatJabatan: pejabat.jabatan || "-"
      };
    }
    
    // =========================================================
    // JIKA TIPE DOKUMEN: TEMPLATE RESMI
    // Generate PDF resmi dengan QR Code via Template HTML
    // =========================================================
    const genResult = generateOfficialSignedPdf(surat, pejabat);
    const waktuTtd = formatDateTimeIndo(new Date());
    
    // Perbarui baris surat di Database
    updateRowByField(CONFIG.SHEET_SURAT, "id_dokumen", docId, {
      status: "DITANDATANGANI",
      waktu_ttd: waktuTtd,
      pdf_id: genResult.pdfId,
      pdf_url: genResult.viewUrl,
      doc_hash: genResult.docHash
    });
    
    return {
      success: true,
      message: "Dokumen berhasil ditandatangani secara elektronik!",
      docId: docId,
      pdfUrl: genResult.viewUrl,
      downloadUrl: genResult.downloadUrl,
      verifyUrl: genResult.verifyUrl
    };
  } catch (err) {
    return { success: false, message: "Gagal memproses tanda tangan: " + err.message };
  }
}

/**
 * API: Menyimpan hasil penempelan stempel TTE pada dokumen UPLOAD_PDF ke Google Drive
 */
function apiSaveSignedUploadPdf(token, docId, stampedPdfBase64, verifyUrl) {
  try {
    const user = validateSessionToken(token);
    if (!user) return { success: false, message: "Sesi Anda tidak valid." };

    if (!docId || !stampedPdfBase64) {
      return { success: false, message: "Data dokumen atau berkas PDF bertanda tangan tidak lengkap." };
    }

    const allSurat = getSheetRowsAsObjects(CONFIG.SHEET_SURAT);
    const surat = allSurat.find(s => String(s.id_dokumen).trim() === String(docId).trim());
    if (!surat) return { success: false, message: "Dokumen surat tidak ditemukan." };

    const cleanBase64 = stampedPdfBase64.replace(/^data:application\/pdf;base64,/, "");
    const pdfBytes = Utilities.base64Decode(cleanBase64);
    const safeNomor = (surat.nomor_surat || "SURAT").replace(/[\/\\]/g, "_");
    const fileName = "SURAT_" + safeNomor + "_" + docId + ".pdf";
    const pdfBlob = Utilities.newBlob(pdfBytes, "application/pdf", fileName);

    const targetFolder = getTargetDriveFolder();
    const savedPdfFile = targetFolder.createFile(pdfBlob);
    try {
      savedPdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {
      Logger.log("Izin sharing Drive file: " + e.message);
    }

    // Hapus file draf lama jika ada
    if (surat.pdf_id && surat.pdf_id !== savedPdfFile.getId()) {
      try {
        DriveApp.getFileById(surat.pdf_id).setTrashed(true);
      } catch (e) {}
    }

    const waktuTtd = formatDateTimeIndo(new Date());
    const docHash = calculateDocumentHash(
      docId + "|" + surat.nomor_surat + "|" + (surat.pejabat_id || "") + "|" + new Date().toISOString()
    );

    updateRowByField(CONFIG.SHEET_SURAT, "id_dokumen", docId, {
      status: "DITANDATANGANI",
      waktu_ttd: waktuTtd,
      pdf_id: savedPdfFile.getId(),
      pdf_url: "https://drive.google.com/file/d/" + savedPdfFile.getId() + "/view",
      doc_hash: docHash
    });

    return {
      success: true,
      message: "Dokumen PDF berhasil dibubuhi tanda tangan elektronik resmi!",
      docId: docId,
      pdfUrl: "https://drive.google.com/file/d/" + savedPdfFile.getId() + "/view",
      downloadUrl: "https://drive.google.com/uc?export=download&id=" + savedPdfFile.getId(),
      verifyUrl: verifyUrl || getVerificationUrl(docId)
    };
  } catch (err) {
    return { success: false, message: "Gagal menyimpan dokumen PDF yang ditandatangani: " + err.message };
  }
}

/**
 * API: Menolak Surat
 */
function apiRejectSurat(token, docId, alasan) {
  try {
    const user = validateSessionToken(token);
    if (!user) return { success: false, message: "Sesi tidak valid." };
    
    updateRowByField(CONFIG.SHEET_SURAT, "id_dokumen", docId, {
      status: "DITOLAK",
      alasan_tolak: alasan || "Tidak ada alasan spesifik"
    });
    
    return { success: true, message: "Surat berhasil ditolak." };
  } catch (err) {
    return { success: false, message: "Gagal menolak surat: " + err.message };
  }
}

/**
 * API: Menghapus Dokumen Surat (Khusus Admin dan Operator untuk dokumen yang BELUM DITANDATANGANI)
 */
function apiDeleteSurat(token, docId) {
  try {
    const user = validateSessionToken(token);
    if (!user) return { success: false, message: "Sesi tidak valid / telah berakhir." };
    if (user.role !== "admin" && user.role !== "operator") {
      return { success: false, message: "Akses ditolak: Hanya Admin dan Operator yang berhak menghapus surat." };
    }
    if (!docId) {
      return { success: false, message: "ID Dokumen tidak valid." };
    }

    const allSurat = getSheetRowsAsObjects(CONFIG.SHEET_SURAT);
    const targetSurat = allSurat.find(s => String(s.id_dokumen).trim() === String(docId).trim());
    if (!targetSurat) {
      return { success: false, message: "Dokumen surat tidak ditemukan." };
    }

    // Proteksi mutlak: Dokumen yang sudah DITANDATANGANI dilarang keras dihapus demi integritas dokumen TTE
    if (targetSurat.status === "DITANDATANGANI") {
      return { success: false, message: "Dokumen yang sudah ditandatangani secara elektronik (TTE) resmi tidak boleh dihapus demi integritas dokumen!" };
    }

    // Hapus file draf PDF terkait di Google Drive jika ada
    if (targetSurat.pdf_id) {
      try {
        DriveApp.getFileById(targetSurat.pdf_id).setTrashed(true);
      } catch (e) {
        Logger.log("Gagal menghapus file draf PDF di Drive: " + e.message);
      }
    }

    const deleted = deleteRowByField(CONFIG.SHEET_SURAT, "id_dokumen", docId);
    if (!deleted) {
      return { success: false, message: "Gagal menghapus baris data surat di database spreadsheet." };
    }

    return { success: true, message: "Dokumen surat berhasil dihapus." };
  } catch (err) {
    return { success: false, message: "Gagal menghapus surat: " + err.message };
  }
}

/**
 * API: Verifikasi Dokumen Publik (Terbuka untuk siapa saja tanpa login saat scan QR)
 */
function apiGetPublicVerification(docId, userAgent) {
  try {
    if (!docId) {
      return { success: false, isValid: false, message: "ID Dokumen tidak valid." };
    }
    
    const allSurat = getSheetRowsAsObjects(CONFIG.SHEET_SURAT);
    const surat = allSurat.find(s => String(s.id_dokumen).trim() === String(docId).trim());
    
    if (!surat) {
      return {
        success: false,
        isValid: false,
        message: "DOKUMEN TIDAK TERDAFTAR! Waspada terhadap potensi pemalsuan dokumen."
      };
    }
    
    const pejabatList = getSheetRowsAsObjects(CONFIG.SHEET_PEJABAT);
    const pejabat = pejabatList.find(p => String(p.id_pejabat).trim() === String(surat.pejabat_id).trim()) || {};
    
    // Catat jejak audit verifikasi ke sheet log
    try {
      appendDataRow(CONFIG.SHEET_LOG, {
        log_id: "LOG-" + new Date().getTime(),
        waktu_scan: formatDateTimeIndo(new Date()),
        id_dokumen: surat.id_dokumen,
        nomor_surat: surat.nomor_surat,
        user_agent: userAgent || "Kamera / Scanner HP",
        ip_client: "",
        status: surat.status === "DITANDATANGANI" ? "VALID" : "INVALID (" + surat.status + ")"
      });
    } catch (e) {
      Logger.log("Log error: " + e.message);
    }
    
    const isValid = (surat.status === "DITANDATANGANI");
    
    return {
      success: true,
      isValid: isValid,
      doc: {
        id_dokumen: surat.id_dokumen,
        nomor_surat: surat.nomor_surat,
        tanggal_surat: surat.tanggal_surat,
        perihal: surat.perihal,
        kepada: surat.kepada,
        status: surat.status,
        waktu_ttd: surat.waktu_ttd,
        pdf_url: surat.pdf_url,
        doc_hash: surat.doc_hash,
        penandatangan: {
          nama: pejabat.nama_lengkap || "-",
          nip: pejabat.nip || "-",
          jabatan: pejabat.jabatan || "-"
        },
        instansi: {
          nama: CONFIG.INSTITUTION_NAME,
          sub: CONFIG.INSTITUTION_SUB
        }
      }
    };
  } catch (err) {
    return {
      success: false,
      isValid: false,
      message: "Gagal memverifikasi dokumen: " + err.message
    };
  }
}

/**
 * API: Mendapatkan URL Verifikasi Publik yang benar untuk disalin/dibagikan
 * (Menggunakan getVerificationUrl() dari DocumentService agar URL selalu /exec bukan iframe)
 */
function apiGetVerifyUrl(docId) {
  try {
    if (!docId) return { success: false, message: 'ID dokumen tidak valid.' };
    const url = getVerificationUrl(docId);
    return { success: true, url: url };
  } catch (err) {
    return { success: false, message: 'Gagal mendapatkan URL: ' + err.message };
  }
}

/**
 * API: Mengambil atau Menghasilkan file PDF resmi terkini untuk surat yang sudah ditandatangani
 * Selalu memastikan file PDF menggunakan format TemplateSurat BAN PDM terbaru dan tersimpan di Google Drive.
 */
function apiGetOrEnsurePdf(sessionToken, docId) {
  try {
    const user = validateSessionToken(sessionToken);
    if (!user) return { success: false, message: "Sesi telah berakhir. Silakan login kembali." };

    if (!docId) return { success: false, message: "ID Dokumen tidak valid." };

    const allSurat = getSheetRowsAsObjects(CONFIG.SHEET_SURAT);
    const surat = allSurat.find(s => String(s.id_dokumen).trim() === String(docId).trim());
    if (!surat) return { success: false, message: "Dokumen surat tidak ditemukan." };

    if (surat.status !== "DITANDATANGANI") {
      return { success: false, message: "Hanya surat yang sudah berstatus DITANDATANGANI yang dapat dibuka file PDF resminya." };
    }

    const safeNomor = (surat.nomor_surat || "SURAT").replace(/[\/\\?%*:|"<>]/g, "_");
    const downloadFileName = "SURAT_" + safeNomor + "_" + docId + ".pdf";

    // 1. Cek apakah berkas PDF sudah ada dan masih aktif di Google Drive (Instant Cache Hit)
    if (surat.pdf_id) {
      try {
        const existingFile = DriveApp.getFileById(surat.pdf_id);
        if (existingFile && !existingFile.isTrashed()) {
          try {
            existingFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          } catch(e) {}

          const pdfBytes = existingFile.getBlob().getBytes();
          const pdfBase64 = Utilities.base64Encode(pdfBytes);
          const viewUrl = "https://drive.google.com/file/d/" + surat.pdf_id + "/view?usp=sharing";
          const directDownloadUrl = "https://drive.google.com/uc?export=download&id=" + surat.pdf_id;

          return {
            success: true,
            message: "Dokumen PDF resmi BAN PDM siap!",
            docId: docId,
            nomorSurat: surat.nomor_surat,
            fileName: downloadFileName,
            pdfId: surat.pdf_id,
            pdfUrl: viewUrl,
            viewUrl: viewUrl,
            downloadUrl: directDownloadUrl,
            verifyUrl: getVerificationUrl(docId),
            pdfBase64: pdfBase64
          };
        }
      } catch (errDrive) {
        Logger.log("File PDF belum ada di Drive atau butuh generate ulang: " + errDrive.message);
      }
    }

    // 2. Jika tipe UPLOAD_PDF tapi file fisik belum ada di Drive
    if (surat.tipe_dokumen === "UPLOAD_PDF") {
      return {
        success: false,
        message: "Berkas PDF fisik tidak ditemukan di Google Drive."
      };
    }

    // 3. Jika berkas PDF belum ada, lakukan generate baru (Template Surat Resmi)
    const allPejabat = getSheetRowsAsObjects(CONFIG.SHEET_PEJABAT);
    let pejabat = allPejabat.find(p => String(p.id_pejabat).trim() === String(surat.pejabat_id).trim());
    if (!pejabat) {
      pejabat = {
        id_pejabat: surat.pejabat_id,
        nama_lengkap: surat.nama_pejabat || "Pejabat Penandatangan",
        nip: surat.pejabat_nip || "-",
        jabatan: surat.pejabat_jabatan || ("Ketua BAN PDM " + (CONFIG.KOP_LINE_3 || "Provinsi Nusa Tenggara Timur"))
      };
    }

    // Generate PDF resmi dengan format template BAN PDM terbaru
    const genResult = generateOfficialSignedPdf(surat, pejabat);

    // Hapus file PDF lama di Google Drive jika ada dan ID-nya berbeda
    if (surat.pdf_id && surat.pdf_id !== genResult.pdfId) {
      try {
        DriveApp.getFileById(surat.pdf_id).setTrashed(true);
      } catch (e) {
        Logger.log("File PDF lama tidak ditemukan atau sudah dihapus: " + e.message);
      }
    }

    // Perbarui data PDF di database Google Sheets
    updateRowByField(CONFIG.SHEET_SURAT, "id_dokumen", docId, {
      pdf_id: genResult.pdfId,
      pdf_url: genResult.viewUrl,
      doc_hash: genResult.docHash
    });

    let newPdfBase64 = "";
    try {
      const newFile = DriveApp.getFileById(genResult.pdfId);
      newPdfBase64 = Utilities.base64Encode(newFile.getBlob().getBytes());
    } catch(e) {}

    return {
      success: true,
      message: "File PDF resmi BAN PDM siap!",
      docId: docId,
      nomorSurat: surat.nomor_surat,
      fileName: downloadFileName,
      pdfId: genResult.pdfId,
      pdfUrl: genResult.viewUrl,
      viewUrl: genResult.viewUrl,
      downloadUrl: genResult.downloadUrl,
      verifyUrl: genResult.verifyUrl,
      pdfBase64: newPdfBase64
    };
  } catch (err) {
    return { success: false, message: "Gagal menyiapkan file PDF: " + err.message };
  }
}

/**
 * API: Membuat ulang (Regenerate) file PDF resmi (Alias ke apiGetOrEnsurePdf)
 */
function apiRegeneratePdf(sessionToken, docId) {
  return apiGetOrEnsurePdf(sessionToken, docId);
}

/**
 * API Publik: Mengambil logo instansi sebagai Base64 Data URI
 * Tidak memerlukan autentikasi — dipanggil saat halaman pertama kali dimuat
 * untuk mengganti emoji placeholder dengan logo asli dari Google Drive.
 */
function apiGetAppLogo() {
  try {
    const logoBase64 = getAppLogoBase64();
    return { success: true, logoBase64: logoBase64 };
  } catch (err) {
    return { success: false, logoBase64: "" };
  }
}
/**
 * API: Mengambil HTML Pratinjau Surat (tanpa QR Code, tanpa simpan ke Drive)
 * Read-only: tidak mengubah status surat maupun database apapun.
 * Dapat diakses oleh semua role yang sudah login (admin, operator, pejabat).
 */
function apiGetPreviewHtml(token, docId) {
  try {
    const user = validateSessionToken(token);
    if (!user) return { success: false, message: "Sesi tidak valid / telah berakhir." };

    if (!docId) return { success: false, message: "ID Dokumen tidak valid." };

    const allSurat = getSheetRowsAsObjects(CONFIG.SHEET_SURAT);
    const surat    = allSurat.find(s => String(s.id_dokumen).trim() === String(docId).trim());
    if (!surat) return { success: false, message: "Dokumen surat tidak ditemukan." };

    // Penanganan pratinjau untuk dokumen yang diunggah dalam format PDF
    if (surat.tipe_dokumen === "UPLOAD_PDF") {
      let pdfBase64 = "";
      let fileId = surat.pdf_id;
      if (!fileId && surat.pdf_url) {
        const m = String(surat.pdf_url).match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (m) fileId = m[1];
      }
      if (fileId) {
        try {
          const file = DriveApp.getFileById(fileId);
          pdfBase64 = Utilities.base64Encode(file.getBlob().getBytes());
        } catch (e) {
          Logger.log("Gagal membaca file PDF draf untuk pratinjau: " + e.message);
        }
      }
      return {
        success:     true,
        isUploadPdf: true,
        pdfBase64:   pdfBase64,
        tte_page:    parseInt(surat.tte_page) || 1,
        tte_x:       parseFloat(surat.tte_x) || 0,
        tte_y:       parseFloat(surat.tte_y) || 0,
        tte_size:    parseFloat(surat.tte_size) || 75,
        nomorSurat:  surat.nomor_surat || docId,
        pdfUrl:      surat.pdf_url
      };
    }

    const allPejabat = getSheetRowsAsObjects(CONFIG.SHEET_PEJABAT);
    let pejabat      = allPejabat.find(p => String(p.id_pejabat).trim() === String(surat.pejabat_id).trim());
    if (!pejabat) {
      pejabat = {
        id_pejabat:   surat.pejabat_id,
        nama_lengkap: surat.nama_pejabat || "Pejabat Penandatangan",
        nip:          "-",
        jabatan:      "Ketua BAN PDM " + (CONFIG.KOP_LINE_3 || "Provinsi Nusa Tenggara Timur")
      };
    }

    const htmlContent = generatePreviewHtml(surat, pejabat);

    return {
      success:    true,
      html:       htmlContent,
      nomorSurat: surat.nomor_surat || docId
    };
  } catch (err) {
    return { success: false, message: "Gagal membuat pratinjau: " + err.message };
  }
}

/**
 * ====================================================================
 * MODUL MANAJEMEN PENGGUNA & PEJABAT (KHUSUS ADMINISTRATOR)
 * ====================================================================
 */

/**
 * API: Mengambil seluruh daftar pengguna dan profil pejabat terkait
 */
function apiGetUsers(token) {
  try {
    const user = validateSessionToken(token);
    if (!user) return { success: false, message: "Sesi tidak valid / telah berakhir." };
    if (user.role !== "admin") {
      return { success: false, message: "Akses ditolak: Hanya Administrator yang berhak mengelola pengguna." };
    }

    let allUsers = getSheetRowsAsObjects(CONFIG.SHEET_USERS);
    if (!allUsers || allUsers.length === 0) {
      setupDatabase();
      allUsers = getSheetRowsAsObjects(CONFIG.SHEET_USERS);
    }
    const allPejabat = getSheetRowsAsObjects(CONFIG.SHEET_PEJABAT);

    const userList = (allUsers || []).map((u, i) => {
      // Helper untuk membaca nilai kolom dengan case-insensitive
      const getVal = (keys, fallback) => {
        for (let k = 0; k < keys.length; k++) {
          const key = keys[k];
          if (u[key] !== undefined && u[key] !== null && String(u[key]).trim() !== "") {
            return String(u[key]).trim();
          }
        }
        return fallback !== undefined ? fallback : "";
      };

      const idUser = getVal(["id_user", "id", "ID_USER", "ID User"], "USR-" + (i + 1));
      const username = getVal(["username", "Username", "USERNAME", "user"], "");
      const nama = getVal(["nama", "nama_lengkap", "Nama", "Nama Lengkap", "NAMA"], username || ("Pengguna " + (i + 1)));
      const role = getVal(["role", "Role", "ROLE", "peran"], "operator").toLowerCase();
      const pejabatId = getVal(["pejabat_id", "id_pejabat", "PEJABAT_ID", "Pejabat ID"], "");
      const status = getVal(["status", "Status", "STATUS"], "AKTIF").toUpperCase();
      const createdAt = getVal(["created_at", "CREATED_AT", "Tanggal"], "");

      let pejabatInfo = null;
      if (pejabatId) {
        const foundP = (allPejabat || []).find(p => {
          const pid = p.id_pejabat || p.ID_PEJABAT || p["ID Pejabat"] || "";
          return String(pid).trim() === String(pejabatId).trim();
        });
        if (foundP) {
          pejabatInfo = {
            id_pejabat: foundP.id_pejabat || foundP.ID_PEJABAT || pejabatId,
            nama_lengkap: foundP.nama_lengkap || foundP.NAMA_LENGKAP || "",
            nip: foundP.nip || foundP.NIP || "-",
            jabatan: foundP.jabatan || foundP.JABATAN || "-",
            email: foundP.email || foundP.EMAIL || "-",
            pin_tte: foundP.pin_tte || foundP.PIN_TTE || ""
          };
        }
      }

      return {
        id_user: idUser,
        username: username,
        nama: nama,
        role: role,
        pejabat_id: pejabatId,
        status: status,
        created_at: createdAt,
        pejabat: pejabatInfo
      };
    });

    const activePejabatList = (allPejabat || []).map(p => ({
      id_pejabat: p.id_pejabat || p.ID_PEJABAT || "",
      nama_lengkap: p.nama_lengkap || p.NAMA_LENGKAP || "",
      nip: p.nip || p.NIP || "-",
      jabatan: p.jabatan || p.JABATAN || "-",
      email: p.email || p.EMAIL || "",
      pin_tte: p.pin_tte || p.PIN_TTE || ""
    }));

    return {
      success: true,
      users: userList,
      pejabatList: activePejabatList
    };
  } catch (err) {
    return { success: false, message: "Gagal memuat data pengguna: " + err.message };
  }
}

/**
 * API: Menyimpan data pengguna baru atau memperbarui pengguna yang ada
 */
function apiSaveUser(token, data) {
  try {
    const user = validateSessionToken(token);
    if (!user) return { success: false, message: "Sesi tidak valid / telah berakhir." };
    if (user.role !== "admin") {
      return { success: false, message: "Akses ditolak: Hanya Administrator yang berhak mengelola pengguna." };
    }

    if (!data.nama || !String(data.nama).trim()) {
      return { success: false, message: "Nama lengkap wajib diisi." };
    }
    if (!data.username || !String(data.username).trim()) {
      return { success: false, message: "Username wajib diisi." };
    }

    const username = String(data.username).trim().toLowerCase();
    const nama = String(data.nama).trim();
    const role = String(data.role || "operator").trim().toLowerCase();
    const status = String(data.status || "AKTIF").trim().toUpperCase();
    const isEdit = data.action === "edit" && data.id_user;

    const allUsers = getSheetRowsAsObjects(CONFIG.SHEET_USERS);

    // Validasi keunikan username
    const duplicate = allUsers.find(u => {
      const uName = String(u.username).trim().toLowerCase();
      if (isEdit) {
        return uName === username && String(u.id_user).trim() !== String(data.id_user).trim();
      }
      return uName === username;
    });

    if (duplicate) {
      return { success: false, message: "Username '" + username + "' sudah digunakan oleh akun lain. Gunakan username lain." };
    }

    let linkedPejabatId = data.pejabat_id || "";

    // Penanganan khusus jika role adalah Pejabat Penandatangan
    if (role === "pejabat") {
      if (data.pejabatMode === "existing" && data.existingPejabatId) {
        linkedPejabatId = String(data.existingPejabatId).trim();
      } else {
        // Mode buat profil pejabat baru atau perbarui pejabat terkait
        const pejabatJabatan = String(data.pejabatJabatan || "").trim();
        const pejabatNip = String(data.pejabatNip || "").trim();
        const pejabatPin = String(data.pejabatPin || "").trim();
        const pejabatEmail = String(data.pejabatEmail || "").trim();

        if (!pejabatJabatan) {
          return { success: false, message: "Jabatan resmi pejabat penandatangan wajib diisi." };
        }
        if (!pejabatPin) {
          return { success: false, message: "PIN TTE pejabat penandatangan (4-6 digit) wajib diisi." };
        }

        if (isEdit && linkedPejabatId) {
          // Perbarui profil pejabat yang ada
          const updatePejabatObj = {
            nama_lengkap: nama,
            jabatan: pejabatJabatan,
            nip: pejabatNip,
            email: pejabatEmail,
            pin_tte: pejabatPin
          };
          updateRowByField(CONFIG.SHEET_PEJABAT, "id_pejabat", linkedPejabatId, updatePejabatObj);
        } else {
          // Buat data pejabat baru di sheet 'pejabat'
          const dateSuffix = Utilities.formatDate(new Date(), "GMT+7", "yyyyMMdd");
          const randSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
          linkedPejabatId = "PJB-" + dateSuffix + "-" + randSuffix;

          const newPejabatRow = {
            id_pejabat: linkedPejabatId,
            nama_lengkap: nama,
            gelar: "",
            nip: pejabatNip,
            jabatan: pejabatJabatan,
            email: pejabatEmail,
            pin_tte: pejabatPin,
            created_at: new Date().toISOString()
          };
          appendDataRow(CONFIG.SHEET_PEJABAT, newPejabatRow);
        }
      }
    }

    if (isEdit) {
      // Update akun pengguna yang sudah ada
      const updateObj = {
        nama: nama,
        username: username,
        role: role,
        pejabat_id: linkedPejabatId,
        status: status
      };

      if (data.password && String(data.password).trim() !== "") {
        updateObj.password = String(data.password).trim();
      }

      const updated = updateRowByField(CONFIG.SHEET_USERS, "id_user", data.id_user, updateObj);
      if (!updated) {
        return { success: false, message: "Gagal memperbarui data: ID Pengguna tidak ditemukan." };
      }

      return { success: true, message: "Data pengguna '" + nama + "' berhasil diperbarui!" };
    } else {
      // Buat akun pengguna baru
      if (!data.password || String(data.password).trim() === "") {
        return { success: false, message: "Kata sandi wajib diisi untuk pengguna baru." };
      }

      const dateSuffix = Utilities.formatDate(new Date(), "GMT+7", "yyyyMMdd");
      const randSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
      const newUserId = "USR-" + dateSuffix + "-" + randSuffix;

      const newUserRow = {
        id_user: newUserId,
        username: username,
        password: String(data.password).trim(),
        nama: nama,
        role: role,
        pejabat_id: linkedPejabatId,
        status: status,
        created_at: new Date().toISOString()
      };

      appendDataRow(CONFIG.SHEET_USERS, newUserRow);
      return { success: true, message: "Pengguna baru '" + nama + "' berhasil ditambahkan!" };
    }
  } catch (err) {
    return { success: false, message: "Gagal menyimpan pengguna: " + err.message };
  }
}

/**
 * API: Mengaktifkan atau menonaktifkan akun pengguna
 */
function apiToggleUserStatus(token, targetUserId) {
  try {
    const user = validateSessionToken(token);
    if (!user) return { success: false, message: "Sesi tidak valid / telah berakhir." };
    if (user.role !== "admin") {
      return { success: false, message: "Akses ditolak: Hanya Administrator yang berhak mengubah status akun." };
    }

    if (!targetUserId) {
      return { success: false, message: "ID Pengguna tidak valid." };
    }

    if (String(user.userId).trim() === String(targetUserId).trim()) {
      return { success: false, message: "Anda tidak dapat menonaktifkan akun yang sedang digunakan saat ini!" };
    }

    const allUsers = getSheetRowsAsObjects(CONFIG.SHEET_USERS);
    const targetUser = allUsers.find(u => String(u.id_user).trim() === String(targetUserId).trim());
    if (!targetUser) {
      return { success: false, message: "Pengguna tidak ditemukan." };
    }

    const newStatus = (targetUser.status === "AKTIF") ? "NON-AKTIF" : "AKTIF";
    updateRowByField(CONFIG.SHEET_USERS, "id_user", targetUserId, { status: newStatus });

    return {
      success: true,
      newStatus: newStatus,
      message: "Status akun '" + targetUser.nama + "' berhasil diubah menjadi " + newStatus + "."
    };
  } catch (err) {
    return { success: false, message: "Gagal mengubah status: " + err.message };
  }
}

/**
 * API: Menghapus akun pengguna dari sistem secara permanen
 */
function apiDeleteUser(token, targetUserId) {
  try {
    const user = validateSessionToken(token);
    if (!user) return { success: false, message: "Sesi tidak valid / telah berakhir." };
    if (user.role !== "admin") {
      return { success: false, message: "Akses ditolak: Hanya Administrator yang berhak menghapus akun pengguna." };
    }

    if (!targetUserId) {
      return { success: false, message: "ID Pengguna tidak valid." };
    }

    if (String(user.userId).trim() === String(targetUserId).trim()) {
      return { success: false, message: "Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan!" };
    }

    const allUsers = getSheetRowsAsObjects(CONFIG.SHEET_USERS);
    const targetUser = allUsers.find(u => String(u.id_user).trim() === String(targetUserId).trim());
    if (!targetUser) {
      return { success: false, message: "Pengguna tidak ditemukan." };
    }

    if (String(targetUser.username).trim().toLowerCase() === "admin") {
      return { success: false, message: "Akun Super Administrator 'admin' dilindungi dan tidak dapat dihapus demi keamanan sistem!" };
    }

    const success = deleteRowByField(CONFIG.SHEET_USERS, "id_user", targetUserId);
    if (!success) {
      return { success: false, message: "Gagal menghapus baris data pengguna dari lembar kerja spreadsheet." };
    }

    return {
      success: true,
      message: "Akun pengguna '" + targetUser.nama + "' (" + targetUser.username + ") berhasil dihapus secara permanen."
    };
  } catch (err) {
    return { success: false, message: "Gagal menghapus pengguna: " + err.message };
  }
}

// ====================================================================
// SECTION 12: ARSIP SURAT MASUK (GOOGLE DRIVE & SPREADSHEET)
// ====================================================================

/**
 * API: Mengambil daftar seluruh surat masuk yang tersimpan
 */
function apiGetSuratMasuk(token) {
  try {
    const user = validateSessionToken(token);
    if (!user) return { success: false, message: "Sesi tidak valid / telah berakhir." };

    ensureSuratMasukSheetExists();
    const sheetName = CONFIG.SHEET_SURAT_MASUK || "surat_masuk";
    const rawData = getSheetRowsAsObjects(sheetName) || [];

    // Helper sanitasi & mapping data
    const list = rawData.map(function(item, idx) {
      return {
        id_surat_masuk: String(item.id_surat_masuk || item.ID_SURAT_MASUK || ("IN-" + (idx + 1))).trim(),
        nomor_surat: String(item.nomor_surat || item.NOMOR_SURAT || "-").trim(),
        pengirim: String(item.pengirim || item.PENGIRIM || "-").trim(),
        perihal: String(item.perihal || item.PERIHAL || "-").trim(),
        tanggal_surat: String(item.tanggal_surat || item.TANGGAL_SURAT || "-").trim(),
        tanggal_terima: String(item.tanggal_terima || item.TANGGAL_TERIMA || "-").trim(),
        kategori: String(item.kategori || item.KATEGORI || "Surat Dinas").trim(),
        keterangan: String(item.keterangan || item.KETERANGAN || "").trim(),
        file_id: String(item.file_id || item.FILE_ID || "").trim(),
        file_name: String(item.file_name || item.FILE_NAME || "Dokumen.pdf").trim(),
        file_url: String(item.file_url || item.FILE_URL || "").trim(),
        file_size: String(item.file_size || item.FILE_SIZE || "").trim(),
        uploaded_by: String(item.uploaded_by || item.UPLOADED_BY || "-").trim(),
        created_at: String(item.created_at || item.CREATED_AT || "").trim(),
        status_disposisi: String(item.status_disposisi || item.STATUS_DISPOSISI || "BELUM_DISPOSISI").trim(),
        disposisi_kepada: String(item.disposisi_kepada || item.DISPOSISI_KEPADA || "").trim(),
        disposisi_sifat: String(item.disposisi_sifat || item.DISPOSISI_SIFAT || "Biasa").trim(),
        disposisi_instruksi: String(item.disposisi_instruksi || item.DISPOSISI_INSTRUKSI || "").trim(),
        disposisi_catatan: String(item.disposisi_catatan || item.DISPOSISI_CATATAN || "").trim(),
        disposisi_oleh: String(item.disposisi_oleh || item.DISPOSISI_OLEH || "").trim(),
        disposisi_tgl: String(item.disposisi_tgl || item.DISPOSISI_TGL || "").trim()
      };
    }).reverse(); // Yang terbaru di atas

    return {
      success: true,
      data: list,
      userRole: user.role,
      userName: user.nama || user.username || "Pejabat"
    };
  } catch (err) {
    return { success: false, message: "Gagal memuat arsip surat masuk: " + err.message };
  }
}

/**
 * API: Menyimpan surat masuk baru (Upload file ke Google Drive & simpan metadata ke Spreadsheet)
 */
function apiSimpanSuratMasuk(token, data) {
  try {
    const user = validateSessionToken(token);
    if (!user) return { success: false, message: "Sesi tidak valid / telah berakhir." };

    if (!data.nomor_surat || !String(data.nomor_surat).trim()) {
      return { success: false, message: "Nomor surat masuk wajib diisi!" };
    }
    if (!data.pengirim || !String(data.pengirim).trim()) {
      return { success: false, message: "Asal pengirim / instansi surat wajib diisi!" };
    }
    if (!data.perihal || !String(data.perihal).trim()) {
      return { success: false, message: "Perihal surat wajib diisi!" };
    }
    if (!data.pdf_base64 || !String(data.pdf_base64).trim()) {
      return { success: false, message: "Berkas PDF surat masuk wajib diunggah!" };
    }

    ensureSuratMasukSheetExists();
    const sheetName = CONFIG.SHEET_SURAT_MASUK || "surat_masuk";

    // Generate ID unik untuk surat masuk
    const datePrefix = Utilities.formatDate(new Date(), "GMT+7", "yyyyMM");
    const randPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const idSuratMasuk = "IN-" + datePrefix + "-" + randPart;

    // Bersihkan nama file dan nomor surat
    const cleanNomor = String(data.nomor_surat).replace(/[^a-zA-Z0-9_\-]/g, "_");
    const fileName = "SURAT_MASUK_" + cleanNomor + "_" + idSuratMasuk + ".pdf";

    // Simpan berkas ke Google Drive
    let fileId = "";
    let fileUrl = "";
    let fileSizeStr = data.file_size || "";

    try {
      const folder = getTargetDriveFolder();
      let rawBase64 = String(data.pdf_base64);
      if (rawBase64.indexOf("base64,") !== -1) {
        rawBase64 = rawBase64.split("base64,")[1];
      }
      const decodedBytes = Utilities.base64Decode(rawBase64);
      const blob = Utilities.newBlob(decodedBytes, "application/pdf", fileName);
      const savedFile = folder.createFile(blob);
      
      try {
        savedFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (eShare) {
        Logger.log("Sharing permission notice: " + eShare.message);
      }

      fileId = savedFile.getId();
      fileUrl = "https://drive.google.com/file/d/" + fileId + "/view";

      if (!fileSizeStr) {
        const bytes = decodedBytes.length;
        if (bytes > 1048576) {
          fileSizeStr = (bytes / 1048576).toFixed(1) + " MB";
        } else {
          fileSizeStr = Math.round(bytes / 1024) + " KB";
        }
      }
    } catch (errDrive) {
      return { success: false, message: "Gagal menyimpan berkas ke Google Drive: " + errDrive.message };
    }

    const tglSurat = data.tanggal_surat || formatDateIndo(new Date());
    const tglTerima = data.tanggal_terima || formatDateIndo(new Date());
    const kategori = data.kategori || "Surat Dinas";
    const keterangan = data.keterangan || "";

    const newRow = {
      id_surat_masuk: idSuratMasuk,
      nomor_surat: String(data.nomor_surat).trim(),
      pengirim: String(data.pengirim).trim(),
      perihal: String(data.perihal).trim(),
      tanggal_surat: tglSurat,
      tanggal_terima: tglTerima,
      kategori: kategori,
      keterangan: keterangan,
      file_id: fileId,
      file_name: data.file_name || fileName,
      file_url: fileUrl,
      file_size: fileSizeStr,
      uploaded_by: user.nama || user.username || "Operator",
      created_at: new Date().toISOString()
    };

    appendDataRow(sheetName, newRow);

    return {
      success: true,
      message: "Surat masuk berhasil disimpan dan diarsipkan ke Google Drive!",
      id: idSuratMasuk,
      fileUrl: fileUrl
    };
  } catch (err) {
    return { success: false, message: "Gagal memproses simpan surat masuk: " + err.message };
  }
}

/**
 * API: Menghapus data surat masuk dan berkas di Google Drive
 */
function apiHapusSuratMasuk(token, idSuratMasuk) {
  try {
    const user = validateSessionToken(token);
    if (!user) return { success: false, message: "Sesi tidak valid / telah berakhir." };

    if (user.role !== "admin" && user.role !== "operator") {
      return { success: false, message: "Akses ditolak: Hanya Admin dan Operator yang berhak menghapus arsip surat masuk." };
    }

    if (!idSuratMasuk) {
      return { success: false, message: "ID Surat Masuk tidak valid." };
    }

    const sheetName = CONFIG.SHEET_SURAT_MASUK || "surat_masuk";
    const allData = getSheetRowsAsObjects(sheetName) || [];
    const target = allData.find(item => String(item.id_surat_masuk || item.ID_SURAT_MASUK).trim() === String(idSuratMasuk).trim());

    if (!target) {
      return { success: false, message: "Data surat masuk tidak ditemukan." };
    }

    // Pindahkan file ke tempat sampah Google Drive jika ada file_id
    const fileId = target.file_id || target.FILE_ID;
    if (fileId) {
      try {
        DriveApp.getFileById(fileId).setTrashed(true);
      } catch (errTrash) {
        Logger.log("Notice: Gagal menghapus file Drive (" + fileId + "): " + errTrash.message);
      }
    }

    // Hapus baris dari sheet surat_masuk
    const ss = getDb();
    const sheet = ss.getSheetByName(sheetName);
    if (sheet && target._rowIndex) {
      sheet.deleteRow(target._rowIndex);
    }

    return {
      success: true,
      message: "Arsip surat masuk nomor '" + (target.nomor_surat || idSuratMasuk) + "' berhasil dihapus!"
    };
  } catch (err) {
    return { success: false, message: "Gagal menghapus surat masuk: " + err.message };
  }
}

/**
 * API: Mengambil data Base64 berkas surat masuk untuk pratinjau di aplikasi
 */
function apiGetPreviewSuratMasuk(token, idSuratMasuk) {
  try {
    const user = validateSessionToken(token);
    if (!user) return { success: false, message: "Sesi tidak valid / telah berakhir." };

    const sheetName = CONFIG.SHEET_SURAT_MASUK || "surat_masuk";
    const allData = getSheetRowsAsObjects(sheetName) || [];
    const target = allData.find(item => String(item.id_surat_masuk || item.ID_SURAT_MASUK).trim() === String(idSuratMasuk).trim());

    if (!target) {
      return { success: false, message: "Surat masuk tidak ditemukan." };
    }

    const fileId = target.file_id || target.FILE_ID;
    if (!fileId) {
      return { success: false, message: "Berkas PDF tidak terlampir untuk surat ini." };
    }

    let pdfBase64 = "";
    try {
      const file = DriveApp.getFileById(fileId);
      pdfBase64 = Utilities.base64Encode(file.getBlob().getBytes());
    } catch (eDrive) {
      return { success: false, message: "Gagal mengunduh berkas dari Google Drive: " + eDrive.message, pdfUrl: target.file_url };
    }

    return {
      success: true,
      isUploadPdf: true,
      isSuratMasuk: true,
      pdfBase64: pdfBase64,
      nomorSurat: target.nomor_surat,
      pdfUrl: target.file_url,
      tte_page: 0,
      tte_x: 0, // Tanpa stempel TTE karena ini surat masuk (Pure Read-Only Viewer)
      tte_y: 0,
      tte_size: 0
    };
  } catch (err) {
    return { success: false, message: "Gagal memuat pratinjau: " + err.message };
  }
}

/**
 * API: Menyimpan penetapan lembar disposisi surat masuk oleh Pejabat
 */
function apiSimpanDisposisi(token, idSuratMasuk, disposisiData) {
  try {
    const user = validateSessionToken(token);
    if (!user) return { success: false, message: "Sesi tidak valid / telah berakhir." };

    if (!idSuratMasuk) {
      return { success: false, message: "ID Surat Masuk tidak valid." };
    }

    const kepada = (disposisiData && (disposisiData.disposisi_kepada || disposisiData.kepada || "")) + "";
    const sifat = (disposisiData && (disposisiData.disposisi_sifat || disposisiData.sifat || "Biasa")) + "";
    const instruksi = (disposisiData && (disposisiData.disposisi_instruksi || disposisiData.instruksi || "")) + "";
    const catatan = (disposisiData && (disposisiData.disposisi_catatan || disposisiData.catatan || "")) + "";

    if (!kepada.trim()) {
      return { success: false, message: "Tujuan disposisi (Diteruskan Kepada) wajib diisi!" };
    }

    ensureSuratMasukSheetExists();
    const sheetName = CONFIG.SHEET_SURAT_MASUK || "surat_masuk";
    const allData = getSheetRowsAsObjects(sheetName) || [];
    const target = allData.find(item => String(item.id_surat_masuk || item.ID_SURAT_MASUK).trim() === String(idSuratMasuk).trim());

    if (!target) {
      return { success: false, message: "Dokumen surat masuk tidak ditemukan." };
    }

    const tglDisposisi = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd HH:mm:ss");
    const namaPejabat = user.nama || user.username || "Pejabat";

    const updateObj = {
      status_disposisi: "SUDAH_DISPOSISI",
      disposisi_kepada: kepada.trim(),
      disposisi_sifat: sifat.trim() || "Biasa",
      disposisi_instruksi: instruksi.trim(),
      disposisi_catatan: catatan.trim(),
      disposisi_oleh: namaPejabat,
      disposisi_tgl: tglDisposisi
    };

    let updated = updateRowByField(sheetName, "id_surat_masuk", idSuratMasuk, updateObj);
    if (!updated && target && target._rowIndex) {
      // Fallback update menggunakan row index langsung dari data terdeteksi
      const ss = getDb();
      const sheet = ss.getSheetByName(sheetName);
      if (sheet) {
        const lastCol = sheet.getLastColumn();
        const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim().toLowerCase());
        for (const prop in updateObj) {
          let colIdx = headers.indexOf(prop.toLowerCase());
          if (colIdx === -1) {
            const newCol = sheet.getLastColumn() + 1;
            sheet.getRange(1, newCol).setValue(prop).setFontWeight("bold").setBackground("#1e293b").setFontColor("#ffffff");
            headers.push(prop.toLowerCase());
            colIdx = newCol - 1;
          }
          sheet.getRange(target._rowIndex, colIdx + 1).setValue(updateObj[prop]);
        }
        SpreadsheetApp.flush();
        updated = true;
      }
    }

    if (!updated) {
      return { success: false, message: "Gagal memperbarui baris surat masuk di spreadsheet." };
    }

    return {
      success: true,
      message: "Disposisi surat berhasil disimpan!",
      id: idSuratMasuk,
      pejabat: namaPejabat,
      waktu: tglDisposisi
    };
  } catch (err) {
    return { success: false, message: "Gagal memproses disposisi: " + err.message };
  }
}
