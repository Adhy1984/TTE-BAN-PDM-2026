/**
 * ====================================================================
 * APLIKASI TANDA TANGAN ELEKTRONIK (TTE) BERBASIS QR-CODE
 * File: AuthService.gs
 * ====================================================================
 */

/**
 * Membuat token sesi server-side berbasis UUID dan disimpan dalam CacheService
 * Mencegah pemalsuan token (token forgery) dan client-side bypass dari console browser.
 */
function createSessionToken(userObj) {
  const token = "TTE_SESS_" + Utilities.getUuid().replace(/-/g, "") + "_" + (new Date().getTime().toString(36));
  const payload = {
    userId: userObj.id_user || userObj.id || userObj.userId || "",
    username: userObj.username || "",
    nama: userObj.nama || "",
    role: userObj.role || "",
    pejabatId: userObj.pejabat_id || userObj.pejabatId || "",
    createdAt: new Date().getTime()
  };

  const expiryMinutes = (typeof CONFIG !== "undefined" && CONFIG.SESSION_EXPIRY_MINUTES) ? CONFIG.SESSION_EXPIRY_MINUTES : 10;
  // CacheService maksimal 21600 detik (6 jam), default 10 menit (600 detik)
  const expirySeconds = Math.min(Math.max(expiryMinutes * 60, 60), 21600);

  const cache = CacheService.getScriptCache();
  cache.put(token, JSON.stringify(payload), expirySeconds);

  return token;
}

/**
 * Memvalidasi token sesi pengguna melalui CacheService sisi server
 */
function validateSessionToken(token) {
  if (!token || typeof token !== "string") return null;
  const cleanToken = token.trim();
  if (!cleanToken) return null;

  try {
    const cache = CacheService.getScriptCache();
    const cachedData = cache.get(cleanToken);
    if (cachedData) {
      return JSON.parse(cachedData);
    }
  } catch (err) {
    console.warn("Peringatan: Gagal membaca CacheService: " + err);
  }

  // Graceful fallback untuk token legacy Base64 saat masa transisi deployment
  try {
    if (cleanToken.indexOf("TTE_SESS_") !== 0) {
      const decoded = Utilities.newBlob(Utilities.base64Decode(cleanToken)).getDataAsString();
      const payload = JSON.parse(decoded);
      if (payload && payload.exp && new Date().getTime() <= payload.exp) {
        return payload;
      }
    }
  } catch (err) {
    // Abaikan jika bukan token legacy
  }

  return null;
}

/**
 * Menghapus token sesi dari CacheService saat pengguna logout
 */
function destroySessionToken(token) {
  if (!token || typeof token !== "string") return true;
  try {
    const cleanToken = token.trim();
    const cache = CacheService.getScriptCache();
    cache.remove(cleanToken);
    return true;
  } catch (err) {
    console.warn("Peringatan: Gagal menghapus token dari CacheService: " + err);
    return false;
  }
}

/**
 * Autentikasi Pengguna saat Login
 */
function authenticateUser(username, password) {
  if (!username || !password) {
    return { success: false, message: "Username dan password wajib diisi." };
  }
  
  const users = getSheetRowsAsObjects(CONFIG.SHEET_USERS);
  const user = users.find(u => 
    String(u.username).trim().toLowerCase() === String(username).trim().toLowerCase() &&
    String(u.password).trim() === String(password).trim()
  );
  
  if (!user) {
    return { success: false, message: "Username atau password salah!" };
  }
  
  if (user.status !== "AKTIF") {
    return { success: false, message: "Akun Anda berstatus non-aktif. Hubungi Administrator." };
  }
  
  // Jika role pejabat, ambil data profil pejabat terkait
  let pejabatData = null;
  if (user.role === "pejabat" && user.pejabat_id) {
    const pejabatList = getSheetRowsAsObjects(CONFIG.SHEET_PEJABAT);
    pejabatData = pejabatList.find(p => String(p.id_pejabat).trim() === String(user.pejabat_id).trim());
  }
  
  const token = createSessionToken(user);
  
  return {
    success: true,
    message: "Login berhasil!",
    token: token,
    expiresIn: ((typeof CONFIG !== "undefined" && CONFIG.SESSION_EXPIRY_MINUTES) ? CONFIG.SESSION_EXPIRY_MINUTES : 10) * 60,
    user: {
      id: user.id_user,
      username: user.username,
      nama: user.nama,
      role: user.role,
      pejabatId: user.pejabat_id || "",
      jabatan: pejabatData ? pejabatData.jabatan : "",
      nip: pejabatData ? pejabatData.nip : ""
    }
  };
}

