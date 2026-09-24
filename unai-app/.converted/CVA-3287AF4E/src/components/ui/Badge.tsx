import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  size?: 'sm' | 'md';
  className?: string;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
  icon
}) => {
  const variantStyles = {
    neutral: 'bg-stone-100 text-stone-700 border-stone-200',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    danger: 'bg-rose-50 text-rose-800 border-rose-200',
    info: 'bg-sky-50 text-sky-800 border-sky-200',
    purple: 'bg-violet-50 text-violet-800 border-violet-200'
  }[variant];

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-0.5 font-medium'
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border whitespace-nowrap tracking-tight ${variantStyles} ${sizeStyles} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
};
