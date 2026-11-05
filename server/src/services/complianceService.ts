import prisma from '../db/prisma.js';
import { getAgeingBucket } from './financialMath.js';
import { logAuditEvent } from './auditService.js';

export async function getDashboardMetrics(organizationId: string) {
  const [invoices, suppliers, openAlertsCount] = await Promise.all([
    prisma.invoice.findMany({
      where: { organizationId },
      include: {
        supplier: {
          select: { name: true, msmeType: true, isTrader: true },
        },
      },
    }),
    prisma.supplier.findMany({
      where: { organizationId },
      select: { id: true, msmeType: true },
    }),
    prisma.complianceAlert.count({
      where: { organizationId, status: { in: ['OPEN', 'ASSIGNED', 'ACKNOWLEDGED'] } },
    }),
  ]);

  let totalInvoiceValue = 0;
  let totalOutstanding = 0;
  let totalPaid = 0;
  let totalOverdue = 0;
  let overdueCount = 0;
  let approachingDeadlineCount = 0;
  let approachingDeadlineValue = 0;
  let totalAccruedInterest = 0;
  let total43bExposure = 0;
  let totalTaxDisallowanceImpact = 0;
  let paidCount = 0;
  let unpaidCount = 0;

  const ageingBuckets: Record<string, { count: number; amount: number }> = {
    '0-15 days': { count: 0, amount: 0 },
    '16-30 days': { count: 0, amount: 0 },
    '31-45 days': { count: 0, amount: 0 },
    '46-90 days': { count: 0, amount: 0 },
    '90+ days': { count: 0, amount: 0 },
  };

  const now = new Date();

  for (const inv of invoices) {
    totalInvoiceValue += inv.principalAmount;
    totalPaid += inv.amountPaid;

    const balance = Math.max(0, inv.principalAmount - inv.amountPaid);

    if (inv.paymentStatus === 'PAID') {
      paidCount++;
    } else {
      unpaidCount++;
      totalOutstanding += balance;
      totalAccruedInterest += inv.accruedInterest;
      total43bExposure += inv.section43bExposure;
      totalTaxDisallowanceImpact += inv.potentialTaxImpact;

      if (inv.daysOverdue > 0) {
        totalOverdue += balance;
        overdueCount++;

        const bucket = getAgeingBucket(inv.daysOverdue);
        if (bucket !== 'Not Overdue') {
          ageingBuckets[bucket].count += 1;
          ageingBuckets[bucket].amount += balance;
        }
      } else {
        const daysToDue = Math.ceil((new Date(inv.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysToDue >= 0 && daysToDue <= 15) {
          approachingDeadlineCount++;
          approachingDeadlineValue += balance;
        }
      }
    }
  }

  // Suppliers MSME category breakdown
  const supplierBreakdown = {
    micro: suppliers.filter(s => s.msmeType === 'MICRO').length,
    small: suppliers.filter(s => s.msmeType === 'SMALL').length,
    medium: suppliers.filter(s => s.msmeType === 'MEDIUM').length,
    notMsme: suppliers.filter(s => s.msmeType === 'NOT_MSME').length,
    unverified: suppliers.filter(s => s.msmeType === 'UNVERIFIED').length,
    total: suppliers.length,
  };

  return {
    kpis: {
      totalInvoiceValue: Math.round(totalInvoiceValue * 100) / 100,
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalOverdue: Math.round(totalOverdue * 100) / 100,
      overdueCount,
      approachingDeadlineCount,
      approachingDeadlineValue: Math.round(approachingDeadlineValue * 100) / 100,
      totalAccruedInterest: Math.round(totalAccruedInterest * 100) / 100,
      total43bExposure: Math.round(total43bExposure * 100) / 100,
      totalTaxDisallowanceImpact: Math.round(totalTaxDisallowanceImpact * 100) / 100,
      paidCount,
      unpaidCount,
      openAlertsCount,
    },
    ageingBuckets,
    supplierBreakdown,
  };
}

export async function listComplianceAlerts(
  organizationId: string,
  options: { status?: string; severity?: string; limit?: number } = {}
) {
  const where: any = { organizationId };

  if (options.status && options.status !== 'ALL') {
    where.status = options.status;
  }

  if (options.severity && options.severity !== 'ALL') {
    where.severity = options.severity;
  }

  return prisma.complianceAlert.findMany({
    where,
    orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    take: options.limit || 50,
    include: {
      invoice: {
        include: {
          supplier: {
            select: { name: true, msmeType: true, udyamNumber: true },
          },
        },
      },
    },
  });
}

export async function updateAlertStatus(
  organizationId: string,
  alertId: string,
  data: {
    status: 'ACKNOWLEDGED' | 'ASSIGNED' | 'RESOLVED';
    assignedTo?: string;
    resolutionNotes?: string;
  },
  actor?: { userId?: string; userEmail?: string }
) {
  const alert = await prisma.complianceAlert.findFirst({
    where: { id: alertId, organizationId },
  });

  if (!alert) {
    throw new Error('Compliance alert not found');
  }

  const updated = await prisma.complianceAlert.update({
    where: { id: alertId },
    data: {
      status: data.status,
      assignedTo: data.assignedTo !== undefined ? data.assignedTo : alert.assignedTo,
      resolutionNotes: data.resolutionNotes !== undefined ? data.resolutionNotes : alert.resolutionNotes,
      resolvedAt: data.status === 'RESOLVED' ? new Date() : alert.resolvedAt,
    },
  });

  await logAuditEvent({
    organizationId,
    userId: actor?.userId,
    userEmail: actor?.userEmail,
    action: data.status === 'RESOLVED' ? 'ALERT_RESOLVED' : 'ALERT_ACKNOWLEDGED',
    entityType: 'COMPLIANCE_ALERT',
    entityId: alertId,
    details: {
      previousStatus: alert.status,
      newStatus: data.status,
      notes: data.resolutionNotes,
    },
  });

  return updated;
}
