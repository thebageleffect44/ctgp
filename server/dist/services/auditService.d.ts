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
export declare function logAuditEvent(params: AuditLogParams): Promise<{
    id: string;
    organizationId: string;
    userId: string | null;
    userEmail: string | null;
    action: string;
    entityType: string;
    entityId: string | null;
    details: string;
    ipAddress: string | null;
    createdAt: Date;
} | undefined>;
export declare function getAuditEvents(organizationId: string, limit?: number, offset?: number): Promise<{
    items: {
        details: any;
        id: string;
        organizationId: string;
        userId: string | null;
        userEmail: string | null;
        action: string;
        entityType: string;
        entityId: string | null;
        ipAddress: string | null;
        createdAt: Date;
    }[];
    total: number;
    limit: number;
    offset: number;
}>;
