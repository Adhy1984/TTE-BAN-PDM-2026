/**
 * ====================================================================
 * APLIKASI TANDA TANGAN ELEKTRONIK (TTE) BERBASIS QR-CODE
 * File: Database.gs
 * ====================================================================
 */

/**
 * Membuka Spreadsheet Database
 */
function getDb() {
  try {
    return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  } catch (err) {
    throw new Error("Gagal membuka Spreadsheet ID: " + CONFIG.SPREADSHEET_ID + ". Pastikan ID benar dan izin akses sudah dibuka. Detail: " + err.message);
  }
}

/**
 * Menginisialisasi seluruh lembar kerja (sheets) & akun default jika belum tersedia
 */
function setupDatabase() {
  const ss = getDb();
  
  // 1. Inisialisasi Sheet 'users'
  let userSheet = ss.getSheetByName(CONFIG.SHEET_USERS);
  if (!userSheet) {
    userSheet = ss.insertSheet(CONFIG.SHEET_USERS);
    userSheet.appendRow([
      "id_user", "username", "password", "nama", "role", "pejabat_id", "status", "created_at"
    ]);
    userSheet.getRange(1, 1, 1, 8).setFontWeight("bold").setBackground("#1e293b").setFontColor("#ffffff");
    
    // Seed data user default
    userSheet.appendRow(["USR-001", "admin", "admin123", "Administrator Sistem", "admin", "", "AKTIF", new Date().toISOString()]);
    userSheet.appendRow(["USR-002", "operator", "operator123", "Staf Tata Usaha", "operator", "", "AKTIF", new Date().toISOString()]);
    userSheet.appendRow(["USR-003", "kepala", "pejabat123", "Dr. H. Ahmad Fauzi, M.Pd.", "pejabat", "PJB-001", "AKTIF", new Date().toISOString()]);
  }
  
  // 2. Inisialisasi Sheet 'pejabat'
  let pejabatSheet = ss.getSheetByName(CONFIG.SHEET_PEJABAT);
  if (!pejabatSheet) {
    pejabatSheet = ss.insertSheet(CONFIG.SHEET_PEJABAT);
    pejabatSheet.appendRow([
      "id_pejabat", "nama_lengkap", "gelar", "nip", "jabatan", "email", "pin_tte", "created_at"
    ]);
    pejabatSheet.getRange(1, 1, 1, 8).setFontWeight("bold").setBackground("#1e293b").setFontColor("#ffffff");
    
    // Seed data pejabat default (PIN default: 123456)
    pejabatSheet.appendRow([
      "PJB-001",
      "Dr. H. Ahmad Fauzi, M.Pd.",
      "M.Pd.",
      "19750812 200003 1 002",
      "Kepala Dinas",
      "ahmad.fauzi@instansi.go.id",
      "123456",
      new Date().toISOString()
    ]);
    pejabatSheet.appendRow([
      "PJB-002",
      "Dra. Hj. Siti Rahmawati, M.Si.",
      "M.Si.",
      "19780415 200212 2 001",
      "Sekretaris Dinas",
      "siti.rahmawati@instansi.go.id",
      "654321",
      new Date().toISOString()
    ]);
  }
  
  // 3. Inisialisasi Sheet 'surat'
  let suratSheet = ss.getSheetByName(CONFIG.SHEET_SURAT);
  if (!suratSheet) {
    suratSheet = ss.insertSheet(CONFIG.SHEET_SURAT);
    suratSheet.appendRow([
      "id_dokumen", "tipe_dokumen", "kategori", "nomor_surat", "tanggal_surat", "lampiran", "perihal", "kepada", 
      "isi_surat", "pejabat_id", "status", "waktu_ttd", "pdf_id", "pdf_url", 
      "doc_hash", "tte_page", "tte_x", "tte_y", "tte_size", "alasan_tolak", "created_at"
    ]);
    suratSheet.getRange(1, 1, 1, 21).setFontWeight("bold").setBackground("#1e293b").setFontColor("#ffffff");
  } else {
    ensureColumnExists(suratSheet, "kategori", "nomor_surat");
    ensureColumnExists(suratSheet, "lampiran", "perihal");
    ensureColumnExists(suratSheet, "tipe_dokumen", "nomor_surat");
    ensureColumnExists(suratSheet, "tte_page", "alasan_tolak");
    ensureColumnExists(suratSheet, "tte_x", "alasan_tolak");
    ensureColumnExists(suratSheet, "tte_y", "alasan_tolak");
    ensureColumnExists(suratSheet, "tte_size", "alasan_tolak");
  }
  
  // 4. Inisialisasi Sheet 'log_verifikasi'
  let logSheet = ss.getSheetByName(CONFIG.SHEET_LOG);
  if (!logSheet) {
    logSheet = ss.insertSheet(CONFIG.SHEET_LOG);
    logSheet.appendRow([
      "log_id", "waktu_scan", "id_dokumen", "nomor_surat", "user_agent", "ip_client", "status"
    ]);
    logSheet.getRange(1, 1, 1, 7).setFontWeight("bold").setBackground("#1e293b").setFontColor("#ffffff");
  }

  // 5. Inisialisasi Sheet 'surat_masuk'
  ensureSuratMasukSheetExists(ss);
  
  return { success: true, message: "Database dan tabel berhasil diinisialisasi!" };
}

