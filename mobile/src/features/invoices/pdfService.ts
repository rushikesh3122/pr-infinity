import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Directory, File, Paths } from 'expo-file-system';
import type { Invoice } from '../../types/models';
import { invoiceFileName } from '../../utils/format';
import { renderInvoiceHtml } from './invoiceTemplate';

/** A4 in points: expo-print sizes the page from these. */
const A4 = { width: 595, height: 842 };
const PDF_MIME = 'application/pdf';

const invoicesDir = () => {
  const dir = new Directory(Paths.document, 'invoices');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
};

export const invoiceHtml = (invoice: Invoice) => renderInvoiceHtml(invoice);

/**
 * Returns the invoice PDF on this device: the saved copy in the app's documents folder,
 * or a fresh render from the invoice's frozen snapshot (same document every time).
 */
export async function getInvoicePdf(invoice: Invoice): Promise<File> {
  const target = new File(invoicesDir(), invoiceFileName(invoice.invoiceNumber));
  if (target.exists && target.size > 0) return target;
  const { uri } = await Print.printToFileAsync({ html: invoiceHtml(invoice), ...A4 });
  new File(uri).move(target);
  return target;
}

/** Opens the PDF in the phone's PDF viewer; falls back to the share sheet. */
export async function openPdf(file: File, title: string) {
  if (await file.canPreview({ mimeType: PDF_MIME }).catch(() => false)) {
    await file.preview({ mimeType: PDF_MIME, title });
    return;
  }
  await sharePdf(file, title);
}

/** WhatsApp, Gmail, Drive and every other installed app appear in the share sheet. */
export async function sharePdf(file: File, title: string) {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(file.uri, { mimeType: PDF_MIME, UTI: 'com.adobe.pdf', dialogTitle: title });
}

export async function printInvoice(invoice: Invoice) {
  await Print.printAsync({ html: invoiceHtml(invoice), ...A4 });
}

export async function printHtml(html: string) {
  await Print.printAsync({ html, ...A4 });
}

/**
 * Saves a copy to a folder the user picks (e.g. Downloads) on Android.
 * iOS has no public folder, so the share sheet's "Save to Files" is used instead.
 * Returns false if the user cancelled.
 */
export async function savePdfToDevice(file: File, invoiceNumber: string): Promise<boolean> {
  if (Platform.OS !== 'android') {
    await sharePdf(file, invoiceNumber);
    return true;
  }
  let folder: Directory;
  try {
    folder = await Directory.pickDirectoryAsync();
  } catch {
    return false;
  }
  const name = invoiceFileName(invoiceNumber).replace(/\.pdf$/, '');
  const copy = folder.createFile(name, PDF_MIME);
  await copy.write(await file.bytes());
  return true;
}

/** Deletes the local cached copy so the next open regenerates or redownloads it. */
export function clearCachedPdf(invoiceNumber: string) {
  const f = new File(invoicesDir(), invoiceFileName(invoiceNumber));
  if (f.exists) f.delete();
}
