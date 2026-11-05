import Decimal from 'decimal.js';
export interface DueDateCalculationInput {
    invoiceDate: Date;
    deliveryDate?: Date | null;
    hasWrittenObjection?: boolean;
    objectionDate?: Date | null;
    objectionResolvedDate?: Date | null;
    hasWrittenAgreement: boolean;
    contractualCreditDays?: number;
}
export interface DueDateCalculationResult {
    acceptanceDate: Date;
    effectiveDueDays: number;
    dueDate: Date;
    dueDateSource: 'STATUTORY_45_DAY_CAP' | 'AGREED_TERM' | 'STATUTORY_15_DAY_DEFAULT';
    isCappedByStatute: boolean;
    notes: string[];
}
export interface InterestCalculationInput {
    principalAmount: number | string | Decimal;
    amountPaid?: number | string | Decimal;
    dueDate: Date;
    calculationDate?: Date;
    paymentDate?: Date | null;
    msmeType: string;
    isTrader?: boolean;
}
export interface InterestCalculationResult {
    isEligibleForStatutoryInterest: boolean;
    ineligibilityReason?: string;
    principalOutstanding: Decimal;
    daysOverdue: number;
    applicableBankRate: Decimal;
    statutoryInterestRate: Decimal;
    accruedInterest: Decimal;
    totalPayableWithInterest: Decimal;
    calculationFormula: string;
}
export interface Section43bExposureInput {
    principalAmount: number | string | Decimal;
    amountPaid?: number | string | Decimal;
    dueDate: Date;
    invoiceDate: Date;
    paymentDate?: Date | null;
    msmeType: string;
    isTrader?: boolean;
    applicableTaxRate?: number | string | Decimal;
    asOfDate?: Date;
}
export interface Section43bExposureResult {
    isApplicable: boolean;
    reason: string;
    isDisallowed: boolean;
    exposureAmount: Decimal;
    potentialTaxImpact: Decimal;
    fiscalYear: string;
    isAtRiskOfDisallowance: boolean;
}
/**
 * Calculates authoritative Acceptance Date and Statutory Due Date under MSMED Act Section 15
 */
export declare function calculateStatutoryDueDate(input: DueDateCalculationInput): DueDateCalculationResult;
/**
 * Calculates compound statutory interest with monthly rests under Section 16 of MSMED Act
 */
export declare function calculateStatutoryInterest(input: InterestCalculationInput): InterestCalculationResult;
/**
 * Assesses Section 43B(h) of the Income-tax Act disallowance risk
 */
export declare function assessSection43bExposure(input: Section43bExposureInput): Section43bExposureResult;
/**
 * Calculates Ageing Buckets for a given overdue days count
 */
export declare function getAgeingBucket(daysOverdue: number): '0-15 days' | '16-30 days' | '31-45 days' | '46-90 days' | '90+ days' | 'Not Overdue';
