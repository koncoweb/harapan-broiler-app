// src/services/bluetoothPrinterService.ts
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import { WeighingSession, FarmSettings } from '../types';
import { formatCurrency, formatWeight, formatDateId } from '../utils/format';

// Conditional import untuk menghindari error di web
let BluetoothManager: any = null;
let BluetoothEscposPrinter: any = null;

// Only import Bluetooth modules on Android
if (Platform.OS === 'android') {
  try {
    const bluetoothModule = require('@vardrz/react-native-bluetooth-escpos-printer');
    BluetoothManager = bluetoothModule.BluetoothManager;
    BluetoothEscposPrinter = bluetoothModule.BluetoothEscposPrinter;
  } catch (error) {
    console.warn('Bluetooth printer module not available:', error);
  }
}

// Bluetooth Device Interface
export interface BluetoothDevice {
  name: string;
  address: string;
}

// Keep track of the currently connected printer address
let connectedPrinterAddress: string | null = null;

const showNotSupportedAlert = () => {
  Alert.alert(
    'Tidak Didukung',
    'Printer thermal Bluetooth hanya didukung di perangkat Android. Silakan gunakan opsi cetak sistem atau bagikan struk sebagai PDF.'
  );
};

// Check if Bluetooth is enabled
export const isBluetoothEnabled = async (): Promise<boolean> => {
  if (Platform.OS !== 'android' || !BluetoothManager) {
    return false; // iOS requires MFi printer, skip for now
  }

  try {
    const enabled = await BluetoothManager.isBluetoothEnabled();
    return enabled;
  } catch (error) {
    console.error('Error checking Bluetooth:', error);
    return false;
  }
};

