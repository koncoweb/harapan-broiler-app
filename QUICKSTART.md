# Quick Start: Build & Test Bluetooth Printer

## 🚀 Build Development APK

Jalankan command berikut untuk build development APK:

```bash
# Login ke EAS (first time only)
eas login

# Build development APK
eas build --profile development --platform android
```

**Proses:**
1. Code diupload ke Expo server ☁️
2. Compile APK di cloud (~10-15 menit)
3. Download link akan muncul

**Output:**
```
✔ Build finished
🎉 Build artifact: https://expo.dev/accounts/koncoweb/...
```

---

## 📲 Install & Test

### 1. Download APK
- Klik link download dari hasil build
- Transfer APK ke Android device (via email/WhatsApp/USB)

### 2. Install APK
- Buka APK di Android
- Enable "Install from Unknown Sources" jika diminta
- Tap Install

### 3. Pair Printer
- Settings → Bluetooth → Pair new device
- Pilih "RPP-210" atau "Rongta"  
- PIN: `0000` atau `1234`

### 4. Test Print
- Buka app Harapan Broiler
- Login dengan akun Anda
- Navigasi ke CreateNota
- Isi form penimbangan:
  - Tanggal: Hari ini
  - Pembeli: Test Corp
  - Supir: Budi
  - Tambah beberapa item timbangan
  - Isi harga dasar
- Tap "SIMPAN & CETAK"

**✅ Expected Result:**
- Alert "Receipt printed successfully!"
- Receipt keluar dari Rongta thermal printer
- Format 58mm dengan 2-column layout

---

## 🔍 Troubleshooting

### Build Error: "Not logged in"
```bash
eas login
# Masukkan email & password Expo
```

### Build Error: "Project not configured"
```bash
eas build:configure
# Pilih Android
```

### Print Error: "Bluetooth permission denied"
- Settings → Apps → Harapan Broiler → Permissions
- Enable: Bluetooth, Location, Nearby Devices

### Print Error: "Unable to connect to printer"
1. Check printer ON dan charged
2. Settings → Bluetooth → Forget device
3. Pair ulang
4. Restart app

---

## 📝 Next Features (Opsional)

Setelah testing berhasil, Anda bisa tambahkan:

1. **Printer Settings UI** - Menu untuk scan & pilih printer
2. **Auto-reconnect** - Simpan last printer di AsyncStorage
3. **Printer status indicator** - Tampilkan connected/disconnected
4. **Print preview** - Preview sebelum print

---

## ✨ Production Build (Nanti)

Setelah semua testing OK:

```bash
eas build --profile production-apk --platform android
```

Upload hasil APK ke Google Play Store atau distribute langsung.
