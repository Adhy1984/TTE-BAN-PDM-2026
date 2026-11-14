/**
 * ====================================================================
 * APLIKASI TANDA TANGAN ELEKTRONIK (TTE) BERBASIS QR-CODE
 * File: DocumentService.gs
 * ====================================================================
 */

/**
 * Mendapatkan folder Google Drive tujuan untuk arsip PDF
 */
function getTargetDriveFolder() {
  try {
    if (CONFIG.DRIVE_FOLDER_ID && CONFIG.DRIVE_FOLDER_ID.trim() !== "") {
      return DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID.trim());
    }
  } catch (err) {
    Logger.log("Folder Google Drive tidak ditemukan dengan ID: " + CONFIG.DRIVE_FOLDER_ID + ", fallback ke Root: " + err.message);
  }
  return DriveApp.getRootFolder();
}

/**
 * Alias fallback untuk getTargetDriveFolder
 */
function getOrCreateStorageFolder() {
  return getTargetDriveFolder();
}

/**
 * Menghasilkan URL Verifikasi Publik untuk dokumen
 */
function getVerificationUrl(docId) {
  let baseUrl = (CONFIG.WEB_APP_URL || "").trim();
  if (!baseUrl) {
    try {
      baseUrl = ScriptApp.getService().getUrl() || "";
    } catch (e) {
      baseUrl = "";
    }
  }
  
  // Jika URL mengarah ke /dev (versi test), ubah otomatis ke /exec agar dapat dibuka publik tanpa login
  if (baseUrl.endsWith("/dev")) {
    baseUrl = baseUrl.substring(0, baseUrl.length - 4) + "/exec";
  }
  
  if (!baseUrl) {
    baseUrl = "https://script.google.com/macros/s/CURRENT_DEPLOYMENT_ID/exec";
  }
  
  return baseUrl + (baseUrl.indexOf("?") === -1 ? "?" : "&") + "p=verify&id=" + encodeURIComponent(docId);
}

/**
 * Mengambil Blob gambar QR Code dari URL verifikasi
 */
function fetchQrCodeBlob(verifyUrl) {
  const qrApiUrl = CONFIG.QR_API_BASE + encodeURIComponent(verifyUrl);
  try {
    const response = UrlFetchApp.fetch(qrApiUrl, { muteHttpExceptions: true });
    if (response.getResponseCode() === 200) {
      return response.getBlob().setName("qrcode.png");
    }
  } catch (e) {
    Logger.log("Gagal mengambil QR via primary API: " + e.message);
  }
  
  // Fallback ke Google Charts API jika API utama mengalami kendala
  const fallbackUrl = "https://chart.googleapis.com/chart?chs=250x250&cht=qr&chl=" + encodeURIComponent(verifyUrl);
  const fallbackRes = UrlFetchApp.fetch(fallbackUrl, { muteHttpExceptions: true });
  return fallbackRes.getBlob().setName("qrcode.png");
}

/**
 * Menghitung Hash Digital Dokumen (SHA-256) untuk integritas keaslian
 */
function calculateDocumentHash(contentString) {
  const signature = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, contentString, Utilities.Charset.UTF_8);
  let hexString = "";
  for (let i = 0; i < signature.length; i++) {
    let byteVal = (signature[i] < 0 ? signature[i] + 256 : signature[i]).toString(16);
    hexString += (byteVal.length === 1 ? "0" : "") + byteVal;
  }
  return hexString.toUpperCase();
}

/**
 * Strip tag HTML menjadi teks biasa (untuk konversi konten CKEditor ke Google Docs)
 * Mendukung konversi tag <br>, <p>, <li> menjadi baris baru agar paragraf tetap terjaga.
 */
