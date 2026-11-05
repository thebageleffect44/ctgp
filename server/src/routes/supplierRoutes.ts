import { Router, Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  listSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
} from '../services/supplierService.js';
import prisma from '../db/prisma.js';

const router = Router();
router.use(authenticate);

// List suppliers with filters
router.get('/', async (req: Request, res: Response, next) => {
  try {
    const suppliers = await listSuppliers(req.user!.organizationId, {
      search: req.query.search as string,
      msmeType: req.query.msmeType as string,
      verificationStatus: req.query.verificationStatus as string,
    });

    res.json({ success: true, data: suppliers });
  } catch (err) {
    next(err);
  }
});

// Get single supplier with invoices
router.get('/:id', async (req: Request, res: Response, next) => {
  try {
    const supplier = await getSupplierById(req.user!.organizationId, req.params.id);
    if (!supplier) {
      return res.status(404).json({ success: false, error: 'Supplier not found' });
    }
    res.json({ success: true, data: supplier });
  } catch (err) {
    next(err);
  }
});

// Create new supplier
router.post('/', requireRole(['OWNER', 'FINANCE_ADMIN', 'ACCOUNTS_PAYABLE']), async (req: Request, res: Response, next) => {
  try {
    const supplier = await createSupplier(
      req.user!.organizationId,
      req.body,
      { userId: req.user!.id, userEmail: req.user!.email }
    );
    res.status(201).json({ success: true, data: supplier });
  } catch (err) {
    next(err);
  }
});

// Update supplier
router.patch('/:id', requireRole(['OWNER', 'FINANCE_ADMIN', 'ACCOUNTS_PAYABLE']), async (req: Request, res: Response, next) => {
  try {
    const updated = await updateSupplier(
      req.user!.organizationId,
      req.params.id,
      req.body,
      { userId: req.user!.id, userEmail: req.user!.email }
    );
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

export default router;
