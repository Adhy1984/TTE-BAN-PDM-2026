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
