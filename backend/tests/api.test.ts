import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import type { Express } from 'express';

let mongo: MongoMemoryReplSet;
let app: Express;
let token: string;
const auth = () => ({ Authorization: `Bearer ${token}` });

beforeAll(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.MONGODB_URI = mongo.getUri();
  process.env.JWT_SECRET = 'test-secret-test-secret-123';
  process.env.NODE_ENV = 'test';
  process.env.ADMIN_EMAIL = 'admin@test.com';
  process.env.ADMIN_PASSWORD = 'Password@123';
  process.env.UPLOAD_DIR = 'tmp-test-uploads';
  const { connectDatabase } = await import('../src/config/db.js');
  const { createApp } = await import('../src/app.js');
  const { ensureAdminUser } = await import('../src/services/auth.service.js');
  await connectDatabase(mongo.getUri());
  await mongoose.syncIndexes();
  await ensureAdminUser();
  app = createApp();
  const res = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'Password@123' });
  token = res.body.data.token;
}, 120_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
  const fs = await import('node:fs/promises');
  await fs.rm('tmp-test-uploads', { recursive: true, force: true });
});

describe('auth', () => {
  it('rejects requests without a token', async () => {
    const res = await request(app).get('/api/leads');
    expect(res.status).toBe(401);
  });
  it('rejects a wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'nope' });
    expect(res.status).toBe(401);
  });
  it('returns the current user without the password hash', async () => {
    const res = await request(app).get('/api/auth/me').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('admin@test.com');
    expect(res.body.data.passwordHash).toBeUndefined();
  });
});

