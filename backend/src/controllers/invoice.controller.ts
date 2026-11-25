import fs from 'node:fs';
import type { Request, Response } from 'express';
import * as invoices from '../services/invoice.service.js';
import { createInvoiceSchema, listInvoicesQuery, updatePaymentStatusSchema } from '../validators/invoice.validator.js';
import { objectId } from '../validators/common.js';
import { ok } from '../utils/respond.js';
import { ApiError } from '../utils/ApiError.js';

const idParam = (req: Request) => objectId.parse(req.params.id);

export async function create(req: Request, res: Response) {
  const { invoice, created } = await invoices.createInvoice(createInvoiceSchema.parse(req.body), req.user?.sub);
  ok(res, invoice, created ? 201 : 200);
}

export async function list(req: Request, res: Response) {
  const { items, ...meta } = await invoices.listInvoices(listInvoicesQuery.parse(req.query));
  ok(res, items, 200, meta);
}

export async function get(req: Request, res: Response) {
  ok(res, await invoices.getInvoice(idParam(req)));
}

export async function nextNumber(_req: Request, res: Response) {
  ok(res, { invoiceNumber: await invoices.nextNumberPreview() });
}

export async function updatePaymentStatus(req: Request, res: Response) {
  const { paymentStatus } = updatePaymentStatusSchema.parse(req.body);
  ok(res, await invoices.updatePaymentStatus(idParam(req), paymentStatus));
}

export async function uploadPdf(req: Request, res: Response) {
  if (!req.file) throw ApiError.badRequest('Attach the PDF in a "file" field');
  ok(res, await invoices.attachPdf(idParam(req)));
}

export async function downloadPdf(req: Request, res: Response) {
  const id = idParam(req);
  const invoice = await invoices.getInvoice(id);
  const file = invoices.pdfFilePath(id);
  if (!fs.existsSync(file)) throw ApiError.notFound('PDF has not been uploaded for this invoice yet');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${invoice.invoiceNumber.replace(/\//g, '-')}.pdf"`);
  res.sendFile(file);
}
