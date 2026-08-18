// src/utils/format.ts
// Utility functions for formatting numbers, weights, currency, and dates in Indonesian format.

export const parseIndonesianNumber = (value: string): number => {
  return parseFloat(value.replace(',', '.')) || 0;
};

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('id-ID').format(value);
};

export const formatCurrency = (amount: number, minimumFractionDigits = 0): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits,
  }).format(amount);
};

export const formatWeight = (weight: number): string => {
  return parseFloat(weight.toFixed(2)).toString().replace('.', ',');
};

export const formatWeightForDisplay = (weight: number): string => {
  if (!weight && weight !== 0) return '';
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(weight);
};

export const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const formatDateId = (
  dateString: string,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }
): string => {
  return parseLocalDate(dateString).toLocaleDateString('id-ID', options);
};

export const timeToDate = (timeString: string): Date => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date;
};
