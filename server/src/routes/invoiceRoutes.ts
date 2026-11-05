import { Router, Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  listInvoices,
  getInvoiceById,
  createInvoice,
  recordPayment,
} from '../services/invoiceService.js';
import prisma from '../db/prisma.js';
import { logAuditEvent } from '../services/auditService.js';

const router = Router();
router.use(authenticate);

// List invoices
router.get('/', async (req: Request, res: Response, next) => {
  try {
    const result = await listInvoices(req.user!.organizationId, {
      supplierId: req.query.supplierId as string,
      paymentStatus: req.query.paymentStatus as string,
      complianceStatus: req.query.complianceStatus as string,
      search: req.query.search as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
    });

    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// Get single invoice
router.get('/:id', async (req: Request, res: Response, next) => {
  try {
    const invoice = await getInvoiceById(req.user!.organizationId, req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }
    res.json({ success: true, data: invoice });
  } catch (err) {
    next(err);
  }
});

// Create invoice
router.post('/', requireRole(['OWNER', 'FINANCE_ADMIN', 'ACCOUNTS_PAYABLE']), async (req: Request, res: Response, next) => {
  try {
    const invoice = await createInvoice(
      req.user!.organizationId,
      req.body,
      { userId: req.user!.id, userEmail: req.user!.email }
    );
    res.status(201).json({ success: true, data: invoice });
  } catch (err) {
    next(err);
  }
});

// Record a payment against an invoice
router.post('/:id/payments', requireRole(['OWNER', 'FINANCE_ADMIN', 'ACCOUNTS_PAYABLE']), async (req: Request, res: Response, next) => {
  try {
    const result = await recordPayment(
      req.user!.organizationId,
      req.params.id,
      req.body,
      { userId: req.user!.id, userEmail: req.user!.email }
    );
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// Delete invoice (restricted to OWNER or FINANCE_ADMIN)
router.delete('/:id', requireRole(['OWNER', 'FINANCE_ADMIN']), async (req: Request, res: Response, next) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
    });

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    await prisma.invoice.delete({ where: { id: req.params.id } });

    await logAuditEvent({
      organizationId: req.user!.organizationId,
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: 'DELETE',
      entityType: 'INVOICE',
      entityId: req.params.id,
      details: { invoiceNumber: invoice.invoiceNumber, amount: invoice.principalAmount },
    });

    res.json({ success: true, message: 'Invoice deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

export default router;
