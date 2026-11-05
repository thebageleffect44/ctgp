import Decimal from 'decimal.js';
import { getEffectiveBankRate } from './rules/ruleRegistry.js';

// Configure Decimal.js for high-precision financial calculations
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

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
export function calculateStatutoryDueDate(input: DueDateCalculationInput): DueDateCalculationResult {
  const notes: string[] = [];
  const invoiceDate = new Date(input.invoiceDate);

  // Determine Acceptance Date per Section 2(b) of MSMED Act
  let acceptanceDate: Date;
  if (input.deliveryDate) {
    const deliveryDate = new Date(input.deliveryDate);
    if (input.hasWrittenObjection && input.objectionResolvedDate) {
      acceptanceDate = new Date(input.objectionResolvedDate);
      notes.push(
        `Acceptance date established as objection resolution date (${acceptanceDate.toISOString().slice(0, 10)}) per MSMED Act Section 2(b)(i).`
      );
    } else {
      acceptanceDate = deliveryDate;
      notes.push(`Acceptance date established as delivery date (${acceptanceDate.toISOString().slice(0, 10)}).`);
    }
  } else {
    // If delivery date is not explicitly captured, fallback to invoice date with an audit note
    acceptanceDate = invoiceDate;
    notes.push(
      'Delivery date not provided. Deemed acceptance calculated from invoice date. Confirm actual delivery date for strict compliance.'
    );
  }

  let effectiveDueDays: number;
  let dueDateSource: 'STATUTORY_45_DAY_CAP' | 'AGREED_TERM' | 'STATUTORY_15_DAY_DEFAULT';
  let isCappedByStatute = false;

  if (!input.hasWrittenAgreement) {
    // Section 15: In the absence of a written agreement, statutory limit is 15 days from acceptance
    effectiveDueDays = 15;
    dueDateSource = 'STATUTORY_15_DAY_DEFAULT';
    notes.push('No written agreement specified. Statutory default limit of 15 days applied under Section 15.');
  } else {
    const agreedDays = input.contractualCreditDays ?? 30;
    if (agreedDays > 45) {
      // Proviso to Section 15: agreed period shall NOT exceed 45 days
      effectiveDueDays = 45;
      dueDateSource = 'STATUTORY_45_DAY_CAP';
      isCappedByStatute = true;
      notes.push(
        `Contractual credit terms of ${agreedDays} days exceed the 45-day statutory cap under Section 15 proviso. Statutory limit of 45 days overrides contract.`
      );
    } else {
      effectiveDueDays = agreedDays;
      dueDateSource = 'AGREED_TERM';
      notes.push(`Agreed credit terms of ${agreedDays} days are within the 45-day statutory ceiling.`);
    }
  }

  const dueDate = new Date(acceptanceDate.getTime());
  dueDate.setDate(dueDate.getDate() + effectiveDueDays);

  return {
    acceptanceDate,
    effectiveDueDays,
    dueDate,
    dueDateSource,
    isCappedByStatute,
    notes,
  };
}

/**
 * Calculates compound statutory interest with monthly rests under Section 16 of MSMED Act
 */
