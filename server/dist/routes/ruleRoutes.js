"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ruleRegistry_js_1 = require("../services/rules/ruleRegistry.js");
const router = (0, express_1.Router)();
// Publicly accessible rules and rates for complete transparency & explainability
router.get('/', (req, res) => {
    res.json({
        success: true,
        data: {
            rules: Object.values(ruleRegistry_js_1.RULE_REGISTRY),
            currentBankRate: (0, ruleRegistry_js_1.getEffectiveBankRate)(),
            bankRateHistory: ruleRegistry_js_1.RBI_BANK_RATES,
        },
    });
});
exports.default = router;