function stripHtmlToPlainText(html) {
  if (!html) return '';
  let text = String(html);
  
  // Ubah tag blok & list menjadi newline sebelum strip
  text = text.replace(/<\/p>/gi, '\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<li[^>]*>/gi, '\u2022 '); // bullet point
  text = text.replace(/<\/h[1-6]>/gi, '\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<\/blockquote>/gi, '\n');
  
  // Hapus semua tag HTML yang tersisa
  text = text.replace(/<[^>]+>/g, '');
  
  // Decode HTML entities umum
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, ' ');
  
  // Bersihkan spasi/baris kosong berlebih (lebih dari 2 baris kosong berurutan)
  text = text.replace(/\n{3,}/g, '\n\n');
  
  return text.trim();
}

/**
 * Helper: Ambil Gambar dari Google Drive dan jadikan Base64 Data URI
 * Identik dengan implementasi di sertifikat-dakwah-digital-mui-kaltim/Code.gs
 */
function getDriveImageAsBase64(fileId) {
  if (!fileId || fileId.trim() === '') return '';

  try {
    const file = DriveApp.getFileById(fileId);
    const blob = file.getBlob();
    const contentType = blob.getContentType() || 'image/png';
    const base64 = Utilities.base64Encode(blob.getBytes());
    return 'data:' + contentType + ';base64,' + base64;
  } catch (errDrive) {
    Logger.log('DriveApp fetch gagal untuk ID ' + fileId + ': ' + errDrive.message);
  }

  try {
    const directUrl = 'https://drive.google.com/uc?export=download&id=' + fileId;
    const response = UrlFetchApp.fetch(directUrl, { muteHttpExceptions: true });
    if (response.getResponseCode() === 200) {
      const blob = response.getBlob();
      const contentType = blob.getContentType() || 'image/png';
      const base64 = Utilities.base64Encode(blob.getBytes());
      return 'data:' + contentType + ';base64,' + base64;
    }
  } catch (errUrl) {
    Logger.log('UrlFetchApp fetch gagal untuk ID ' + fileId + ': ' + errUrl.message);
  }

  return '';
}

/**
 * Helper: Ambil Logo Resmi Instansi sebagai Base64 Data URI
 * Memprioritaskan logo transparan resmi dari CONFIG.KOP_LOGO_URL (bebas pola kotak-kotak catur / fake transparency),
 * dengan fallback ke Google Drive file ID jika URL tidak tersedia atau gagal dimuat.
 */
function getAppLogoBase64() {
  const logoUrl = CONFIG.KOP_LOGO_URL || "https://upload.wikimedia.org/wikipedia/commons/4/44/Logo_BAN-PDM.png";
  if (logoUrl && logoUrl.trim() !== '') {
    try {
      const response = UrlFetchApp.fetch(logoUrl, { muteHttpExceptions: true });
      if (response.getResponseCode() === 200) {
        const blob = response.getBlob();
        const contentType = blob.getContentType() || 'image/png';
        const base64 = Utilities.base64Encode(blob.getBytes());
        return "data:" + contentType + ";base64," + base64;
      }
    } catch (errUrl) {
      Logger.log("UrlFetchApp fetch logo resmi gagal: " + errUrl.message);
    }
  }

  // Fallback ke Google Drive jika ada fileId
  const logoFileId = CONFIG.KOP_LOGO_FILE_ID || '';
  if (logoFileId && logoFileId.trim() !== '') {
    const driveBase64 = getDriveImageAsBase64(logoFileId);
    if (driveBase64) return driveBase64;
  }

  return logoUrl || '';
}

/**
 * Menghasilkan Dokumen Surat Resmi Kedinasan Lengkap dengan QR Code TTE
 * Menggunakan HtmlService.createTemplateFromFile('TemplateSurat') persis seperti
 * sertifikat-dakwah-digital-mui-kaltim agar CSS/layout/gambar ter-render sempurna.
 */
function generateOfficialSignedPdf(suratData, pejabatData) {
  const docId        = suratData.id_dokumen;
  const verifyUrl    = getVerificationUrl(docId);
  const qrBlob       = fetchQrCodeBlob(verifyUrl);
  const targetFolder = getTargetDriveFolder();

  // =========================================================
  // 1. PENGAMBILAN GAMBAR (LOGO & QR CODE) KE BASE64
  //    Menggunakan getDriveImageAsBase64 persis seperti MUI Kaltim
  // =========================================================
  const logoBase64 = getAppLogoBase64();

  let qrBase64 = "";
  if (qrBlob) {
    const qrContentType = qrBlob.getContentType() || 'image/png';
    qrBase64 = "data:" + qrContentType + ";base64," + Utilities.base64Encode(qrBlob.getBytes());
  }

  // =========================================================
  // 2. PENYIAPAN VARIABEL SURAT & KOP
  // =========================================================
  const kopColor   = CONFIG.KOP_COLOR || "#4682B4";
  const kopLine1   = CONFIG.KOP_LINE_1 || "BADAN AKREDITASI NASIONAL";
  const kopLine2   = CONFIG.KOP_LINE_2 || "PENDIDIKAN ANAK USIA DINI, PENDIDIKAN DASAR, DAN PENDIDIKAN MENENGAH";
  const kopLine3   = CONFIG.KOP_LINE_3 || "PROVINSI NUSA TENGGARA TIMUR";
  const kopAddress = (CONFIG.KOP_ADDRESS || CONFIG.INSTITUTION_ADDRESS || "").trim();
  const kopContact = (CONFIG.KOP_CONTACT || CONFIG.INSTITUTION_CONTACT || "").trim();

  const tanggalStr   = formatDateIndo(suratData.tanggal_surat);
  const tanggalSurat = tanggalStr;

  const nomorSurat    = suratData.nomor_surat || "-";
  const lampiranSurat = suratData.lampiran || "-";
  const perihalSurat  = suratData.perihal || "-";

  // Penanganan Tujuan Surat (Kepada Yth.) — array untuk template loop
  const kepadaList = (suratData.kepada || "Di Tempat")
    .split("\n")
    .map(function(l) { return l.trim(); })
    .filter(function(l) { return l.length > 0; });

  // Penanganan Isi Surat (Menjaga HTML dan Mencegah Duplikasi Salam)
  let isiHtml = (suratData.isi_surat || "").trim();
  // Salam pembuka ("Dengan hormat,") TIDAK ditambah otomatis oleh sistem.
  // User bertanggung jawab menuliskannya sendiri di editor agar tidak duplikat.
  const salamPembukaHtml = "";
  const hasSalamPenutup = /demikian\s+surat/i.test(isiHtml) || /terima\s+kasih/i.test(isiHtml);

  // Jika input berupa plain text (tanpa tag <p>/<div>), bungkus rapi dalam tag <p>
  if (!isiHtml.startsWith("<p") && !isiHtml.startsWith("<div")) {
    isiHtml = isiHtml.split("\n")
      .map(function(l) { return l.trim(); })
      .filter(function(l) { return l.length > 0; })
      .map(function(l) {
        if (/^[•\-\*]\s+/.test(l) || /^\d+[\.\ )]\s+/.test(l)) {
          return '<p style="text-indent: 0; padding-left: 24px; margin-bottom: 3px;">' + l + '</p>';
        }
        return '<p>' + l + '</p>';
      })
      .join("");
  }

  let salamPenutupHtml = "";
  if (!hasSalamPenutup) {
    salamPenutupHtml = '<p style="margin-top: 14px;">Demikian surat ini disampaikan untuk dipergunakan sebagaimana mestinya. Atas perhatian dan kerja sama yang baik kami ucapkan terima kasih.</p>';
  }

  // Penanganan Blok Tanda Tangan
  const defaultJabatan = "Ketua BAN PDM<br>" + (CONFIG.KOP_LINE_3 || "Provinsi Nusa Tenggara Timur") + ",";
  let jabatanTtd = (pejabatData.jabatan || suratData.pejabat_jabatan || defaultJabatan).trim();
  jabatanTtd = jabatanTtd.replace(/\n/g, "<br>");
  if (!jabatanTtd.endsWith(",")) jabatanTtd += ",";

  const namaPejabat = pejabatData.nama_lengkap || "-";
  const nipPejabat  = pejabatData.nip || "-";

  // =========================================================
  // 3. RENDER TEMPLATE HTML (IDENTIK DENGAN MUI KALTIM)
  //    HtmlService.createTemplateFromFile mengevaluasi <?= ?> dan <?!= ?>
  //    sehingga semua CSS, warna, dan gambar Base64 langsung ter-embed
  // =========================================================
  const template = HtmlService.createTemplateFromFile('TemplateSurat');

  // Bind semua variabel ke template
  template.kopColor      = kopColor;
  template.kopLine1      = kopLine1;
  template.kopLine2      = kopLine2;
  template.kopLine3      = kopLine3;
  template.kopAddress    = kopAddress;
  template.kopContact    = kopContact;
  template.logoBase64    = logoBase64;
  template.nomorSurat    = nomorSurat;
  template.lampiranSurat = lampiranSurat;
  template.perihalSurat  = perihalSurat;
  template.tanggalSurat  = tanggalSurat;
  template.kotaTanggal   = tanggalSurat;
  template.kepadaList    = kepadaList;
  template.isiHtml       = isiHtml;
  template.salamPembukaHtml = salamPembukaHtml;
  template.salamPenutupHtml = salamPenutupHtml;
  template.jabatanTtd    = jabatanTtd;
  template.namaPejabat   = namaPejabat;
  template.nipPejabat    = nipPejabat;
  template.qrBase64      = qrBase64;
  template.verifyUrl     = verifyUrl;

  const htmlContent = template.evaluate().getContent();

  // =========================================================
  // 4. KONVERSI HTML KE PDF & SIMPAN KE GOOGLE DRIVE
  //    Menggunakan Utilities.newBlob persis seperti MUI Kaltim
  // =========================================================
  const safeNomor = (suratData.nomor_surat || "SURAT").replace(/[\/\\]/g, "_");
  const fileName  = "SURAT_" + safeNomor + "_" + docId + ".pdf";

  const blob    = Utilities.newBlob(htmlContent, "text/html", fileName);
  const pdfBlob = blob.getAs("application/pdf").setName(fileName);

  const savedPdfFile = targetFolder.createFile(pdfBlob);

  try {
    savedPdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    Logger.log("Izin sharing Drive file: " + e.message);
  }

  // Hash SHA-256
  const docHash = calculateDocumentHash(
    docId + "|" + suratData.nomor_surat + "|" + (pejabatData.nip || "") + "|" + new Date().toISOString()
  );

  return {
    pdfId:       savedPdfFile.getId(),
    pdfUrl:      savedPdfFile.getUrl(),
    downloadUrl: "https://drive.google.com/uc?export=download&id=" + savedPdfFile.getId(),
    viewUrl:     "https://drive.google.com/file/d/" + savedPdfFile.getId() + "/view",
    docHash:     docHash,
    verifyUrl:   verifyUrl
  };
}

