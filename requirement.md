# Requirement Document - Harapan Broiler App

## 1. Overview
Aplikasi manajemen penimbangan ayam broiler berbasis mobile (Android/iOS) menggunakan Expo dan Firebase.

## 2. Fitur Utama
- **Autentikasi**: Login/Register (Email/Password).
- **Role**: Admin dan User biasa.
- **Input Data**: Mencatat sesi penimbangan (Pembeli, Supir, Harga, Berat, dll).
- **Offline Mode**: 
  - Menyimpan data transaksi secara lokal ketika tidak ada koneksi internet.
  - Sinkronisasi manual data offline ke Firebase saat koneksi kembali.
- **Bluetooth Printer**: Mencetak struk via printer thermal bluetooth.
- **Admin Panel**: 
  - Melihat semua riwayat.
  - Edit/Hapus data.
  - Export ke Excel.
  - Pengaturan nama farm.

## 3. Tech Stack
- **Framework**: React Native (Expo SDK 54).
- **Backend**: Firebase (Auth, Firestore).
- **Local Storage**: AsyncStorage (untuk offline persistence).
- **Printer**: ESC/POS Bluetooth.
