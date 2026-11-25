import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/auth.js';
import * as leads from '../controllers/lead.controller.js';
import * as invoices from '../controllers/invoice.controller.js';
import * as misc from '../controllers/misc.controller.js';
import { env } from '../config/env.js';

const pdfDir = path.resolve(env.UPLOAD_DIR, 'invoices');
fs.mkdirSync(pdfDir, { recursive: true });

const pdfUpload = multer({
  storage: multer.diskStorage({
    destination: pdfDir,
    filename: (req, _file, cb) => cb(null, `${String(req.params.id).replace(/[^a-f0-9]/gi, '')}.pdf`),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype === 'application/pdf'),
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.NODE_ENV === 'test' ? 1000 : 20,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' },
});

export const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', time: new Date().toISOString() } });
});

// Auth
router.post('/auth/login', loginLimiter, misc.login);
router.get('/auth/me', requireAuth, misc.me);
router.put('/auth/password', requireAuth, misc.changePassword);

// Everything below requires a logged-in user.
router.use(requireAuth);

router.get('/dashboard', misc.dashboard);

router.get('/settings', misc.readSettings);
router.put('/settings', misc.writeSettings);

router.get('/leads', leads.list);
router.post('/leads', leads.create);
router.get('/leads/:id', leads.get);
router.put('/leads/:id', leads.update);
router.patch('/leads/:id/status', leads.updateStatus);
router.delete('/leads/:id', leads.remove);

router.get('/invoices', invoices.list);
router.get('/invoices/next-number', invoices.nextNumber);
router.post('/invoices', invoices.create);
router.get('/invoices/:id', invoices.get);
router.patch('/invoices/:id/payment-status', invoices.updatePaymentStatus);
router.post('/invoices/:id/pdf', pdfUpload.single('file'), invoices.uploadPdf);
router.get('/invoices/:id/pdf', invoices.downloadPdf);