export function calculateStatutoryInterest(input: InterestCalculationInput): InterestCalculationResult {
  const principal = new Decimal(input.principalAmount || 0);
  const paid = new Decimal(input.amountPaid || 0);
  const principalOutstanding = Decimal.max(0, principal.minus(paid));

  // Determine eligibility
  const normalizedMsme = (input.msmeType || '').toUpperCase().trim();
  const isEligibleMsme = normalizedMsme === 'MICRO' || normalizedMsme === 'SMALL';

  if (!isEligibleMsme) {
    return {
      isEligibleForStatutoryInterest: false,
      ineligibilityReason: `Supplier MSME category is '${normalizedMsme}'. Section 16 statutory interest applies solely to Micro and Small enterprises.`,
      principalOutstanding,
      daysOverdue: 0,
      applicableBankRate: new Decimal(0),
      statutoryInterestRate: new Decimal(0),
      accruedInterest: new Decimal(0),
      totalPayableWithInterest: principalOutstanding,
      calculationFormula: 'None (Ineligible supplier classification)',
    };
  }

  if (input.isTrader) {
    return {
      isEligibleForStatutoryInterest: false,
      ineligibilityReason: 'Retail and wholesale traders under Udyam are excluded from Section 15 & 16 benefits per Ministry OM No. 2/1(5)/2021-P&G/Policy.',
      principalOutstanding,
      daysOverdue: 0,
      applicableBankRate: new Decimal(0),
      statutoryInterestRate: new Decimal(0),
      accruedInterest: new Decimal(0),
      totalPayableWithInterest: principalOutstanding,
      calculationFormula: 'None (Trader classification excluded)',
    };
  }

  const effectiveEnd = input.paymentDate ? new Date(input.paymentDate) : (input.calculationDate || new Date());
  const dueDate = new Date(input.dueDate);

  const diffMs = effectiveEnd.getTime() - dueDate.getTime();
  const daysOverdue = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  if (daysOverdue <= 0 || principalOutstanding.isZero()) {
    const rateInfo = getEffectiveBankRate(dueDate);
    return {
      isEligibleForStatutoryInterest: true,
      principalOutstanding,
      daysOverdue: 0,
      applicableBankRate: new Decimal(rateInfo.ratePercent),
      statutoryInterestRate: new Decimal(rateInfo.statutoryRatePercent),
      accruedInterest: new Decimal(0),
      totalPayableWithInterest: principalOutstanding,
      calculationFormula: 'Invoice is within due date. Zero interest accrued.',
    };
  }

  const rateInfo = getEffectiveBankRate(dueDate);
  const bankRate = new Decimal(rateInfo.ratePercent);
  const statutoryRate = new Decimal(rateInfo.statutoryRatePercent); // 3 * bankRate
  const annualRateFraction = statutoryRate.dividedBy(100);

  // Section 16 mandates compound interest with monthly rests
  // Let m = complete calendar months overdue, remDays = remaining days
  const months = Math.floor(daysOverdue / 30);
  const remDays = daysOverdue % 30;

  // Monthly rest rate = annualRate / 12
  const monthlyRate = annualRateFraction.dividedBy(12);

  // Compounded amount after full monthly rests: A = P * (1 + r_month)^months
  const compoundMultiplier = new Decimal(1).plus(monthlyRate).pow(months);
  let compoundedPrincipal = principalOutstanding.times(compoundMultiplier);

  // For the remaining fractional days, interest accrues proportionately: (r_annual * remDays / 365)
  if (remDays > 0) {
    const fractionalInterest = compoundedPrincipal.times(annualRateFraction).times(remDays).dividedBy(365);
    compoundedPrincipal = compoundedPrincipal.plus(fractionalInterest);
  }

  const accruedInterest = compoundedPrincipal.minus(principalOutstanding).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const totalPayableWithInterest = principalOutstanding.plus(accruedInterest).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  const formula = `Compounded with monthly rests at 3× RBI Bank Rate (${statutoryRate.toFixed(2)}% p.a.) for ${daysOverdue} days (${months} months + ${remDays} days).`;

  return {
    isEligibleForStatutoryInterest: true,
    principalOutstanding,
    daysOverdue,
    applicableBankRate: bankRate,
    statutoryInterestRate: statutoryRate,
    accruedInterest,
    totalPayableWithInterest,
    calculationFormula: formula,
  };
}

/**
 * Assesses Section 43B(h) of the Income-tax Act disallowance risk
 */
