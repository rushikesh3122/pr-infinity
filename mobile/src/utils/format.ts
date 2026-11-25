const inr = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "Rs.33,000.00", the style used on the PR Infinity invoice. */
export const formatInvoiceMoney = (value: number) => `Rs.${inr.format(value || 0)}`;

/** "₹33,000.00" for in-app display. */
export const formatCurrency = (value: number) => `₹${inr.format(value || 0)}`;

const pad = (n: number) => String(n).padStart(2, '0');

/** dd/mm/yyyy */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "19 Nov 2026" */
export function formatDateLong(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  return `${formatDateLong(d)}, ${pad(d.getHours() % 12 || 12)}:${pad(d.getMinutes())} ${d.getHours() >= 12 ? 'PM' : 'AM'}`;
}

/** "98765 43210" */
export function formatMobile(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.length === 10 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : value;
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

/** Safe file name from an invoice number: "PRI/2026-27/0019" -> "PRI-2026-27-0019" */
export const invoiceFileName = (invoiceNumber: string) => `${invoiceNumber.replace(/[^A-Za-z0-9-]+/g, '-')}.pdf`;
