import { useAuth } from "../context/AuthContext";
import { formatCurrency as formatCurrencyUtil, getCurrencySymbol as getCurrencySymbolUtil } from "../lib/utils";

/**
 * Hook to get currency formatting functions with tenant's currency
 * @returns {Object} Currency utilities with tenant's currency applied
 */
export function useCurrency() {
  const { tenant } = useAuth();
  const currencyCode = tenant?.settings?.currency || "INR";
  
  const formatCurrency = (amount) => formatCurrencyUtil(amount, currencyCode);
  const currencySymbol = getCurrencySymbolUtil(currencyCode);
  
  return {
    currencyCode,
    currencySymbol,
    formatCurrency,
  };
}

export default useCurrency;
