import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { formatDate } from '../utils/formatters.js';
import {
  History,
  ShieldCheck,
  Search,
  Filter,
  User,
  Clock,
  FileText,
  AlertCircle,
  Database,
} from 'lucide-react';

export const AuditTrail: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadAuditEvents();
  }, []);

  const loadAuditEvents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/audit?limit=100');
      if (res.success) setEvents(res.items || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load audit events');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEvents = events.filter((ev) => {
    if (!search) return true;
    const lower = search.toLowerCase();
    return (
      ev.action?.toLowerCase().includes(lower) ||
      ev.entityType?.toLowerCase().includes(lower) ||
      ev.userEmail?.toLowerCase().includes(lower) ||
      JSON.stringify(ev.details)?.toLowerCase().includes(lower)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Immutable Audit Trail
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete tamper-evident log of invoice modifications, payment recordings, alerts, and report generations
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Statutory Audit Logging Active</span>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search audit trail by actor email, action, entity, or keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Details & Event Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-sans">
                    Loading audit records...
                  </td>
                </tr>
              ) : filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-sans">
                    No matching audit records found.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(ev.createdAt).toLocaleString('en-IN', {
                        dateStyle: 'short',
                        timeStyle: 'medium',
                      })}
                    </td>
                    <td className="py-3 px-4 font-sans font-medium text-slate-800">
                      {ev.userEmail || <span className="text-slate-400 italic">System Automation</span>}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          ev.action === 'CREATE'
                            ? 'bg-blue-100 text-blue-800'
                            : ev.action === 'STATUS_CHANGE' || ev.action === 'UPDATE'
                            ? 'bg-purple-100 text-purple-800'
                            : ev.action === 'ALERT_RESOLVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ev.action === 'DELETE'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {ev.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 font-sans">
                      {ev.entityType}
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-md truncate font-sans">
                      {typeof ev.details === 'object' ? (
                        <span>{JSON.stringify(ev.details)}</span>
                      ) : (
                        <span>{String(ev.details)}</span>
                      )}
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
