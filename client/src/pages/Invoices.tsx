import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api.js';
import { formatInr, formatDate, formatDaysRemaining } from '../utils/formatters.js';
import { ComplianceStatusBadge, MsmeBadge, PaymentBadge } from '../components/Badges.js';
import { Modal } from '../components/Modal.js';
import {
  FilePlus,
  Search,
  Filter,
  DollarSign,
  AlertTriangle,
  Info,
  CheckCircle2,
  Calendar,
  CreditCard,
  Eye,
  Trash2,
  Clock,
  Download,
} from 'lucide-react';

export const Invoices: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState(searchParams.get('status') || 'ALL');
  const [complianceStatus, setComplianceStatus] = useState('ALL');
  const [selectedSupplierId, setSelectedSupplierId] = useState('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(searchParams.get('action') === 'new');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState<any>(null);

  // Add Invoice Form State
  const [formSupplierId, setFormSupplierId] = useState('');
  const [formInvoiceNumber, setFormInvoiceNumber] = useState('');
  const [formInvoiceDate, setFormInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [formDeliveryDate, setFormDeliveryDate] = useState(new Date().toISOString().slice(0, 10));
  const [formHasAgreement, setFormHasAgreement] = useState(true);
  const [formCreditDays, setFormCreditDays] = useState(30);
  const [formPrincipalAmount, setFormPrincipalAmount] = useState('');
  const [formHasObjection, setFormHasObjection] = useState(false);
  const [formObjectionDate, setFormObjectionDate] = useState('');
  const [formObjectionResolvedDate, setFormObjectionResolvedDate] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Payment Form State
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payRef, setPayRef] = useState('');
  const [payMode, setPayMode] = useState('NEFT');
  const [payNotes, setPayNotes] = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [search, paymentStatus, complianceStatus, selectedSupplierId]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [invRes, supRes] = await Promise.all([
        api.get('/invoices', {
          search: search || undefined,
          paymentStatus: paymentStatus !== 'ALL' ? paymentStatus : undefined,
          complianceStatus: complianceStatus !== 'ALL' ? complianceStatus : undefined,
          supplierId: selectedSupplierId !== 'ALL' ? selectedSupplierId : undefined,
        }),
        api.get('/suppliers'),
      ]);

      if (invRes.success) setInvoices(invRes.items || []);
      if (supRes.success) setSuppliers(supRes.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load invoices');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSubmitting(true);
    try {
      const amount = parseFloat(formPrincipalAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid positive principal amount');
      }

      await api.post('/invoices', {
        supplierId: formSupplierId,
        invoiceNumber: formInvoiceNumber.trim(),
        invoiceDate: formInvoiceDate,
        deliveryDate: formDeliveryDate || null,
        hasWrittenAgreement: formHasAgreement,
        contractualCreditDays: formCreditDays,
        principalAmount: amount,
        hasWrittenObjection: formHasObjection,
        objectionDate: formHasObjection && formObjectionDate ? formObjectionDate : null,
        objectionResolvedDate: formHasObjection && formObjectionResolvedDate ? formObjectionResolvedDate : null,
        notes: formNotes || null,
      });

      setIsAddModalOpen(false);
      resetAddForm();
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create invoice');
    } finally {
      setFormSubmitting(false);
    }
  };

  const resetAddForm = () => {
    setFormSupplierId('');
    setFormInvoiceNumber('');
    setFormPrincipalAmount('');
    setFormCreditDays(30);
    setFormHasAgreement(true);
    setFormHasObjection(false);
    setFormNotes('');
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInvoice) return;
    setPaySubmitting(true);
    try {
      const amount = parseFloat(payAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid positive payment amount');
      }

      await api.post(`/invoices/${activeInvoice.id}/payments`, {
        amount,
        paymentDate: payDate,
        referenceNumber: payRef || null,
        paymentMode: payMode,
        notes: payNotes || null,
      });

      setIsPaymentModalOpen(false);
      setPayAmount('');
      setPayRef('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Payment recording failed');
    } finally {
      setPaySubmitting(false);
    }
  };

  // Preview statutory calculation in Add Invoice modal
  const selectedSupplier = suppliers.find((s) => s.id === formSupplierId);
  const effectiveDueDays = !formHasAgreement ? 15 : Math.min(formCreditDays, 45);
  const isCapped = formHasAgreement && formCreditDays > 45;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Invoice Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative tracking of statutory credit caps, acceptance dates, and Section 16 interest
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/api/reports/invoices-export"
            download
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </a>
          <button
            onClick={() => {
              resetAddForm();
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold shadow-sm hover:bg-blue-700 transition-colors"
          >
            <FilePlus className="w-4 h-4" />
            Add Invoice
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by invoice number, vendor name, or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Status Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white text-slate-700 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Paid</option>
            <option value="DISPUTED">Disputed (Sec 2(b))</option>
          </select>

          <select
            value={complianceStatus}
            onChange={(e) => setComplianceStatus(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white text-slate-700 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="ALL">All Compliance Flags</option>
            <option value="COMPLIANT">Compliant</option>
            <option value="APPROACHING_DEADLINE">Approaching (&le; 7d)</option>
            <option value="OVERDUE">Overdue (Sec 15)</option>
            <option value="SEC_43B_EXPOSURE">Sec 43B(h) Risk</option>
            <option value="INCOMPLETE_DATA">Missing Delivery Date</option>
          </select>

          <select
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white text-slate-700 focus:ring-blue-500 focus:border-blue-500 max-w-[180px] truncate"
          >
            <option value="ALL">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Invoices Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4">Invoice #</th>
                <th className="py-3.5 px-4">Supplier</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Inv Date</th>
                <th className="py-3.5 px-4">Due Date</th>
                <th className="py-3.5 px-4 text-right">Principal</th>
                <th className="py-3.5 px-4 text-right">Balance Due</th>
                <th className="py-3.5 px-4 text-right">Sec 16 Interest</th>
                <th className="py-3.5 px-4">Payment</th>
                <th className="py-3.5 px-4">Compliance Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    No matching invoices found for the selected filters.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const balanceDue = Math.max(0, inv.principalAmount - inv.amountPaid);
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800 max-w-[180px] truncate">
                        {inv.supplier?.name}
                      </td>
                      <td className="py-3.5 px-4">
                        <MsmeBadge type={inv.supplier?.msmeType} isTrader={inv.supplier?.isTrader} />
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {formatDate(inv.invoiceDate)}
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <div className="text-slate-800 font-semibold">{formatDate(inv.dueDate)}</div>
                        <div className="text-[10px] text-slate-400 font-sans">
                          {inv.dueDateSource === 'STATUTORY_45_DAY_CAP' ? (
                            <span className="text-amber-700 font-bold">45-day Sec 15 Cap</span>
                          ) : inv.dueDateSource === 'STATUTORY_15_DAY_DEFAULT' ? (
                            <span className="text-blue-700 font-semibold">15-day Default</span>
                          ) : (
                            `${inv.contractualCreditDays}d Agreed`
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900">
                        {formatInr(inv.principalAmount)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        {formatInr(balanceDue)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-rose-600">
                        {inv.accruedInterest > 0 ? formatInr(inv.accruedInterest) : '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <PaymentBadge status={inv.paymentStatus} />
                      </td>
                      <td className="py-3.5 px-4">
                        <ComplianceStatusBadge status={inv.complianceStatus} daysOverdue={inv.daysOverdue} />
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setActiveInvoice(inv);
                              setIsDetailsModalOpen(true);
                            }}
                            title="View Calculation & Statutory Audit Details"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {inv.paymentStatus !== 'PAID' && (
                            <button
                              onClick={() => {
                                setActiveInvoice(inv);
                                setPayAmount(String(balanceDue));
                                setIsPaymentModalOpen(true);
                              }}
                              title="Record Settlement Payment"
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                            >
                              <CreditCard className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Invoice Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Record New Supplier Invoice"
        subtitle="Automatic calculation of Section 15 statutory deadline and compound interest exposure"
      >
        <form onSubmit={handleCreateInvoice} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Supplier *</label>
              <select
                required
                value={formSupplierId}
                onChange={(e) => setFormSupplierId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Choose Supplier --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.msmeType})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Invoice Number *</label>
              <input
                type="text"
                required
                placeholder="e.g. INV-2026-901"
                value={formInvoiceNumber}
                onChange={(e) => setFormInvoiceNumber(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono uppercase focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Invoice Date *</label>
              <input
                type="date"
                required
                value={formInvoiceDate}
                onChange={(e) => setFormInvoiceDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Delivery / Acceptance Date</label>
              <input
                type="date"
                value={formDeliveryDate}
                onChange={(e) => setFormDeliveryDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-400">Day of delivery under Sec 2(b)</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Principal Amount (INR) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="₹ 0.00"
                value={formPrincipalAmount}
                onChange={(e) => setFormPrincipalAmount(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Credit Agreement Section */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800">Is there an agreement in writing?</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formHasAgreement}
                  onChange={(e) => setFormHasAgreement(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {formHasAgreement ? (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Agreed Credit Days (in contract / PO)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={formCreditDays}
                    onChange={(e) => setFormCreditDays(parseInt(e.target.value, 10) || 0)}
                    className="w-32 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                  <span className="text-[11px] text-slate-500">
                    Statutory Rule: Section 15 proviso strictly caps agreed credit terms to <strong>45 days</strong>.
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-[11px]">
                Under Section 15 of MSMED Act, 2006: Where there is <strong>no written agreement</strong>, the statutory deadline is <strong>15 days</strong> from the day of acceptance.
              </div>
            )}
          </div>

          {/* Statutory Calculation Preview Badge */}
          <div className="p-3 rounded-lg border border-slate-200 bg-amber-50/40 text-slate-800 flex items-start gap-2 text-xs">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-900">
                Calculated Statutory Limit: {effectiveDueDays} days from acceptance
              </div>
              {isCapped && (
                <div className="text-amber-800 text-[11px] font-medium mt-0.5">
                  ⚠️ Your contractual terms ({formCreditDays} days) exceed 45 days. The statutory cap of 45 days will legally override your contract under Section 15!
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Internal Notes & Context</label>
            <textarea
              rows={2}
              placeholder="e.g. PO Ref #1245; pending inspection clearance..."
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            ></textarea>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold disabled:opacity-50"
            >
              {formSubmitting ? 'Recording...' : 'Record Invoice'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={`Record Payment for ${activeInvoice?.invoiceNumber}`}
        subtitle={`Supplier: ${activeInvoice?.supplier?.name}`}
      >
        <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Payment Amount (INR) *</label>
            <input
              type="number"
              step="0.01"
              required
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Date *</label>
              <input
                type="date"
                required
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Mode</label>
              <select
                value={payMode}
                onChange={(e) => setPayMode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
              >
                <option value="NEFT">NEFT</option>
                <option value="RTGS">RTGS</option>
                <option value="CHEQUE">Cheque</option>
                <option value="UPI">UPI</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Bank Reference / UTR Number</label>
            <input
              type="text"
              placeholder="e.g. UTR-HDFC-99118822"
              value={payRef}
              onChange={(e) => setPayRef(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Payment Notes</label>
            <input
              type="text"
              placeholder="Settlement notes..."
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={paySubmitting}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-semibold disabled:opacity-50"
            >
              {paySubmitting ? 'Processing...' : 'Confirm Payment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Details Drawer / Modal */}
      {activeInvoice && (
        <Modal
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          title={`Invoice ${activeInvoice.invoiceNumber}`}
          subtitle={`Compliance Audit & Statutory Calculation Breakdown`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-6 text-xs">
            {/* Vendor & Status Header */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Supplier</span>
                <span className="text-sm font-bold text-slate-900 block">{activeInvoice.supplier?.name}</span>
                <div className="flex items-center gap-2 mt-1">
                  <MsmeBadge type={activeInvoice.supplier?.msmeType} isTrader={activeInvoice.supplier?.isTrader} />
                  <span className="text-slate-400 font-mono text-[11px]">
                    PAN: {activeInvoice.supplier?.pan || 'N/A'} · Udyam: {activeInvoice.supplier?.udyamNumber || 'Self-Declared'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Compliance Flag</span>
                <div className="mt-1">
                  <ComplianceStatusBadge status={activeInvoice.complianceStatus} daysOverdue={activeInvoice.daysOverdue} />
                </div>
              </div>
            </div>

            {/* Core Financial & Calculation Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Principal Value</span>
                <span className="text-sm font-mono font-bold text-slate-900 block mt-1">
                  {formatInr(activeInvoice.principalAmount)}
                </span>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Amount Paid</span>
                <span className="text-sm font-mono font-bold text-emerald-700 block mt-1">
                  {formatInr(activeInvoice.amountPaid)}
                </span>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Days Overdue</span>
                <span className={`text-sm font-mono font-bold block mt-1 ${activeInvoice.daysOverdue > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                  {activeInvoice.daysOverdue} days
                </span>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Sec 16 Interest</span>
                <span className="text-sm font-mono font-bold text-rose-700 block mt-1">
                  {formatInr(activeInvoice.accruedInterest)}
                </span>
              </div>
            </div>

            {/* Statutory Compliance Analysis */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-3">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
                Statutory Timeline Determination (MSMED Act 2006 Section 15)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px] text-slate-600">
                <div>
                  <span className="text-slate-400 block">Invoice Date:</span>
                  <span className="font-semibold text-slate-800 font-mono">{formatDate(activeInvoice.invoiceDate)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Day of Acceptance (Sec 2(b)):</span>
                  <span className="font-semibold text-slate-800 font-mono">{formatDate(activeInvoice.acceptanceDate)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Statutory Due Date:</span>
                  <span className="font-semibold text-slate-800 font-mono">{formatDate(activeInvoice.dueDate)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Contractual Credit:</span>
                  <span className="font-semibold text-slate-800">{activeInvoice.contractualCreditDays} days</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Statutory Allowed Limit:</span>
                  <span className="font-semibold text-slate-800">{activeInvoice.statutoryLimitDays} days</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Due Date Source:</span>
                  <span className="font-semibold text-blue-700 font-mono">{activeInvoice.dueDateSource}</span>
                </div>
              </div>
            </div>

            {/* Section 43B(h) Disallowance Exposure */}
            {activeInvoice.section43bExposure > 0 && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-950 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">Section 43B(h) Tax Disallowance Risk</span>
                  <span className="font-mono font-bold text-xs">
                    Disallowance: {formatInr(activeInvoice.section43bExposure)}
                  </span>
                </div>
                <p className="text-[11px] text-red-800 leading-relaxed">
                  Breached Section 15 deadline. If unpaid as of March 31, this expense will be added back to taxable income, generating an estimated additional tax liability of <strong>{formatInr(activeInvoice.potentialTaxImpact)}</strong> (at corporate tax rate 25.17%).
                </p>
              </div>
            )}

            {/* Payment History */}
            <div>
              <h4 className="font-bold text-slate-900 text-xs mb-2">Payment History</h4>
              {(!activeInvoice.payments || activeInvoice.payments.length === 0) ? (
                <p className="text-slate-400 text-[11px] italic">No payments recorded against this invoice yet.</p>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Amount</th>
                        <th className="py-2 px-3">Mode</th>
                        <th className="py-2 px-3">Reference (UTR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeInvoice.payments.map((p: any) => (
                        <tr key={p.id}>
                          <td className="py-2 px-3 font-mono">{formatDate(p.paymentDate)}</td>
                          <td className="py-2 px-3 font-mono font-bold text-emerald-700">{formatInr(p.amount)}</td>
                          <td className="py-2 px-3">{p.paymentMode}</td>
                          <td className="py-2 px-3 font-mono">{p.referenceNumber || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
