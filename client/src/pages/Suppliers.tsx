import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { formatInr } from '../utils/formatters.js';
import { MsmeBadge, VerificationBadge } from '../components/Badges.js';
import { Modal } from '../components/Modal.js';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  Building2,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Edit2,
  Info,
} from 'lucide-react';

export const Suppliers: React.FC = () => {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [msmeFilter, setMsmeFilter] = useState('ALL');
  const [verificationFilter, setVerificationFilter] = useState('ALL');

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [pan, setPan] = useState('');
  const [udyamNumber, setUdyamNumber] = useState('');
  const [msmeType, setMsmeType] = useState('MICRO');
  const [isTrader, setIsTrader] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('SELF_DECLARED');
  const [contactPerson, setContactPerson] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    loadSuppliers();
  }, [search, msmeFilter, verificationFilter]);

  const loadSuppliers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/suppliers', {
        search: search || undefined,
        msmeType: msmeFilter !== 'ALL' ? msmeFilter : undefined,
        verificationStatus: verificationFilter !== 'ALL' ? verificationFilter : undefined,
      });
      if (res.success) setSuppliers(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load suppliers');
    } finally {
      setIsLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingSupplier(null);
    setName('');
    setPan('');
    setUdyamNumber('');
    setMsmeType('MICRO');
    setIsTrader(false);
    setVerificationStatus('SELF_DECLARED');
    setContactPerson('');
    setContactEmail('');
    setContactPhone('');
    setAddress('');
    setNotes('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (s: any) => {
    setEditingSupplier(s);
    setName(s.name);
    setPan(s.pan || '');
    setUdyamNumber(s.udyamNumber || '');
    setMsmeType(s.msmeType);
    setIsTrader(s.isTrader || false);
    setVerificationStatus(s.verificationStatus);
    setContactPerson(s.contactPerson || '');
    setContactEmail(s.contactEmail || '');
    setContactPhone(s.contactPhone || '');
    setAddress(s.address || '');
    setNotes(s.notes || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    try {
      if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.toUpperCase())) {
        throw new Error('Invalid Indian PAN format (must be 5 letters, 4 digits, 1 letter, e.g. ABCDE1234F)');
      }

      if (udyamNumber && !/^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/.test(udyamNumber.toUpperCase())) {
        throw new Error('Invalid Udyam registration format (e.g. UDYAM-MH-01-0012345)');
      }

      const payload = {
        name: name.trim(),
        pan: pan ? pan.toUpperCase().trim() : null,
        udyamNumber: udyamNumber ? udyamNumber.toUpperCase().trim() : null,
        msmeType,
        isTrader,
        verificationStatus,
        contactPerson: contactPerson.trim() || null,
        contactEmail: contactEmail.trim() || null,
        contactPhone: contactPhone.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      };

      if (editingSupplier) {
        await api.patch(`/suppliers/${editingSupplier.id}`, payload);
      } else {
        await api.post('/suppliers', payload);
      }

      setIsModalOpen(false);
      await loadSuppliers();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save supplier details');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Supplier Directory & MSME Classifications
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Maintain verified Udyam records, manufacturing/trading classification, and exposure tracking
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold shadow-sm hover:bg-blue-700 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Add Supplier
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by supplier name, PAN, Udyam, or contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={msmeFilter}
            onChange={(e) => setMsmeFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white text-slate-700"
          >
            <option value="ALL">All Categories</option>
            <option value="MICRO">Micro MSE</option>
            <option value="SMALL">Small MSE</option>
            <option value="MEDIUM">Medium MSME</option>
            <option value="NOT_MSME">Non-MSME</option>
            <option value="UNVERIFIED">Unverified</option>
          </select>

          <select
            value={verificationFilter}
            onChange={(e) => setVerificationFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white text-slate-700"
          >
            <option value="ALL">All Verification Statuses</option>
            <option value="VERIFIED">Udyam Verified</option>
            <option value="SELF_DECLARED">Self-Declared</option>
            <option value="UNVERIFIED">Unverified</option>
          </select>
        </div>
      </div>

      {/* Suppliers Grid / Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4">Supplier Name</th>
                <th className="py-3.5 px-4">MSME Category</th>
                <th className="py-3.5 px-4">Verification</th>
                <th className="py-3.5 px-4">PAN / Udyam</th>
                <th className="py-3.5 px-4 text-center">Invoices</th>
                <th className="py-3.5 px-4 text-right">Outstanding</th>
                <th className="py-3.5 px-4 text-right">Overdue</th>
                <th className="py-3.5 px-4 text-right">43B(h) Risk</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Loading suppliers...
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No suppliers found matching your query. Click "Add Supplier" to register a new vendor.
                  </td>
                </tr>
              ) : (
                suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{s.name}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        {s.contactPerson && <span>{s.contactPerson}</span>}
                        {s.contactPhone && <span>· {s.contactPhone}</span>}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <MsmeBadge type={s.msmeType} isTrader={s.isTrader} />
                    </td>
                    <td className="py-3.5 px-4">
                      <VerificationBadge status={s.verificationStatus} />
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      <div>{s.pan || <span className="text-slate-400 italic font-sans">No PAN</span>}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {s.udyamNumber || <span className="text-slate-400 italic font-sans">No Udyam</span>}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono">
                      <span className="font-semibold text-slate-800">{s.invoiceCount || 0}</span>
                      {s.overdueInvoiceCount > 0 && (
                        <span className="text-rose-600 block text-[10px]">({s.overdueInvoiceCount} overdue)</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900">
                      {formatInr(s.totalOutstanding)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-rose-600">
                      {s.totalOverdue > 0 ? formatInr(s.totalOverdue) : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-red-700">
                      {s.total43bExposure > 0 ? formatInr(s.total43bExposure) : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => openEditModal(s)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit Supplier & Classification"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Supplier Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSupplier ? `Edit Supplier: ${editingSupplier.name}` : 'Add New Supplier'}
        subtitle="Ensure Udyam and MSME category are verified for accurate Section 43B(h) calculations"
      >
        <form onSubmit={handleSaveSupplier} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Supplier Business Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Deccan Springs & Fasteners Pvt Ltd"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Permanent Account Number (PAN)</label>
              <input
                type="text"
                maxLength={10}
                placeholder="e.g. AADCD5678G"
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono uppercase focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Udyam Registration Number</label>
              <input
                type="text"
                placeholder="e.g. UDYAM-MH-01-0012345"
                value={udyamNumber}
                onChange={(e) => setUdyamNumber(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono uppercase focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">MSME Classification *</label>
              <select
                value={msmeType}
                onChange={(e) => setMsmeType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="MICRO">Micro Enterprise (Inv &le; ₹1 Cr, Turnover &le; ₹5 Cr)</option>
                <option value="SMALL">Small Enterprise (Inv &le; ₹10 Cr, Turnover &le; ₹50 Cr)</option>
                <option value="MEDIUM">Medium Enterprise (Turnover &le; ₹250 Cr) [Exempt from 43B(h)]</option>
                <option value="NOT_MSME">Non-MSME (Large Corporate)</option>
                <option value="UNVERIFIED">Unverified / Self-Claimed Only</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Verification Status</label>
              <select
                value={verificationStatus}
                onChange={(e) => setVerificationStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="VERIFIED">Verified (Certificate on file)</option>
                <option value="SELF_DECLARED">Self-Declared (Invoice declaration only)</option>
                <option value="UNVERIFIED">Unverified</option>
              </select>
            </div>
          </div>

          {/* Trader Checkbox */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="isTraderCheckbox"
                checked={isTrader}
                onChange={(e) => setIsTrader(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <div>
                <label htmlFor="isTraderCheckbox" className="font-semibold text-slate-800 cursor-pointer">
                  Supplier is a Wholesale / Retail Trader (NIC 45, 46, 47)
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  As per Ministry of MSME OM No. 2/1(5)/2021-P&G/Policy dated 02/07/2021 and ICAI Guidance, traders registered under Udyam are entitled only to Priority Sector Lending and are <strong>excluded from MSMED Act Sections 15 & 16</strong> and <strong>Section 43B(h)</strong> disallowances.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Contact Person</label>
              <input
                type="text"
                placeholder="e.g. Suresh Patil"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                placeholder="spatil@vendor.com"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Phone</label>
              <input
                type="text"
                placeholder="+91 98220 12345"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Registered Address</label>
            <input
              type="text"
              placeholder="e.g. Plot 45, MIDC Bhosari, Pune, Maharashtra 411026"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Notes / Verification Remarks</label>
            <textarea
              rows={2}
              placeholder="Certificate verification remarks..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            ></textarea>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : editingSupplier ? 'Update Supplier' : 'Create Supplier'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
