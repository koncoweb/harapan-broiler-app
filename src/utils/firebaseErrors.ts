// src/utils/firebaseErrors.ts
// Maps Firebase error codes to user-friendly Indonesian messages.

export const getFirebaseAuthErrorMessage = (errorCode: string): string => {
  const messages: Record<string, string> = {
    'auth/invalid-email': 'Format email tidak valid.',
    'auth/user-not-found': 'Pengguna tidak ditemukan.',
    'auth/wrong-password': 'Password salah.',
    'auth/invalid-credential': 'Email atau password salah.',
    'auth/email-already-in-use': 'Email sudah terdaftar. Silakan gunakan email lain.',
    'auth/weak-password': 'Password terlalu lemah. Minimal 6 karakter.',
    'auth/too-many-requests': 'Terlalu banyak percobaan. Silakan coba lagi nanti.',
    'auth/network-request-failed': 'Gagal terhubung ke server. Periksa koneksi internet Anda.',
    'auth/user-disabled': 'Akun ini telah dinonaktifkan. Hubungi admin.',
    'auth/operation-not-allowed': 'Operasi tidak diizinkan. Hubungi admin.',
  };

  return messages[errorCode] || 'Terjadi kesalahan. Silakan coba lagi.';
};

export const getFirebaseFirestoreErrorMessage = (errorCode: string): string => {
  const messages: Record<string, string> = {
    'permission-denied': 'Anda tidak memiliki izin untuk melakukan operasi ini.',
    'not-found': 'Data tidak ditemukan.',
    'already-exists': 'Data sudah ada.',
    'resource-exhausted': 'Batas permintaan terlampaui. Silakan coba lagi nanti.',
    'unauthenticated': 'Sesi login telah berakhir. Silakan login kembali.',
    'unavailable': 'Layanan tidak tersedia saat ini. Periksa koneksi internet Anda.',
  };

  return messages[errorCode] || 'Terjadi kesalahan saat mengakses database. Silakan coba lagi.';
};

export const getErrorMessage = (error: any): string => {
  if (!error) return 'Terjadi kesalahan yang tidak diketahui.';
  if (typeof error === 'string') return error;
  if (error.code) {
    if (error.code.startsWith('auth/')) {
      return getFirebaseAuthErrorMessage(error.code);
    }
    if (error.code.startsWith('firestore/') || ['permission-denied', 'not-found', 'already-exists', 'resource-exhausted', 'unauthenticated', 'unavailable'].includes(error.code)) {
      return getFirebaseFirestoreErrorMessage(error.code);
    }
    return error.message || 'Terjadi kesalahan. Silakan coba lagi.';
  }
  return error.message || 'Terjadi kesalahan. Silakan coba lagi.';
};
