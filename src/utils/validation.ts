// src/utils/validation.ts
// Reusable validation helpers for forms and user inputs.

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export const validateEmail = (email: string): ValidationResult => {
  const trimmed = email.trim();
  if (!trimmed) {
    return { valid: false, error: 'Email harus diisi' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Format email tidak valid' };
  }
  return { valid: true };
};

export const validatePassword = (password: string, minLength = 6): ValidationResult => {
  if (!password) {
    return { valid: false, error: 'Password harus diisi' };
  }
  if (password.length < minLength) {
    return { valid: false, error: `Password minimal ${minLength} karakter` };
  }
  return { valid: true };
};

export const validateRequired = (value: string, fieldName: string): ValidationResult => {
  if (!value || !value.trim()) {
    return { valid: false, error: `${fieldName} harus diisi` };
  }
  return { valid: true };
};

export const validatePositiveNumber = (value: number, fieldName: string): ValidationResult => {
  if (value === undefined || value === null || isNaN(value)) {
    return { valid: false, error: `${fieldName} harus berupa angka` };
  }
  if (value <= 0) {
    return { valid: false, error: `${fieldName} harus lebih besar dari 0` };
  }
  return { valid: true };
};

export const validateNotFutureDate = (dateString: string): ValidationResult => {
  if (!dateString) {
    return { valid: false, error: 'Tanggal harus diisi' };
  }
  const [year, month, day] = dateString.split('-').map(Number);
  const inputDate = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (inputDate > today) {
    return { valid: false, error: 'Tanggal tidak boleh di masa depan' };
  }
  return { valid: true };
};

export interface WeighingFormData {
  buyer: string;
  basePrice: number;
  cnAmount: number;
  items: { grossWeight: number }[];
  date: string;
}

export const validateWeighingForm = (data: WeighingFormData): ValidationResult => {
  const buyerValidation = validateRequired(data.buyer, 'Nama pembeli');
  if (!buyerValidation.valid) return buyerValidation;

  const priceValidation = validatePositiveNumber(data.basePrice, 'Harga dasar');
  if (!priceValidation.valid) return priceValidation;

  const dateValidation = validateNotFutureDate(data.date);
  if (!dateValidation.valid) return dateValidation;

  const validItems = data.items.filter((item) => item.grossWeight > 0);
  if (validItems.length === 0) {
    return { valid: false, error: 'Minimal harus ada 1 timbangan dengan berat lebih dari 0' };
  }

  if (data.cnAmount < 0) {
    return { valid: false, error: 'Potongan CN tidak boleh negatif' };
  }

  if (data.cnAmount >= data.basePrice) {
    return { valid: false, error: 'Potongan CN tidak boleh lebih besar atau sama dengan harga dasar' };
  }

  return { valid: true };
};
