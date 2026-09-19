import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive?: boolean;
    isNeutral?: boolean;
  };
  highlightColor?: 'blue' | 'red' | 'teal' | 'amber' | 'emerald';
  badge?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  highlightColor = 'blue',
  badge,
  onClick,
}) => {
  const shouldReduceMotion = useReducedMotion();

  const colorMap = {
    blue: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20',
    red: 'text-tomato-600 dark:text-tomato-400 bg-tomato-500/10 border-tomato-500/25',
    teal: 'text-teal-600 dark:text-teal-400 bg-teal-500/10 border-teal-500/20',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/25',
    emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  };

  return (
    <motion.div
      whileHover={shouldReduceMotion ? undefined : { y: -2, transition: { duration: 0.2 } }}
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        "relative p-5 rounded-2xl bg-white dark:bg-navy-900 border border-command-border dark:border-navy-border shadow-subtle transition-all focus-visible:ring-2 focus-visible:ring-tomato-500",
        onClick && "cursor-pointer hover:border-tomato-500/50"
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-command-muted dark:text-slate-400 uppercase tracking-wider">
              {title}
            </span>
            {badge && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-tomato-500/10 text-tomato-600 dark:text-tomato-400 border border-tomato-500/20">
                {badge}
              </span>
            )}
          </div>
          <div className="mt-2 text-2xl lg:text-3xl font-extrabold tracking-tight text-command-text dark:text-white font-mono">
            {value}
          </div>
        </div>
        <div className={cn("p-2.5 rounded-xl border", colorMap[highlightColor])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-command-border dark:border-navy-border">
          {subtitle && (
            <span className="text-command-muted dark:text-slate-400 truncate max-w-[70%]">
              {subtitle}
            </span>
          )}
          {trend && (
            <span
              className={cn(
                "font-semibold ml-auto",
                trend.isNeutral
                  ? "text-slate-400"
                  : trend.isPositive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-tomato-600 dark:text-tomato-400"
              )}
            >
              {trend.value}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
};
