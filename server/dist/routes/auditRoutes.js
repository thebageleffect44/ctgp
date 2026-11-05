"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const auditService_js_1 = require("../services/auditService.js");
const router = (0, express_1.Router)();
router.use(auth_js_1.authenticate);
// Restricted to OWNER, FINANCE_ADMIN, and AUDITOR
router.get('/', (0, auth_js_1.requireRole)(['OWNER', 'FINANCE_ADMIN', 'AUDITOR']), async (req, res, next) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
        const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;
        const data = await (0, auditService_js_1.getAuditEvents)(req.user.organizationId, limit, offset);
        res.json({ success: true, ...data });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
