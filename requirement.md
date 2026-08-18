# Requirement Document - Asya Berkah App

## 1. Overview
Aplikasi manajemen penimbangan ayam broiler berbasis mobile (Android/iOS) menggunakan Expo dan Firebase.

## 2. Fitur Utama
- **Autentikasi**: Login/Register (Email/Password).
- **Role**: Admin dan User biasa.
- **Input Data**: Mencatat sesi penimbangan (Pembeli, Supir, Harga, Berat, dll).
- **Edit Data**: Admin dapat mengedit sesi penimbangan yang sudah tersimpan.
- **Status Pembayaran**: Sistem menghitung status pembayaran secara otomatis (Lunas, Sebagian, Belum Lunas) berdasarkan jumlah bayar.
- **Pencarian Canggih**: Pencarian multi-kata dengan filter tanggal, nama bulan, operator jumlah (>/<), dan operator berat.
- **Offline Mode**:
  - Menyimpan data transaksi secara lokal ketika tidak ada koneksi internet.
  - Sinkronisasi manual data offline ke Firebase saat koneksi kembali.
  - Mendukung sinkronisasi data baru maupun perubahan data existing.
- **Bluetooth Printer**: Mencetak struk via printer thermal bluetooth.
- **Bagikan Struk**: Export struk ke PDF dan bagikan melalui aplikasi lain.
- **Admin Panel**:
  - Melihat semua riwayat dengan filter tanggal, pembeli, sopir, dan status pembayaran.
  - Edit/Hapus data per item maupun batch delete.
  - Export hasil filter ke Excel.
  - Pengaturan nama farm dan alamat farm.

## 3. Tech Stack
- **Framework**: React Native (Expo SDK 54).
- **Backend**: Firebase (Auth, Firestore).
- **Local Storage**: AsyncStorage (untuk offline persistence dan auth persistence).
- **Printer**: ESC/POS Bluetooth.
- **Export**: Excel (.xlsx) dan PDF.

## 4. Keamanan & Aturan Data
- **Firestore Rules**: Hanya admin yang dapat mengedit atau menghapus data timbangan. User biasa hanya dapat input dan membaca data.
- **Role Protection**: Perubahan role hanya dapat dilakukan oleh admin.

## 5. Catatan Teknis & Pelajaran Penting (Update Juni 2026)
- **Persistensi Auth**: Inisialisasi Firebase Auth harus menggunakan adapter AsyncStorage (`getReactNativePersistence`) agar sesi login tersimpan dengan aman saat aplikasi ditutup.
- **Input Sanitasi**: Input email dan password harus selalu di-`.trim()` sebelum autentikasi guna mencegah kegagalan login karena spasi kosong tidak disengaja.
- **EAS Build Env**: Environment variables Firebase harus disertakan di `eas.json` untuk semua profil build agar kompatibel dengan EAS build jarak jauh.
- **Konfigurasi Project Firebase**: Pada branch `master` aplikasi menggunakan project Firebase `quizzizclone`. Pada branch `asyaberkah` aplikasi menggunakan project Firebase `crmappbuilder`. Konfigurasi ini tercantum di `.env` untuk development lokal dan di `eas.json` untuk build EAS.
- **Template Environment**: Gunakan `.env.example` sebagai template untuk membuat file `.env` lokal. File `.env` asli tidak masuk ke version control.
