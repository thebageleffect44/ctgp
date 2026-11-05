"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const supplierService_js_1 = require("../services/supplierService.js");
const router = (0, express_1.Router)();
router.use(auth_js_1.authenticate);
// List suppliers with filters
router.get('/', async (req, res, next) => {
    try {
        const suppliers = await (0, supplierService_js_1.listSuppliers)(req.user.organizationId, {
            search: req.query.search,
            msmeType: req.query.msmeType,
            verificationStatus: req.query.verificationStatus,
        });
        res.json({ success: true, data: suppliers });
    }
    catch (err) {
        next(err);
    }
});
// Get single supplier with invoices
router.get('/:id', async (req, res, next) => {
    try {
        const supplier = await (0, supplierService_js_1.getSupplierById)(req.user.organizationId, req.params.id);
        if (!supplier) {
            return res.status(404).json({ success: false, error: 'Supplier not found' });
        }
        res.json({ success: true, data: supplier });
    }
    catch (err) {
        next(err);
    }
});
// Create new supplier
router.post('/', (0, auth_js_1.requireRole)(['OWNER', 'FINANCE_ADMIN', 'ACCOUNTS_PAYABLE']), async (req, res, next) => {
    try {
        const supplier = await (0, supplierService_js_1.createSupplier)(req.user.organizationId, req.body, { userId: req.user.id, userEmail: req.user.email });
        res.status(201).json({ success: true, data: supplier });
    }
    catch (err) {
        next(err);
    }
});
// Update supplier
router.patch('/:id', (0, auth_js_1.requireRole)(['OWNER', 'FINANCE_ADMIN', 'ACCOUNTS_PAYABLE']), async (req, res, next) => {
    try {
        const updated = await (0, supplierService_js_1.updateSupplier)(req.user.organizationId, req.params.id, req.body, { userId: req.user.id, userEmail: req.user.email });
        res.json({ success: true, data: updated });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