/**
 * Memvalidasi PIN TTE Pejabat saat akan menandatangani dokumen
 */
function verifyPejabatPin(pejabatId, inputPin) {
  if (!pejabatId || !inputPin) {
    return { success: false, message: "ID Pejabat dan PIN wajib diisi." };
  }
  
  const pejabatList = getSheetRowsAsObjects(CONFIG.SHEET_PEJABAT);
  const pejabat = pejabatList.find(p => String(p.id_pejabat).trim() === String(pejabatId).trim());
  
  if (!pejabat) {
    return { success: false, message: "Data pejabat tidak ditemukan di sistem." };
  }
  
  if (String(pejabat.pin_tte).trim() !== String(inputPin).trim()) {
    return { success: false, message: "PIN TTE yang Anda masukkan salah!" };
  }
  
  return {
    success: true,
    message: "Otorisasi PIN Pejabat valid.",
    pejabat: pejabat
  };
}

/**
 * Autentikasi Pengguna via Akun Google (Google Sign-In)
 */
function authenticateGoogleUser(googleEmail, googleName, idToken) {
  if (!googleEmail || typeof googleEmail !== "string") {
    return { success: false, message: "Email Google tidak valid atau tidak terbaca." };
  }

  const cleanEmail = googleEmail.trim().toLowerCase();
  ensureUsersEmailColumnExists();

  const users = getSheetRowsAsObjects(CONFIG.SHEET_USERS);
  let user = users.find(u => String(u.email || "").trim().toLowerCase() === cleanEmail);

  // Jika belum ditemukan di sheet users, cari di sheet pejabat yang memiliki email tersebut
  let pejabatData = null;
  const pejabatList = getSheetRowsAsObjects(CONFIG.SHEET_PEJABAT);
  if (!user) {
    const matchingPejabat = pejabatList.find(p => String(p.email || "").trim().toLowerCase() === cleanEmail);
    if (matchingPejabat) {
      pejabatData = matchingPejabat;
      user = users.find(u => String(u.pejabat_id || "").trim() === String(matchingPejabat.id_pejabat).trim());
    }
  } else if (user.role === "pejabat" && user.pejabat_id) {
    pejabatData = pejabatList.find(p => String(p.id_pejabat).trim() === String(user.pejabat_id).trim());
  }

  if (!user) {
    return {
      success: false,
      message: "Akun Google Anda (" + cleanEmail + ") belum terdaftar di sistem e-TTE. Silakan hubungi Administrator untuk mendaftarkan akun."
    };
  }

  if (user.status !== "AKTIF") {
    return {
      success: false,
      message: "Akun Anda (" + user.username + ") berstatus non-aktif. Hubungi Administrator."
    };
  }

  const token = createSessionToken(user);

  return {
    success: true,
    message: "Login dengan Akun Google berhasil!",
    token: token,
    expiresIn: ((typeof CONFIG !== "undefined" && CONFIG.SESSION_EXPIRY_MINUTES) ? CONFIG.SESSION_EXPIRY_MINUTES : 10) * 60,
    user: {
      id: user.id_user,
      username: user.username,
      nama: user.nama || googleName || "Pengguna",
      role: user.role,
      pejabatId: user.pejabat_id || "",
      jabatan: pejabatData ? pejabatData.jabatan : "",
      nip: pejabatData ? pejabatData.nip : ""
    }
  };
}

/**
 * ====================================================================
 * FUNGSI OTORISASI IZIN EMAIL (MAILAPP / GMAILAPP)
 * Jalankan fungsi ini 1x di Editor Google Apps Script:
 * Pilih fungsi 'otorisasiIzinKirimEmail' -> Klik 'Run / Jalankan' -> Review permissions -> Allow (Izinkan).
 * ====================================================================
 */
