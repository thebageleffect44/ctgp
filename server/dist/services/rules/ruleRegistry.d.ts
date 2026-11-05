/**
 * Statutory Compliance Rule Registry
 *
 * Provides versioned rules, citations, effective dates, and legal parameters
 * for Indian MSME payment compliance (MSMED Act 2006, Income-tax Act Section 43B(h), MCA Form 1).
 */
export interface RuleDefinition {
    ruleId: string;
    name: string;
    actName: string;
    sectionReference: string;
    version: string;
    effectiveFrom: string;
    effectiveTo?: string;
    description: string;
    parameters: Record<string, any>;
    applicableEntities: string[];
    caveats: string[];
}
export declare const RULE_REGISTRY: Record<string, RuleDefinition>;
/**
 * Historical and current RBI Bank Rate Registry
 */
export interface RbiBankRateEntry {
    effectiveDate: string;
    ratePercent: number;
    statutoryRatePercent: number;
    notificationRef: string;
}
export declare const RBI_BANK_RATES: RbiBankRateEntry[];
/**
 * Returns the effective RBI bank rate for a given date
 */
export declare function getEffectiveBankRate(targetDate?: Date): RbiBankRateEntry;
