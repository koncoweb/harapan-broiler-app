# Setup EAS Development Build untuk Bluetooth Thermal Printer

## 📋 Prerequisite

1. **Akun Expo** (gratis): https://expo.dev/signup
2. **Android Device** untuk testing
3. **Printer Rongta RPP210** sudah paired via Bluetooth
4. **Disk space** minimal 2GB untuk dependencies

---

## 🚀 Langkah Setup

### Step 1: Install EAS CLI Global

```bash
npm install -g eas-cli
```

### Step 2: Login ke Expo

```bash
eas login
```

Masukkan email dan password akun Expo Anda.

### Step 3: Clean npm Cache (Jika ada error ENOSPC)

```bash
npm cache clean --force
```

### Step 4: Install Dependencies

```bash
cd d:\koncoweb\projek\harapan=farm-webview\harapan-broiler

# Install semua dependencies
npm install --legacy-peer-deps
```

**Dependencies yang ditambahkan:**
- `expo-dev-client` - Development client untuk custom native modules
- `expo-build-properties` - Configure native build properties
- `react-native-bluetooth-escpos-printer` - Bluetooth thermal printer support

### Step 5: Configure EAS Project

```bash
eas build:configure
```

Pilih:
- Platform: **Android**
- Create new project atau link existing? → **Link to existing**
- Project ID sudah otomatis (dari app.json)

### Step 6: Build Development APK

```bash
eas build --profile development --platform android
```

Proses ini akan:
1. Upload code ke Expo server
2. Compile APK di cloud (~10-15 menit)
3. Generate download link

**Output:**
```
✔ Build finished
🚀 Download APK: https://expo.dev/accounts/koncoweb/projects/harapan-broiler/builds/...
```

### Step 7: Install APK ke Android Device

1. Download APK dari link yang diberikan
2. Transfer ke Android device
3. Install APK (enable "Install from Unknown Sources" jika perlu)
4. Buka app **Expo Go Dev Client**

### Step 8: Start Development Server

```bash
npm start
```

Atau untuk langsung connect ke Android:

```bash
npm run android
```

---

## 📱 Testing Bluetooth Printer

### Persiapan:

1. **Pair printer** Rongta RPP210 dengan Android device:
   - Settings → Bluetooth → Scan devices
   - Pilih "RPP-210" atau "Rongta"
   - Masukkan PIN (default: 0000 atau 1234)

2. **Test connection** via app:
   - Buka app Asya Berkah
   - Login
   - Buat nota penimbangan test
   - Klik "SIMPAN & CETAK"

### Expected Result:

✅ **Jika Bluetooth printer connected:**
- Receipt print langsung ke thermal printer Rongta
- Format 58mm dengan ESC/POS commands
- Alert "Receipt printed successfully!"

✅ **Jika Bluetooth printer NOT connected:**
- Fallback ke system print dialog
- Pilih printer WiFi/AirPrint jika ada

---

## 🔧 Troubleshooting

### Error: "ENOSPC: no space left on device"

**Solusi:**
```bash
npm cache clean --force
rd /s node_modules
npm install --legacy-peer-deps
```

### Error: "Bluetooth permission denied"

**Solusi:**
- Buka Settings → Apps → Asya Berkah → Permissions
- Enable Bluetooth, Location, Nearby Devices

### Error: "Unable to connect to printer"

**Solusi:**
1. Re-pair printer di Bluetooth settings
2. Restart app
3. Test print lagi

### Printer tidak terdeteksi

**Solusi:**
1. Pastikan printer ON dan charged
2. Check Bluetooth paired devices
3. Try unpair → pair again
4. Restart Bluetooth on Android

---

## 📝 How to Use dalam App

### Automatic Mode (Recommended):

```typescript
import { printReceiptAuto } from './services/printerService';

// Auto detect terbaik printer (Bluetooth atau System)
await printReceiptAuto(session, settings);
```

### Manual Bluetooth Print:

```typescript
import { 
  scanBluetoothDevices,
  connectToBluetoothPrinter,
  printBluetoothReceipt 
} from './services/bluetoothPrinterService';

// 1. Scan devices
const devices = await scanBluetoothDevices();

// 2. Connect
await connectToBluetoothPrinter(devices[0].address);

// 3. Print
await printBluetoothReceipt(session, settings);
```

---

## 🎯 Next Steps

1. ✅ **Test print** dengan data real
2. ⏳ **Add UI** untuk scan & connect printer di settings
3. ⏳ **Save** last connected printer di AsyncStorage
4. ⏳ **Auto-reconnect** on app start

---

## 📄 Files Changed

- ✅ `package.json` - Added dependencies
- ✅ `app.json` - Added Bluetooth permissions & plugins
- ✅ `src/services/bluetoothPrinterService.ts` - NEW: Bluetooth printer service
- ✅ `src/services/printerService.ts` - Updated: Auto-detect function
- ⏳ `src/screens/CreateNotaScreen.tsx` - TODO: Use printReceiptAuto
- ⏳ `src/screens/HomeScreen.tsx` - TODO: Use printReceiptAuto

---

## ⚠️ Important Notes

1. **iOS tidak support** Bluetooth thermal printer kecuali printer MFi certified
2. **Web platform** tetap pakai HTML printing (window.print)
3. **Production build** akan lebih kecil dari development build
4. **OTA updates** masih bisa digunakan untuk JavaScript changes

---

## 🚢 Production Build (Nanti)

Setelah testing selesai, build production APK:

```bash
eas build --profile production-apk --platform android
```

Upload ke Google Play Store atau distribute via APK file.
