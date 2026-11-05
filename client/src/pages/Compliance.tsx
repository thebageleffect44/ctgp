import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { formatInr, formatDate } from '../utils/formatters.js';
import { MsmeBadge } from '../components/Badges.js';
import { Modal } from '../components/Modal.js';
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  CheckCircle,
  UserCheck,
  FileText,
  Filter,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

export const Compliance: React.FC = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');

  // Action Modal
  const [activeAlert, setActiveAlert] = useState<any | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'ACKNOWLEDGE' | 'ASSIGN' | 'RESOLVE'>('ACKNOWLEDGE');
  const [assignedTo, setAssignedTo] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadAlerts();
  }, [statusFilter, severityFilter]);

  const loadAlerts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/compliance/alerts', {
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        severity: severityFilter !== 'ALL' ? severityFilter : undefined,
        limit: 100,
      });
      if (res.success) setAlerts(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load compliance alerts');
    } finally {
      setIsLoading(false);
    }
  };

  const openActionModal = (alert: any, type: 'ACKNOWLEDGE' | 'ASSIGN' | 'RESOLVE') => {
    setActiveAlert(alert);
    setActionType(type);
    setAssignedTo(alert.assignedTo || '');
    setResolutionNotes(alert.resolutionNotes || '');
    setIsActionModalOpen(true);
  };

  const handleAlertAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAlert) return;
    setIsSubmitting(true);
    try {
      let statusUpdate: 'ACKNOWLEDGED' | 'ASSIGNED' | 'RESOLVED' = 'ACKNOWLEDGED';
      if (actionType === 'RESOLVE') statusUpdate = 'RESOLVED';
      else if (actionType === 'ASSIGN') statusUpdate = 'ASSIGNED';

      await api.patch(`/compliance/alerts/${activeAlert.id}`, {
        status: statusUpdate,
        assignedTo: actionType === 'ASSIGN' ? assignedTo : activeAlert.assignedTo,
        resolutionNotes,
      });

      setIsActionModalOpen(false);
      await loadAlerts();
    } catch (err: any) {
      alert(err.message || 'Action update failed');
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
            Deadline & Statutory Compliance Monitoring
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative alert tracking, reviewable compliance flags, and human verification workflows
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open (Requires Review)</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600">Severity:</span>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical (Sec 43B Disallowance)</option>
            <option value="HIGH">High (Overdue / Sec 16 Interest)</option>
            <option value="MEDIUM">Medium (Data Completeness / Missing GRN)</option>
          </select>
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-white p-12 text-center text-slate-400 rounded-xl border border-slate-200">
            Loading compliance alerts...
          </div>
        ) : alerts.length === 0 ? (
          <div className="bg-white p-12 text-center text-slate-400 rounded-xl border border-slate-200">
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-60" />
            <h3 className="text-sm font-semibold text-slate-700">All clear</h3>
            <p className="text-xs text-slate-400 mt-1">
              No open compliance exceptions or delayed payment risks found.
            </p>
          </div>
        ) : (
          alerts.map((alert) => {
            const isOverdue = alert.invoice?.daysOverdue > 0;
            const balanceDue = Math.max(0, (alert.invoice?.principalAmount || 0) - (alert.invoice?.amountPaid || 0));

            return (
              <div
                key={alert.id}
                className={`p-5 rounded-xl border shadow-sm bg-white transition-all ${
                  alert.status === 'RESOLVED'
                    ? 'border-slate-200 opacity-60'
                    : alert.severity === 'CRITICAL'
                    ? 'border-red-300 ring-1 ring-red-200/50'
                    : alert.severity === 'HIGH'
                    ? 'border-amber-300 ring-1 ring-amber-200/50'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  {/* Left Column: Details */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          alert.severity === 'CRITICAL'
                            ? 'bg-red-100 text-red-900 border border-red-300'
                            : alert.severity === 'HIGH'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-slate-100 text-slate-800 border border-slate-300'
                        }`}
                      >
                        {alert.severity}
                      </span>

                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        Rule: {alert.ruleVersion}
                      </span>

                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          alert.status === 'RESOLVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : alert.status === 'ASSIGNED'
                            ? 'bg-blue-100 text-blue-800'
                            : alert.status === 'ACKNOWLEDGED'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        Status: {alert.status}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <h3 className="text-base font-bold text-slate-900">
                        Invoice #{alert.invoice?.invoiceNumber} · {alert.invoice?.supplier?.name}
                      </h3>
                      <MsmeBadge type={alert.invoice?.supplier?.msmeType} />
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      {alert.reason}
                    </p>

                    <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-100 text-blue-900 text-xs">
                      <strong>Recommended Action:</strong> {alert.recommendedAction}
                    </div>

                    {/* Metadata chips */}
                    <div className="pt-2 flex flex-wrap items-center gap-4 text-[11px] text-slate-500 font-mono">
                      <span>Statutory Due: {formatDate(alert.invoice?.dueDate)}</span>
                      <span>Principal: {formatInr(alert.invoice?.principalAmount)}</span>
                      <span>Outstanding Balance: {formatInr(balanceDue)}</span>
                      {alert.invoice?.accruedInterest > 0 && (
                        <span className="text-rose-600 font-bold">
                          Sec 16 Interest Accrued: {formatInr(alert.invoice?.accruedInterest)}
                        </span>
                      )}
                      {alert.assignedTo && <span>Assigned to: {alert.assignedTo}</span>}
                    </div>

                    {alert.resolutionNotes && (
                      <div className="text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded border border-emerald-200 mt-2">
                        <strong>Resolution Note:</strong> {alert.resolutionNotes}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Workflow Action Buttons */}
                  {alert.status !== 'RESOLVED' && (
                    <div className="flex md:flex-col items-center gap-2 shrink-0">
                      {alert.status === 'OPEN' && (
                        <button
                          onClick={() => openActionModal(alert, 'ACKNOWLEDGE')}
                          className="w-full px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 text-xs font-semibold transition-colors"
                        >
                          Acknowledge
                        </button>
                      )}

                      <button
                        onClick={() => openActionModal(alert, 'ASSIGN')}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold transition-colors"
                      >
                        Assign Task
                      </button>

                      <button
                        onClick={() => openActionModal(alert, 'RESOLVE')}
                        className="w-full px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold shadow-sm transition-colors"
                      >
                        Mark Resolved
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Action Workflow Modal */}
      <Modal
        isOpen={isActionModalOpen}
        onClose={() => setIsActionModalOpen(false)}
        title={
          actionType === 'RESOLVE'
            ? 'Resolve Compliance Alert'
            : actionType === 'ASSIGN'
            ? 'Assign Alert to Team Member'
            : 'Acknowledge Compliance Risk'
        }
        subtitle={`Invoice #${activeAlert?.invoice?.invoiceNumber} (${activeAlert?.invoice?.supplier?.name})`}
      >
        <form onSubmit={handleAlertAction} className="space-y-4 text-xs">
          {actionType === 'ASSIGN' && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Assignee Name / Email *</label>
              <input
                type="text"
                required
                placeholder="e.g. ap.officer@apexindia.com"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              {actionType === 'RESOLVE' ? 'Resolution Details & Proof of Action *' : 'Review Notes & Remarks'}
            </label>
            <textarea
              required={actionType === 'RESOLVE'}
              rows={3}
              placeholder={
                actionType === 'RESOLVE'
                  ? 'e.g. Payment disbursed via NEFT (UTR-991188); statutory interest capped.'
                  : 'Add internal comments for audit record...'
              }
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            ></textarea>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsActionModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-4 py-2 rounded-lg text-white font-semibold shadow-sm ${
                actionType === 'RESOLVE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isSubmitting ? 'Saving...' : 'Confirm Action'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
