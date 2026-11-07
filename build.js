/**
 * ====================================================================
 * e-TTE Signature Portal - Automated Build Script for Vercel
 * ====================================================================
 * Menggabungkan seluruh komponen modular HTML, CSS, dan JS menjadi
 * berkas statis tunggal siap saji di folder 'dist/index.html'.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = __dirname;
const DIST_DIR = path.join(ROOT_DIR, 'dist');

console.log('[ZettBOT Build] Memulai proses bundling frontend untuk Vercel...');

if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
}

// 1. Baca Index.html utama
let indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'Index.html'), 'utf8');

// 2. Daftar komponen yang di-include oleh Apps Script
const includes = [
    { key: "Styles", file: "Styles.html" },
    { key: "AuthView", file: "AuthView.html" },
    { key: "DashboardView", file: "DashboardView.html" },
    { key: "SuratView", file: "SuratView.html" },
    { key: "DaftarSuratView", file: "DaftarSuratView.html" },
    { key: "SuratMasukView", file: "SuratMasukView.html" },
    { key: "UserManagementView", file: "UserManagementView.html" },
    { key: "VerifyView", file: "VerifyView.html" },
    { key: "SignView", file: "SignView.html" },
    { key: "Scripts", file: "Scripts.html" }
];

// 3. Sisipkan config.js di awal tag <head>
const configScriptTag = '<script src="config.js"></script>\n';
indexHtml = indexHtml.replace('</head>', `${configScriptTag}</head>`);

// 4. Lakukan inline penggantian untuk setiap include
includes.forEach(item => {
    const filePath = path.join(ROOT_DIR, item.file);
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        // Regex untuk mencocokkan <?!= include('ItemKey'); ?>
        const pattern = new RegExp(`<\\?!=\\s*include\\(['"]${item.key}['"]\\);?\\s*\\?>`, 'g');
        indexHtml = indexHtml.replace(pattern, content);
        console.log(`  ✓ Berhasil menyertakan: ${item.file}`);
    } else {
        console.warn(`  ⚠ Berkas ${item.file} tidak ditemukan, dilewati.`);
    }
});

// 5. Gantikan ekspresi template Google Apps Script dengan nilai standar W3C
indexHtml = indexHtml.replace(/<\?=\s*appName\s*\?>/g, "e-TTE Signature Portal");
indexHtml = indexHtml.replace(/<\?=\s*institutionName\s*\?>/g, "BADAN AKREDITASI NASIONAL PDM PROVINSI NTT");
indexHtml = indexHtml.replace(/<\?!=\s*JSON\.stringify\(queryParams\)\s*\?>/g, "{}");

// 6. Tulis hasil akhir ke dist/index.html
fs.writeFileSync(path.join(DIST_DIR, 'index.html'), indexHtml, 'utf8');
console.log('✓ dist/index.html berhasil dibuat.');

// 7. Salin config.js ke dist/config.js
if (fs.existsSync(path.join(ROOT_DIR, 'config.js'))) {
    fs.copyFileSync(path.join(ROOT_DIR, 'config.js'), path.join(DIST_DIR, 'config.js'));
    console.log('✓ dist/config.js berhasil disalin.');
}

console.log('[ZettBOT Build] Selesai 100%! Aplikasi siap dideploy ke Vercel.');

