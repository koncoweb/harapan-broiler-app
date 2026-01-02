import { WeighingSession, FarmSettings } from '../types';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import {
  isBluetoothPrinterConnected,
  printBluetoothReceipt
} from './bluetoothPrinterService';

export const generateReceiptHtml = (session: WeighingSession, settings?: FarmSettings) => {
  // Safe parsing of YYYY-MM-DD to Local Date
  const [year, month, day] = session.date.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  const formattedDate = dateObj.toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
  const timeString = session.time || '';

  const farmName = settings?.farmName || "HARAPAN BROILER";
  const farmAddress = settings?.farmAddress || "Jln Sawang Ujung, Perum Griya Azna Indah No 73";

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
  };

  // Format weight without trailing zeros
  const formatWeight = (weight: number) => {
    return parseFloat(weight.toFixed(2)).toString().replace('.', ',');
  };

  // Generate items in 2-column layout for space efficiency
  const generateItemsGrid = (items: any[]) => {
    let gridHtml = '';
    for (let i = 0; i < items.length; i += 2) {
      const leftItem = items[i];
      const rightItem = items[i + 1];

      const leftText = `${leftItem.index || (i + 1)}. ${formatWeight(leftItem.grossWeight || 0)} Kg`;
      const rightText = rightItem ? `${rightItem.index || (i + 2)}. ${formatWeight(rightItem.grossWeight || 0)} Kg` : '';

      gridHtml += `
        <tr>
          <td style="text-align: left; width: 50%; padding: 2px 0; font-size: 10px;">${leftText}</td>
          <td style="text-align: left; width: 50%; padding: 2px 0; font-size: 10px;">${rightText}</td>
        </tr>
      `;
    }
    return gridHtml;
  };

  const itemsGridHtml = generateItemsGrid(session.items);

  return `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          @page { margin: 0; size: 58mm 200mm; }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: 58mm;
            margin: 0;
            padding: 5px;
            font-size: 10px;
            color: black;
            background-color: white;
          }
          .header {
            text-align: center;
            margin-bottom: 10px;
          }
          .title {
            font-size: 16px;
            font-weight: bold;
            text-transform: uppercase;
          }
          .subtitle {
            font-size: 10px;
            margin-bottom: 5px;
          }
          .divider {
            border-top: 1px dashed black;
            margin: 5px 0;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th {
            text-align: center;
            border-bottom: 1px dashed black;
            font-size: 10px;
            padding-bottom: 2px;
          }
          td {
            font-size: 10px;
            padding: 2px 0;
          }
          .total-section {
            margin-top: 5px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            font-weight: bold;
            font-size: 12px;
            margin-top: 5px;
          }
          .footer {
            text-align: center;
            margin-top: 15px;
            font-size: 10px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${farmName}</div>
          <div class="subtitle">${farmAddress}</div>
        </div>

        <div class="divider"></div>
        
        <div class="info-row">
          <span>Tanggal:</span>
          <span>${formattedDate} ${timeString}</span>
        </div>
        <div class="info-row">
          <span>Pembeli:</span>
          <span>${session.buyer}</span>
        </div>
        <div class="info-row">
          <span>Supir:</span>
          <span>${session.driver}</span>
        </div>

        <div class="divider"></div>

        <div style="margin: 5px 0;">
          <div style="font-weight: bold; font-size: 11px; margin-bottom: 3px; text-align: center;">DETAIL PENIMBANGAN</div>
          <table style="width: 100%; border-collapse: collapse;">
            <tbody>
              ${itemsGridHtml}
            </tbody>
          </table>
        </div>

        <div class="divider"></div>

        <div class="total-section">
           <div class="info-row">
            <span>Tot Berat:</span>
            <span>${formatWeight(session.totalNetWeight || 0)} Kg</span>
          </div>
          <div class="info-row">
            <span>Tot Timbangan:</span>
            <span>${session.totalColi || 0}</span>
          </div>
        </div>

        <div class="divider"></div>

        <div class="total-section">
           <div class="info-row">
            <span>Harga Dasar:</span>
            <span>${formatCurrency(session.basePrice || 0)}</span>
          </div>
           <div class="info-row">
            <span>Potongan CN:</span>
            <span>${formatCurrency(session.cnAmount || 0)}</span>
          </div>
           <div class="info-row" style="font-weight: bold;">
            <span>Harga Bersih:</span>
            <span>${formatCurrency(session.finalPrice || 0)}</span>
          </div>
        </div>

        <div class="divider"></div>

        <div class="total-row">
          <span>TOTAL BAYAR:</span>
          <span>${formatCurrency(session.totalAmount || 0)}</span>
        </div>

        <div class="divider"></div>

        <div class="footer">
          *** TERIMA KASIH ***
        </div>
      </body>
    </html>
  `;
};

export const printReceipt = async (session: WeighingSession, settings?: FarmSettings) => {
  try {
    const html = generateReceiptHtml(session, settings);

    if (Platform.OS === 'web') {
      // Workaround for Web: Create an iframe to print only the receipt content
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.width = '0px';
      iframe.style.height = '0px';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(html);
        iframeDoc.close();

        // Wait for content to load before printing
        iframe.contentWindow?.focus();
        setTimeout(() => {
          iframe.contentWindow?.print();
          // Remove iframe after a delay to ensure print dialog is shown
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
        }, 500);
      }
    } else {
      // Native (Android/iOS)
      await Print.printAsync({
        html,
      });
    }
  } catch (error) {
    console.error("Printing error:", error);
  }
};

export const shareReceipt = async (session: WeighingSession, settings?: FarmSettings) => {
  try {
    const html = generateReceiptHtml(session, settings);
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
  } catch (error) {
    console.error("Sharing error:", error);
  }
};

/**
 * Auto-detect and print to the best available printer
 * Tries Bluetooth thermal printer first, then falls back to system print dialog
 */
export const printReceiptAuto = async (session: WeighingSession, settings?: FarmSettings) => {
  try {
    // Try Bluetooth thermal printer first (Android only)
    if (Platform.OS === 'android') {
      const bluetoothConnected = await isBluetoothPrinterConnected();
      if (bluetoothConnected) {
        console.log('Printing to Bluetooth thermal printer...');
        await printBluetoothReceipt(session, settings);
        return;
      }
    }

    // Fallback to HTML-based printing (system print dialog)
    console.log('Printing to system printer...');
    await printReceipt(session, settings);
  } catch (error) {
    console.error("Auto print error:", error);
    // If Bluetooth fails, fallback to HTML printing
    await printReceipt(session, settings);
  }
};

