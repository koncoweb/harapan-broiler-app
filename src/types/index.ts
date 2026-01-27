// src/types/index.ts

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
  CreateNota: { session?: WeighingSession } | undefined;
  Admin: undefined;
  BluetoothSettings: undefined;
  Sync: undefined;
};

export interface WeighingItem {
  id: string;
  index: number;
  grossWeight: number; // berat per penimbangan
}

export interface WeighingSession {
  id: string;
  date: string;        // "YYYY-MM-DD"
  time: string;        // "HH:MM"
  buyer: string;       // Pembeli
  driver: string;      // Supir
  basePrice: number;   // Harga Dasar
  cnAmount: number;    // CN
  finalPrice: number;  // Harga Bersih (basePrice - cnAmount)
  items: WeighingItem[];
  totalNetWeight: number; // Total Berat
  totalAmount: number;  // Total Bayar
  totalColi: number;   // Total Items/Keranjang
  amountPaid?: number; // Jumlah yang dibayarkan
  paymentStatus?: 'Lunas' | 'Belum Lunas' | 'Sebagian'; // Status pembayaran
  notes: string;       // Catatan
  createdBy: string;   // email or uid
  createdAt: number | Date; // Timestamp
}

export interface UserData {
  uid: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
}

export interface FarmSettings {
  farmName: string;
  farmAddress: string;
}