/**
 * Menghasilkan HTML Pratinjau Surat Kedinasan TANPA QR Code dan TANPA menyimpan ke Drive.
 * Memanfaatkan ulang TemplateSurat.html persis seperti generateOfficialSignedPdf,
 * dengan dua perbedaan: qrBase64 dikosongkan dan watermark PRATINJAU disisipkan.
 */
function generatePreviewHtml(suratData, pejabatData) {
  // =========================================================
  // 1. LOGO (Kop Surat tetap tampil dengan benar)
  //    QR Code sengaja dikosongkan — tidak ada penandatanganan
  // =========================================================
  const logoBase64 = getAppLogoBase64();
  const qrBase64   = ""; // Sengaja kosong: pratinjau belum bertanda tangan

  // =========================================================
  // 2. VARIABEL KOP & SURAT (identik dengan generateOfficialSignedPdf)
  // =========================================================
  const kopColor   = CONFIG.KOP_COLOR   || "#4682B4";
  const kopLine1   = CONFIG.KOP_LINE_1  || "BADAN AKREDITASI NASIONAL";
  const kopLine2   = CONFIG.KOP_LINE_2  || "PENDIDIKAN ANAK USIA DINI, PENDIDIKAN DASAR, DAN PENDIDIKAN MENENGAH";
  const kopLine3   = CONFIG.KOP_LINE_3  || "PROVINSI NUSA TENGGARA TIMUR";
  const kopAddress = (CONFIG.KOP_ADDRESS || CONFIG.INSTITUTION_ADDRESS || "").trim();
  const kopContact = (CONFIG.KOP_CONTACT || CONFIG.INSTITUTION_CONTACT || "").trim();

  const tanggalSurat  = formatDateIndo(suratData.tanggal_surat);
  const nomorSurat    = suratData.nomor_surat   || "-";
  const lampiranSurat = suratData.lampiran      || "-";
  const perihalSurat  = suratData.perihal       || "-";

  const kepadaList = (suratData.kepada || "Di Tempat")
    .split("\n")
    .map(function(l) { return l.trim(); })
    .filter(function(l) { return l.length > 0; });

  let isiHtml = (suratData.isi_surat || "").trim();
  // Salam pembuka ("Dengan hormat,") TIDAK ditambah otomatis oleh sistem.
  // User bertanggung jawab menuliskannya sendiri di editor agar tidak duplikat.
  const salamPembukaHtml = "";
  const hasSalamPenutup = /demikian\s+surat/i.test(isiHtml) || /terima\s+kasih/i.test(isiHtml);

  if (!isiHtml.startsWith("<p") && !isiHtml.startsWith("<div")) {
    isiHtml = isiHtml.split("\n")
      .map(function(l) { return l.trim(); })
      .filter(function(l) { return l.length > 0; })
      .map(function(l) {
        if (/^[•\-\*]\s+/.test(l) || /^\d+[\.\)]\s+/.test(l)) {
          return '<p style="text-indent: 0; padding-left: 24px; margin-bottom: 3px;">' + l + '</p>';
        }
        return '<p>' + l + '</p>';
      }).join("");
  }

  const salamPenutupHtml = hasSalamPenutup ? "" :
    '<p style="margin-top: 14px;">Demikian surat ini disampaikan untuk dipergunakan sebagaimana mestinya. Atas perhatian dan kerja sama yang baik kami ucapkan terima kasih.</p>';

  const defaultJabatan = "Ketua BAN PDM<br>" + (CONFIG.KOP_LINE_3 || "Provinsi Nusa Tenggara Timur") + ",";
  let jabatanTtd = (pejabatData.jabatan || defaultJabatan).trim();
  jabatanTtd = jabatanTtd.replace(/\n/g, "<br>");
  if (!jabatanTtd.endsWith(",")) jabatanTtd += ",";

  const namaPejabat = pejabatData.nama_lengkap || "-";
  const nipPejabat  = pejabatData.nip          || "-";
  const verifyUrl   = ""; // Tidak relevan untuk pratinjau

  // =========================================================
  // 3. RENDER TEMPLATE (sama persis dengan generateOfficialSignedPdf)
  // =========================================================
  const template = HtmlService.createTemplateFromFile('TemplateSurat');
  template.kopColor         = kopColor;
  template.kopLine1         = kopLine1;
  template.kopLine2         = kopLine2;
  template.kopLine3         = kopLine3;
  template.kopAddress       = kopAddress;
  template.kopContact       = kopContact;
  template.logoBase64       = logoBase64;
  template.nomorSurat       = nomorSurat;
  template.lampiranSurat    = lampiranSurat;
  template.perihalSurat     = perihalSurat;
  template.tanggalSurat     = tanggalSurat;
  template.kotaTanggal      = tanggalSurat;
  template.kepadaList       = kepadaList;
  template.isiHtml          = isiHtml;
  template.salamPembukaHtml = salamPembukaHtml;
  template.salamPenutupHtml = salamPenutupHtml;
  template.jabatanTtd       = jabatanTtd;
  template.namaPejabat      = namaPejabat;
  template.nipPejabat       = nipPejabat;
  template.qrBase64         = qrBase64;  // "" → blok QR tidak tampil di template
  template.verifyUrl        = verifyUrl;

  let htmlContent = template.evaluate().getContent();

  // =========================================================
  // 4. SISIPKAN GAYA LEMBAR KERTAS A4 & WATERMARK PRATINJAU
  //    Membungkus konten dalam container lembar cetak A4 dengan bayangan (drop shadow)
  //    di atas latar abu-abu PDF viewer, agar batas/tepi kertas terlihat jelas.
  // =========================================================
  const previewCss =
    '<style>' +
    '  html { background-color: #525659 !important; }' +
    '  body {' +
    '    background-color: #525659 !important;' +
    '    margin: 0 !important;' +
    '    padding: 24px 16px 40px 16px !important;' +
    '    display: flex !important;' +
    '    justify-content: center !important;' +
    '    box-sizing: border-box !important;' +
    '    min-height: 100% !important;' +
    '  }' +
    '  .preview-paper-sheet {' +
    '    background: #ffffff !important;' +
    '    width: 100% !important;' +
    '    max-width: 210mm !important;' +
    '    min-height: 297mm !important;' +
    '    padding: 15mm 20mm 20mm 20mm !important;' +
    '    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(0, 0, 0, 0.12) !important;' +
    '    box-sizing: border-box !important;' +
    '    position: relative !important;' +
    '    border-radius: 2px !important;' +
    '    overflow: hidden !important;' +
    '  }' +
    '  @media (max-width: 640px) {' +
    '    body { padding: 8px 4px 20px 4px !important; }' +
    '    .preview-paper-sheet {' +
    '      padding: 14px 12px 20px 12px !important;' +
    '      width: 100% !important;' +
    '      max-width: 100% !important;' +
    '      min-height: auto !important;' +
    '      border-radius: 4px !important;' +
    '    }' +
    '    .kop-table td.kop-logo { width: 58px !important; max-width: 58px !important; padding-right: 8px !important; }' +
    '    .kop-logo img { height: 50px !important; max-width: 58px !important; }' +
    '    .kop-line1 { font-size: 12.5px !important; line-height: 1.15 !important; }' +
    '    .kop-line2 { font-size: 6.8px !important; line-height: 1.2 !important; }' +
    '    .kop-line3 { font-size: 12.5px !important; line-height: 1.15 !important; }' +
    '    .kop-alamat { font-size: 7px !important; line-height: 1.2 !important; }' +
    '    .kop-hr { border-top: 1.5px solid #000 !important; margin: 4px 0 8px 0 !important; }' +
    '    .info-table td:first-child { width: 62% !important; }' +
    '    .info-table td:last-child { width: 38% !important; text-align: right !important; white-space: nowrap !important; font-size: 8.5pt !important; }' +
    '    .meta-label { width: 55px !important; }' +
    '  }' +
    '</style>';

  const watermarkHtml =
    '<div style="' +
      'position:absolute;' +
      'top:32px;' +
      'right:-50px;' +
      'width:200px;' +
      'background:#dc2626;' +
      'color:#ffffff;' +
      'text-align:center;' +
      'padding:7px 0;' +
      'font-size:9pt;' +
      'font-weight:bold;' +
      'letter-spacing:1.5px;' +
      'font-family:Arial,sans-serif;' +
      'transform:rotate(45deg);' +
      'z-index:9999;' +
      'pointer-events:none;' +
      'box-shadow:0 2px 8px rgba(220,38,38,.4);' +
    '">PRATINJAU</div>';

  htmlContent = htmlContent.replace('</head>', previewCss + '</head>');
  htmlContent = htmlContent.replace('<body>', '<body><div class="preview-paper-sheet">' + watermarkHtml);
  htmlContent = htmlContent.replace('</body>', '</div></body>');

  return htmlContent;
}

