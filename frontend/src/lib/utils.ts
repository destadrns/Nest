import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats financial amounts (in cents/subunits) according to selected currency.
 * Default is Indonesian Rupiah ('IDR') formatted as 'id-ID' (e.g., Rp12.500.000).
 */
export function formatCurrency(cents: number, currency = 'IDR'): string {
  const locale = currency === 'IDR' ? 'id-ID' : 'en-US';
  const amount = cents / 100;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: currency === 'IDR' ? 0 : 2,
  }).format(amount);
}
