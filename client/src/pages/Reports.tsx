import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api.js';
import { formatInr, formatDate } from '../utils/formatters.js';
import {
  BarChart3,
  Download,
  Printer,
  FileSpreadsheet,
  AlertTriangle,
  Info,
  Calendar,
  Building2,
  FileText,
} from 'lucide-react';

export const Reports: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'FORM_1' | 'SEC_43B'>(
    searchParams.get('tab') === '43b' ? 'SEC_43B' : 'FORM_1'
  );

  const [form1Data, setForm1Data] = useState<any>(null);
  const [sec43bData, setSec43bData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
  }, [activeTab]);

  const loadReports = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (activeTab === 'FORM_1') {
        const res = await api.get('/reports/msme-form-1');
        if (res.success) setForm1Data(res.data);
      } else {
        const res = await api.get('/reports/section-43b');
        if (res.success) setSec43bData(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate statutory report');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header (Hidden when printing) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Statutory Reports & MCA Filing Preparation
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Generate compliant schedules for MSME Form 1 (MCA) and Section 43B(h) income tax disallowance
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>

          <a
            href={`/api/reports/${activeTab === 'FORM_1' ? 'msme-form-1' : 'section-43b'}?format=csv`}
            download
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            Download CSV Export
          </a>
        </div>
      </div>

      {/* Report Selection Tabs (Hidden when printing) */}
      <div className="print:hidden flex border-b border-slate-200 gap-4">
        <button
          onClick={() => setActiveTab('FORM_1')}
          className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'FORM_1'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          MSME Form 1 Filing Preparation (Dues &gt; 45 Days)
        </button>

        <button
          onClick={() => setActiveTab('SEC_43B')}
          className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'SEC_43B'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Section 43B(h) Income Tax Disallowance Schedule
        </button>
      </div>

      {/* Print Document Header */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-tight text-slate-900">
              Closing the Payment Gap · Statutory Compliance Schedule
            </h1>
            <p className="text-xs text-slate-600 mt-1 font-mono">
              Generated: {new Date().toLocaleDateString('en-IN', { dateStyle: 'full' })}
            </p>
          </div>
          <div className="text-right text-xs">
            <span className="font-bold">Apex Automotive Systems India Pvt Ltd</span>
            <span className="block text-slate-500 font-mono">PAN: AABCA9876K</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
          Compiling statutory report data...
        </div>
      ) : activeTab === 'FORM_1' ? (
        /* MSME Form 1 View */
        <div className="space-y-6">
          {/* Statutory Meta Box */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">
                {form1Data?.meta?.reportName}
              </span>
              <span className="font-mono text-slate-500 text-[11px]">
                {form1Data?.meta?.statutoryReference}
              </span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              {form1Data?.meta?.disclaimer}
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-6 font-mono text-slate-800 font-semibold border-t border-slate-200/60">
              <span>Eligible Overdue Records: {form1Data?.meta?.recordCount || 0}</span>
              <span>Total Principal Exceeding 45 Days: {formatInr(form1Data?.meta?.totalOutstanding)}</span>
              <span>Total Accrued Section 16 Interest: {formatInr(form1Data?.meta?.totalInterest)}</span>
            </div>
          </div>

          {/* Form 1 Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Supplier Name</th>
                    <th className="py-3 px-4">PAN</th>
                    <th className="py-3 px-4">Udyam Registration #</th>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4 text-right">Amount Due</th>
                    <th className="py-3 px-4 text-center">Days Overdue</th>
                    <th className="py-3 px-4 text-right">Accrued Sec 16 Interest</th>
                    <th className="py-3 px-4">Reason for Delay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {(!form1Data?.records || form1Data.records.length === 0) ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 font-sans">
                        No supplier dues currently exceed 45 days. No mandatory filing required.
                      </td>
                    </tr>
                  ) : (
                    form1Data.records.map((r: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-sans font-bold text-slate-900">{r.supplierName}</td>
                        <td className="py-3 px-4 text-slate-700">{r.supplierPan}</td>
                        <td className="py-3 px-4 text-blue-700 font-semibold">{r.udyamRegistrationNumber}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{r.invoiceNumber}</td>
                        <td className="py-3 px-4 text-slate-600">{r.dueDate}</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">{formatInr(r.amountDue)}</td>
                        <td className="py-3 px-4 text-center text-rose-600 font-bold">{r.daysOverdue}d</td>
                        <td className="py-3 px-4 text-right text-rose-700 font-bold">{formatInr(r.statutoryInterestAccrued)}</td>
                        <td className="py-3 px-4 font-sans text-slate-600 max-w-[200px] truncate">{r.reasonForDelay}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Section 43B(h) Schedule View */
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-red-950">
                {sec43bData?.meta?.reportName}
              </span>
              <span className="font-mono text-red-800 text-[11px]">
                {sec43bData?.meta?.statutoryReference}
              </span>
            </div>
            <p className="text-red-900 leading-relaxed text-[11px]">
              {sec43bData?.meta?.disclaimer}
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-6 font-mono text-red-950 font-bold border-t border-red-200">
              <span>Disallowance Risk Count: {sec43bData?.meta?.recordCount || 0}</span>
              <span>Total Disallowed Expenditure: {formatInr(sec43bData?.meta?.totalExposure)}</span>
              <span>Potential Corporate Cash Tax Impact (25.17%): {formatInr(sec43bData?.meta?.totalTaxImpact)}</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-4">MSME Category</th>
                    <th className="py-3 px-4">Invoice Date</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4 text-right">Disallowed Principal</th>
                    <th className="py-3 px-4 text-right">Estimated Cash Tax Impact</th>
                    <th className="py-3 px-4 text-center">Days Overdue</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {(!sec43bData?.records || sec43bData.records.length === 0) ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 font-sans">
                        No invoices currently at risk of Section 43B(h) tax disallowance.
                      </td>
                    </tr>
                  ) : (
                    sec43bData.records.map((r: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-bold text-slate-900">{r.invoiceNumber}</td>
                        <td className="py-3 px-4 font-sans font-semibold text-slate-800">{r.supplierName}</td>
                        <td className="py-3 px-4 font-sans">{r.supplierType}</td>
                        <td className="py-3 px-4 text-slate-600">{r.invoiceDate}</td>
                        <td className="py-3 px-4 text-slate-600">{r.dueDate}</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">{formatInr(r.exposureAmount)}</td>
                        <td className="py-3 px-4 text-right font-bold text-red-600">{formatInr(r.potentialTaxImpact)}</td>
                        <td className="py-3 px-4 text-center text-rose-600 font-bold">{r.daysOverdue}d</td>
                        <td className="py-3 px-4 font-sans text-slate-700">{r.paymentStatus}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
