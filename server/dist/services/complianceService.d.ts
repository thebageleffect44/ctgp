export declare function getDashboardMetrics(organizationId: string): Promise<{
    kpis: {
        totalInvoiceValue: number;
        totalOutstanding: number;
        totalPaid: number;
        totalOverdue: number;
        overdueCount: number;
        approachingDeadlineCount: number;
        approachingDeadlineValue: number;
        totalAccruedInterest: number;
        total43bExposure: number;
        totalTaxDisallowanceImpact: number;
        paidCount: number;
        unpaidCount: number;
        openAlertsCount: number;
    };
    ageingBuckets: Record<string, {
        count: number;
        amount: number;
    }>;
    supplierBreakdown: {
        micro: number;
        small: number;
        medium: number;
        notMsme: number;
        unverified: number;
        total: number;
    };
}>;
export declare function listComplianceAlerts(organizationId: string, options?: {
    status?: string;
    severity?: string;
    limit?: number;
}): Promise<({
    invoice: {
        supplier: {
            name: string;
            udyamNumber: string | null;
            msmeType: string;
        };
    } & {
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        supplierId: string;
        invoiceNumber: string;
        invoiceDate: Date;
        deliveryDate: Date | null;
        hasWrittenAgreement: boolean;
        contractualCreditDays: number;
        principalAmount: number;
        hasWrittenObjection: boolean;
        objectionDate: Date | null;
        objectionResolvedDate: Date | null;
        supportingDocRef: string | null;
        notes: string | null;
        acceptanceDate: Date;
        statutoryLimitDays: number;
        dueDate: Date;
        dueDateSource: string;
        amountPaid: number;
        paymentStatus: string;
        paymentDate: Date | null;
        applicableBankRate: number;
        statutoryInterestRate: number;
        accruedInterest: number;
        daysOverdue: number;
        section43bExposure: number;
        potentialTaxImpact: number;
        complianceStatus: string;
    };
} & {
    id: string;
    organizationId: string;
    createdAt: Date;
    status: string;
    updatedAt: Date;
    invoiceId: string;
    alertType: string;
    severity: string;
    ruleVersion: string;
    reason: string;
    recommendedAction: string;
    assignedTo: string | null;
    resolvedAt: Date | null;
    resolutionNotes: string | null;
})[]>;
export declare function updateAlertStatus(organizationId: string, alertId: string, data: {
    status: 'ACKNOWLEDGED' | 'ASSIGNED' | 'RESOLVED';
    assignedTo?: string;
    resolutionNotes?: string;
}, actor?: {
    userId?: string;
    userEmail?: string;
}): Promise<{
    id: string;
    organizationId: string;
    createdAt: Date;
    status: string;
    updatedAt: Date;
    invoiceId: string;
    alertType: string;
    severity: string;
    ruleVersion: string;
    reason: string;
    recommendedAction: string;
    assignedTo: string | null;
    resolvedAt: Date | null;
    resolutionNotes: string | null;
}>;
