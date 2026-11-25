import { LeadModel } from '../models/Lead.js';
import { InvoiceModel } from '../models/Invoice.js';

export async function getDashboard() {
  const listFields = 'customerName mobileNumber address status leadDate dealCompletedAt createdAt';
  const [totalLeads, pendingLeads, dealsDone, totalInvoices, revenue, recentLeads, recentDeals, recentInvoices] =
    await Promise.all([
      LeadModel.countDocuments(),
      LeadModel.countDocuments({ status: 'Pending' }),
      LeadModel.countDocuments({ status: 'Deal Done' }),
      InvoiceModel.countDocuments(),
      InvoiceModel.aggregate<{ total: number; paid: number }>([
        {
          $group: {
            _id: null,
            total: { $sum: '$grandTotal' },
            paid: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, '$grandTotal', 0] } },
          },
        },
      ]),
      LeadModel.find().sort({ createdAt: -1 }).limit(5).select(listFields),
      LeadModel.find({ status: 'Deal Done' }).sort({ dealCompletedAt: -1 }).limit(5).select(listFields),
      InvoiceModel.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('invoiceNumber customerDetails invoiceDate grandTotal paymentStatus leadId createdAt'),
    ]);

  return {
    stats: {
      totalLeads,
      pendingLeads,
      dealsDone,
      totalInvoices,
      totalInvoiced: Math.round((revenue[0]?.total ?? 0) * 100) / 100,
      totalPaid: Math.round((revenue[0]?.paid ?? 0) * 100) / 100,
    },
    recentLeads,
    recentDeals,
    recentInvoices,
  };
}
