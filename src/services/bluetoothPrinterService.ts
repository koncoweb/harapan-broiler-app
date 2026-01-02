// src/services/bluetoothPrinterService.ts
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import { WeighingSession, FarmSettings } from '../types';
import {
  BluetoothManager,
  BluetoothEscposPrinter,
} from '@vardrz/react-native-bluetooth-escpos-printer';

// Bluetooth Device Interface
export interface BluetoothDevice {
  name: string;
  address: string;
}

// Check if Bluetooth is enabled
export const isBluetoothEnabled = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
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
  if (Platform.OS !== 'android') {
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
  if (Platform.OS !== 'android') {
    Alert.alert('Not Supported', 'Bluetooth printing is only supported on Android');
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
  if (Platform.OS !== 'android') {
    return false;
  }

  try {
    await BluetoothManager.connect(address);
    return true;
  } catch (error) {
    console.error('Connection error:', error);
    Alert.alert('Connection Failed', 'Unable to connect to the printer');
    return false;
  }
};

// Disconnect from Bluetooth printer
export const disconnectBluetoothPrinter = async (): Promise<void> => {
  if (Platform.OS !== 'android') {
    return;
  }

  try {
    await BluetoothManager.unpair(await BluetoothManager.list()[0]?.address);
  } catch (error) {
    console.error('Disconnect error:', error);
  }
};

// Check if printer is connected
export const isBluetoothPrinterConnected = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return false;
  }

  try {
    const connected = await BluetoothManager.isBluetoothEnabled();
    // Additional check: try to get connected device
    return connected;
  } catch (error) {
    return false;
  }
};

// Format currency for receipt
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

// Format weight with Indonesian decimal, remove trailing zeros
const formatWeight = (weight: number): string => {
  return parseFloat(weight.toFixed(2)).toString().replace('.', ',');
};

// Print receipt using ESC/POS commands
export const printBluetoothReceipt = async (
  session: WeighingSession,
  settings?: FarmSettings
): Promise<void> => {
  if (Platform.OS !== 'android') {
    Alert.alert('Not Supported', 'Bluetooth printing is only supported on Android');
    return;
  }

  try {
    const farmName = settings?.farmName || 'HARAPAN BROILER';
    const farmAddress = settings?.farmAddress || 'Jln Sawang Ujung, Perum Griya Azna Indah No 73';

    // Parse date
    const [year, month, day] = session.date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const formattedDate = dateObj.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

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
    await BluetoothEscposPrinter.printText(`TOTAL BAYAR : ${formatCurrency(session.totalAmount)}\n`, {
      widthtimes: 1,
      heigthtimes: 1,
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
