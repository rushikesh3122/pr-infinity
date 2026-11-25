import { CounterModel } from '../models/Counter.js';
import { financialYear } from '../utils/financialYear.js';

/**
 * Issues the next invoice number, e.g. "PRI/2026-27/0019".
 * The sequence restarts every financial year and is incremented atomically in MongoDB,
 * so two simultaneous requests can never receive the same number.
 * `startNumber` lets the business continue from its existing paper/PDF numbering.
 */
export async function nextInvoiceNumber(prefix: string, startNumber: number, date: Date): Promise<string> {
  const fy = financialYear(date);
  const key = `invoice:${prefix}:${fy}`;
  const counter = await CounterModel.findOneAndUpdate(
    { key },
    [{ $set: { key, seq: { $add: [{ $max: [{ $ifNull: ['$seq', 0] }, startNumber - 1] }, 1] } } }],
    { upsert: true, returnDocument: 'after', updatePipeline: true },
  ).orFail();
  return `${prefix}/${fy}/${String(counter.seq).padStart(4, '0')}`;
}

/** Preview of the number the next invoice will get, without reserving it. */
export async function peekInvoiceNumber(prefix: string, startNumber: number, date: Date): Promise<string> {
  const fy = financialYear(date);
  const counter = await CounterModel.findOne({ key: `invoice:${prefix}:${fy}` });
  const next = Math.max(counter?.seq ?? 0, startNumber - 1) + 1;
  return `${prefix}/${fy}/${String(next).padStart(4, '0')}`;
}
