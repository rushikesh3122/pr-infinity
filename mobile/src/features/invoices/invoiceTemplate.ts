import type { CompanyDetails, InvoiceItem, Party, PaymentStatus, TaxDetails } from '../../types/models';
import { formatDate, formatInvoiceMoney as money } from '../../utils/format';

/**
 * HTML for the invoice PDF, built to match the supplied PR Infinity layout
 * (invoice-preview-new-layout.pdf): navy top rule, two-column header, Bill To / Ship To,
 * S.No / Items / Warranty / Rate / Qty / Amount table, CGST/SGST summary, amount in words,
 * bank details, terms and the authorised signatory stamp.
 *
 * The same HTML drives the in-app preview (WebView), the PDF (expo-print) and printing,
 * so what the user previews is exactly what gets shared.
 */
export interface InvoiceTemplateData {
  invoiceNumber: string;
  invoiceDate: string | Date;
  customerDetails: Party;
  shipTo: Party;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  taxDetails: TaxDetails;
  grandTotal: number;
  amountInWords: string;
  paymentStatus: PaymentStatus;
  company: CompanyDetails;
}

const esc = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const lines = (value: string) =>
  value
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

const pct = (rate: number) => `${Number.isInteger(rate) ? rate : rate.toFixed(2).replace(/0+$/, '')}%`;

const qtyText = (q: number) => (Number.isInteger(q) ? String(q) : q.toFixed(2));

/** Only allow image data URIs or http(s) URLs into the src attribute. */
const safeImage = (src: string) => (/^(data:image\/(png|jpe?g|webp);base64,|https?:\/\/)/.test(src) ? src : '');

function partyBlock(title: string, party: Party) {
  return `
    <div class="party">
      <div class="party-title">${esc(title)}</div>
      <div class="party-name">${esc(party.name)}</div>
      <div class="party-line"><b>Address:</b> ${esc(party.address)}</div>
      <div class="party-line"><b>Mobile:</b> ${esc(party.mobileNumber)}</div>
      ${party.email ? `<div class="party-line"><b>Email:</b> ${esc(party.email)}</div>` : ''}
    </div>`;
}

