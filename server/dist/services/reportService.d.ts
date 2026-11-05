export declare function generateMsmeForm1Report(organizationId: string, options?: {
    fiscalYear?: string;
    halfYear?: 'H1' | 'H2';
}, actor?: {
    userId?: string;
    userEmail?: string;
}): Promise<{
    meta: {
        reportName: string;
        statutoryReference: string;
        thresholdCriteria: string;
        disclaimer: string;
        generatedAt: string;
        recordCount: number;
        totalOutstanding: number;
        totalInterest: number;
    };
    records: {
        supplierName: string;
        supplierPan: string;
        udyamRegistrationNumber: string;
        msmeClassification: string;
        invoiceNumber: string;
        invoiceDate: string;
        dueDate: string;
        amountDue: number;
        daysOverdue: number;
        statutoryInterestAccrued: number;
        reasonForDelay: string;
    }[];
}>;
export declare function generateSection43bReport(organizationId: string, actor?: {
    userId?: string;
    userEmail?: string;
}): Promise<{
    meta: {
        reportName: string;
        statutoryReference: string;
        disclaimer: string;
        generatedAt: string;
        recordCount: number;
        totalExposure: number;
        totalTaxImpact: number;
    };
    records: {
        invoiceNumber: string;
        supplierName: string;
        supplierType: string;
        udyamNumber: string;
        invoiceDate: string;
        dueDate: string;
        principalAmount: number;
        amountPaid: number;
        exposureAmount: number;
        potentialTaxImpact: number;
        daysOverdue: number;
        paymentStatus: string;
        notes: string;
    }[];
}>;
export declare function formatCsv(rows: Record<string, any>[]): string;
