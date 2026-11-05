import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { formatInr, formatDate } from '../utils/formatters.js';
import { StatCard } from '../components/StatCard.js';
import { ComplianceStatusBadge, MsmeBadge } from '../components/Badges.js';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Clock,
  DollarSign,
  TrendingUp,
  FileCheck2,
  ShieldAlert,
  ArrowUpRight,
  FilePlus,
  Upload,
  UserPlus,
  CheckCircle,
  Info,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [metricsRes, alertsRes, invoicesRes] = await Promise.all([
        api.get('/compliance/metrics'),
        api.get('/compliance/alerts?limit=5'),
        api.get('/invoices?limit=6'),
      ]);

      if (metricsRes.success) setMetrics(metricsRes.data);
      if (alertsRes.success) setAlerts(alertsRes.data);
      if (invoicesRes.success) setInvoices(invoicesRes.items || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-medium">Computing statutory exposure metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadDashboardData} className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-semibold">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const kpis = metrics?.kpis || {};
  const ageing = metrics?.ageingBuckets || {};
  const maxAgeingAmount = Math.max(...Object.values(ageing).map((b: any) => b.amount), 1);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Compliance & Exposure Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time monitoring of Section 15 payment deadlines, Section 16 compound interest, and Section 43B(h) tax disallowance.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/invoices?action=new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold shadow-sm hover:bg-blue-700 transition-colors"
          >
            <FilePlus className="w-4 h-4" />
            Add Invoice
          </Link>
          <Link
            to="/import"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </Link>
          <Link
            to="/reports"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold shadow-sm hover:bg-slate-800 transition-colors"
          >
            <TrendingUp className="w-4 h-4" />
            MSME Form 1 Export
          </Link>
        </div>
      </div>

      {/* Critical Section 43B(h) Warning Banner if exposure exists */}
      {kpis.total43bExposure > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-rose-100 rounded-lg text-rose-700 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-rose-950">
                  Section 43B(h) Disallowance Exposure Identified
                </h3>
                <span className="text-xs font-mono font-bold text-rose-900 bg-rose-200/60 px-2 py-0.5 rounded">
                  {formatInr(kpis.total43bExposure)} At Risk
                </span>
              </div>
              <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                You have <strong>{formatInr(kpis.total43bExposure)}</strong> in overdue dues to Micro & Small manufacturers/service providers past the Section 15 timeline. If unpaid at fiscal year end, this expenditure will be <strong>disallowed for income tax</strong>, causing an immediate cash tax increase of approx <strong>{formatInr(kpis.totalTaxDisallowanceImpact)}</strong> (at 25.17% corporate tax rate).
              </p>
              <div className="mt-3 flex items-center gap-3">
                <Link
                  to="/reports?tab=43b"
                  className="text-xs font-semibold text-rose-900 underline hover:text-rose-950"
                >
                  View Disallowance Schedule →
                </Link>
                <Link
                  to="/invoices?status=SEC_43B_EXPOSURE"
                  className="text-xs font-semibold text-rose-900 underline hover:text-rose-950"
                >
                  Inspect Overdue Invoices →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Outstanding"
          value={formatInr(kpis.totalOutstanding)}
          subtitle={`${kpis.unpaidCount || 0} unpaid invoices across all suppliers`}
          icon={DollarSign}
          variant="default"
        />

        <StatCard
          title="Overdue Invoices"
          value={formatInr(kpis.totalOverdue)}
          subtitle={`${kpis.overdueCount || 0} invoices breached statutory timeline`}
          icon={AlertTriangle}
          variant={kpis.totalOverdue > 0 ? 'danger' : 'default'}
          badge={kpis.overdueCount > 0 ? `${kpis.overdueCount} Overdue` : undefined}
        />

        <StatCard
          title="Approaching Deadline"
          value={formatInr(kpis.approachingDeadlineValue)}
          subtitle={`${kpis.approachingDeadlineCount || 0} invoices due in next 15 days`}
          icon={Clock}
          variant={kpis.approachingDeadlineCount > 0 ? 'warning' : 'default'}
        />

        <StatCard
          title="Accrued Statutory Interest"
          value={formatInr(kpis.totalAccruedInterest)}
          subtitle="MSMED Act Sec 16 (20.25% p.a. monthly compound)"
          icon={TrendingUp}
          variant={kpis.totalAccruedInterest > 0 ? 'danger' : 'default'}
        />
      </div>

      {/* Two Column Layout: Ageing Analysis & Urgent Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Ageing Analysis */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Invoice Ageing Analysis
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Breakdown of delayed dues by overdue duration
              </p>
            </div>
            <Link to="/reports" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
              Detailed Report →
            </Link>
          </div>

          <div className="mt-6 space-y-4">
            {Object.entries(ageing).map(([bucket, data]: [string, any]) => {
              const percentage = maxAgeingAmount > 0 ? (data.amount / maxAgeingAmount) * 100 : 0;
              const isHighRisk = bucket === '46-90 days' || bucket === '90+ days';

              return (
                <div key={bucket} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-medium ${isHighRisk && data.amount > 0 ? 'text-rose-700 font-bold' : 'text-slate-700'}`}>
                      {bucket} {bucket === '46-90 days' || bucket === '90+ days' ? '⚠️ (MCA Form 1)' : ''}
                    </span>
                    <span className="font-mono text-slate-900 font-semibold">
                      {formatInr(data.amount)} <span className="text-slate-400 font-normal">({data.count} inv)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-500 ${
                        isHighRisk ? 'bg-rose-500' : bucket === '31-45 days' ? 'bg-amber-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${Math.max(percentage, data.amount > 0 ? 3 : 0)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Dues exceeding 45 days mandate disclosure in MCA MSME Form 1.</span>
            <span className="font-mono font-semibold text-slate-800">
              Total Overdue: {formatInr(kpis.totalOverdue)}
            </span>
          </div>
        </div>

        {/* Right Column: Compliance Alerts Feed */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">
                  Compliance Alerts
                </h2>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                {alerts.length} Pending
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {alerts.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60" />
                  No open compliance alerts. All invoices are currently within statutory timelines.
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3.5 rounded-xl border text-xs transition-all ${
                      alert.severity === 'CRITICAL'
                        ? 'border-rose-200 bg-rose-50/40'
                        : alert.severity === 'HIGH'
                        ? 'border-amber-200 bg-amber-50/40'
                        : 'border-slate-200 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900">
                        {alert.invoice?.invoiceNumber} · {alert.invoice?.supplier?.name}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          alert.severity === 'CRITICAL'
                            ? 'bg-rose-200 text-rose-900'
                            : 'bg-amber-200 text-amber-900'
                        }`}
                      >
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-slate-600 line-clamp-2 leading-relaxed mt-1">
                      {alert.reason}
                    </p>
                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-blue-700">
                        Action: {alert.recommendedAction?.slice(0, 45)}...
                      </span>
                      <Link
                        to={`/compliance`}
                        className="text-slate-700 hover:text-slate-900 font-semibold"
                      >
                        Resolve →
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <Link
              to="/compliance"
              className="w-full py-2 flex items-center justify-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
            >
              Manage All Compliance Alerts ({kpis.openAlertsCount || 0}) →
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Invoices</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Invoices tracked under MSMED Act Section 15 caps and Section 16 interest
            </p>
          </div>
          <Link to="/invoices" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
            View All Invoices ({metrics?.kpis?.totalInvoiceValue ? invoices.length : 0}) →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Statutory Due Date</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">Sec 16 Interest</th>
                <th className="py-3 px-4">Compliance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No invoices recorded yet. Click "Add Invoice" or "Import CSV" to begin tracking.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      <Link to={`/invoices`} className="hover:underline text-blue-600">
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {inv.supplier?.name}
                    </td>
                    <td className="py-3 px-4">
                      <MsmeBadge type={inv.supplier?.msmeType} isTrader={inv.supplier?.isTrader} />
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {formatDate(inv.dueDate)}
                      {inv.dueDateSource === 'STATUTORY_45_DAY_CAP' && (
                        <span className="ml-1 text-[10px] text-amber-600 font-sans font-bold" title="Capped at 45 days by statute">
                          (45d Cap)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                      {formatInr(inv.principalAmount)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-rose-600">
                      {inv.accruedInterest > 0 ? formatInr(inv.accruedInterest) : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <ComplianceStatusBadge status={inv.complianceStatus} daysOverdue={inv.daysOverdue} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
