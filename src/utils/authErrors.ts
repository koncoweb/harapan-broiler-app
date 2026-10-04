// src/utils/authErrors.ts
// Maps authService error codes (thrown as Error.message) to friendly Indonesian
// messages. Replaces firebaseErrors for the Turso-backed auth flow.

const MESSAGES: Record<string, string> = {
  EMAIL_NOT_FOUND: 'Email belum terdaftar.',
  INVALID_PASSWORD: 'Password salah.',
  ACCOUNT_DISABLED: 'Akun ini telah dinonaktifkan. Hubungi admin.',
  EMAIL_IN_USE: 'Email sudah terdaftar. Silakan gunakan email lain.',
  NOT_AUTHENTICATED: 'Sesi login berakhir. Silakan login kembali.',
  NETWORK: 'Gagal terhubung ke server. Periksa koneksi internet Anda.',
};

export function getAuthErrorMessage(error: any): string {
  if (!error) return 'Terjadi kesalahan. Silakan coba lagi.';
  const code = typeof error === 'string' ? error : error.message || '';
  return MESSAGES[code] || code || 'Terjadi kesalahan. Silakan coba lagi.';
}
