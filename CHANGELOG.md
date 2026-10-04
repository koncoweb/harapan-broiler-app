# Changelog - Harapan Broiler App

Semua perubahan penting pada proyek ini akan dicatat di file ini.

Format mengacu pada [Keep a Changelog](https://keepachangelog.com/id-ID/1.0.0/).

## [Unreleased]

### Deployed
- Deploy web ke EAS Hosting: https://harapan-broiler--6zve7gm3b4.expo.app
- Build APK preview v1.0.3: https://expo.dev/artifacts/eas/9YAgo61LvKcFBNo_OoFRRRuslZfRC7cc-0IUuxVCnc4.apk

### Changed (riwayat refactor, pra-migrasi Turso)
- Memperbarui `requirement.md` agar mencakup fitur terbaru: edit data, status pembayaran, pencarian canggih, batch delete, dan export Excel.
- Refactor Fase 2: State Management & Eliminasi Duplikasi Kode
  - Menambahkan `src/utils/format.ts` untuk fungsi format angka, berat, mata uang, dan tanggal.
  - Menambahkan custom hooks: `useUserRole`, `useFarmSettings`, `useWeighingSessions`.
  - Mengganti duplikasi fetch data dan format di `HomeScreen`, `AdminScreen`, `CreateNotaScreen`, `SyncScreen`, `printerService`, dan `bluetoothPrinterService`.
- Fase 3: Validasi Data & Error Handling
  - Menambahkan `src/utils/validation.ts` untuk validasi form reusable.
  - Menambahkan `src/utils/firebaseErrors.ts` untuk mapping error Firebase ke pesan Indonesia yang mudah dipahami.
  - Menerapkan validasi di `RegisterScreen` (email, password, nama).
  - Menerapkan validasi di `CreateNotaScreen` (pembeli, harga, tanggal, minimal 1 timbangan, potongan CN).
  - Menerapkan pesan error yang lebih baik di `LoginScreen`, `RegisterScreen`, dan `CreateNotaScreen`.
- Fase 4: Perbaikan Offline Storage & Sinkronisasi
  - Menambahkan metadata sync pada data offline: `syncStatus`, `syncAttempts`, `lastSyncError`.
  - Menambahkan retry mechanism dengan batas maksimal 3 percobaan per data.
  - Menampilkan status sinkronisasi per item di `SyncScreen` (menunggu, sedang sync, gagal).
  - Menambahkan tombol retry dan hapus untuk data yang gagal disinkronkan.
  - Data yang gagal sync tetap tersimpan di perangkat sampai berhasil atau dihapus user.
- Fase 5: Perbaikan UX/UI & Performa
  - Memperbaiki time picker di `CreateNotaScreen` agar mempertahankan state waktu yang sedang diedit.
  - Mengubah label tombol simpan di `CreateNotaScreen` dari "SIMPAN" menjadi "SIMPAN & CETAK" agar lebih jelas.
- Fase 6: Perbaikan Printer Bluetooth & Dokumentasi
  - Menambahkan tracking alamat printer yang sedang terhubung.
  - Memperbaiki `isBluetoothPrinterConnected` agar benar-benar memeriksa koneksi ke printer yang tersimpan.
  - Memperbaiki `disconnectBluetoothPrinter` agar memutuskan koneksi ke printer yang benar-benar terhubung.
  - Menambahkan pesan fallback eksplisit untuk iOS/web saat fitur Bluetooth thermal tidak didukung.

## [1.0.3] - 2026-10-01

### Changed
- **Migrasi database Firebase → Turso/libSQL.** Seluruh baca/tulis data kini lewat
  Turso (`/v2/pipeline` HTTP API) dengan token tertanam di klien Expo. Lihat
  `src/config/turso.ts`.
- **Autentikasi mandiri** memakai `expo-crypto` (hash SHA-256 + salt), bukan lagi
  Firebase Auth. Password default `<email-lokal>123` dengan perubahan wajib saat
  login pertama. Reset: `node scripts/reset-user-password.js <email> <password>`.
- **Warna brand hijau → Emerald Segar** (primary `#15803D`, palette `#14532D`→`#22C55E`),
  disentralisasi di `src/theme/colors.ts`; seluruh hex hijau lama diganti token.
- **Modernisasi UI "Soft Minimal Premium"** di semua layar: radius besar, bayangan
  lembut, kartu tanpa border, aksi ikon berupa pill, header gradien 3-stop, dan
  tipografi terpusat (`src/theme/typography.ts`).
- **Ikon app** dipetakan ke aset baru di `app.json` (`android-chrome-512x512.png`,
  `apple-touch-icon.png`, `favicon-32x32.png`).
- Nomor versi disinkronkan ke **1.0.3** di `package.json`, `app.json`, dan
  `package-lock.json`; label versi di Home & Login → "v1.0.3 • Oktober 2026".

### Added
- **Strategi offline lengkap (A > B > C)** agar data tidak hilang:
  - (A) Cache baca terakhir (`src/services/sessionCache.ts`) + penggabungan antrean
    offline ke daftar Home dengan badge "Belum sync" dan fallback saat Turso error.
  - (B) Fallback tulis: kegagalan tulis ke Turso otomatis dimasukkan ke antrean offline.
  - (C) Auto-sync (`src/hooks/useAutoSync.ts` + `src/services/syncService.ts`) saat
    reconnect dan saat app kembali ke foreground.
- Kredensial Turso (`EXPO_PUBLIC_TURSO_URL`, `EXPO_PUBLIC_TURSO_AUTH_TOKEN`) disuntikkan
  ke profil `preview` di `eas.json` karena `.env` di-gitignore dan tidak ikut ter-upload.

### Security
- Menambahkan `.env.example` sebagai template konfigurasi (Tanpa nilai sensitif).

## [1.0.0] - 2026-06-29

### Added
- Fitur autentikasi email/password dengan role admin dan user.
- Input sesi penimbangan ayam dengan perhitungan harga, berat, total, dan status pembayaran otomatis.
- Mode offline dengan penyimpanan lokal AsyncStorage dan sinkronisasi manual.
- Halaman admin untuk rekap, filter, edit, hapus, dan export Excel.
- Dukungan pencetakan struk via printer thermal Bluetooth ESC/POS.
- Dukungan berbagi struk dalam format PDF.
- Pengaturan nama farm dan alamat farm.
