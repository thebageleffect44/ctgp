"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const complianceService_js_1 = require("../services/complianceService.js");
const router = (0, express_1.Router)();
router.use(auth_js_1.authenticate);
// Get real-time dashboard metrics
router.get('/metrics', async (req, res, next) => {
    try {
        const metrics = await (0, complianceService_js_1.getDashboardMetrics)(req.user.organizationId);
        res.json({ success: true, data: metrics });
    }
    catch (err) {
        next(err);
    }
});
// List compliance alerts
router.get('/alerts', async (req, res, next) => {
    try {
        const alerts = await (0, complianceService_js_1.listComplianceAlerts)(req.user.organizationId, {
            status: req.query.status,
            severity: req.query.severity,
            limit: req.query.limit ? parseInt(req.query.limit, 10) : 50,
        });
        res.json({ success: true, data: alerts });
    }
    catch (err) {
        next(err);
    }
});
// Update alert status (Acknowledge, Assign, Resolve)
router.patch('/alerts/:id', (0, auth_js_1.requireRole)(['OWNER', 'FINANCE_ADMIN', 'ACCOUNTS_PAYABLE']), async (req, res, next) => {
    try {
        const updated = await (0, complianceService_js_1.updateAlertStatus)(req.user.organizationId, req.params.id, req.body, { userId: req.user.id, userEmail: req.user.email });
        res.json({ success: true, data: updated });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
