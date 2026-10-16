export const CURRENCY_SYMBOL = '₹';

export function formatINR(amount, includeDecimals = false) {
  const num = Number(amount) || 0;
  return `₹${num.toLocaleString('en-IN', {
    maximumFractionDigits: includeDecimals ? 2 : 0,
    minimumFractionDigits: includeDecimals ? 2 : 0
  })}`;
}

export function formatCompactINR(amount) {
  const num = Number(amount) || 0;
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
  return formatINR(num);
}

export function formatCurrency(amount) {
  return formatINR(amount);
}
