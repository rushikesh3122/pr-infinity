import type { InvoiceItem, TaxDetails, TaxType } from '../../types/models';

/**
 * Mirror of the backend calculator (backend/src/services/invoiceCalculator.ts), used for the
 * live totals and the preview. The server recalculates on save and its numbers are stored.
 * All math is in integer paise to avoid floating point errors.
 */
const toPaise = (rupees: number) => Math.round((Number(rupees) || 0) * 100);
const toRupees = (paise: number) => Math.round(paise) / 100;

export interface DraftItem {
  name: string;
  description?: string;
  warranty?: string;
  quantity: number | string;
  rate: number | string;
}

export interface InvoiceTotals {
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  taxDetails: TaxDetails;
  grandTotal: number;
  amountInWords: string;
  discountExceedsSubtotal: boolean;
}

export function calculateInvoice(draftItems: DraftItem[], discount: number | string, gstRate: number | string, taxType: TaxType): InvoiceTotals {
  const rate = Number(gstRate) || 0;
  const items = draftItems.map((item) => {
    const quantity = Number(item.quantity) || 0;
    const amountPaise = Math.round(quantity * toPaise(Number(item.rate)));
    return {
      name: item.name,
      description: item.description ?? '',
      warranty: item.warranty ?? '',
      quantity,
      rate: toRupees(toPaise(Number(item.rate))),
      amount: toRupees(amountPaise),
      amountPaise,
    };
  });
  const subtotalPaise = items.reduce((s, i) => s + i.amountPaise, 0);
  const rawDiscount = toPaise(Number(discount));
  const discountPaise = Math.min(rawDiscount, subtotalPaise);
  const taxablePaise = subtotalPaise - discountPaise;
  const half = rate / 2;
  const igst = taxType === 'IGST' ? Math.round((taxablePaise * rate) / 100) : 0;
  const cgst = taxType === 'IGST' ? 0 : Math.round((taxablePaise * half) / 100);
  const sgst = cgst;
  const totalTax = igst + cgst + sgst;
  const grand = taxablePaise + totalTax;

  return {
    items: items.map(({ amountPaise: _omit, ...rest }) => rest),
    subtotal: toRupees(subtotalPaise),
    discount: toRupees(discountPaise),
    taxDetails: {
      taxType,
      gstRate: rate,
      taxableValue: toRupees(taxablePaise),
      cgstRate: taxType === 'IGST' ? 0 : half,
      cgstAmount: toRupees(cgst),
      sgstRate: taxType === 'IGST' ? 0 : half,
      sgstAmount: toRupees(sgst),
      igstRate: taxType === 'IGST' ? rate : 0,
      igstAmount: toRupees(igst),
      totalTax: toRupees(totalTax),
    },
    grandTotal: toRupees(grand),
    amountInWords: amountInWords(toRupees(grand)),
    discountExceedsSubtotal: rawDiscount > subtotalPaise,
  };
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
  'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function belowThousand(n: number): string {
  const parts: string[] = [];
  if (n >= 100) {
    parts.push(`${ONES[Math.floor(n / 100)]} Hundred`);
    n %= 100;
  }
  if (n >= 20) parts.push(TENS[Math.floor(n / 10)] + (n % 10 ? ` ${ONES[n % 10]}` : ''));
  else if (n > 0) parts.push(ONES[n]);
  return parts.join(' ');
}

function integerToWords(n: number): string {
  if (n === 0) return 'Zero';
  const parts: string[] = [];
  const crore = Math.floor(n / 10_000_000);
  n %= 10_000_000;
  const lakh = Math.floor(n / 100_000);
  n %= 100_000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (crore) parts.push(`${integerToWords(crore)} Crore`);
  if (lakh) parts.push(`${belowThousand(lakh)} Lakh`);
  if (thousand) parts.push(`${belowThousand(thousand)} Thousand`);
  if (n) parts.push(belowThousand(n));
  return parts.join(' ');
}

export function amountInWords(amount: number): string {
  const paise = toPaise(Math.abs(amount));
  const rupees = Math.floor(paise / 100);
  const rem = paise % 100;
  return `${integerToWords(rupees)} Rupees${rem ? ` and ${integerToWords(rem)} Paise` : ''} Only`;
}