export function assessSection43bExposure(input: Section43bExposureInput): Section43bExposureResult {
  const principal = new Decimal(input.principalAmount || 0);
  const paid = new Decimal(input.amountPaid || 0);
  const outstanding = Decimal.max(0, principal.minus(paid));

  const normalizedMsme = (input.msmeType || '').toUpperCase().trim();
  const isEligible = normalizedMsme === 'MICRO' || normalizedMsme === 'SMALL';

  const defaultTaxRate = new Decimal(input.applicableTaxRate || 0.2517); // 25% + 4% cess

  // Determine Fiscal Year of the invoice (Indian FY: April 1 to March 31)
  const invDate = new Date(input.invoiceDate);
  const invYear = invDate.getFullYear();
  const invMonth = invDate.getMonth() + 1; // 1-12
  const fyStart = invMonth >= 4 ? invYear : invYear - 1;
  const fyEnd = fyStart + 1;
  const fiscalYear = `FY ${fyStart}-${String(fyEnd).slice(-2)}`;

  if (!isEligible) {
    return {
      isApplicable: false,
      reason: `Supplier is ${normalizedMsme}. Section 43B(h) applies only to Micro and Small enterprises. Medium enterprises are excluded.`,
      isDisallowed: false,
      exposureAmount: new Decimal(0),
      potentialTaxImpact: new Decimal(0),
      fiscalYear,
      isAtRiskOfDisallowance: false,
    };
  }

  if (input.isTrader) {
    return {
      isApplicable: false,
      reason: 'Supplier is registered as a trader. Wholesale and retail traders are excluded from Section 43B(h) per Ministry Clarification OM dated 02/07/2021.',
      isDisallowed: false,
      exposureAmount: new Decimal(0),
      potentialTaxImpact: new Decimal(0),
      fiscalYear,
      isAtRiskOfDisallowance: false,
    };
  }

  const asOf = input.asOfDate || new Date();
  const dueDate = new Date(input.dueDate);

  // FY Year End date for this invoice
  const fyYearEndDate = new Date(fyEnd, 2, 31, 23, 59, 59); // March 31 of FY

  // If already paid:
  if (input.paymentDate) {
    const payDate = new Date(input.paymentDate);
    if (payDate <= dueDate) {
      return {
        isApplicable: true,
        reason: 'Paid within statutory Section 15 timeline. Full tax deduction allowable.',
        isDisallowed: false,
        exposureAmount: new Decimal(0),
        potentialTaxImpact: new Decimal(0),
        fiscalYear,
        isAtRiskOfDisallowance: false,
      };
    } else {
      // Paid late! If paid after March 31 of the financial year and overdue, it was disallowed in that FY and only allowed in the year of payment
      const wasPaidInLaterFy = payDate > fyYearEndDate;
      return {
        isApplicable: true,
        reason: wasPaidInLaterFy
          ? `Paid after FY end and past due date. Deduction disallowed in ${fiscalYear} and deferred to actual payment year.`
          : 'Paid late within the same financial year. Deduction allowable in year of payment.',
        isDisallowed: wasPaidInLaterFy,
        exposureAmount: wasPaidInLaterFy ? outstanding : new Decimal(0),
        potentialTaxImpact: wasPaidInLaterFy ? outstanding.times(defaultTaxRate).toDecimalPlaces(2) : new Decimal(0),
        fiscalYear,
        isAtRiskOfDisallowance: false,
      };
    }
  }

  // If unpaid:
  const isOverdueNow = asOf > dueDate;
  const isPastFyEnd = asOf > fyYearEndDate;

  if (isOverdueNow && isPastFyEnd) {
    // Definite Section 43B(h) disallowance: overdue and past March 31
    const potentialTaxImpact = outstanding.times(defaultTaxRate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    return {
      isApplicable: true,
      reason: `Invoice is unpaid past due date and past financial year end (${fyYearEndDate.toISOString().slice(0, 10)}). Disallowed under Section 43B(h) for ${fiscalYear}.`,
      isDisallowed: true,
      exposureAmount: outstanding,
      potentialTaxImpact,
      fiscalYear,
      isAtRiskOfDisallowance: true,
    };
  }

  if (isOverdueNow) {
    // Currently overdue, risk of disallowance if not cleared before March 31
    const potentialTaxImpact = outstanding.times(defaultTaxRate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    return {
      isApplicable: true,
      reason: `Invoice is currently overdue past Section 15 limit. Will be disallowed under Section 43B(h) if unpaid as of March 31, ${fyEnd}.`,
      isDisallowed: false,
      exposureAmount: outstanding,
      potentialTaxImpact,
      fiscalYear,
      isAtRiskOfDisallowance: true,
    };
  }

  return {
    isApplicable: true,
    reason: 'Invoice is currently within statutory due date.',
    isDisallowed: false,
    exposureAmount: new Decimal(0),
    potentialTaxImpact: new Decimal(0),
    fiscalYear,
    isAtRiskOfDisallowance: false,
  };
}

/**
 * Calculates Ageing Buckets for a given overdue days count
 */
export function getAgeingBucket(daysOverdue: number): '0-15 days' | '16-30 days' | '31-45 days' | '46-90 days' | '90+ days' | 'Not Overdue' {
  if (daysOverdue <= 0) return 'Not Overdue';
  if (daysOverdue <= 15) return '0-15 days';
  if (daysOverdue <= 30) return '16-30 days';
  if (daysOverdue <= 45) return '31-45 days';
  if (daysOverdue <= 90) return '46-90 days';
  return '90+ days';
}
