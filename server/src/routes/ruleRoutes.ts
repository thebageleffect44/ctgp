import { Router, Request, Response } from 'express';
import { RULE_REGISTRY, RBI_BANK_RATES, getEffectiveBankRate } from '../services/rules/ruleRegistry.js';

const router = Router();

// Publicly accessible rules and rates for complete transparency & explainability
router.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      rules: Object.values(RULE_REGISTRY),
      currentBankRate: getEffectiveBankRate(),
      bankRateHistory: RBI_BANK_RATES,
    },
  });
});

export default router;
