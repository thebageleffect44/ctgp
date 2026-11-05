import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'default' | 'danger' | 'warning' | 'success';
  badge?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  badge,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return 'border-rose-200 bg-rose-50/40 text-rose-900';
      case 'warning':
        return 'border-amber-200 bg-amber-50/40 text-amber-900';
      case 'success':
        return 'border-emerald-200 bg-emerald-50/40 text-emerald-900';
      default:
        return 'border-slate-200 bg-white text-slate-900';
    }
  };

  const getIconStyles = () => {
    switch (variant) {
      case 'danger':
        return 'bg-rose-100 text-rose-700';
      case 'warning':
        return 'bg-amber-100 text-amber-700';
      case 'success':
        return 'bg-emerald-100 text-emerald-700';
      default:
        return 'bg-blue-50 text-blue-700';
    }
  };

  return (
    <div className={`p-5 rounded-xl border shadow-sm transition-all hover:shadow-md ${getVariantStyles()}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        <div className={`p-2 rounded-lg ${getIconStyles()}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="flex items-baseline justify-between">
        <div className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
          {value}
        </div>
        {badge && (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-700">
            {badge}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="mt-2 text-xs text-slate-500">
          {subtitle}
        </p>
      )}
    </div>
  );
};
