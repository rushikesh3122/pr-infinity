export type LeadStatus = 'Pending' | 'Deal Done';
export type PaymentStatus = 'Unpaid' | 'Partially Paid' | 'Paid';
export type TaxType = 'CGST_SGST' | 'IGST';
export type SortOrder = 'newest' | 'oldest';

export interface Lead {
  _id: string;
  customerName: string;
  mobileNumber: string;
  address: string;
  email: string;
  description: string;
  status: LeadStatus;
  leadDate: string;
  dealCompletedAt: string | null;
  invoiceCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Party {
  name: string;
  mobileNumber: string;
  address: string;
  email?: string;
}

export interface InvoiceItem {
  name: string;
  description: string;
  warranty: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface TaxDetails {
  taxType: TaxType;
  gstRate: number;
  taxableValue: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTax: number;
}

export interface BankDetails {
  accountName: string;
  ifscCode: string;
  accountNumber: string;
  bankName: string;
}

export interface CompanyDetails {
  name: string;
  subtitle: string;
  tagline: string;
  address: string;
  mobile: string;
  email: string;
  website: string;
  gstin: string;
  udyamNumber: string;
  logo: string;
  signature: string;
  bank: BankDetails;
  terms: string[];
}

export interface InvoiceSettings {
  prefix: string;
  startNumber: number;
  defaultGstRate: number;
  defaultTaxType: TaxType;
  defaultWarranty: string;
}

export interface AppSettings {
  _id: string;
  company: CompanyDetails;
  invoice: InvoiceSettings;
  updatedAt: string;
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  leadId: string;
  customerDetails: Party;
  shipTo: Party;
  invoiceDate: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  taxDetails: TaxDetails;
  grandTotal: number;
  amountInWords: string;
  paymentStatus: PaymentStatus;
  notes: string;
  company: CompanyDetails;
  pdfUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export interface DashboardData {
  stats: {
    totalLeads: number;
    pendingLeads: number;
    dealsDone: number;
    totalInvoices: number;
    totalInvoiced: number;
    totalPaid: number;
  };
  recentLeads: Lead[];
  recentDeals: Lead[];
  recentInvoices: Pick<Invoice, '_id' | 'invoiceNumber' | 'customerDetails' | 'invoiceDate' | 'grandTotal' | 'paymentStatus' | 'leadId' | 'createdAt'>[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