export function renderInvoiceHtml(data: InvoiceTemplateData, options: { draft?: boolean } = {}): string {
  const { company, taxDetails: tax } = data;
  const isIgst = tax.taxType === 'IGST';
  const hasGst = tax.gstRate > 0;
  const badge = hasGst ? 'TAX INVOICE' : 'NON GST INVOICE';
  const totalQty = data.items.reduce((s, i) => s + i.quantity, 0);
  const logo = safeImage(company.logo);
  const signature = safeImage(company.signature);

  // Keep the item area at least as tall as in the reference layout, so short invoices still look full.
  const estimatedItemHeight = data.items.reduce((h, i) => h + 24 + lines(i.description).length * 13, 0);
  const filler = Math.max(0, 124 - estimatedItemHeight);

  const itemRows = data.items
    .map((item, idx) => {
      const specs = lines(item.description);
      return `
      <tr class="item">
        <td class="c">${idx + 1}</td>
        <td class="item-cell">
          <div class="item-name">${esc(item.name)}</div>
          ${specs.map((s) => `<div class="item-spec">${esc(s)}</div>`).join('')}
        </td>
        <td class="c">${esc(item.warranty || '')}</td>
        <td class="c">${money(item.rate)}</td>
        <td class="c">${qtyText(item.quantity)}</td>
        <td class="c">${money(item.amount)}</td>
      </tr>`;
    })
    .join('');

  const taxHead = isIgst
    ? `<tr>
        <th rowspan="2" style="width:30%">Taxable Value</th>
        <th colspan="2">IGST</th>
        <th rowspan="2" style="width:30%">Total Tax Amount</th>
      </tr>
      <tr><th style="width:15%">Rate</th><th>Amount</th></tr>`
    : `<tr>
        <th rowspan="2" style="width:22.7%">Taxable Value</th>
        <th colspan="2">CGST</th>
        <th colspan="2">SGST</th>
        <th rowspan="2" style="width:27.6%">Total Tax Amount</th>
      </tr>
      <tr>
        <th style="width:10.1%">Rate</th><th style="width:14.7%">Amount</th>
        <th style="width:10.1%">Rate</th><th style="width:14.8%">Amount</th>
      </tr>`;

  const taxRows = isIgst
    ? `<tr>
        <td>${money(tax.taxableValue)}</td><td>${pct(tax.igstRate)}</td><td>${money(tax.igstAmount)}</td><td>${money(tax.totalTax)}</td>
      </tr>
      <tr class="b">
        <td>${money(tax.taxableValue)}</td><td></td><td>${money(tax.igstAmount)}</td><td>${money(tax.totalTax)}</td>
      </tr>`
    : `<tr>
        <td>${money(tax.taxableValue)}</td>
        <td>${pct(tax.cgstRate)}</td><td>${money(tax.cgstAmount)}</td>
        <td>${pct(tax.sgstRate)}</td><td>${money(tax.sgstAmount)}</td>
        <td>${money(tax.totalTax)}</td>
      </tr>
      <tr class="b">
        <td>${money(tax.taxableValue)}</td>
        <td></td><td>${money(tax.cgstAmount)}</td>
        <td></td><td>${money(tax.sgstAmount)}</td>
        <td>${money(tax.totalTax)}</td>
      </tr>`;

  // The reference has no discount or GST; when either applies, show how the grand total was reached.
  const showBreakdown = data.discount > 0 || tax.totalTax > 0;
  const summary = `
    <table class="summary">
      ${
        showBreakdown
          ? `<tr><td>Subtotal</td><td>${money(data.subtotal)}</td></tr>
             ${data.discount > 0 ? `<tr><td>Discount</td><td>- ${money(data.discount)}</td></tr>` : ''}
             ${tax.totalTax > 0 ? `<tr><td>${isIgst ? 'IGST' : 'CGST + SGST'} (${pct(tax.gstRate)})</td><td>${money(tax.totalTax)}</td></tr>` : ''}`
          : ''
      }
      <tr class="grand"><td>Grand Total</td><td>${money(data.grandTotal)}</td></tr>
      <tr><td>Payment Status</td><td><span class="pay pay-${data.paymentStatus.replace(/\s+/g, '-').toLowerCase()}">${esc(data.paymentStatus)}</span></td></tr>
    </table>`;

  const contactLine = [
    company.gstin ? `<b>GSTIN:</b> ${esc(company.gstin)}` : '',
    company.mobile ? `<b>Mobile:</b> ${esc(company.mobile)}` : '',
  ]
    .filter(Boolean)
    .join('&nbsp;&nbsp;&nbsp;');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=794" />
<title>${esc(data.invoiceNumber)}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; background: #eef1f6; }
  body { font-family: Arial, 'Liberation Sans', Helvetica, sans-serif; color: #111; font-size: 10.5px; line-height: 1.36; }
  .page { width: 794px; min-height: 1122px; padding: 23px 26px 30px; margin: 0 auto; position: relative; }
  .invoice { background: #fff; border: 1.3px solid #111; border-top: 5px solid #0b1f4b; }
  table { border-collapse: collapse; width: 100%; }
  b { font-weight: 700; }

  .header { display: flex; border-bottom: 1.3px solid #111; }
  .header-left { width: 68%; display: flex; padding: 12px 14px 14px; border-right: 1.3px solid #111; }
  .logo { width: 76px; height: 70px; object-fit: contain; margin-right: 14px; flex-shrink: 0; }
  .company-name { font-size: 18.5px; font-weight: 700; margin: 0 0 4px; letter-spacing: 0.1px; }
  .company-sub { font-size: 9.5px; color: #333; margin-bottom: 8px; }
  .company-line { font-size: 10.3px; margin-bottom: 0.5px; }
  .header-right { width: 32%; padding: 16px 14px 12px; text-align: right; }
  .tagline { font-style: italic; font-weight: 700; font-size: 11px; margin-bottom: 17px; }
  .badge { display: inline-block; background: #0b1f4b; color: #fff; font-weight: 700; font-size: 9.5px; padding: 6px 8px; margin-bottom: 13px; letter-spacing: 0.2px; }
  .meta { font-size: 11px; margin-bottom: 7px; }
  .meta b { font-weight: 700; }
  .original { font-weight: 700; font-size: 11px; margin-top: 11px; }
  .draft { color: #b45309; font-weight: 700; font-size: 9.5px; margin-top: 4px; }

  .parties { display: flex; border-bottom: 1.3px solid #111; }
  .party { width: 50%; padding: 10px 13px 8px; font-size: 10.2px; }
  .party + .party { border-left: 1.3px solid #111; }
  .party-title { font-weight: 700; font-size: 10.2px; margin-bottom: 8px; }
  .party-name { font-weight: 700; font-size: 12.3px; margin-bottom: 4px; }
  .party-line { margin-bottom: 0; }

  .items th { background: #eef1f6; font-weight: 700; font-size: 10px; padding: 5px 4px; border-right: 1.3px solid #111; border-bottom: 1.3px solid #111; }
  .items th:last-child, .items td:last-child { border-right: none; }
  .items td { vertical-align: top; padding: 5px 4px; border-right: 1.3px solid #111; font-size: 10.2px; }
  .items .c { text-align: center; }
  .items .item-cell { padding: 5px 7px; }
  .item-name { font-weight: 700; font-size: 11.3px; margin-bottom: 3px; }
  .item-spec { font-size: 8.7px; color: #444; line-height: 1.5; }
  .items tr.item + tr.item td { border-top: 1px solid #d5dae3; }
  .items tr.filler td { padding: 0; }
  .items tr.total td { background: #eef1f6; font-weight: 700; border-top: 1.3px solid #111; border-bottom: 1.3px solid #111; padding: 5px 7px; text-align: center; }
  .items tr.total td.label { text-align: right; }

  .tax th { background: #eef1f6; font-weight: 700; font-size: 10px; padding: 4.5px 4px; border: 1.3px solid #111; border-top: none; }
  .tax td { text-align: center; padding: 4.5px 4px; border: 1.3px solid #111; font-size: 10.2px; }
  .tax th:first-child, .tax td:first-child { border-left: none; }
  .tax th:last-child, .tax td:last-child { border-right: none; }
  .tax tr.b td { font-weight: 700; }

  .words { display: flex; justify-content: space-between; align-items: flex-start; padding: 9px 13px 9px; border-bottom: 1.3px solid #111; }
  .words-title { font-weight: 700; font-size: 10.2px; margin-bottom: 3px; }
  .summary { width: auto; min-width: 230px; font-size: 10.2px; }
  .summary td { padding: 0.5px 0 0.5px 14px; text-align: right; }
  .summary td:first-child { color: #333; }
  .summary tr.grand td { font-weight: 700; font-size: 11.3px; color: #111; padding-top: 1px; }
  .pay { font-weight: 700; }
  .pay-paid { color: #1e7f4c; }
  .pay-unpaid { color: #b42318; }
  .pay-partially-paid { color: #b45309; }

  .footer { display: flex; border-bottom: 1.3px solid #111; }
  .bank { width: 30.1%; padding: 12px 13px; border-right: 1.3px solid #111; font-size: 10.2px; }
  .terms { width: 41.8%; padding: 12px 13px; border-right: 1.3px solid #111; font-size: 9.6px; }
  .sign { width: 28.1%; padding: 14px 10px; text-align: center; font-size: 10.2px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .section-title { font-weight: 700; font-size: 11.3px; margin-bottom: 10px; }
  .bank div { margin-bottom: 4px; }
  .terms ul { margin: 0; padding-left: 15px; }
  .terms li { margin-bottom: 3px; line-height: 1.42; }
  .stamp { width: 82px; height: 82px; object-fit: contain; margin-bottom: 8px; }
  .stamp-space { height: 82px; }
  .sign-for { margin-bottom: 4px; }
  .sign-name { font-weight: 700; }
  .bottom { text-align: right; font-weight: 700; font-size: 9.2px; padding: 6px 10px; }
</style>
</head>
<body>
<div class="page">
  <div class="invoice">
    <div class="header">
      <div class="header-left">
        ${logo ? `<img class="logo" src="${logo}" />` : ''}
        <div>
          <div class="company-name">${esc(company.name)}</div>
          ${company.subtitle ? `<div class="company-sub">${esc(company.subtitle)}</div>` : ''}
          ${company.address ? `<div class="company-line">${esc(company.address)}</div>` : ''}
          ${contactLine ? `<div class="company-line">${contactLine}</div>` : ''}
          ${company.email ? `<div class="company-line"><b>Email:</b> ${esc(company.email)}</div>` : ''}
          ${company.udyamNumber ? `<div class="company-line"><b>UDYAM REGISTRATION:</b> ${esc(company.udyamNumber)}</div>` : ''}
          ${company.website ? `<div class="company-line"><b>Website:</b> ${esc(company.website)}</div>` : ''}
        </div>
      </div>
      <div class="header-right">
        ${company.tagline ? `<div class="tagline">"${esc(company.tagline)}"</div>` : ''}
        <div class="badge">${badge}</div>
        <div class="meta"><b>Invoice No.:</b> ${esc(data.invoiceNumber)}</div>
        <div class="meta"><b>Invoice Date:</b> ${formatDate(data.invoiceDate)}</div>
        <div class="original">ORIGINAL FOR RECIPIENT</div>
        ${options.draft ? '<div class="draft">PREVIEW – number is assigned on save</div>' : ''}
      </div>
    </div>

    <div class="parties">
      ${partyBlock('BILL TO', data.customerDetails)}
      ${partyBlock('SHIP TO', data.shipTo)}
    </div>

    <table class="items">
      <thead>
        <tr>
          <th style="width:6%">S.NO.</th>
          <th style="width:45%">ITEMS</th>
          <th style="width:13%">WARRANTY</th>
          <th style="width:13%">RATE</th>
          <th style="width:8%">QTY.</th>
          <th style="width:15%">AMOUNT</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
        ${filler ? `<tr class="filler"><td style="height:${filler}px"></td><td></td><td></td><td></td><td></td><td></td></tr>` : ''}
        <tr class="total">
          <td class="label" colspan="3">TOTAL</td>
          <td></td>
          <td>${qtyText(totalQty)}</td>
          <td>${money(data.subtotal)}</td>
        </tr>
      </tbody>
    </table>

    <table class="tax">
      <thead>${taxHead}</thead>
      <tbody>${taxRows}</tbody>
    </table>

    <div class="words">
      <div>
        <div class="words-title">Total Amount (in words)</div>
        <div>${esc(data.amountInWords)}</div>
      </div>
      ${summary}
    </div>

    <div class="footer">
      <div class="bank">
        <div class="section-title">Bank Details</div>
        ${company.bank?.accountName ? `<div><b>Name:</b> ${esc(company.bank.accountName)}</div>` : ''}
        ${company.bank?.ifscCode ? `<div><b>IFSC Code:</b> ${esc(company.bank.ifscCode)}</div>` : ''}
        ${company.bank?.accountNumber ? `<div><b>Account No:</b> ${esc(company.bank.accountNumber)}</div>` : ''}
        ${company.bank?.bankName ? `<div><b>Bank:</b> ${esc(company.bank.bankName)}</div>` : ''}
      </div>
      <div class="terms">
        <div class="section-title">Terms and Conditions</div>
        <ul>${(company.terms ?? []).map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      </div>
      <div class="sign">
        ${signature ? `<img class="stamp" src="${signature}" />` : '<div class="stamp-space"></div>'}
        <div class="sign-for">Authorized Signatory For</div>
        <div class="sign-name">${esc(company.name)}</div>
      </div>
    </div>
    <div class="bottom">ORIGINAL FOR RECIPIENT</div>
  </div>
</div>
</body>
</html>`;
}
