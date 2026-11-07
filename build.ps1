# ====================================================================
# e-TTE Signature Portal - Local PowerShell Bundler for Vercel/Web
# ====================================================================
$rootDir = $PSScriptRoot
if (-not $rootDir) { $rootDir = Get-Location }

$distDir = Join-Path $rootDir "dist"
if (-not (Test-Path $distDir)) {
    New-Item -ItemType Directory -Path $distDir -Force | Out-Null
}

Write-Host "[ZettBOT Build PS] Memulai bundling frontend mandiri..."

$indexFile = Join-Path $rootDir "Index.html"
$indexHtml = Get-Content $indexFile -Raw -Encoding UTF8

$includes = @(
    @{ Key = "Styles"; File = "Styles.html" },
    @{ Key = "AuthView"; File = "AuthView.html" },
    @{ Key = "DashboardView"; File = "DashboardView.html" },
    @{ Key = "SuratView"; File = "SuratView.html" },
    @{ Key = "DaftarSuratView"; File = "DaftarSuratView.html" },
    @{ Key = "SuratMasukView"; File = "SuratMasukView.html" },
    @{ Key = "UserManagementView"; File = "UserManagementView.html" },
    @{ Key = "VerifyView"; File = "VerifyView.html" },
    @{ Key = "SignView"; File = "SignView.html" },
    @{ Key = "Scripts"; File = "Scripts.html" }
)

# Sisipkan config.js di awal tag </head>
$configScriptTag = "<script src=`"config.js`"></script>`n</head>"
$indexHtml = $indexHtml -replace "</head>", $configScriptTag

foreach ($item in $includes) {
    $filePath = Join-Path $rootDir $item.File
    if (Test-Path $filePath) {
        $content = Get-Content $filePath -Raw -Encoding UTF8
        $pattern = "(?i)<\?!=\s*include\(['`"]" + [regex]::Escape($item.Key) + "['`"]\);?\s*\?>"
        $indexHtml = [regex]::Replace($indexHtml, $pattern, { $content })
        Write-Host "  + Berhasil menyertakan: $($item.File)"
    } else {
        Write-Host "  ! File tidak ditemukan: $($item.File)" -ForegroundColor Yellow
    }
}

# Gantikan ekspresi template Google Apps Script dengan nilai standar W3C
$indexHtml = $indexHtml -replace "(?i)<\?=\s*appName\s*\?>", "e-TTE Signature Portal"
$indexHtml = $indexHtml -replace "(?i)<\?=\s*institutionName\s*\?>", "BADAN AKREDITASI NASIONAL PDM PROVINSI NTT"
$indexHtml = $indexHtml -replace "(?i)<\?!=\s*JSON\.stringify\(queryParams\)\s*\?>", "{}"

$targetDistFile = Join-Path $distDir "index.html"
[System.IO.File]::WriteAllText($targetDistFile, $indexHtml, [System.Text.Encoding]::UTF8)
Write-Host "  -> dist/index.html berhasil dibuat." -ForegroundColor Green

# Salin config.js ke dist
$configFile = Join-Path $rootDir "config.js"
if (Test-Path $configFile) {
    Copy-Item $configFile (Join-Path $distDir "config.js") -Force
    Write-Host "  -> dist/config.js berhasil disalin." -ForegroundColor Green
}

Write-Host "[ZettBOT Build PS] Selesai 100%! Berkas di folder 'dist' siap dijalankan atau dideploy." -ForegroundColor Green