describe('leads and invoices', () => {
  let leadId: string;

  it('validates required lead fields', async () => {
    const res = await request(app).post('/api/leads').set(auth()).send({ customerName: '', mobileNumber: '123' });
    expect(res.status).toBe(400);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it('creates a lead as Pending even if another status is sent', async () => {
    const res = await request(app).post('/api/leads').set(auth()).send({
      customerName: 'Sudhan Puranik',
      mobileNumber: '+91 94048 19055',
      address: 'B 702 puraniks abitante, near crystal honda showroom bavdhan pune 411021',
      status: 'Deal Done',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('Pending');
    expect(res.body.data.mobileNumber).toBe('9404819055');
    expect(res.body.data.leadDate).toBeTruthy();
    leadId = res.body.data._id;
  });

  it('searches, filters and sorts leads', async () => {
    await request(app).post('/api/leads').set(auth()).send({ customerName: 'Asha Patil', mobileNumber: '9876543210', address: 'Nerul, Navi Mumbai' });
    const byName = await request(app).get('/api/leads?search=sudhan').set(auth());
    expect(byName.body.data).toHaveLength(1);
    const byMobile = await request(app).get('/api/leads?search=98765').set(auth());
    expect(byMobile.body.data[0].customerName).toBe('Asha Patil');
    const pending = await request(app).get('/api/leads?status=Pending').set(auth());
    expect(pending.body.meta.total).toBe(2);
    const oldest = await request(app).get('/api/leads?sort=oldest').set(auth());
    expect(oldest.body.data[0].customerName).toBe('Sudhan Puranik');
  });

  it('refuses to invoice a Pending lead', async () => {
    const res = await request(app).post('/api/invoices').set(auth()).send({
      leadId,
      items: [{ name: 'DELL LATITUDE 5420', quantity: 1, rate: 33000 }],
    });
    expect(res.status).toBe(400);
  });

  it('marks a deal done and records the completion date', async () => {
    const res = await request(app).patch(`/api/leads/${leadId}/status`).set(auth()).send({ status: 'Deal Done' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Deal Done');
    expect(res.body.data.dealCompletedAt).toBeTruthy();
  });

  let invoiceId: string;
  it('creates an invoice with server-side totals and a formatted number', async () => {
    await request(app).put('/api/settings').set(auth()).send({ invoice: { startNumber: 19 } });
    const res = await request(app)
      .post('/api/invoices')
      .set(auth())
      .send({
        leadId,
        clientRequestId: 'req-abc-123456',
        invoiceDate: '2026-11-19',
        items: [
          { name: 'DELL LATITUDE 5420', description: 'Intel Core i5 | 11th Gen\n8GB RAM | 512GB SSD', warranty: '3 months', quantity: 1, rate: 33000 },
          { name: 'Laptop bag', quantity: 3, rate: 333.33 },
        ],
        discount: 500,
        gstRate: 18,
        paymentStatus: 'Paid',
      });
    expect(res.status).toBe(201);
    const inv = res.body.data;
    expect(inv.invoiceNumber).toBe('PRI/2026-27/0019');
    expect(inv.items[1].amount).toBe(999.99);
    expect(inv.subtotal).toBe(33999.99);
    expect(inv.taxDetails.taxableValue).toBe(33499.99);
    expect(inv.taxDetails.cgstRate).toBe(9);
    expect(inv.taxDetails.cgstAmount).toBe(3015);
    expect(inv.taxDetails.sgstAmount).toBe(3015);
    expect(inv.grandTotal).toBe(39529.99);
    expect(inv.amountInWords).toBe('Thirty Nine Thousand Five Hundred Twenty Nine Rupees and Ninety Nine Paise Only');
    expect(inv.customerDetails.name).toBe('Sudhan Puranik');
    expect(inv.shipTo.name).toBe('Sudhan Puranik');
    expect(inv.company.name).toBe('PR INFINITY SOLUTIONS');
    invoiceId = inv._id;
  });

  it('returns the same invoice when the same request is sent twice', async () => {
    const body = { leadId, clientRequestId: 'req-abc-123456', items: [{ name: 'X', quantity: 1, rate: 1 }] };
    const res = await request(app).post('/api/invoices').set(auth()).send(body);
    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(invoiceId);
  });

  it('issues unique numbers under concurrent requests', async () => {
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        request(app).post('/api/invoices').set(auth()).send({ leadId, clientRequestId: `parallel-${i}-xxxx`, items: [{ name: 'Service', quantity: 1, rate: 100 }] }),
      ),
    );
    const numbers = results.map((r) => r.body.data.invoiceNumber);
    expect(results.every((r) => r.status === 201)).toBe(true);
    expect(new Set(numbers).size).toBe(8);
  });

  it('keeps issued invoices unchanged when the lead is edited', async () => {
    await request(app).put(`/api/leads/${leadId}`).set(auth()).send({ customerName: 'Sudhan P. (edited)' });
    const res = await request(app).get(`/api/invoices/${invoiceId}`).set(auth());
    expect(res.body.data.customerDetails.name).toBe('Sudhan Puranik');
  });

  it('blocks moving a lead with invoices back to Pending', async () => {
    const res = await request(app).patch(`/api/leads/${leadId}/status`).set(auth()).send({ status: 'Pending' });
    expect(res.status).toBe(409);
  });

  it('lists invoices per customer and updates payment status', async () => {
    const list = await request(app).get(`/api/invoices?leadId=${leadId}`).set(auth());
    expect(list.body.meta.total).toBe(9);
    expect(list.body.data[0].company.logo).toBeUndefined();
    const upd = await request(app).patch(`/api/invoices/${invoiceId}/payment-status`).set(auth()).send({ paymentStatus: 'Unpaid' });
    expect(upd.body.data.paymentStatus).toBe('Unpaid');
    expect(upd.body.data.grandTotal).toBe(39529.99);
  });

  it('stores and serves the invoice PDF', async () => {
    const pdf = Buffer.from('%PDF-1.4\n%test\n');
    const up = await request(app).post(`/api/invoices/${invoiceId}/pdf`).set(auth()).attach('file', pdf, { filename: 'a.pdf', contentType: 'application/pdf' });
    expect(up.status).toBe(200);
    expect(up.body.data.pdfUrl).toBe(`/api/invoices/${invoiceId}/pdf`);
    const down = await request(app).get(`/api/invoices/${invoiceId}/pdf`).set(auth());
    expect(down.status).toBe(200);
    expect(down.headers['content-type']).toContain('application/pdf');
  });

  it('reports dashboard stats', async () => {
    const res = await request(app).get('/api/dashboard').set(auth());
    expect(res.body.data.stats).toMatchObject({ totalLeads: 2, pendingLeads: 1, dealsDone: 1, totalInvoices: 9 });
    expect(res.body.data.recentInvoices).toHaveLength(5);
    expect(res.body.data.recentDeals[0]._id).toBe(leadId);
  });

  it('deletes a lead but keeps its invoices', async () => {
    const res = await request(app).delete(`/api/leads/${leadId}`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data.invoicesKept).toBe(9);
    const gone = await request(app).get(`/api/leads/${leadId}`).set(auth());
    expect(gone.status).toBe(404);
  });

  it('rejects malformed ids and invalid settings', async () => {
    expect((await request(app).get('/api/leads/not-an-id').set(auth())).status).toBe(400);
    const bad = await request(app).put('/api/settings').set(auth()).send({ company: { gstin: 'short' } });
    expect(bad.status).toBe(400);
  });
});
