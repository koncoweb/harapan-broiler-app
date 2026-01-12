import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { WeighingSession } from '../types';

export const exportToExcel = async (data: WeighingSession[]) => {
  if (!data || data.length === 0) {
    throw new Error('Data kosong, tidak ada yang bisa diekspor.');
  }

  // 1. Prepare Data for Excel
  // Formatting numbers or keeping them as numbers depends on requirement. 
  // Excel handles numbers well, so keeping them as numbers is better for calculations.
  const exportData = data.map((item, index) => ({
    'No': index + 1,
    'Tanggal': item.date,
    'Jam': item.time || '-',
    'Pembeli': item.buyer,
    'Sopir': item.driver,
    'Total Berat (Kg)': parseFloat((item.totalNetWeight || 0).toFixed(2)), // Remove trailing zeros
    'Total Timbangan': item.totalColi || 0,
    'Harga Dasar': item.basePrice || 0,
    'Potongan CN': item.cnAmount || 0,
    'Harga Bersih': item.finalPrice || 0,
    'Total Tagihan': item.totalAmount || 0,
    'Jumlah Bayar': item.amountPaid || 0,
    'Sisa Tagihan': (item.totalAmount || 0) - (item.amountPaid || 0),
    'Status': item.paymentStatus || 'Belum Lunas',
    'Dibuat Oleh': item.createdBy
  }));

  // 2. Create Worksheet
  const ws = XLSX.utils.json_to_sheet(exportData);

  // 3. Set Column Widths
  const colWidths = [
    { wch: 5 },  // No
    { wch: 12 }, // Tanggal
    { wch: 8 },  // Jam
    { wch: 20 }, // Pembeli
    { wch: 15 }, // Sopir
    { wch: 15 }, // Total Berat
    { wch: 12 }, // Total Timbangan
    { wch: 12 }, // Harga Dasar
    { wch: 12 }, // CN
    { wch: 12 }, // Harga Bersih
    { wch: 15 }, // Total Tagihan
    { wch: 15 }, // Jumlah Bayar
    { wch: 15 }, // Sisa Tagihan
    { wch: 15 }, // Status
    { wch: 25 }, // Dibuat Oleh
  ];
  ws['!cols'] = colWidths;

  // 4. Create Workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Laporan");

  // 5. Generate Filename
  const now = new Date();
  const timestamp = now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0') + '_' +
    now.getHours().toString().padStart(2, '0') +
    now.getMinutes().toString().padStart(2, '0');
  const filename = `laporan_${timestamp}.xlsx`;

  // 6. Handle Platform Specific Save
  if (Platform.OS === 'web') {
    XLSX.writeFile(wb, filename);
    return true;
  } else {
    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    const uri = FileSystem.documentDirectory + filename;
    
    await FileSystem.writeAsStringAsync(uri, wbout, {
      encoding: FileSystem.EncodingType.Base64
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Download Laporan Excel',
        UTI: 'com.microsoft.excel.xlsx'
      });
      return true;
    } else {
      throw new Error('Fitur berbagi tidak tersedia di perangkat ini');
    }
  }
};
