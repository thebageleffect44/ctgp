export interface ColumnMapping {
    invoiceNumber: string;
    supplierName: string;
    invoiceDate: string;
    principalAmount: string;
    deliveryDate?: string;
    contractualCreditDays?: string;
    supplierPan?: string;
    supplierUdyam?: string;
    supplierMsmeType?: string;
}
export interface CsvPreviewResult {
    headers: string[];
    totalRows: number;
    sampleRows: Record<string, string>[];
    suggestedMapping: Partial<ColumnMapping>;
}
export interface CsvValidationRow {
    rowNumber: number;
    data: Record<string, any>;
    isValid: boolean;
    isDuplicate: boolean;
    errors: string[];
}
export interface CsvValidationResult {
    totalRows: number;
    validRowCount: number;
    duplicateRowCount: number;
    errorRowCount: number;
    rows: CsvValidationRow[];
}
export declare const SAMPLE_CSV_TEMPLATE = "Invoice Number,Supplier Name,Supplier PAN,Udyam Number,MSME Type,Invoice Date,Delivery Date,Agreed Credit Days,Amount\nINV-2026-001,Bharat Precision Components,AABCB1234F,UDYAM-MH-01-0012345,MICRO,2026-03-01,2026-03-02,30,125000.00\nINV-2026-002,Deccan Engineering Works,AADCD5678G,UDYAM-KA-02-0098765,SMALL,2026-03-10,2026-03-12,45,480000.00\nINV-2026-003,Apex Logistics & Services,AAFFA9012K,UDYAM-TN-03-0045612,MICRO,2026-03-15,2026-03-15,15,85000.00\nINV-2026-004,Surat Synthetic Textiles,AABCT3456M,,MEDIUM,2026-03-18,2026-03-20,60,320000.00\nINV-2026-005,National Steel Traders,AAECN7890P,,NOT_MSME,2026-03-25,2026-03-25,30,950000.00";
export declare function previewCsv(csvContent: string): CsvPreviewResult;
export declare function validateCsvData(organizationId: string, csvContent: string, mapping: ColumnMapping): Promise<CsvValidationResult>;
export declare function commitCsvImport(organizationId: string, validatedRows: CsvValidationRow[], actor?: {
    userId?: string;
    userEmail?: string;
}): Promise<{
    acceptedCount: number;
    totalAttempted: number;
}>;
