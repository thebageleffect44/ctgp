import { Router, Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { getAuditEvents } from '../services/auditService.js';

const router = Router();
router.use(authenticate);

// Restricted to OWNER, FINANCE_ADMIN, and AUDITOR
router.get('/', requireRole(['OWNER', 'FINANCE_ADMIN', 'AUDITOR']), async (req: Request, res: Response, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    const data = await getAuditEvents(req.user!.organizationId, limit, offset);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
});

export default router;
