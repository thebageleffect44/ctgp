import prisma from '../db/prisma.js';
import { logAuditEvent } from './auditService.js';
import { z } from 'zod';

export const SupplierInputSchema = z.object({
  name: z.string().min(2, 'Supplier name is required'),
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid Indian PAN format (e.g. ABCDE1234F)').optional().or(z.literal('')),
  udyamNumber: z.string().regex(/^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/, 'Invalid Udyam registration format (e.g. UDYAM-MH-01-0012345)').optional().or(z.literal('')),
  msmeType: z.enum(['MICRO', 'SMALL', 'MEDIUM', 'NOT_MSME', 'UNVERIFIED']).default('MICRO'),
  isTrader: z.boolean().default(false),
  verificationStatus: z.enum(['VERIFIED', 'SELF_DECLARED', 'UNVERIFIED']).default('SELF_DECLARED'),
  contactPerson: z.string().optional().or(z.literal('')),
  contactEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  contactPhone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

export type SupplierInput = z.infer<typeof SupplierInputSchema>;

export async function listSuppliers(
  organizationId: string,
  options: {
    search?: string;
    msmeType?: string;
    verificationStatus?: string;
  } = {}
) {
  const where: any = { organizationId };

  if (options.search) {
    where.OR = [
      { name: { contains: options.search } },
      { pan: { contains: options.search } },
      { udyamNumber: { contains: options.search } },
      { contactPerson: { contains: options.search } },
    ];
  }

  if (options.msmeType && options.msmeType !== 'ALL') {
    where.msmeType = options.msmeType;
  }

  if (options.verificationStatus && options.verificationStatus !== 'ALL') {
    where.verificationStatus = options.verificationStatus;
  }

  const suppliers = await prisma.supplier.findMany({
    where,
    orderBy: { name: 'asc' },
    include: {
      invoices: {
        select: {
          id: true,
          principalAmount: true,
          amountPaid: true,
          paymentStatus: true,
          accruedInterest: true,
          section43bExposure: true,
          daysOverdue: true,
        },
      },
    },
  });

  return suppliers.map(s => {
    let totalOutstanding = 0;
    let totalOverdue = 0;
    let totalInterest = 0;
    let total43bExposure = 0;
    let overdueCount = 0;

    for (const inv of s.invoices) {
      if (inv.paymentStatus !== 'PAID') {
        const balance = Math.max(0, inv.principalAmount - inv.amountPaid);
        totalOutstanding += balance;
        if (inv.daysOverdue > 0) {
          totalOverdue += balance;
          overdueCount++;
        }
        totalInterest += inv.accruedInterest;
        total43bExposure += inv.section43bExposure;
      }
    }

    return {
      ...s,
      invoiceCount: s.invoices.length,
      unpaidInvoiceCount: s.invoices.filter(i => i.paymentStatus !== 'PAID').length,
      overdueInvoiceCount: overdueCount,
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      totalOverdue: Math.round(totalOverdue * 100) / 100,
      totalAccruedInterest: Math.round(totalInterest * 100) / 100,
      total43bExposure: Math.round(total43bExposure * 100) / 100,
      invoices: undefined, // remove bloated sublist from directory list
    };
  });
}

export async function getSupplierById(organizationId: string, id: string) {
  return prisma.supplier.findFirst({
    where: { id, organizationId },
    include: {
      invoices: {
        orderBy: { dueDate: 'asc' },
      },
    },
  });
}

export async function createSupplier(
  organizationId: string,
  input: SupplierInput,
  actor?: { userId?: string; userEmail?: string }
) {
  const validated = SupplierInputSchema.parse(input);

  const supplier = await prisma.supplier.create({
    data: {
      organizationId,
      name: validated.name,
      pan: validated.pan ? validated.pan.toUpperCase() : null,
      udyamNumber: validated.udyamNumber ? validated.udyamNumber.toUpperCase() : null,
      msmeType: validated.msmeType,
      isTrader: validated.isTrader,
      verificationStatus: validated.verificationStatus,
      verificationDate: validated.verificationStatus === 'VERIFIED' ? new Date() : null,
      contactPerson: validated.contactPerson || null,
      contactEmail: validated.contactEmail || null,
      contactPhone: validated.contactPhone || null,
      address: validated.address || null,
      notes: validated.notes || null,
    },
  });

  await logAuditEvent({
    organizationId,
    userId: actor?.userId,
    userEmail: actor?.userEmail,
    action: 'CREATE',
    entityType: 'SUPPLIER',
    entityId: supplier.id,
    details: { name: supplier.name, msmeType: supplier.msmeType, udyam: supplier.udyamNumber },
  });

  return supplier;
}

export async function updateSupplier(
  organizationId: string,
  id: string,
  input: Partial<SupplierInput>,
  actor?: { userId?: string; userEmail?: string }
) {
  const existing = await prisma.supplier.findFirst({ where: { id, organizationId } });
  if (!existing) {
    throw new Error('Supplier not found');
  }

  const updated = await prisma.supplier.update({
    where: { id },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.pan !== undefined && { pan: input.pan ? input.pan.toUpperCase() : null }),
      ...(input.udyamNumber !== undefined && { udyamNumber: input.udyamNumber ? input.udyamNumber.toUpperCase() : null }),
      ...(input.msmeType && { msmeType: input.msmeType }),
      ...(input.isTrader !== undefined && { isTrader: input.isTrader }),
      ...(input.verificationStatus && {
        verificationStatus: input.verificationStatus,
        verificationDate: input.verificationStatus === 'VERIFIED' ? new Date() : existing.verificationDate,
      }),
      ...(input.contactPerson !== undefined && { contactPerson: input.contactPerson || null }),
      ...(input.contactEmail !== undefined && { contactEmail: input.contactEmail || null }),
      ...(input.contactPhone !== undefined && { contactPhone: input.contactPhone || null }),
      ...(input.address !== undefined && { address: input.address || null }),
      ...(input.notes !== undefined && { notes: input.notes || null }),
    },
  });

  await logAuditEvent({
    organizationId,
    userId: actor?.userId,
    userEmail: actor?.userEmail,
    action: 'UPDATE',
    entityType: 'SUPPLIER',
    entityId: id,
    details: { changes: input },
  });

  return updated;
}
