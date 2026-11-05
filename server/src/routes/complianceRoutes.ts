import { Router, Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  getDashboardMetrics,
  listComplianceAlerts,
  updateAlertStatus,
} from '../services/complianceService.js';

const router = Router();
router.use(authenticate);

// Get real-time dashboard metrics
router.get('/metrics', async (req: Request, res: Response, next) => {
  try {
    const metrics = await getDashboardMetrics(req.user!.organizationId);
    res.json({ success: true, data: metrics });
  } catch (err) {
    next(err);
  }
});

// List compliance alerts
router.get('/alerts', async (req: Request, res: Response, next) => {
  try {
    const alerts = await listComplianceAlerts(req.user!.organizationId, {
      status: req.query.status as string,
      severity: req.query.severity as string,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
    });
    res.json({ success: true, data: alerts });
  } catch (err) {
    next(err);
  }
});

// Update alert status (Acknowledge, Assign, Resolve)
router.patch('/alerts/:id', requireRole(['OWNER', 'FINANCE_ADMIN', 'ACCOUNTS_PAYABLE']), async (req: Request, res: Response, next) => {
  try {
    const updated = await updateAlertStatus(
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
