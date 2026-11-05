import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  generateMsmeForm1Report,
  generateSection43bReport,
  formatCsv,
} from '../services/reportService.js';
import prisma from '../db/prisma.js';

const router = Router();
router.use(authenticate);

// MSME Form 1 preparation report
router.get('/msme-form-1', async (req: Request, res: Response, next) => {
  try {
    const report = await generateMsmeForm1Report(
      req.user!.organizationId,
      {
        fiscalYear: req.query.fiscalYear as string,
        halfYear: req.query.halfYear as any,
      },
      { userId: req.user!.id, userEmail: req.user!.email }
    );

    if (req.query.format === 'csv') {
      const csv = formatCsv(report.records);
      res.header('Content-Type', 'text/csv');
      res.attachment(`MSME_Form_1_Prep_${new Date().toISOString().slice(0, 10)}.csv`);
      return res.send(csv);
    }

    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
});

// Section 43B(h) exposure report
router.get('/section-43b', async (req: Request, res: Response, next) => {
  try {
    const report = await generateSection43bReport(
      req.user!.organizationId,
      { userId: req.user!.id, userEmail: req.user!.email }
    );

    if (req.query.format === 'csv') {
      const csv = formatCsv(report.records);
      res.header('Content-Type', 'text/csv');
      res.attachment(`Section_43Bh_Disallowance_${new Date().toISOString().slice(0, 10)}.csv`);
      return res.send(csv);
    }

    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
});

// Invoices export
router.get('/invoices-export', async (req: Request, res: Response, next) => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: { organizationId: req.user!.organizationId },
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

    const csv = formatCsv(rows);
    res.header('Content-Type', 'text/csv');
    res.attachment(`Invoices_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

export default router;
