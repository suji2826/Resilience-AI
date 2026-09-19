import React from 'react';
import { cn } from '../../lib/utils';
import { RiskLevel } from '../../types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'risk' | 'ai' | 'brics';
  riskLevel?: RiskLevel;
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  riskLevel = 'LOW',
  className,
  dot = false,
}) => {
  let baseStyles = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border';

  if (variant === 'risk') {
    switch (riskLevel) {
      case 'CRITICAL':
        baseStyles = cn(baseStyles, 'bg-red-500/10 text-red-500 border-red-500/30 dark:bg-red-950/40 dark:text-red-400');
        break;
      case 'HIGH':
        baseStyles = cn(baseStyles, 'bg-orange-500/10 text-orange-500 border-orange-500/30 dark:bg-orange-950/40 dark:text-orange-400');
        break;
      case 'MEDIUM':
        baseStyles = cn(baseStyles, 'bg-amber-500/10 text-amber-500 border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-400');
        break;
      case 'LOW':
      default:
        baseStyles = cn(baseStyles, 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-400');
        break;
    }
  } else if (variant === 'ai') {
    baseStyles = cn(baseStyles, 'bg-blue-500/10 text-blue-600 border-blue-500/30 dark:bg-blue-950/40 dark:text-blue-400');
  } else if (variant === 'brics') {
    baseStyles = cn(baseStyles, 'bg-teal-500/10 text-teal-600 border-teal-500/30 dark:bg-teal-950/40 dark:text-teal-400');
  } else {
    baseStyles = cn(baseStyles, 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700');
  }

  // Normalize riskLevel if passed as object
  const levelStr = typeof riskLevel === 'object' && riskLevel !== null
    ? (riskLevel as any).level || (riskLevel as any).status || 'LOW'
    : String(riskLevel || 'LOW').toUpperCase();

  const dotColor =
    levelStr === 'CRITICAL' ? 'bg-red-500' :
    levelStr === 'HIGH' ? 'bg-orange-500' :
    levelStr === 'MEDIUM' ? 'bg-amber-500' : 'bg-emerald-500';

  // Guard against plain object passed directly as children
  let safeChildren = children;
  if (children && typeof children === 'object' && !React.isValidElement(children) && !Array.isArray(children)) {
    const obj = children as unknown as Record<string, unknown>;
    safeChildren = String(obj.level || obj.status || obj.name || obj.label || '');
  }

  return (
    <span className={cn(baseStyles, className)}>
      {dot && (
        <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", dotColor)} />
      )}
      {safeChildren}
    </span>
  );
};
