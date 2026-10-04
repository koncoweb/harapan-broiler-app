# Requirement Document - Harapan Broiler App

## 1. Overview
Aplikasi manajemen penimbangan ayam broiler berbasis mobile (Android/iOS) menggunakan Expo dan Turso (libSQL).

## 2. Fitur Utama
- **Autentikasi**: Login/Register (Email/Password).
- **Role**: Admin dan User biasa.
- **Input Data**: Mencatat sesi penimbangan (Pembeli, Supir, Harga, Berat, dll).
- **Edit Data**: Admin dapat mengedit sesi penimbangan yang sudah tersimpan.
- **Status Pembayaran**: Sistem menghitung status pembayaran secara otomatis (Lunas, Sebagian, Belum Lunas) berdasarkan jumlah bayar.
- **Pencarian Canggih**: Pencarian multi-kata dengan filter tanggal, nama bulan, operator jumlah (>/<), dan operator berat.
- **Offline Mode** (strategi A > B > C agar data tidak hilang):
  - (A) Cache baca terakhir + penggabungan antrean offline ke daftar; fallback ke cache saat server error.
  - (B) Fallback tulis: kegagalan tulis ke Turso otomatis dimasukkan ke antrean offline.
  - (C) Auto-sync saat koneksi kembali dan saat app kembali ke foreground; sinkronisasi manual juga tersedia.
  - Mendukung sinkronisasi data baru (`offline_` → INSERT) maupun perubahan data existing (UPDATE).
- **Bluetooth Printer**: Mencetak struk via printer thermal bluetooth.
- **Bagikan Struk**: Export struk ke PDF dan bagikan melalui aplikasi lain.
- **Admin Panel**:
  - Melihat semua riwayat dengan filter tanggal, pembeli, sopir, dan status pembayaran.
  - Edit/Hapus data per item maupun batch delete.
  - Export hasil filter ke Excel.
  - Pengaturan nama farm dan alamat farm.

## 3. Tech Stack
- **Framework**: React Native (Expo SDK 54).
- **Database**: Turso / libSQL via API HTTP `/v2/pipeline` (token tertanam di klien Expo, tanpa backend/proxy).
- **Autentikasi**: hash password SHA-256 + salt memakai `expo-crypto` (bukan Firebase Auth).
- **Local Storage**: AsyncStorage (untuk antrean offline, cache daftar, dan persistensi sesi login).
- **Printer**: ESC/POS Bluetooth.
- **Export**: Excel (.xlsx) dan PDF.

## 4. Keamanan & Aturan Data
- **Model ledger bersama**: seluruh pengguna berbagi satu database Turso; kontrol role (admin/user) ditegakkan di level aplikasi, bukan di server. Token Turso tertanam di klien sehingga berisiko terekstrak — trade-off yang disengaja karena tidak ada backend.
- **Password**: disimpan sebagai `${salt}$${sha256(salt + ":" + password)}`; default `<email-lokal>123` dengan perubahan wajib saat login pertama.
- **Role Protection**: perubahan role dan reset password hanya dapat dilakukan oleh admin.

## 5. Catatan Teknis & Pelajaran Penting (Update Oktober 2026)
- **Persistensi Auth**: sesi login disimpan via AsyncStorage; `last_login` NULL memaksa perubahan password pada login pertama.
- **Input Sanitasi**: input email dan password harus selalu di-`.trim()` sebelum autentikasi guna mencegah kegagalan login karena spasi kosong tidak disengaja.
- **EAS Build Env**: `.env` di-gitignore sehingga tidak ikut ter-upload ke worker EAS. Kredensial Turso (`EXPO_PUBLIC_TURSO_URL`, `EXPO_PUBLIC_TURSO_AUTH_TOKEN`) harus disuntikkan lewat `env` di `eas.json` pada tiap profil build, jika tidak APK tidak dapat mengakses data.
- **Aset Ikon**: `app.json` memetakan ikon ke `android-chrome-512x512.png` (source), `apple-touch-icon.png` (iOS), dan `favicon-32x32.png` (web); ukuran lain digenerate otomatis oleh Expo.
- **Template Environment**: Gunakan `.env.example` sebagai template untuk membuat file `.env` lokal. File `.env` asli tidak masuk ke version control.
