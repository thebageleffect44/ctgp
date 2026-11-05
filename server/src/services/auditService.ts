import prisma from '../db/prisma.js';

export interface AuditLogParams {
  organizationId: string;
  userId?: string;
  userEmail?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'CSV_IMPORT' | 'ALERT_ACKNOWLEDGED' | 'ALERT_RESOLVED' | 'REPORT_GENERATED';
  entityType: 'INVOICE' | 'SUPPLIER' | 'PAYMENT' | 'COMPLIANCE_ALERT' | 'ORGANIZATION';
  entityId?: string;
  details: Record<string, any>;
  ipAddress?: string;
}

export async function logAuditEvent(params: AuditLogParams) {
  try {
    return await prisma.auditEvent.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId,
        userEmail: params.userEmail,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        details: JSON.stringify(params.details),
        ipAddress: params.ipAddress,
      },
    });
  } catch (error) {
    console.error('Failed to write immutable audit log:', error);
    // Never crash the primary transaction if logging fails, but alert
  }
}

export async function getAuditEvents(organizationId: string, limit: number = 50, offset: number = 0) {
  const [items, total] = await Promise.all([
    prisma.auditEvent.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.auditEvent.count({ where: { organizationId } }),
  ]);

  return {
    items: items.map(item => ({
      ...item,
      details: (() => {
        try {
          return JSON.parse(item.details);
        } catch {
          return item.details;
        }
      })(),
    })),
    total,
    limit,
    offset,
  };
}