/**
 * Memastikan sheet surat_masuk tersedia beserta seluruh kolomnya
 */
function ensureSuratMasukSheetExists(ss) {
  if (!ss) ss = getDb();
  const sheetName = CONFIG.SHEET_SURAT_MASUK || "surat_masuk";
  let sheet = ss.getSheetByName(sheetName);
  const defaultHeaders = [
    "id_surat_masuk", "nomor_surat", "pengirim", "perihal", "tanggal_surat", 
    "tanggal_terima", "kategori", "keterangan", "file_id", "file_name", 
    "file_url", "file_size", "uploaded_by", "created_at",
    "status_disposisi", "disposisi_kepada", "disposisi_sifat", "disposisi_instruksi",
    "disposisi_catatan", "disposisi_oleh", "disposisi_tgl"
  ];
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(defaultHeaders);
    sheet.getRange(1, 1, 1, defaultHeaders.length).setFontWeight("bold").setBackground("#1e293b").setFontColor("#ffffff");
  } else {
    // Pastikan seluruh kolom default ada tanpa merusak susunan kolom lama
    const lastCol = Math.max(sheet.getLastColumn(), 1);
    const existingHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim().toLowerCase());
    
    let currentLastCol = lastCol;
    for (let i = 0; i < defaultHeaders.length; i++) {
      const colName = defaultHeaders[i];
      if (existingHeaders.indexOf(colName.toLowerCase()) === -1) {
        currentLastCol++;
        sheet.getRange(1, currentLastCol).setValue(colName)
          .setFontWeight("bold").setBackground("#1e293b").setFontColor("#ffffff");
        existingHeaders.push(colName.toLowerCase());
      }
    }
  }
  SpreadsheetApp.flush();
  return sheet;
}

/**
 * Mengambil semua baris data dari sheet sebagai Array of Object
 */
function getSheetRowsAsObjects(sheetName) {
  try {
    const ss = getDb();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return [];
    
    const values = sheet.getDataRange().getValues();
    if (!values || values.length <= 1) return [];
    
    const headers = values[0];
    const results = [];
    
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const item = { _rowIndex: i + 1 };
      let hasData = false;
      
      for (let j = 0; j < headers.length; j++) {
        const headerKey = headers[j].toString().trim();
        let val = row[j];
        if (val instanceof Date) {
          val = Utilities.formatDate(val, ss.getSpreadsheetTimeZone() || "GMT+8", "yyyy-MM-dd HH:mm:ss");
        } else if (val === null || val === undefined) {
          val = "";
        } else if (typeof val === "number") {
          val = val.toString();
        } else {
          // Pastikan nilai string tetap utuh termasuk newline (\n) untuk field multi-baris seperti kepada
          val = String(val);
        }
        item[headerKey] = val;
        if (val !== "") {
          hasData = true;
        }
      }
      if (hasData) {
        results.push(item);
      }
    }
    return results;
  } catch (err) {
    Logger.log("Error in getSheetRowsAsObjects(" + sheetName + "): " + err.message);
    return [];
  }
}

/**
 * Memastikan kolom tertentu ada di baris header sheet (auto-migrasi aman).
 */
function ensureColumnExists(sheet, columnName, insertBeforeColumnName) {
  try {
    const lastCol = sheet.getLastColumn();
    if (lastCol === 0) return;
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());
    if (headers.indexOf(columnName) === -1) {
      const targetIdx = insertBeforeColumnName ? headers.indexOf(insertBeforeColumnName) : -1;
      if (targetIdx !== -1) {
        sheet.insertColumnBefore(targetIdx + 1);
        sheet.getRange(1, targetIdx + 1).setValue(columnName)
          .setFontWeight("bold").setBackground("#1e293b").setFontColor("#ffffff");
      } else {
        sheet.insertColumnAfter(lastCol);
        sheet.getRange(1, lastCol + 1).setValue(columnName)
          .setFontWeight("bold").setBackground("#1e293b").setFontColor("#ffffff");
      }
    }
  } catch (err) {
    Logger.log("ensureColumnExists warning: " + err.message);
  }
}

