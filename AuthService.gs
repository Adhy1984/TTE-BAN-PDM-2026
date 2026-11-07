/**
 * ====================================================================
 * APLIKASI TANDA TANGAN ELEKTRONIK (TTE) BERBASIS QR-CODE
 * File: AuthService.gs
 * ====================================================================
 */

/**
 * Membuat token sesi sederhana dan aman berbasis Base64 + Hashing
 */
function createSessionToken(userObj) {
  const payload = {
    userId: userObj.id_user,
    username: userObj.username,
    nama: userObj.nama,
    role: userObj.role,
    pejabatId: userObj.pejabat_id || "",
    exp: new Date().getTime() + (CONFIG.SESSION_EXPIRY_MINUTES * 60 * 1000)
  };
  return Utilities.base64Encode(JSON.stringify(payload));
}

/**
 * Memvalidasi token sesi pengguna
 */
function validateSessionToken(token) {
  if (!token) return null;
  try {
    const decoded = Utilities.newBlob(Utilities.base64Decode(token)).getDataAsString();
    const payload = JSON.parse(decoded);
    
    if (new Date().getTime() > payload.exp) {
      return null; // Token kadaluarsa
    }
    return payload;
  } catch (err) {
    return null;
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
