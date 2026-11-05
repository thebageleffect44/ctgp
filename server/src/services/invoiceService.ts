import prisma from '../db/prisma.js';
import {
  calculateStatutoryDueDate,
  calculateStatutoryInterest,
  assessSection43bExposure,
} from './financialMath.js';
import { logAuditEvent } from './auditService.js';
import { z } from 'zod';
import Decimal from 'decimal.js';

export const InvoiceInputSchema = z.object({
  supplierId: z.string().uuid('Valid supplier ID is required'),
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  invoiceDate: z.string().or(z.date()),
  deliveryDate: z.string().or(z.date()).optional().nullable(),
  hasWrittenAgreement: z.boolean().default(true),
  contractualCreditDays: z.number().int().min(0).max(365).default(30),
  principalAmount: z.number().positive('Invoice principal amount must be greater than zero'),
  hasWrittenObjection: z.boolean().default(false),
  objectionDate: z.string().or(z.date()).optional().nullable(),
  objectionResolvedDate: z.string().or(z.date()).optional().nullable(),
  supportingDocRef: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type InvoiceInput = z.input<typeof InvoiceInputSchema>;

export async function listInvoices(
  organizationId: string,
  options: {
    supplierId?: string;
    paymentStatus?: string;
    complianceStatus?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  } = {}
) {
  const where: any = { organizationId };

  if (options.supplierId && options.supplierId !== 'ALL') {
    where.supplierId = options.supplierId;
  }

  if (options.paymentStatus && options.paymentStatus !== 'ALL') {
    where.paymentStatus = options.paymentStatus;
  }

  if (options.complianceStatus && options.complianceStatus !== 'ALL') {
    where.complianceStatus = options.complianceStatus;
  }

  if (options.search) {
    where.OR = [
      { invoiceNumber: { contains: options.search } },
      { supplier: { name: { contains: options.search } } },
      { notes: { contains: options.search } },
    ];
  }

  if (options.startDate) {
    where.invoiceDate = { ...where.invoiceDate, gte: new Date(options.startDate) };
  }

  if (options.endDate) {
    where.invoiceDate = { ...where.invoiceDate, lte: new Date(options.endDate) };
  }

  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 50));
  const skip = (page - 1) * limit;

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { dueDate: 'asc' },
      skip,
      take: limit,
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            pan: true,
            udyamNumber: true,
            msmeType: true,
            isTrader: true,
            verificationStatus: true,
          },
        },
        payments: true,
        complianceAlerts: {
          where: { status: { in: ['OPEN', 'ACKNOWLEDGED', 'ASSIGNED'] } },
        },
      },
    }),
    prisma.invoice.count({ where }),
  ]);

  return {
    items: invoices,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getInvoiceById(organizationId: string, id: string) {
  return prisma.invoice.findFirst({
    where: { id, organizationId },
    include: {
      supplier: true,
      payments: { orderBy: { paymentDate: 'desc' } },
      complianceAlerts: { orderBy: { createdAt: 'desc' } },
    },
  });
}

export async function createInvoice(
  organizationId: string,
  input: InvoiceInput,
  actor?: { userId?: string; userEmail?: string }
) {
  const validated = InvoiceInputSchema.parse(input);

  const supplier = await prisma.supplier.findFirst({
    where: { id: validated.supplierId, organizationId },
  });

  if (!supplier) {
    throw new Error('Supplier not found in your organization');
  }

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  const invDate = new Date(validated.invoiceDate);
  const delivDate = validated.deliveryDate ? new Date(validated.deliveryDate) : null;
  const objDate = validated.objectionDate ? new Date(validated.objectionDate) : null;
  const objResDate = validated.objectionResolvedDate ? new Date(validated.objectionResolvedDate) : null;

  // 1. Calculate statutory due date per Section 15
  const dueDateCalc = calculateStatutoryDueDate({
    invoiceDate: invDate,
    deliveryDate: delivDate,
    hasWrittenObjection: validated.hasWrittenObjection,
    objectionDate: objDate,
    objectionResolvedDate: objResDate,
    hasWrittenAgreement: validated.hasWrittenAgreement,
    contractualCreditDays: validated.contractualCreditDays,
  });

  // 2. Calculate interest per Section 16
  const interestCalc = calculateStatutoryInterest({
    principalAmount: validated.principalAmount,
    amountPaid: 0,
    dueDate: dueDateCalc.dueDate,
    msmeType: supplier.msmeType,
    isTrader: supplier.isTrader,
  });

  // 3. Assess Section 43B(h) exposure
  const sec43bCalc = assessSection43bExposure({
    principalAmount: validated.principalAmount,
    amountPaid: 0,
    dueDate: dueDateCalc.dueDate,
    invoiceDate: invDate,
    msmeType: supplier.msmeType,
    isTrader: supplier.isTrader,
    applicableTaxRate: org?.applicableTaxRate || 0.2517,
  });

  // Determine initial compliance status
  let complianceStatus = 'COMPLIANT';
  if (!delivDate) {
    complianceStatus = 'INCOMPLETE_DATA';
  } else if (interestCalc.daysOverdue > 0) {
    complianceStatus = sec43bCalc.isDisallowed ? 'SEC_43B_EXPOSURE' : 'OVERDUE';
  } else {
    // Check if approaching deadline (within 7 days)
    const now = new Date();
    const daysUntilDue = Math.ceil((dueDateCalc.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilDue >= 0 && daysUntilDue <= 7) {
      complianceStatus = 'APPROACHING_DEADLINE';
    }
  }

  const invoice = await prisma.invoice.create({
    data: {
      organizationId,
      supplierId: supplier.id,
      invoiceNumber: validated.invoiceNumber,
      invoiceDate: invDate,
      deliveryDate: delivDate,
      hasWrittenObjection: validated.hasWrittenObjection,
      objectionDate: objDate,
      objectionResolvedDate: objResDate,
      acceptanceDate: dueDateCalc.acceptanceDate,
      hasWrittenAgreement: validated.hasWrittenAgreement,
      contractualCreditDays: validated.contractualCreditDays,
      statutoryLimitDays: dueDateCalc.effectiveDueDays,
      dueDate: dueDateCalc.dueDate,
      dueDateSource: dueDateCalc.dueDateSource,
      principalAmount: validated.principalAmount,
      amountPaid: 0,
      paymentStatus: 'UNPAID',
      applicableBankRate: interestCalc.applicableBankRate.toNumber(),
      statutoryInterestRate: interestCalc.statutoryInterestRate.toNumber(),
      accruedInterest: interestCalc.accruedInterest.toNumber(),
      daysOverdue: interestCalc.daysOverdue,
      section43bExposure: sec43bCalc.exposureAmount.toNumber(),
      potentialTaxImpact: sec43bCalc.potentialTaxImpact.toNumber(),
      complianceStatus,
      supportingDocRef: validated.supportingDocRef || null,
      notes: validated.notes || null,
    },
  });

  // Auto-generate alerts if needed
  if (complianceStatus === 'OVERDUE' || complianceStatus === 'SEC_43B_EXPOSURE') {
    await prisma.complianceAlert.create({
      data: {
        organizationId,
        invoiceId: invoice.id,
        alertType: complianceStatus === 'SEC_43B_EXPOSURE' ? 'SECTION_43B_RISK' : 'OVERDUE_STATUTORY',
        severity: complianceStatus === 'SEC_43B_EXPOSURE' ? 'CRITICAL' : 'HIGH',
        status: 'OPEN',
        ruleVersion: complianceStatus === 'SEC_43B_EXPOSURE' ? 'IT_SEC_43B_H_V1' : 'MSMED_SEC15_16_V1',
        reason: `Invoice #${invoice.invoiceNumber} is ${interestCalc.daysOverdue} days overdue past the statutory Section 15 deadline. Accrued interest is ₹${interestCalc.accruedInterest.toFixed(2)}.`,
        recommendedAction: 'Disburse immediate payment via NEFT/RTGS to halt statutory compound interest accumulation.',
      },
    });
  }

  await logAuditEvent({
    organizationId,
    userId: actor?.userId,
    userEmail: actor?.userEmail,
    action: 'CREATE',
    entityType: 'INVOICE',
    entityId: invoice.id,
    details: {
      invoiceNumber: invoice.invoiceNumber,
      supplier: supplier.name,
      amount: invoice.principalAmount,
      dueDate: invoice.dueDate,
    },
  });

  return invoice;
}

export async function recordPayment(
  organizationId: string,
  invoiceId: string,
  paymentData: {
    amount: number;
    paymentDate: string | Date;
    referenceNumber?: string;
    paymentMode?: string;
    notes?: string;
  },
  actor?: { userId?: string; userEmail?: string }
) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId },
    include: { supplier: true },
  });

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  const payDate = new Date(paymentData.paymentDate);
  const paymentAmount = new Decimal(paymentData.amount);

  if (paymentAmount.lte(0)) {
    throw new Error('Payment amount must be greater than zero');
  }

  const currentPaid = new Decimal(invoice.amountPaid);
  const totalPrincipal = new Decimal(invoice.principalAmount);
  const newAmountPaid = Decimal.min(totalPrincipal, currentPaid.plus(paymentAmount));
  const newPaymentStatus = newAmountPaid.gte(totalPrincipal) ? 'PAID' : 'PARTIALLY_PAID';

  // Recalculate interest and 43B exposure as of payment date
  const interestCalc = calculateStatutoryInterest({
    principalAmount: totalPrincipal,
    amountPaid: newAmountPaid,
    dueDate: invoice.dueDate,
    paymentDate: newPaymentStatus === 'PAID' ? payDate : null,
    calculationDate: payDate,
    msmeType: invoice.supplier.msmeType,
    isTrader: invoice.supplier.isTrader,
  });

  const sec43bCalc = assessSection43bExposure({
    principalAmount: totalPrincipal,
    amountPaid: newAmountPaid,
    dueDate: invoice.dueDate,
    invoiceDate: invoice.invoiceDate,
    paymentDate: newPaymentStatus === 'PAID' ? payDate : null,
    msmeType: invoice.supplier.msmeType,
    isTrader: invoice.supplier.isTrader,
  });

  // Create payment record and update invoice in transaction
  const [payment, updatedInvoice] = await prisma.$transaction([
    prisma.payment.create({
      data: {
        organizationId,
        invoiceId,
        amount: paymentAmount.toNumber(),
        paymentDate: payDate,
        referenceNumber: paymentData.referenceNumber || null,
        paymentMode: paymentData.paymentMode || 'NEFT',
        notes: paymentData.notes || null,
      },
    }),
    prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        amountPaid: newAmountPaid.toNumber(),
        paymentStatus: newPaymentStatus,
        paymentDate: newPaymentStatus === 'PAID' ? payDate : null,
        accruedInterest: interestCalc.accruedInterest.toNumber(),
        daysOverdue: interestCalc.daysOverdue,
        section43bExposure: sec43bCalc.exposureAmount.toNumber(),
        potentialTaxImpact: sec43bCalc.potentialTaxImpact.toNumber(),
        complianceStatus: newPaymentStatus === 'PAID' ? 'COMPLIANT' : invoice.complianceStatus,
      },
    }),
  ]);

  // If paid, auto-resolve open compliance alerts
  if (newPaymentStatus === 'PAID') {
    await prisma.complianceAlert.updateMany({
      where: { invoiceId, status: { in: ['OPEN', 'ACKNOWLEDGED', 'ASSIGNED'] } },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolutionNotes: `Auto-resolved upon full payment of ₹${paymentAmount.toNumber()} (Ref: ${paymentData.referenceNumber || 'N/A'}).`,
      },
    });
  }

  await logAuditEvent({
    organizationId,
    userId: actor?.userId,
    userEmail: actor?.userEmail,
    action: 'STATUS_CHANGE',
    entityType: 'INVOICE',
    entityId: invoiceId,
    details: {
      amountPaid: paymentAmount.toNumber(),
      newStatus: newPaymentStatus,
      referenceNumber: paymentData.referenceNumber,
    },
  });

  return { payment, invoice: updatedInvoice };
}
