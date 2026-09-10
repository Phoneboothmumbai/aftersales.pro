import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Currency configuration for global support
const CURRENCY_CONFIG = {
  INR: { symbol: "₹", locale: "en-IN", position: "before" },
  USD: { symbol: "$", locale: "en-US", position: "before" },
  EUR: { symbol: "€", locale: "de-DE", position: "before" },
  GBP: { symbol: "£", locale: "en-GB", position: "before" },
  AED: { symbol: "د.إ", locale: "ar-AE", position: "before" },
  SAR: { symbol: "﷼", locale: "ar-SA", position: "after" },
  AUD: { symbol: "A$", locale: "en-AU", position: "before" },
  CAD: { symbol: "C$", locale: "en-CA", position: "before" },
  SGD: { symbol: "S$", locale: "en-SG", position: "before" },
  MYR: { symbol: "RM", locale: "ms-MY", position: "before" },
  JPY: { symbol: "¥", locale: "ja-JP", position: "before", decimals: 0 },
  CNY: { symbol: "¥", locale: "zh-CN", position: "before" },
  KRW: { symbol: "₩", locale: "ko-KR", position: "before", decimals: 0 },
  THB: { symbol: "฿", locale: "th-TH", position: "before" },
  IDR: { symbol: "Rp", locale: "id-ID", position: "before", decimals: 0 },
  PHP: { symbol: "₱", locale: "fil-PH", position: "before" },
  VND: { symbol: "₫", locale: "vi-VN", position: "after", decimals: 0 },
  BDT: { symbol: "৳", locale: "bn-BD", position: "before" },
  PKR: { symbol: "₨", locale: "ur-PK", position: "before" },
  LKR: { symbol: "Rs", locale: "si-LK", position: "before" },
  NPR: { symbol: "₨", locale: "ne-NP", position: "before" },
  ZAR: { symbol: "R", locale: "en-ZA", position: "before" },
  NGN: { symbol: "₦", locale: "en-NG", position: "before" },
  KES: { symbol: "KSh", locale: "sw-KE", position: "before" },
  EGP: { symbol: "E£", locale: "ar-EG", position: "before" },
  BRL: { symbol: "R$", locale: "pt-BR", position: "before" },
  MXN: { symbol: "MX$", locale: "es-MX", position: "before" },
  CHF: { symbol: "CHF", locale: "de-CH", position: "before" },
  TRY: { symbol: "₺", locale: "tr-TR", position: "before" },
  RUB: { symbol: "₽", locale: "ru-RU", position: "after" },
};

/**
 * Format amount with currency
 * @param {number} amount - Amount to format
 * @param {string} currencyCode - Currency code (default: INR)
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, currencyCode = "INR") {
  if (amount === null || amount === undefined) return getCurrencySymbol(currencyCode) + "0";
  
  const config = CURRENCY_CONFIG[currencyCode] || CURRENCY_CONFIG.INR;
  const decimals = config.decimals ?? 0;
  
  const formattedNumber = new Intl.NumberFormat(config.locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
  
  if (config.position === "after") {
    return `${formattedNumber} ${config.symbol}`;
  }
  return `${config.symbol}${formattedNumber}`;
}

/**
 * Get currency symbol
 * @param {string} currencyCode - Currency code
 * @returns {string} Currency symbol
 */
export function getCurrencySymbol(currencyCode = "INR") {
  const config = CURRENCY_CONFIG[currencyCode] || CURRENCY_CONFIG.INR;
  return config.symbol;
}

export function getStatusColor(status) {
  const colors = {
    received: "status-received",
    diagnosed: "status-diagnosed",
    waiting_for_approval: "status-waiting_for_approval",
    in_progress: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    pending_parts: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    repaired: "status-repaired",
    delivered: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    closed: "status-closed",
  };
  return colors[status] || "bg-gray-100 text-gray-700";
}

export function getStatusLabel(status) {
  const labels = {
    received: "Received",
    diagnosed: "Diagnosed",
    waiting_for_approval: "Waiting for Approval",
    in_progress: "In Progress",
    pending_parts: "Pending Parts",
    repaired: "Repaired",
    delivered: "Delivered",
    closed: "Closed",
  };
  return labels[status] || status;
}

export function getDeviceTypeIcon(type) {
  const icons = {
    laptop: "Laptop",
    mobile: "Smartphone",
    tablet: "Tablet",
    other: "HardDrive",
  };
  return icons[type?.toLowerCase()] || "HardDrive";
}

export const DEVICE_TYPES = ["Laptop", "Mobile", "Tablet", "Other"];

export const DEVICE_CONDITIONS = [
  "Fresh",
  "Active",
  "Physical Damage",
  "Dead",
  "Liquid Damage",
];

export const DEFAULT_ACCESSORIES = [
  { name: "Charger", checked: false },
  { name: "Adapter", checked: false },
  { name: "Bag", checked: false },
  { name: "SIM Tray", checked: false },
  { name: "Stylus", checked: false },
  { name: "Case/Cover", checked: false },
  { name: "Screen Guard", checked: false },
];

export const PAYMENT_MODES = [
  "Cash",
  "UPI",
  "Card",
  "Bank Transfer",
  "Pending",
];
