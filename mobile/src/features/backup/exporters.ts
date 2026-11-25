import { Platform } from 'react-native';
import * as XLSX from 'xlsx';
import * as Print from 'expo-print';
import { Directory, File, Paths } from 'expo-file-system';
import { exportBackup, invoicesApi, leadsApi } from '../../data/localApi';
import { renderInvoiceHtml } from '../invoices/invoiceTemplate';
import { formatDate, invoiceFileName } from '../../utils/format';
import type { Invoice, Lead } from '../../types/models';

/**
 * Exports for "Backup & restore": everything is written into a folder the user picks
 * in the phone's storage (e.g. Download/PR Infinity), so the files are visible in the
 * Files app, can be copied to a computer, and survive uninstalling the app.
 */

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const today = () => new Date().toISOString().slice(0, 10);

/** Asks the user for a folder (Android). Returns null if they cancel. */
export async function pickFolder(): Promise<Directory | null> {
  try {
    return await Directory.pickDirectoryAsync();
  } catch {
    return null;
  }
}

async function writeFile(folder: Directory, name: string, mime: string, data: string | Uint8Array) {
  const base = name.replace(/\.[^.]+$/, '');
  // Android's folder picker adds the extension from the MIME type.
  const file = folder.createFile(Platform.OS === 'android' ? base : name, mime);
  await file.write(data);
  return file;
}

async function allLeads(): Promise<Lead[]> {
  return (await leadsApi.list({ sort: 'oldest', page: 1, limit: 1_000_000 })).items;
}
async function allInvoices(): Promise<Invoice[]> {
  return (await invoicesApi.list({ sort: 'oldest', page: 1, limit: 1_000_000 })).items;
}

function sheet(rows: Record<string, unknown>[], widths: number[]) {
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Note: 'No records yet' }]);
  ws['!cols'] = widths.map((wch) => ({ wch }));
  return ws;
}

/** One Excel workbook with Leads, Invoices and Invoice Items sheets. */
export async function buildExcel(): Promise<{ bytes: Uint8Array; leads: number; invoices: number }> {
  const [leads, invoices] = await Promise.all([allLeads(), allInvoices()]);

  const leadRows = leads.map((l, i) => ({
    'S.No': i + 1,
    'Customer Name': l.customerName,
    'Mobile Number': l.mobileNumber,
    Address: l.address,
    Email: l.email,
    'Lead Date': formatDate(l.leadDate),
    Status: l.status,
    'Deal Completed On': l.dealCompletedAt ? formatDate(l.dealCompletedAt) : '',
    Invoices: l.invoiceCount ?? 0,
    Notes: l.description,
  }));

  const invoiceRows = invoices.map((v, i) => ({
    'S.No': i + 1,
    'Invoice No.': v.invoiceNumber,
    'Invoice Date': formatDate(v.invoiceDate),
    'Customer Name': v.customerDetails.name,
    Mobile: v.customerDetails.mobileNumber,
    Address: v.customerDetails.address,
    Items: v.items.map((it) => it.name).join(', '),
    Subtotal: v.subtotal,
    Discount: v.discount,
    'Taxable Value': v.taxDetails.taxableValue,
    'GST %': v.taxDetails.gstRate,
    CGST: v.taxDetails.cgstAmount,
    SGST: v.taxDetails.sgstAmount,
    IGST: v.taxDetails.igstAmount,
    'Total Tax': v.taxDetails.totalTax,
    'Grand Total': v.grandTotal,
    'Payment Status': v.paymentStatus,
  }));

  const itemRows = invoices.flatMap((v) =>
    v.items.map((it, j) => ({
      'Invoice No.': v.invoiceNumber,
      'Invoice Date': formatDate(v.invoiceDate),
      Customer: v.customerDetails.name,
      'Item No.': j + 1,
      Item: it.name,
      Specifications: it.description.replace(/\n/g, ' | '),
      Warranty: it.warranty,
      Qty: it.quantity,
      Rate: it.rate,
      Amount: it.amount,
    })),
  );

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet(leadRows, [6, 24, 14, 45, 26, 12, 11, 16, 9, 40]), 'Leads');
  XLSX.utils.book_append_sheet(wb, sheet(invoiceRows, [6, 20, 12, 24, 13, 45, 35, 12, 10, 13, 7, 10, 10, 10, 11, 13, 14]), 'Invoices');
  XLSX.utils.book_append_sheet(wb, sheet(itemRows, [20, 12, 24, 8, 30, 50, 12, 6, 12, 12]), 'Invoice Items');
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return { bytes: new Uint8Array(out), leads: leads.length, invoices: invoices.length };
}

export interface ExportResult {
  files: number;
  leads: number;
  invoices: number;
}

/**
 * Full export into one folder: backup file (for Restore), Excel workbook, and every invoice as a PDF.
 * `onProgress` reports PDF progress, e.g. "PDF 3 of 12".
 */
export async function exportEverything(
  folder: Directory,
  parts: { backup: boolean; excel: boolean; pdfs: boolean },
  onProgress?: (text: string) => void,
): Promise<ExportResult> {
  let files = 0;
  let leads = 0;
  let invoices = 0;

  if (parts.backup) {
    onProgress?.('Saving backup file…');
    await writeFile(folder, `PR-Infinity-backup-${today()}.json`, 'application/json', await exportBackup());
    files++;
  }

  if (parts.excel) {
    onProgress?.('Creating Excel file…');
    const x = await buildExcel();
    await writeFile(folder, `PR-Infinity-data-${today()}.xlsx`, XLSX_MIME, x.bytes);
    leads = x.leads;
    invoices = x.invoices;
    files++;
  }

  if (parts.pdfs) {
    const list = await allInvoices();
    invoices = list.length;
    for (let i = 0; i < list.length; i++) {
      onProgress?.(`Saving invoice PDF ${i + 1} of ${list.length}…`);
      const full = await invoicesApi.get(list[i]._id);
      const { uri } = await Print.printToFileAsync({ html: renderInvoiceHtml(full), width: 595, height: 842 });
      const tmp = new File(uri);
      await writeFile(folder, invoiceFileName(full.invoiceNumber), 'application/pdf', await tmp.bytes());
      tmp.delete();
      files++;
    }
  }

  return { files, leads, invoices };
}

/** Writes the Excel file to the app cache, for sharing (iOS / quick share). */
export async function excelToCache(): Promise<File> {
  const x = await buildExcel();
  const f = new File(Paths.cache, `PR-Infinity-data-${today()}.xlsx`);
  if (f.exists) f.delete();
  f.create();
  await f.write(x.bytes);
  return f;
}