/**
 * Format tanggal dalam Bahasa Indonesia (contoh: 11 September 2026)
 * Mendukung objek Date, string ISO ("2026-09-11T23:00:00"), dan string datetime SQL ("2026-09-11 23:00:00")
 */
function formatDateIndo(rawDate) {
  if (!rawDate) return "";
  let d;
  if (rawDate instanceof Date) {
    d = rawDate;
  } else {
    const str = String(rawDate).trim();
    // Ambil bagian tanggal saja jika ada jam/spasi/T
    const datePart = str.split(" ")[0].split("T")[0];
    const parts = datePart.split("-");
    if (parts.length === 3) {
      d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else {
      d = new Date(str);
    }
  }

  if (!d || isNaN(d.getTime())) {
    return String(rawDate);
  }

  const bulan = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  return d.getDate() + " " + bulan[d.getMonth()] + " " + d.getFullYear();
}

/**
 * Format tanggal dan jam lengkap (contoh: 09 September 2026 16:30:15 WIB)
 */
function formatDateTimeIndo(dateObj) {
  if (!dateObj) return "-";
  const d = new Date(dateObj);
  const bulan = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const jam   = String(d.getHours()).padStart(2, "0");
  const menit = String(d.getMinutes()).padStart(2, "0");
  const detik = String(d.getSeconds()).padStart(2, "0");
  return d.getDate() + " " + bulan[d.getMonth()] + " " + d.getFullYear() + " " + jam + ":" + menit + ":" + detik + " WIB";
}
