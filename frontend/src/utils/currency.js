// Currency formatting utilities

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
  ARS: { symbol: "AR$", locale: "es-AR", position: "before" },
  CLP: { symbol: "CL$", locale: "es-CL", position: "before", decimals: 0 },
  COP: { symbol: "CO$", locale: "es-CO", position: "before" },
  PEN: { symbol: "S/", locale: "es-PE", position: "before" },
  CHF: { symbol: "CHF", locale: "de-CH", position: "before" },
  SEK: { symbol: "kr", locale: "sv-SE", position: "after" },
  NOK: { symbol: "kr", locale: "nb-NO", position: "after" },
  DKK: { symbol: "kr", locale: "da-DK", position: "after" },
  PLN: { symbol: "zł", locale: "pl-PL", position: "after" },
  CZK: { symbol: "Kč", locale: "cs-CZ", position: "after" },
  HUF: { symbol: "Ft", locale: "hu-HU", position: "after", decimals: 0 },
  RON: { symbol: "lei", locale: "ro-RO", position: "after" },
  TRY: { symbol: "₺", locale: "tr-TR", position: "before" },
  ILS: { symbol: "₪", locale: "he-IL", position: "before" },
  QAR: { symbol: "﷼", locale: "ar-QA", position: "after" },
  KWD: { symbol: "د.ك", locale: "ar-KW", position: "before", decimals: 3 },
  BHD: { symbol: "BD", locale: "ar-BH", position: "before", decimals: 3 },
  OMR: { symbol: "﷼", locale: "ar-OM", position: "after", decimals: 3 },
  NZD: { symbol: "NZ$", locale: "en-NZ", position: "before" },
  HKD: { symbol: "HK$", locale: "zh-HK", position: "before" },
  TWD: { symbol: "NT$", locale: "zh-TW", position: "before" },
  RUB: { symbol: "₽", locale: "ru-RU", position: "after" },
  UAH: { symbol: "₴", locale: "uk-UA", position: "before" },
};

/**
 * Format a number as currency
 * @param {number} amount - The amount to format
 * @param {string} currencyCode - Currency code (e.g., "INR", "USD")
 * @param {boolean} showSymbol - Whether to show currency symbol (default: true)
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, currencyCode = "INR", showSymbol = true) {
  if (amount === null || amount === undefined) return "-";
  
  const config = CURRENCY_CONFIG[currencyCode] || CURRENCY_CONFIG.INR;
  const decimals = config.decimals ?? 2;
  
  // Format number with proper locale
  const formattedNumber = new Intl.NumberFormat(config.locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
  
  if (!showSymbol) return formattedNumber;
  
  // Add symbol in correct position
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

/**
 * Get currency config
 * @param {string} currencyCode - Currency code
 * @returns {object} Currency configuration
 */
export function getCurrencyConfig(currencyCode = "INR") {
  return CURRENCY_CONFIG[currencyCode] || CURRENCY_CONFIG.INR;
}

export default { formatCurrency, getCurrencySymbol, getCurrencyConfig };
