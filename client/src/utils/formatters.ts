/**
 * Formats monetary amounts in Indian Rupee format (e.g. ₹14,20,000.00 or ₹14.20 L)
 */
export function formatInr(amount: number | string | undefined | null, options: { compact?: boolean; showDecimals?: boolean } = {}): string {
  if (amount === undefined || amount === null) return '₹0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₹0.00';

  if (options.compact) {
    if (Math.abs(num) >= 10000000) {
      return `₹${(num / 10000000).toFixed(2)} Cr`;
    }
    if (Math.abs(num) >= 100000) {
      return `₹${(num / 100000).toFixed(2)} L`;
    }
  }

  const parts = num.toFixed(options.showDecimals !== false ? 2 : 0).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1];

  const isNegative = integerPart.startsWith('-');
  if (isNegative) integerPart = integerPart.substring(1);

  // Indian numbering grouping: last 3 digits, then groups of 2
  let lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);

  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }

  const formattedInteger = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  const full = `${isNegative ? '-' : ''}₹${formattedInteger}${decimalPart ? '.' + decimalPart : ''}`;
  return full;
}

/**
 * Standard Indian date formatting (DD/MM/YYYY)
 */
export function formatDate(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '—';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Relative days remaining or overdue label
 */
export function formatDaysRemaining(dueDateStr: string | Date): { text: string; isOverdue: boolean; days: number } {
  const due = new Date(dueDateStr);
  const now = new Date();
  const diffTime = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { text: `${Math.abs(diffDays)} days overdue`, isOverdue: true, days: Math.abs(diffDays) };
  } else if (diffDays === 0) {
    return { text: 'Due today', isOverdue: false, days: 0 };
  } else {
    return { text: `${diffDays} days left`, isOverdue: false, days: diffDays };
  }
}
