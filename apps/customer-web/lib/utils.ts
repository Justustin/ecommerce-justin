// lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// ============================================
// FUNCTION 1: Combine CSS classes
// ============================================
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================
// FUNCTION 2: Format Indonesian Rupiah
// ============================================
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

// ============================================
// FUNCTION 3: Format countdown timer
// ============================================
export function formatTimeRemaining(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}j ${minutes}m`;  // j = jam (hours)
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}d`;   // d = detik (seconds)
  }
  return `${secs}d`;
}

// ============================================
// FUNCTION 4: Format dates in Indonesian
// ============================================
export function formatIndonesianDate(date: Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'long',
  }).format(date);
}