function otorisasiIzinKirimEmail() {
  try {
    const userEmail = Session.getEffectiveUser().getEmail() || (typeof CONFIG !== "undefined" ? CONFIG.ADMIN_EMAIL : "");
    if (userEmail) {
      MailApp.sendEmail({
        to: userEmail,
        subject: "[e-TTE BAN PDM NTT] Uji Coba Otorisasi Pengiriman Email",
        htmlBody: "<p>Selamat! Otorisasi izin pengiriman email (MailApp & GmailApp) untuk sistem e-TTE telah aktif 100%.</p>"
      });
      Logger.log("Email uji coba otorisasi berhasil dikirim ke: " + userEmail);
    }
    return { success: true, message: "Otorisasi email berhasil diaktifkan!" };
  } catch (err) {
    Logger.log("Error otorisasi email: " + err.message);
    throw err;
  }
}

/**
 * Helper pengiriman email defensif (MailApp dengan cadangan otomatis GmailApp)
 */
function sendEmailSafe(targetEmail, subject, htmlBody) {
  if (!targetEmail) throw new Error("Alamat email penerima kosong.");

  let lastError = null;
  // 1. Coba menggunakan MailApp
  try {
    MailApp.sendEmail({
      to: targetEmail,
      subject: subject,
      htmlBody: htmlBody
    });
    return true;
  } catch (errMail) {
    lastError = errMail;
    Logger.log("sendEmailSafe MailApp warning: " + errMail.message);
  }

  // 2. Cadangan otomatis menggunakan GmailApp
  try {
    GmailApp.sendEmail(targetEmail, subject, "", {
      htmlBody: htmlBody
    });
    return true;
  } catch (errGmail) {
    lastError = errGmail;
    Logger.log("sendEmailSafe GmailApp warning: " + errGmail.message);
  }

  // Jika belum diotorisasi di Google Apps Script
  throw new Error(
    "Izin pengiriman email belum diaktifkan di Google Apps Script (" + (lastError ? lastError.message : "Izin diperlukan") + "). " +
    "Buka editor script, pilih fungsi 'otorisasiIzinKirimEmail', lalu klik 'Run / Jalankan' dan 'Izinkan' (Review permissions -> Allow)."
  );
}

/**
 * Helper menyamarkan email untuk privasi (contoh: ad***a@gmail.com)
 */
function maskEmail(email) {
  if (!email || typeof email !== "string" || email.indexOf("@") === -1) return "***";
  const parts = email.split("@");
  const name = parts[0];
  const domain = parts[1];
  const visible = name.length > 2 ? name.substring(0, 2) + "***" : name.substring(0, 1) + "***";
  return visible + "@" + domain;
}

/**
 * Memproses permintaan bantuan "Lupa Username"
 */
