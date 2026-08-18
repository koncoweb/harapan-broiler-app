# Changelog - Asya Berkah App

Semua perubahan penting pada proyek ini akan dicatat di file ini.

Format mengacu pada [Keep a Changelog](https://keepachangelog.com/id-ID/1.0.0/).

## [Unreleased]

### Security
- Menambahkan `.env.example` sebagai template konfigurasi Firebase tanpa nilai sensitif.
- Memperbarui Firestore Rules untuk mengizinkan pembuatan akun dengan role `admin` dan `user`.

### Deployed
- Deploy web ke EAS Hosting project lama: https://harapan-broiler--9xon8vavio.expo.app
- Deploy web ke EAS Hosting project Asyaberkah (preview): https://asyaberkah--f48jyras5d.expo.app
- Deploy web ke EAS Hosting project Asyaberkah (production): https://asyaberkah.expo.app
- Build APK preview: https://expo.dev/artifacts/eas/AC3JLSfzzqvC4vLJSlEBeV0cegpQ_4dABOb78huLmdY.apk

### Changed
- Branch `asyaberkah`: Mengganti konfigurasi Firebase dari project `quizzizclone` ke project `crmappbuilder` di `.env` dan `eas.json`.
- Branch `asyaberkah`: Mengganti seluruh icon aplikasi dengan logo Asya Berkah.
- Branch `asyaberkah`: Mengganti nama aplikasi menjadi "Asya Berkah", package Android menjadi `com.koncoweb.asyaberkah`, dan default farm name menjadi "Asya Berkah".
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

## [1.0.0] - 2026-06-29

### Added
- Fitur autentikasi email/password dengan role admin dan user.
- Input sesi penimbangan ayam dengan perhitungan harga, berat, total, dan status pembayaran otomatis.
- Mode offline dengan penyimpanan lokal AsyncStorage dan sinkronisasi manual.
- Halaman admin untuk rekap, filter, edit, hapus, dan export Excel.
- Dukungan pencetakan struk via printer thermal Bluetooth ESC/POS.
- Dukungan berbagi struk dalam format PDF.
- Pengaturan nama farm dan alamat farm.
