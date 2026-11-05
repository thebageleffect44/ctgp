import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import {
  BookOpen,
  Scale,
  Percent,
  Calendar,
  AlertCircle,
  FileCheck,
  ExternalLink,
  Info,
} from 'lucide-react';

export const RulesInfo: React.FC = () => {
  const [ruleData, setRuleData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get('/rules')
      .then((res) => {
        if (res.success) setRuleData(res.data);
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Statutory Framework & Calculation Methodology
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Transparent explanation of legal authorities, versioned statutory rules, and mathematical formulas
        </p>
      </div>

      {/* Current RBI Bank Rate Card */}
      <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded bg-blue-500/30 text-blue-200 border border-blue-400/30 mb-2 inline-block">
              Statutory Parameter
            </span>
            <h2 className="text-lg font-bold">Reserve Bank of India (RBI) Bank Rate</h2>
            <p className="text-xs text-blue-200 mt-1 max-w-xl leading-relaxed">
              Section 16 of the MSMED Act, 2006 dictates that delayed payments to Micro and Small suppliers incur compound interest with monthly rests at <strong>three times (3×) the Bank Rate</strong> notified by the RBI.
            </p>
          </div>
          <div className="text-right bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10 shrink-0">
            <span className="text-[11px] text-blue-200 block uppercase font-semibold">Active Statutory Rate</span>
            <div className="text-3xl font-extrabold font-mono text-emerald-400 mt-0.5">
              20.25% <span className="text-xs font-normal text-slate-300">p.a.</span>
            </div>
            <span className="text-[10px] text-slate-300 font-mono block mt-1">
              Base RBI Rate: 6.75% · 3× Multiplier
            </span>
          </div>
        </div>
      </div>

      {/* Core Legal Rules Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Rule 1: MSMED Act Section 15 */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">
              1. MSMED Act, 2006 — Section 15
            </h3>
          </div>
          <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
            <p>
              <strong>Statutory Payment Window:</strong> The buyer is obligated to pay the supplier on or before the agreed date in writing.
            </p>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5 font-sans">
              <div>
                <strong>• 45-Day Absolute Cap:</strong> Under the proviso to Section 15, in no case shall the agreed period between supplier and buyer exceed <strong>45 days</strong>. Any contract clause specifying 60, 90, or 120 days is legally superseded by the 45-day statutory cap.
              </div>
              <div>
                <strong>• 15-Day Default:</strong> Where there is <strong>no written agreement</strong>, the statutory deadline is <strong>15 days</strong> from the day of acceptance (the "appointed day" under Section 2(b)).
              </div>
              <div>
                <strong>• 15-Day Objection Window:</strong> If the buyer submits a written objection regarding quality or acceptance within 15 days of delivery, the acceptance date legally shifts to the day the supplier resolves the objection (Section 2(b)(i)).
              </div>
            </div>
          </div>
        </div>

        {/* Rule 2: MSMED Act Section 16 & Section 23 */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Percent className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">
              2. MSMED Act, 2006 — Section 16 & 23
            </h3>
          </div>
          <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
            <p>
              <strong>Compound Interest with Monthly Rests:</strong> If payment is delayed past the Section 15 deadline, the buyer is liable to pay compound interest with monthly rests at 3× the RBI Bank Rate.
            </p>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
              <div>
                <strong>• Overrides Contract:</strong> Statutory interest is mandatory and overrides any contractual waiver or lower agreed interest rate.
              </div>
              <div>
                <strong>• Tax Non-Deductibility (Section 23):</strong> Under Section 23 of MSMED Act, interest paid or payable under Section 16 is <strong>strictly disallowed as a deduction</strong> under the Income-tax Act, 1961.
              </div>
              <div>
                <strong>• Formula:</strong> Compound interest with monthly rests: A = P × (1 + r/12)^m × (1 + r × rem_days/365), where r = 20.25% (3× RBI Bank Rate).
              </div>
            </div>
          </div>
        </div>

        {/* Rule 3: Income-tax Act Section 43B(h) */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600" />
            <h3 className="text-base font-bold text-slate-900">
              3. Income-tax Act, 1961 — Section 43B(h)
            </h3>
          </div>
          <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
            <p>
              <strong>Disallowance of Delayed Payments:</strong> Inserted by Finance Act, 2023 (applicable from FY 2023-24 / AY 2024-25 onwards).
            </p>
            <div className="p-3 rounded-lg bg-rose-50/50 border border-rose-200 space-y-1.5 text-slate-800">
              <div>
                <strong>• Strict Fiscal Year Timing:</strong> Any sum payable to a Micro or Small enterprise beyond the Section 15 timeline is disallowed in the year of accrual and allowed only in the year of actual payment.
              </div>
              <div>
                <strong>• Proviso Inapplicable:</strong> The general proviso allowing payment up to ITR filing date (Section 139(1)) does <strong>not</strong> apply to clause (h). If overdue at March 31, it is disallowed.
              </div>
              <div>
                <strong>• Medium Enterprises Excluded:</strong> Section 43B(h) covers only Micro and Small enterprises. Medium enterprises are exempt.
              </div>
              <div>
                <strong>• Wholesale/Retail Traders Excluded:</strong> Traders registered under Udyam (NIC 45-47) are not entitled to Section 43B(h) disallowance benefits per Ministry OM dated 02/07/2021.
              </div>
            </div>
          </div>
        </div>

        {/* Rule 4: MCA MSME Form 1 */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">
              4. MCA MSME Form 1 Reporting
            </h3>
          </div>
          <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
            <p>
              <strong>Specified Companies Order, 2019:</strong> Mandates half-yearly return to the Registrar of Companies (ROC) under Section 405 of Companies Act, 2013.
            </p>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
              <div>
                <strong>• Trigger:</strong> Any dues outstanding to Micro or Small enterprises for <strong>more than 45 days</strong>.
              </div>
              <div>
                <strong>• Reporting Cycles:</strong>
                <ul className="list-disc pl-5 mt-1 space-y-0.5">
                  <li>April to September (H1) — Due by 31st October</li>
                  <li>October to March (H2) — Due by 30th April</li>
                </ul>
              </div>
              <div>
                <strong>• Required Disclosures:</strong> Supplier name, PAN, Udyam registration number, exact amount due, and detailed commercial reasons for delay.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Legal & Product Disclaimer */}
      <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 flex items-start gap-3">
        <Info className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-slate-800">Compliance & Regulatory Disclaimer</span>
          <p className="leading-relaxed">
            Closing the Payment Gap provides automated compliance workflows, calculation assistance, and audit tracking. It does not provide legal advice, tax opinion, or guaranteed dispute recovery. Statutory assumptions should be reviewed by your qualified Chartered Accountant or Legal Counsel prior to formal statutory filings with the MCA or Income Tax Department.
          </p>
        </div>
      </div>
    </div>
  );
};