function processLupaUsername(keyword) {
  if (!keyword || typeof keyword !== "string") {
    return { success: false, message: "Masukkan Email, NIP, atau Nama Lengkap Anda." };
  }

  const kw = keyword.trim().toLowerCase();
  const kwClean = kw.replace(/[\s\.\-_]/g, "");

  const users = getSheetRowsAsObjects(CONFIG.SHEET_USERS);
  const pejabatList = getSheetRowsAsObjects(CONFIG.SHEET_PEJABAT);

  let targetUser = null;
  let targetEmail = "";

  for (let i = 0; i < users.length; i++) {
    const u = users[i];
    const uEmail = String(u.email || "").trim().toLowerCase();
    const uNama = String(u.nama || "").trim().toLowerCase();

    let pObj = null;
    if (u.pejabat_id) {
      pObj = pejabatList.find(p => String(p.id_pejabat).trim() === String(u.pejabat_id).trim());
    }

    const pEmail = pObj ? String(pObj.email || "").trim().toLowerCase() : "";
    const pNip = pObj ? String(pObj.nip || "").replace(/[\s\.\-_]/g, "").toLowerCase() : "";
    const pNama = pObj ? String(pObj.nama_lengkap || "").trim().toLowerCase() : "";

    if (
      (uEmail && uEmail === kw) ||
      (pEmail && pEmail === kw) ||
      (pNip && pNip.indexOf(kwClean) !== -1) ||
      (uNama && uNama.indexOf(kw) !== -1) ||
      (pNama && pNama.indexOf(kw) !== -1)
    ) {
      targetUser = u;
      targetEmail = uEmail || pEmail || "";
      break;
    }
  }

  if (!targetUser) {
    return {
      success: false,
      message: "Data akun tidak ditemukan. Pastikan Email, NIP, atau Nama Lengkap sudah sesuai dengan yang terdaftar di sistem e-TTE."
    };
  }

  if (targetEmail) {
    try {
      const subject = "[e-TTE BAN PDM NTT] Informasi Pengingat Username Anda";
      const bodyHtml =
        '<div style="font-family:Arial,sans-serif;max-width:540px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;">' +
        '<h2 style="color:#0284c7;margin-top:0;">Informasi Akun Portal e-TTE</h2>' +
        '<p>Yth. <b>' + (targetUser.nama || 'Pengguna') + '</b>,</p>' +
        '<p>Berikut adalah rincian username akun Anda pada Portal e-TTE BAN PDM Provinsi NTT:</p>' +
        '<div style="background:#f1f5f9;border-left:4px solid #0284c7;padding:14px 18px;border-radius:8px;margin:16px 0;">' +
        '<p style="margin:4px 0;font-size:0.95rem;"><b>Username:</b> <span style="font-size:1.15rem;color:#0f172a;font-weight:700;">' + targetUser.username + '</span></p>' +
        '<p style="margin:4px 0;font-size:0.88rem;color:#475569;"><b>Hak Akses (Role):</b> ' + targetUser.role + '</p>' +
        '</div>' +
        '<p>Silakan gunakan username di atas untuk masuk ke portal resmi e-TTE.</p>' +
        '<hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">' +
        '<small style="color:#64748b;">Pesan otomatis dari Sistem e-TTE BAN PDM Provinsi NTT. Jangan membalas email ini.</small>' +
        '</div>';

      sendEmailSafe(targetEmail, subject, bodyHtml);

      return {
        success: true,
        emailSent: true,
        maskedEmail: maskEmail(targetEmail),
        message: "Informasi username telah dikirimkan ke email terdaftar Anda (" + maskEmail(targetEmail) + "). Silakan periksa kotak masuk atau folder spam."
      };
    } catch (mailErr) {
      Logger.log("processLupaUsername MailApp warning: " + mailErr.message);
      return {
        success: true,
        emailSent: false,
        username: targetUser.username,
        message: "Akun ditemukan! Username Anda adalah: '" + targetUser.username + "'. Silakan catat dan jaga kerahasiaannya."
      };
    }
  } else {
    return {
      success: true,
      emailSent: false,
      username: targetUser.username,
      message: "Akun ditemukan! Username Anda adalah: '" + targetUser.username + "'. Silakan gunakan username ini untuk masuk."
    };
  }
}

/**
 * Memproses permintaan "Lupa Password" (Kirim Kode OTP Reset)
 */
