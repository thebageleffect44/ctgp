"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const invoiceService_js_1 = require("../services/invoiceService.js");
const prisma_js_1 = __importDefault(require("../db/prisma.js"));
const auditService_js_1 = require("../services/auditService.js");
const router = (0, express_1.Router)();
router.use(auth_js_1.authenticate);
// List invoices
router.get('/', async (req, res, next) => {
    try {
        const result = await (0, invoiceService_js_1.listInvoices)(req.user.organizationId, {
            supplierId: req.query.supplierId,
            paymentStatus: req.query.paymentStatus,
            complianceStatus: req.query.complianceStatus,
            search: req.query.search,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            page: req.query.page ? parseInt(req.query.page, 10) : 1,
            limit: req.query.limit ? parseInt(req.query.limit, 10) : 50,
        });
        res.json({ success: true, ...result });
    }
    catch (err) {
        next(err);
    }
});
// Get single invoice
router.get('/:id', async (req, res, next) => {
    try {
        const invoice = await (0, invoiceService_js_1.getInvoiceById)(req.user.organizationId, req.params.id);
        if (!invoice) {
            return res.status(404).json({ success: false, error: 'Invoice not found' });
        }
        res.json({ success: true, data: invoice });
    }
    catch (err) {
        next(err);
    }
});
// Create invoice
router.post('/', (0, auth_js_1.requireRole)(['OWNER', 'FINANCE_ADMIN', 'ACCOUNTS_PAYABLE']), async (req, res, next) => {
    try {
        const invoice = await (0, invoiceService_js_1.createInvoice)(req.user.organizationId, req.body, { userId: req.user.id, userEmail: req.user.email });
        res.status(201).json({ success: true, data: invoice });
    }
    catch (err) {
        next(err);
    }
});
// Record a payment against an invoice
router.post('/:id/payments', (0, auth_js_1.requireRole)(['OWNER', 'FINANCE_ADMIN', 'ACCOUNTS_PAYABLE']), async (req, res, next) => {
    try {
        const result = await (0, invoiceService_js_1.recordPayment)(req.user.organizationId, req.params.id, req.body, { userId: req.user.id, userEmail: req.user.email });
        res.status(201).json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
});
// Delete invoice (restricted to OWNER or FINANCE_ADMIN)
router.delete('/:id', (0, auth_js_1.requireRole)(['OWNER', 'FINANCE_ADMIN']), async (req, res, next) => {
    try {
        const invoice = await prisma_js_1.default.invoice.findFirst({
            where: { id: req.params.id, organizationId: req.user.organizationId },
        });
        if (!invoice) {
            return res.status(404).json({ success: false, error: 'Invoice not found' });
        }
        await prisma_js_1.default.invoice.delete({ where: { id: req.params.id } });
        await (0, auditService_js_1.logAuditEvent)({
            organizationId: req.user.organizationId,
            userId: req.user.id,
            userEmail: req.user.email,
            action: 'DELETE',
            entityType: 'INVOICE',
            entityId: req.params.id,
            details: { invoiceNumber: invoice.invoiceNumber, amount: invoice.principalAmount },
        });
        res.json({ success: true, message: 'Invoice deleted successfully.' });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
