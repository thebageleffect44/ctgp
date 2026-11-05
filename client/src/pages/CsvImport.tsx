import React, { useState } from 'react';
import { api } from '../services/api.js';
import { formatInr } from '../utils/formatters.js';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  RefreshCw,
  Info,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const CsvImport: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState<string>('');
  const [step, setStep] = useState<'UPLOAD' | 'MAP' | 'VALIDATE' | 'DONE'>('UPLOAD');

  // Preview & Mapping
  const [previewData, setPreviewData] = useState<any>(null);
  const [mapping, setMapping] = useState<any>({
    invoiceNumber: '',
    supplierName: '',
    invoiceDate: '',
    principalAmount: '',
    deliveryDate: '',
    contractualCreditDays: '',
    supplierPan: '',
    supplierUdyam: '',
    supplierMsmeType: '',
  });

  // Validation
  const [validationResult, setValidationResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setCsvContent(text);
      };
      reader.readAsText(selected);
    }
  };

  const handleUploadPreview = async () => {
    if (!csvContent) {
      setError('Please select a valid CSV file.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await api.post('/import/preview', { csvContent });
      if (res.success) {
        setPreviewData(res.data);
        setMapping((prev: any) => ({
          ...prev,
          ...res.data.suggestedMapping,
        }));
        setStep('MAP');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process CSV file preview');
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!mapping.invoiceNumber || !mapping.supplierName || !mapping.invoiceDate || !mapping.principalAmount) {
      setError('Please map all required fields: Invoice Number, Supplier Name, Invoice Date, and Amount.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await api.post('/import/validate', {
        csvContent,
        mapping,
      });
      if (res.success) {
        setValidationResult(res.data);
        setStep('VALIDATE');
      }
    } catch (err: any) {
      setError(err.message || 'Validation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!validationResult || !validationResult.rows) return;

    setIsLoading(true);
    setError(null);
    try {
      const res = await api.post('/import/commit', {
        validatedRows: validationResult.rows,
      });
      if (res.success) {
        setImportSummary(res.data);
        setStep('DONE');
      }
    } catch (err: any) {
      setError(err.message || 'Import commit failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Bulk Invoice CSV Import
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative backend validation, automatic duplicate checks, and statutory deadline assignment
          </p>
        </div>

        <a
          href="/api/import/sample-template"
          download
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />
          Download Sample CSV Template
        </a>
      </div>

      {/* Progress Steps Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-around text-xs">
        <div className={`flex items-center gap-2 ${step === 'UPLOAD' ? 'font-bold text-blue-600' : 'text-slate-500'}`}>
          <span className="w-5 h-5 rounded-full flex items-center justify-center bg-blue-100 text-blue-700 text-[11px] font-bold">1</span>
          Upload File
        </div>
        <div className="h-0.5 w-12 bg-slate-200"></div>
        <div className={`flex items-center gap-2 ${step === 'MAP' ? 'font-bold text-blue-600' : 'text-slate-500'}`}>
          <span className="w-5 h-5 rounded-full flex items-center justify-center bg-blue-100 text-blue-700 text-[11px] font-bold">2</span>
          Map Columns
        </div>
        <div className="h-0.5 w-12 bg-slate-200"></div>
        <div className={`flex items-center gap-2 ${step === 'VALIDATE' ? 'font-bold text-blue-600' : 'text-slate-500'}`}>
          <span className="w-5 h-5 rounded-full flex items-center justify-center bg-blue-100 text-blue-700 text-[11px] font-bold">3</span>
          Validate & Preview
        </div>
        <div className="h-0.5 w-12 bg-slate-200"></div>
        <div className={`flex items-center gap-2 ${step === 'DONE' ? 'font-bold text-emerald-600' : 'text-slate-500'}`}>
          <span className="w-5 h-5 rounded-full flex items-center justify-center bg-emerald-100 text-emerald-700 text-[11px] font-bold">4</span>
          Completed
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: Upload Dropzone */}
      {step === 'UPLOAD' && (
        <div className="bg-white rounded-xl border-2 border-dashed border-slate-300 p-12 text-center shadow-sm space-y-4 hover:border-blue-400 transition-colors">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
            <UploadCloud className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Select or drop your CSV file</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Upload invoices exported from your ERP, Tally, or accounting ledger. Maximum file size: 5 MB.
            </p>
          </div>

          <div className="pt-2">
            <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-xs font-semibold cursor-pointer hover:bg-blue-700 shadow-sm transition-colors">
              <span>Choose CSV File</span>
              <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
            </label>
            {file && (
              <span className="block text-xs font-mono font-semibold text-slate-700 mt-2">
                Selected: {file.name} ({Math.round(file.size / 1024)} KB)
              </span>
            )}
          </div>

          {file && (
            <div className="pt-4 border-t border-slate-100 max-w-sm mx-auto">
              <button
                onClick={handleUploadPreview}
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50"
              >
                {isLoading ? 'Scanning File...' : 'Proceed to Column Mapping →'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: Column Mapping */}
      {step === 'MAP' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900">Map CSV Columns</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Confirm which columns in your CSV represent the required compliance fields
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Invoice Number *</label>
              <select
                value={mapping.invoiceNumber}
                onChange={(e) => setMapping({ ...mapping, invoiceNumber: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
              >
                <option value="">-- Select Column --</option>
                {previewData?.headers?.map((h: string) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Supplier Name *</label>
              <select
                value={mapping.supplierName}
                onChange={(e) => setMapping({ ...mapping, supplierName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
              >
                <option value="">-- Select Column --</option>
                {previewData?.headers?.map((h: string) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Invoice Date *</label>
              <select
                value={mapping.invoiceDate}
                onChange={(e) => setMapping({ ...mapping, invoiceDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
              >
                <option value="">-- Select Column --</option>
                {previewData?.headers?.map((h: string) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Principal Amount *</label>
              <select
                value={mapping.principalAmount}
                onChange={(e) => setMapping({ ...mapping, principalAmount: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
              >
                <option value="">-- Select Column --</option>
                {previewData?.headers?.map((h: string) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Delivery / Acceptance Date</label>
              <select
                value={mapping.deliveryDate}
                onChange={(e) => setMapping({ ...mapping, deliveryDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
              >
                <option value="">(Optional) None</option>
                {previewData?.headers?.map((h: string) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Agreed Credit Days</label>
              <select
                value={mapping.contractualCreditDays}
                onChange={(e) => setMapping({ ...mapping, contractualCreditDays: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
              >
                <option value="">(Optional) Default 30d</option>
                {previewData?.headers?.map((h: string) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Supplier PAN</label>
              <select
                value={mapping.supplierPan}
                onChange={(e) => setMapping({ ...mapping, supplierPan: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
              >
                <option value="">(Optional) None</option>
                {previewData?.headers?.map((h: string) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Udyam Registration #</label>
              <select
                value={mapping.supplierUdyam}
                onChange={(e) => setMapping({ ...mapping, supplierUdyam: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
              >
                <option value="">(Optional) None</option>
                {previewData?.headers?.map((h: string) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep('UPLOAD')}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
            >
              ← Back to File
            </button>
            <button
              onClick={handleValidate}
              disabled={isLoading}
              className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-sm disabled:opacity-50"
            >
              {isLoading ? 'Validating Records...' : 'Validate & Preview Rows →'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Validation Summary & Row Review */}
      {step === 'VALIDATE' && (
        <div className="space-y-6">
          {/* Validation Metrics Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Rows In File</span>
              <span className="text-xl font-bold font-mono text-slate-900 block mt-1">{validationResult?.totalRows}</span>
            </div>
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-[10px] text-emerald-700 uppercase font-semibold block">Valid for Import</span>
              <span className="text-xl font-bold font-mono text-emerald-800 block mt-1">{validationResult?.validRowCount}</span>
            </div>
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
              <span className="text-[10px] text-amber-700 uppercase font-semibold block">Duplicates Detected</span>
              <span className="text-xl font-bold font-mono text-amber-800 block mt-1">{validationResult?.duplicateRowCount}</span>
            </div>
            <div className="p-4 bg-rose-50 rounded-xl border border-rose-200">
              <span className="text-[10px] text-rose-700 uppercase font-semibold block">Formatting Errors</span>
              <span className="text-xl font-bold font-mono text-rose-800 block mt-1">{validationResult?.errorRowCount}</span>
            </div>
          </div>

          {/* Rows Inspection Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Row-by-Row Validation Report</h3>
              <span className="text-xs text-slate-500">Only verified rows will be persisted</span>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3 text-center">Row</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Invoice #</th>
                    <th className="py-2.5 px-3">Supplier</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3">Validation Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {validationResult?.rows?.map((r: any) => (
                    <tr
                      key={r.rowNumber}
                      className={r.isValid ? 'hover:bg-slate-50' : r.isDuplicate ? 'bg-amber-50/50' : 'bg-rose-50/50'}
                    >
                      <td className="py-2 px-3 text-center text-slate-400 font-sans">{r.rowNumber}</td>
                      <td className="py-2 px-3">
                        {r.isValid ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-sans font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                          </span>
                        ) : r.isDuplicate ? (
                          <span className="inline-flex items-center gap-1 text-amber-700 font-sans font-semibold">
                            <AlertTriangle className="w-3.5 h-3.5" /> Duplicate
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 font-sans font-semibold">
                            <XCircle className="w-3.5 h-3.5" /> Error
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-900">{r.data.invoiceNumber || '—'}</td>
                      <td className="py-2 px-3 font-sans text-slate-800">{r.data.supplierName || '—'}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">{formatInr(r.data.principalAmount)}</td>
                      <td className="py-2 px-3 font-sans">
                        {r.errors.length > 0 ? (
                          <span className="text-rose-700">{r.errors.join('; ')}</span>
                        ) : (
                          <span className="text-emerald-700">Ready to import</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <button
                onClick={() => setStep('MAP')}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100"
              >
                ← Back to Mapping
              </button>
              <button
                onClick={handleCommit}
                disabled={isLoading || validationResult?.validRowCount === 0}
                className="px-6 py-2.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 shadow-sm disabled:opacity-50"
              >
                {isLoading ? 'Persisting Invoices...' : `Import ${validationResult?.validRowCount} Verified Invoices →`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Import Complete */}
      {step === 'DONE' && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center max-w-xl mx-auto shadow-sm space-y-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Invoices Imported Successfully</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Persisted <strong>{importSummary?.acceptedCount} invoices</strong> to your organization ledger. Statutory Section 15 caps and Section 16 interest have been automatically calculated.
          </p>
          <div className="pt-4 flex items-center justify-center gap-3">
            <Link
              to="/invoices"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-sm"
            >
              View Invoices →
            </Link>
            <button
              onClick={() => {
                setFile(null);
                setCsvContent('');
                setStep('UPLOAD');
              }}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
            >
              Upload Another CSV
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
