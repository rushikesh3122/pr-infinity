import type { TaxType } from '../models/Settings.js';
import { amountInWords, toPaise, toRupees } from '../utils/money.js';
import { ApiError } from '../utils/ApiError.js';

export interface CalcItemInput {
  name: string;
  description?: string;
  warranty?: string;
  quantity: number;
  rate: number;
}

/**
 * Amount      = Quantity x Rate
 * Subtotal    = sum of item amounts
 * Taxable     = Subtotal - Discount
 * Grand total = Taxable + GST (CGST + SGST, or IGST)
 * Calculated in integer paise; the mobile app mirrors this logic for live preview,
 * but the server result is what gets stored.
 */
export function calculateInvoice(items: CalcItemInput[], discount: number, gstRate: number, taxType: TaxType) {
  const lines = items.map((item) => {
    const amountPaise = Math.round(item.quantity * toPaise(item.rate));
    return {
      name: item.name,
      description: item.description ?? '',
      warranty: item.warranty ?? '',
      quantity: item.quantity,
      rate: toRupees(toPaise(item.rate)),
      amount: toRupees(amountPaise),
      amountPaise,
    };
  });

  const subtotalPaise = lines.reduce((sum, l) => sum + l.amountPaise, 0);
  const discountPaise = toPaise(discount);
  if (discountPaise > subtotalPaise) throw ApiError.badRequest('Discount cannot be more than the subtotal');

  const taxablePaise = subtotalPaise - discountPaise;
  let cgstPaise = 0;
  let sgstPaise = 0;
  let igstPaise = 0;
  const half = gstRate / 2;
  if (taxType === 'IGST') {
    igstPaise = Math.round((taxablePaise * gstRate) / 100);
  } else {
    cgstPaise = Math.round((taxablePaise * half) / 100);
    sgstPaise = Math.round((taxablePaise * half) / 100);
  }
  const totalTaxPaise = cgstPaise + sgstPaise + igstPaise;
  const grandTotalPaise = taxablePaise + totalTaxPaise;

  return {
    items: lines.map(({ amountPaise: _omit, ...rest }) => rest),
    subtotal: toRupees(subtotalPaise),
    discount: toRupees(discountPaise),
    taxDetails: {
      taxType,
      gstRate,
      taxableValue: toRupees(taxablePaise),
      cgstRate: taxType === 'IGST' ? 0 : half,
      cgstAmount: toRupees(cgstPaise),
      sgstRate: taxType === 'IGST' ? 0 : half,
      sgstAmount: toRupees(sgstPaise),
      igstRate: taxType === 'IGST' ? gstRate : 0,
      igstAmount: toRupees(igstPaise),
      totalTax: toRupees(totalTaxPaise),
    },
    grandTotal: toRupees(grandTotalPaise),
    amountInWords: amountInWords(toRupees(grandTotalPaise)),
  };
}
