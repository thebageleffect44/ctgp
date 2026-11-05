import prisma from '../db/prisma.js';
import { getAgeingBucket } from './financialMath.js';
import { logAuditEvent } from './auditService.js';

export async function generateMsmeForm1Report(
  organizationId: string,
  options: { fiscalYear?: string; halfYear?: 'H1' | 'H2' } = {},
  actor?: { userId?: string; userEmail?: string }
) {
  // MSME Form 1 applies to dues to Micro & Small enterprises exceeding 45 days
  const invoices = await prisma.invoice.findMany({
    where: {
      organizationId,
      paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID', 'DISPUTED'] },
      daysOverdue: { gt: 0 },
      supplier: {
        msmeType: { in: ['MICRO', 'SMALL'] },
      },
    },
    include: {
      supplier: true,
    },
    orderBy: { daysOverdue: 'desc' },
  });

  // Filter for those exceeding 45 days overdue
  const qualifiedDues = invoices.filter(inv => inv.daysOverdue > 45);

  const rows = qualifiedDues.map(inv => {
    const outstanding = Math.max(0, inv.principalAmount - inv.amountPaid);
    return {
      supplierName: inv.supplier.name,
      supplierPan: inv.supplier.pan || 'NOT_PROVIDED',
      udyamRegistrationNumber: inv.supplier.udyamNumber || 'SELF_DECLARED',
      msmeClassification: inv.supplier.msmeType,
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate.toISOString().slice(0, 10),
      dueDate: inv.dueDate.toISOString().slice(0, 10),
      amountDue: Math.round(outstanding * 100) / 100,
      daysOverdue: inv.daysOverdue,
      statutoryInterestAccrued: Math.round(inv.accruedInterest * 100) / 100,
      reasonForDelay: inv.notes || 'Under reconciliation / verification with supplier',
    };
  });

  const totalOutstanding = rows.reduce((sum, r) => sum + r.amountDue, 0);
  const totalInterest = rows.reduce((sum, r) => sum + r.statutoryInterestAccrued, 0);

  await logAuditEvent({
    organizationId,
    userId: actor?.userId,
    userEmail: actor?.userEmail,
    action: 'REPORT_GENERATED',
    entityType: 'ORGANIZATION',
    details: {
      reportType: 'MSME_FORM_1',
      recordCount: rows.length,
      totalOutstanding,
    },
  });

  return {
    meta: {
      reportName: 'MSME Form 1 Filing Preparation Schedule',
      statutoryReference: 'Section 405 of Companies Act, 2013 read with Specified Companies Order, 2019',
      thresholdCriteria: 'Dues to Micro and Small suppliers outstanding for > 45 days',
      disclaimer: 'This schedule is generated for internal compliance and statutory filing preparation. Legal verification of Udyam validity is recommended prior to MCA submission.',
      generatedAt: new Date().toISOString(),
      recordCount: rows.length,
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
    },
    records: rows,
  };
}

export async function generateSection43bReport(
  organizationId: string,
  actor?: { userId?: string; userEmail?: string }
) {
  const invoices = await prisma.invoice.findMany({
    where: {
      organizationId,
      section43bExposure: { gt: 0 },
    },
    include: {
      supplier: true,
    },
    orderBy: { section43bExposure: 'desc' },
  });

  const records = invoices.map(inv => ({
    invoiceNumber: inv.invoiceNumber,
    supplierName: inv.supplier.name,
    supplierType: inv.supplier.msmeType,
    udyamNumber: inv.supplier.udyamNumber || 'N/A',
    invoiceDate: inv.invoiceDate.toISOString().slice(0, 10),
    dueDate: inv.dueDate.toISOString().slice(0, 10),
    principalAmount: inv.principalAmount,
    amountPaid: inv.amountPaid,
    exposureAmount: inv.section43bExposure,
    potentialTaxImpact: inv.potentialTaxImpact,
    daysOverdue: inv.daysOverdue,
    paymentStatus: inv.paymentStatus,
    notes: inv.notes || 'Pending clearance',
  }));

  const totalExposure = records.reduce((sum, r) => sum + r.exposureAmount, 0);
  const totalTaxImpact = records.reduce((sum, r) => sum + r.potentialTaxImpact, 0);

  await logAuditEvent({
    organizationId,
    userId: actor?.userId,
    userEmail: actor?.userEmail,
    action: 'REPORT_GENERATED',
    entityType: 'ORGANIZATION',
    details: {
      reportType: 'SECTION_43B_H_EXPOSURE',
      recordCount: records.length,
      totalExposure,
      totalTaxImpact,
    },
  });

  return {
    meta: {
      reportName: 'Section 43B(h) Tax Disallowance Exposure Schedule',
      statutoryReference: 'Section 43B(h) of the Income-tax Act, 1961 (inserted by Finance Act, 2023)',
      disclaimer: 'Amounts reflect potential disallowance of expenditure if unpaid past statutory deadline as of fiscal year end. Consult your statutory auditor.',
      generatedAt: new Date().toISOString(),
      recordCount: records.length,
      totalExposure: Math.round(totalExposure * 100) / 100,
      totalTaxImpact: Math.round(totalTaxImpact * 100) / 100,
    },
    records,
  };
}

export function formatCsv(rows: Record<string, any>[]): string {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const csvLines = [headers.join(',')];

  for (const row of rows) {
    const line = headers.map(header => {
      let val = row[header];
      if (val === null || val === undefined) val = '';
      val = String(val).replace(/"/g, '""');
      if (val.includes(',') || val.includes('\n') || val.includes('"')) {
        val = `"${val}"`;
      }
      return val;
    }).join(',');
    csvLines.push(line);
  }

  return csvLines.join('\n');
}
