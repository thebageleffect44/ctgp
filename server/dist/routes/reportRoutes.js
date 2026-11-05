"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const reportService_js_1 = require("../services/reportService.js");
const prisma_js_1 = __importDefault(require("../db/prisma.js"));
const router = (0, express_1.Router)();
router.use(auth_js_1.authenticate);
// MSME Form 1 preparation report
router.get('/msme-form-1', async (req, res, next) => {
    try {
        const report = await (0, reportService_js_1.generateMsmeForm1Report)(req.user.organizationId, {
            fiscalYear: req.query.fiscalYear,
            halfYear: req.query.halfYear,
        }, { userId: req.user.id, userEmail: req.user.email });
        if (req.query.format === 'csv') {
            const csv = (0, reportService_js_1.formatCsv)(report.records);
            res.header('Content-Type', 'text/csv');
            res.attachment(`MSME_Form_1_Prep_${new Date().toISOString().slice(0, 10)}.csv`);
            return res.send(csv);
        }
        res.json({ success: true, data: report });
    }
    catch (err) {
        next(err);
    }
});
// Section 43B(h) exposure report
router.get('/section-43b', async (req, res, next) => {
    try {
        const report = await (0, reportService_js_1.generateSection43bReport)(req.user.organizationId, { userId: req.user.id, userEmail: req.user.email });
        if (req.query.format === 'csv') {
            const csv = (0, reportService_js_1.formatCsv)(report.records);
            res.header('Content-Type', 'text/csv');
            res.attachment(`Section_43Bh_Disallowance_${new Date().toISOString().slice(0, 10)}.csv`);
            return res.send(csv);
        }
        res.json({ success: true, data: report });
    }
    catch (err) {
        next(err);
    }
});
// Invoices export
router.get('/invoices-export', async (req, res, next) => {
    try {
        const invoices = await prisma_js_1.default.invoice.findMany({
            where: { organizationId: req.user.organizationId },
            include: { supplier: true },
            orderBy: { invoiceDate: 'desc' },
        });
        const rows = invoices.map(i => ({
            'Invoice Number': i.invoiceNumber,
            'Supplier Name': i.supplier.name,
            'MSME Category': i.supplier.msmeType,
            'Udyam Number': i.supplier.udyamNumber || 'N/A',
            'Invoice Date': i.invoiceDate.toISOString().slice(0, 10),
            'Statutory Due Date': i.dueDate.toISOString().slice(0, 10),
            'Principal Amount (INR)': i.principalAmount,
            'Amount Paid (INR)': i.amountPaid,
            'Balance Due (INR)': Math.max(0, i.principalAmount - i.amountPaid),
            'Payment Status': i.paymentStatus,
            'Days Overdue': i.daysOverdue,
            'Accrued Statutory Interest (INR)': i.accruedInterest,
            'Section 43B Disallowance (INR)': i.section43bExposure,
            'Potential Tax Cost (INR)': i.potentialTaxImpact,
            'Compliance Status': i.complianceStatus,
        }));
        const csv = (0, reportService_js_1.formatCsv)(rows);
        res.header('Content-Type', 'text/csv');
        res.attachment(`Invoices_Export_${new Date().toISOString().slice(0, 10)}.csv`);
        res.send(csv);
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