function processLupaPassword(identifier) {
  if (!identifier || typeof identifier !== "string") {
    return { success: false, message: "Masukkan Username atau Email terdaftar Anda." };
  }

  const idClean = identifier.trim().toLowerCase();
  const users = getSheetRowsAsObjects(CONFIG.SHEET_USERS);
  const pejabatList = getSheetRowsAsObjects(CONFIG.SHEET_PEJABAT);

  let targetUser = users.find(u =>
    String(u.username || "").trim().toLowerCase() === idClean ||
    String(u.email || "").trim().toLowerCase() === idClean
  );

  let targetEmail = targetUser ? String(targetUser.email || "").trim().toLowerCase() : "";

  // Jika belum ditemukan di sheet users, cari di sheet pejabat
  if (!targetUser) {
    const matchingPejabat = pejabatList.find(p => String(p.email || "").trim().toLowerCase() === idClean);
    if (matchingPejabat) {
      targetUser = users.find(u => String(u.pejabat_id || "").trim() === String(matchingPejabat.id_pejabat).trim());
      targetEmail = String(matchingPejabat.email || "").trim().toLowerCase();
    }
  } else if (!targetEmail && targetUser.pejabat_id) {
    const pObj = pejabatList.find(p => String(p.id_pejabat).trim() === String(targetUser.pejabat_id).trim());
    if (pObj && pObj.email) targetEmail = String(pObj.email).trim().toLowerCase();
  }

  if (!targetUser) {
    return {
      success: false,
      message: "Akun dengan Username atau Email tersebut tidak ditemukan di sistem."
    };
  }

  // Generate kode OTP 6-digit acak
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const cacheKey = "OTP_PWD_" + String(targetUser.username).trim().toLowerCase();

  // Simpan OTP di CacheService selama 15 menit (900 detik)
  const cache = CacheService.getScriptCache();
  cache.put(cacheKey, otpCode, 900);

  if (targetEmail) {
    try {
      const subject = "[e-TTE BAN PDM NTT] Kode Verifikasi Reset Password: " + otpCode;
      const bodyHtml =
        '<div style="font-family:Arial,sans-serif;max-width:540px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;">' +
        '<h2 style="color:#0284c7;margin-top:0;">Permintaan Reset Password</h2>' +
        '<p>Yth. <b>' + (targetUser.nama || 'Pengguna') + '</b>,</p>' +
        '<p>Kami menerima permintaan untuk mengatur ulang kata sandi akun e-TTE Anda (Username: <b>' + targetUser.username + '</b>).</p>' +
        '<div style="background:#f0f9ff;border:1px solid #bae6fd;padding:20px;border-radius:10px;margin:18px 0;text-align:center;">' +
        '<p style="margin:0 0 8px;color:#0369a1;font-size:0.9rem;font-weight:600;">Kode OTP Verifikasi Anda:</p>' +
        '<div style="font-size:2.2rem;font-weight:900;letter-spacing:8px;color:#0284c7;">' + otpCode + '</div>' +
        '<p style="margin:10px 0 0;font-size:0.8rem;color:#64748b;">(Berlaku 15 menit. JANGAN berikan kode ini kepada siapa pun)</p>' +
        '</div>' +
        '<p>Masukkan kode di atas pada formulir reset password untuk memperbarui kata sandi Anda.</p>' +
        '<hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">' +
        '<small style="color:#64748b;">Jika Anda tidak merasa meminta reset password, abaikan email ini. Akun Anda tetap aman terlindungi.</small>' +
        '</div>';

      sendEmailSafe(targetEmail, subject, bodyHtml);

      return {
        success: true,
        otpSent: true,
        username: targetUser.username,
        maskedEmail: maskEmail(targetEmail),
        message: "Kode OTP 6-digit telah dikirimkan ke kotak masuk Gmail Anda (" + maskEmail(targetEmail) + "). Berlaku selama 15 menit."
      };
    } catch (mailErr) {
      Logger.log("processLupaPassword MailApp warning: " + mailErr.message);
      return {
        success: true,
        otpSent: false,
        needAdmin: true,
        username: targetUser.username,
        message: "Pengiriman email otomatis terhambat (" + mailErr.message + "). Silakan hubungi Administrator via WhatsApp untuk bantuan reset kata sandi."
      };
    }
  } else {
    return {
      success: true,
      otpSent: false,
      needAdmin: true,
      username: targetUser.username,
      message: "Akun Anda belum memiliki alamat email terdaftar untuk menerima OTP. Silakan hubungi Administrator via WhatsApp untuk reset kata sandi."
    };
  }
}

/**
 * Memverifikasi kode OTP dan mereset kata sandi baru
 */
function processResetPasswordWithOtp(username, otpCode, newPassword) {
  if (!username || !otpCode || !newPassword) {
    return { success: false, message: "Username, Kode OTP, dan Password baru wajib diisi." };
  }

  if (String(newPassword).length < 5) {
    return { success: false, message: "Password baru minimal 5 karakter demi keamanan akun." };
  }

  const cleanUser = String(username).trim();
  const cacheKey = "OTP_PWD_" + cleanUser.toLowerCase();
  const cache = CacheService.getScriptCache();
  const cachedOtp = cache.get(cacheKey);

  if (!cachedOtp || String(cachedOtp).trim() !== String(otpCode).trim()) {
    return {
      success: false,
      message: "Kode OTP salah atau telah kadaluwarsa (lebih dari 15 menit). Silakan minta kode baru."
    };
  }

  const updated = updateRowByField(CONFIG.SHEET_USERS, "username", cleanUser, {
    password: String(newPassword).trim()
  });

  if (updated) {
    cache.remove(cacheKey);
    return {
      success: true,
      message: "Password berhasil diperbarui! Silakan masuk dengan kata sandi baru Anda."
    };
  } else {
    return {
      success: false,
      message: "Gagal memperbarui kata sandi di database. Pastikan akun terdaftar."
    };
  }
}