// Request Bluetooth permissions (Android 12+)
export const requestBluetoothPermissions = async (): Promise<boolean> => {
  if (Platform.OS !== 'android' || !BluetoothManager) {
    return false;
  }

  try {
    const apiLevel = Platform.Version;

    // Android 12+ (API level 31+) requires new Bluetooth permissions
    if (apiLevel >= 31) {
      const granted = await PermissionsAndroid.requestMultiple([
        'android.permission.BLUETOOTH_SCAN' as any,
        'android.permission.BLUETOOTH_CONNECT' as any,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);

      return (
        granted['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
        granted['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
        granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
      );
    } else {
      // Android 11 and below - use string literals for legacy permissions
      const granted: any = await PermissionsAndroid.requestMultiple([
        'android.permission.BLUETOOTH' as any,
        'android.permission.BLUETOOTH_ADMIN' as any,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);

      return (
        granted['android.permission.BLUETOOTH'] === PermissionsAndroid.RESULTS.GRANTED &&
        granted['android.permission.BLUETOOTH_ADMIN'] === PermissionsAndroid.RESULTS.GRANTED &&
        granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
      );
    }
  } catch (error) {
    console.error('Permission request error:', error);
    return false;
  }
};

// Scan for Bluetooth devices
export const scanBluetoothDevices = async (): Promise<BluetoothDevice[]> => {
  if (Platform.OS !== 'android' || !BluetoothManager) {
    showNotSupportedAlert();
    return [];
  }

  try {
    // Check if Bluetooth is enabled
    const enabled = await isBluetoothEnabled();
    if (!enabled) {
      Alert.alert('Bluetooth Disabled', 'Please enable Bluetooth to scan for printers');
      await BluetoothManager.enableBluetooth();
      return [];
    }

    // Request permissions
    const hasPermission = await requestBluetoothPermissions();
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Bluetooth permissions are required to scan for printers');
      return [];
    }

    // Scan for paired and unpaired devices
    const pairedDevices = await BluetoothManager.list();

    return pairedDevices.map((device: any) => ({
      name: device.name || 'Unknown Device',
      address: device.address,
    }));
  } catch (error) {
    console.error('Scan error:', error);
    Alert.alert('Scan Failed', 'Unable to scan for Bluetooth devices');
    return [];
  }
};

// Connect to Bluetooth printer
export const connectToBluetoothPrinter = async (address: string): Promise<boolean> => {
  if (Platform.OS !== 'android' || !BluetoothManager) {
    showNotSupportedAlert();
    return false;
  }

  try {
    await BluetoothManager.connect(address);
    connectedPrinterAddress = address;
    return true;
  } catch (error) {
    console.error('Connection error:', error);
    connectedPrinterAddress = null;
    Alert.alert('Connection Failed', 'Unable to connect to the printer');
    return false;
  }
};

// Disconnect from Bluetooth printer
export const disconnectBluetoothPrinter = async (): Promise<void> => {
  if (Platform.OS !== 'android' || !BluetoothManager) {
    showNotSupportedAlert();
    return;
  }

  if (!connectedPrinterAddress) {
    Alert.alert('Info', 'Tidak ada printer yang sedang terhubung');
    return;
  }

  try {
    await BluetoothManager.unpair(connectedPrinterAddress);
    connectedPrinterAddress = null;
  } catch (error) {
    console.error('Disconnect error:', error);
    Alert.alert('Disconnect Failed', 'Gagal memutuskan koneksi printer');
  }
};

// Check if printer is connected
export const isBluetoothPrinterConnected = async (): Promise<boolean> => {
  if (Platform.OS !== 'android' || !BluetoothManager) {
    return false;
  }

  if (!connectedPrinterAddress) {
    return false;
  }

  try {
    // First check if Bluetooth is enabled
    const enabled = await BluetoothManager.isBluetoothEnabled();
    if (!enabled) {
      connectedPrinterAddress = null;
      return false;
    }

    // Try to verify connection by listing connected/paired devices
    const pairedDevices = await BluetoothManager.list();
    const stillConnected = pairedDevices.some(
      (device: any) => device.address === connectedPrinterAddress
    );

    if (!stillConnected) {
      connectedPrinterAddress = null;
    }

    return stillConnected;
  } catch (error) {
    console.error('Error checking printer connection:', error);
    return false;
  }
};


// Print receipt using ESC/POS commands
export const printBluetoothReceipt = async (
  session: WeighingSession,
  settings?: FarmSettings
): Promise<void> => {
  if (Platform.OS !== 'android' || !BluetoothEscposPrinter) {
    showNotSupportedAlert();
    return;
  }

  try {
    const farmName = settings?.farmName || 'Asya Berkah';
    const farmAddress = settings?.farmAddress || 'Jln Sawang Ujung, Perum Griya Azna Indah No 73';

    const formattedDate = formatDateId(session.date);

    // Initialize printer
    await BluetoothEscposPrinter.printerInit();

    // Header - Center aligned, bold
    await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
    await BluetoothEscposPrinter.printText(`${farmName}\n`, {
      encoding: 'GBK',
      codepage: 0,
      widthtimes: 1,
      heigthtimes: 1,
      fonttype: 1,
    });
    await BluetoothEscposPrinter.printText(`${farmAddress}\n`, {
      encoding: 'GBK',
      codepage: 0,
      widthtimes: 0,
      heigthtimes: 0,
      fonttype: 0,
    });

    // Separator line
    await BluetoothEscposPrinter.printText('--------------------------------\n', {});

    // Transaction info - Left aligned
    await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.LEFT);
    await BluetoothEscposPrinter.printText(`Tanggal: ${formattedDate} ${session.time || ''}\n`, {});
    await BluetoothEscposPrinter.printText(`Pembeli: ${session.buyer}\n`, {});
    await BluetoothEscposPrinter.printText(`Supir  : ${session.driver}\n`, {});

    await BluetoothEscposPrinter.printText('--------------------------------\n', {});

    // Detail Penimbangan Header
    await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
    await BluetoothEscposPrinter.printText('DETAIL PENIMBANGAN\n', {
      widthtimes: 0,
      heigthtimes: 0,
      fonttype: 1,
    });
    await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.LEFT);

    // Print items in 2-column layout
    for (let i = 0; i < session.items.length; i += 2) {
      const leftItem = session.items[i];
      const rightItem = session.items[i + 1];

      const leftText = `${leftItem.index || (i + 1)}. ${formatWeight(leftItem.grossWeight)} Kg`;
      const rightText = rightItem
        ? `${rightItem.index || (i + 2)}. ${formatWeight(rightItem.grossWeight)} Kg`
        : '';

      // Print two columns (approximate 16 chars per column for 58mm)
      const line = leftText.padEnd(16) + rightText;
      await BluetoothEscposPrinter.printText(`${line}\n`, {});
    }

    await BluetoothEscposPrinter.printText('--------------------------------\n', {});

    // Totals
    await BluetoothEscposPrinter.printText(`Tot Berat     : ${formatWeight(session.totalNetWeight)} Kg\n`, {});
    await BluetoothEscposPrinter.printText(`Tot Timbangan : ${session.totalColi}\n`, {});

    await BluetoothEscposPrinter.printText('--------------------------------\n', {});

    // Price calculations
    await BluetoothEscposPrinter.printText(`Harga Dasar : ${formatCurrency(session.basePrice)}\n`, {});
    await BluetoothEscposPrinter.printText(`Potongan CN : ${formatCurrency(session.cnAmount)}\n`, {});
    await BluetoothEscposPrinter.printText(`Harga Bersih: ${formatCurrency(session.finalPrice)}\n`, {
      fonttype: 1,
    });

    await BluetoothEscposPrinter.printText('--------------------------------\n', {});

    // Total Bayar - Bold
    await BluetoothEscposPrinter.printText(`TOTAL TAGIHAN : ${formatCurrency(session.totalAmount)}\n`, {
      widthtimes: 1,
      heigthtimes: 1,
      fonttype: 1,
    });

    // Payment Details
    const amountPaid = session.amountPaid || 0;
    const remaining = session.totalAmount - amountPaid;
    const status = session.paymentStatus || (amountPaid >= session.totalAmount ? 'Lunas' : amountPaid > 0 ? 'Sebagian' : 'Belum Lunas');

    await BluetoothEscposPrinter.printText(`DIBAYAR       : ${formatCurrency(amountPaid)}\n`, {});
    
    if (remaining > 0) {
      await BluetoothEscposPrinter.printText(`SISA TAGIHAN  : ${formatCurrency(remaining)}\n`, {});
    } else {
      await BluetoothEscposPrinter.printText(`KEMBALI       : ${formatCurrency(Math.abs(remaining))}\n`, {});
    }

    await BluetoothEscposPrinter.printText(`STATUS        : ${status.toUpperCase()}\n`, {
      fonttype: 1,
    });

    await BluetoothEscposPrinter.printText('--------------------------------\n', {});

    // Footer
    await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
    await BluetoothEscposPrinter.printText('*** TERIMA KASIH ***\n', {
      fonttype: 1,
    });

    // Feed and cut
    await BluetoothEscposPrinter.printText('\n\n\n', {});
    await BluetoothEscposPrinter.cutOnePoint();

    Alert.alert('Success', 'Receipt printed successfully!');
  } catch (error) {
    console.error('Print error:', error);
    Alert.alert('Print Failed', 'Unable to print receipt. Please check printer connection.');
    throw error;
  }
};