/**
 * Menambahkan 1 baris data baru ke Sheet
 */
function appendDataRow(sheetName, dataObj) {
  const ss = getDb();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error("Sheet '" + sheetName + "' tidak ditemukan.");
  
  if (sheetName === CONFIG.SHEET_SURAT) {
    ensureColumnExists(sheet, "kategori", "nomor_surat");
    ensureColumnExists(sheet, "lampiran", "perihal");
  }
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const newRow = [];
  
  for (let j = 0; j < headers.length; j++) {
    const key = headers[j].toString().trim();
    newRow.push(dataObj[key] !== undefined ? dataObj[key] : "");
  }
  
  sheet.appendRow(newRow);
  return true;
}

/**
 * Memperbarui baris berdasarkan nilai kolom kunci tertentu (misal id_dokumen)
 */
function updateRowByField(sheetName, keyField, keyValue, updateObj) {
  const ss = getDb();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return false;
  
  if (sheetName === CONFIG.SHEET_SURAT) {
    ensureColumnExists(sheet, "kategori", "nomor_surat");
    ensureColumnExists(sheet, "lampiran", "perihal");
  } else if (sheetName === (CONFIG.SHEET_SURAT_MASUK || "surat_masuk")) {
    ensureSuratMasukSheetExists(ss);
  }
  
  SpreadsheetApp.flush();
  
  const lastCol = sheet.getLastColumn();
  const lastRow = sheet.getLastRow();
  if (lastCol === 0 || lastRow <= 1) return false;
  
  const rawHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const normHeaders = rawHeaders.map(h => String(h).trim().toLowerCase());
  
  const targetKeyNorm = String(keyField).trim().toLowerCase();
  const keyColIdx = normHeaders.indexOf(targetKeyNorm);
  if (keyColIdx === -1) {
    Logger.log("Field kunci '" + keyField + "' tidak ditemukan pada sheet '" + sheetName + "'.");
    return false;
  }
  
  const targetValStr = String(keyValue).trim();
  const colValues = sheet.getRange(1, keyColIdx + 1, lastRow, 1).getValues();
  
  let targetRowIdx = -1;
  for (let r = 1; r < colValues.length; r++) {
    const curVal = String(colValues[r][0]).trim();
    if (curVal === targetValStr || curVal.toLowerCase() === targetValStr.toLowerCase()) {
      targetRowIdx = r + 1;
      break;
    }
  }
  
  if (targetRowIdx === -1) return false;
  
  for (const prop in updateObj) {
    const propNorm = String(prop).trim().toLowerCase();
    let colIdx = normHeaders.indexOf(propNorm);
    if (colIdx === -1) {
      const newCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, newCol).setValue(prop).setFontWeight("bold").setBackground("#1e293b").setFontColor("#ffffff");
      normHeaders.push(propNorm);
      colIdx = newCol - 1;
    }
    sheet.getRange(targetRowIdx, colIdx + 1).setValue(updateObj[prop]);
  }
  
  SpreadsheetApp.flush();
  return true;
}

/**
 * Menghapus satu baris berdasarkan nilai kolom kunci tertentu (misal id_user)
 */
function deleteRowByField(sheetName, keyField, keyValue) {
  const ss = getDb();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return false;
  
  const lastCol = sheet.getLastColumn();
  const lastRow = sheet.getLastRow();
  if (lastCol === 0 || lastRow <= 1) return false;
  
  const rawHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const normHeaders = rawHeaders.map(h => String(h).trim().toLowerCase());
  
  const targetKeyNorm = String(keyField).trim().toLowerCase();
  const keyColIdx = normHeaders.indexOf(targetKeyNorm);
  if (keyColIdx === -1) {
    Logger.log("Field kunci '" + keyField + "' tidak ditemukan pada sheet '" + sheetName + "'.");
    return false;
  }
  
  const targetValStr = String(keyValue).trim();
  const colValues = sheet.getRange(1, keyColIdx + 1, lastRow, 1).getValues();
  
  let targetRowIdx = -1;
  for (let r = 1; r < colValues.length; r++) {
    const curVal = String(colValues[r][0]).trim();
    if (curVal === targetValStr || curVal.toLowerCase() === targetValStr.toLowerCase()) {
      targetRowIdx = r + 1;
      break;
    }
  }
  
  if (targetRowIdx === -1) return false;
  
  sheet.deleteRow(targetRowIdx);
  SpreadsheetApp.flush();
  return true;
}
