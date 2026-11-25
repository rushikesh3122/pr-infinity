import { SettingsModel } from '../models/Settings.js';
import type { UpdateSettingsInput } from '../validators/settings.validator.js';
import { DEFAULT_LOGO, DEFAULT_SIGNATURE } from '../assets/defaultImages.js';

/** First-run defaults, taken from the supplied PR Infinity invoice. Everything is editable in the app. */
export const DEFAULT_SETTINGS = {
  company: {
    name: 'PR INFINITY SOLUTIONS',
    subtitle: 'Laptop & IT Solutions',
    tagline: 'Powerful Laptops, Honest Prices.',
    address:
      '14/06, Hanuman Mandir Rd, NL - 4 Type, Sector 11, Nerul, "Inventory Storage Location", Navi Mumbai, Maharashtra 400706',
    mobile: '8104879377',
    email: 'sales@prinfinitytech.com',
    website: 'prinfinitytech.com',
    gstin: '27EPXPK0265K1Z7',
    udyamNumber: 'UDYAM-MH-33-0644834',
    logo: DEFAULT_LOGO,
    signature: DEFAULT_SIGNATURE,
    bank: {
      accountName: 'PR Infinity Solutions',
      ifscCode: 'SBIN0011785',
      accountNumber: '45421910961',
      bankName: 'State Bank of India, NERUL EAST',
    },
    terms: [
      'Manufacturer warranty as per brand policy and invoice.',
      'Physical/liquid damage, misuse and unauthorized repairs are not covered.',
      'Original invoice is mandatory for warranty claims.',
      'Warranty claims must be raised with the manufacturer or authorized service centre, as applicable.',
      'Products are non-refundable and non-returnable, except where required under applicable law',
    ],
  },
  invoice: {
    prefix: 'PRI',
    startNumber: 1,
    defaultGstRate: 0,
    defaultTaxType: 'CGST_SGST' as const,
    defaultWarranty: '3 months',
  },
};

export async function getSettings() {
  const existing = await SettingsModel.findOne({ key: 'default' });
  if (existing) return existing;
  return SettingsModel.findOneAndUpdate(
    { key: 'default' },
    { $setOnInsert: { key: 'default', ...DEFAULT_SETTINGS } },
    { upsert: true, returnDocument: 'after' },
  ).orFail();
}

/** Flattens nested input into dotted $set paths so a partial update never wipes sibling fields. */
function toDottedPaths(input: Record<string, unknown>, prefix = '', out: Record<string, unknown> = {}) {
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) toDottedPaths(value as Record<string, unknown>, path, out);
    else out[path] = value;
  }
  return out;
}

export async function updateSettings(input: UpdateSettingsInput) {
  await getSettings();
  const $set = toDottedPaths(input as Record<string, unknown>);
  if (Object.keys($set).length === 0) return getSettings();
  return SettingsModel.findOneAndUpdate({ key: 'default' }, { $set }, { returnDocument: 'after', runValidators: true }).orFail();
}
