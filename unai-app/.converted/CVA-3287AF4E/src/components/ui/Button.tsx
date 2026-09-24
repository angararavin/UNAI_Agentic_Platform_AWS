import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer';

  const variantStyles = {
    primary: 'bg-stone-900 text-white hover:bg-stone-800 focus:ring-stone-950 border border-transparent',
    secondary: 'bg-stone-100 text-stone-800 hover:bg-stone-200 focus:ring-stone-400 border border-stone-200',
    outline: 'bg-white text-stone-800 border border-stone-200 hover:bg-stone-50 focus:ring-stone-400',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 border border-transparent',
    ghost: 'bg-transparent text-stone-600 hover:bg-stone-100 focus:ring-stone-300'
  }[variant];

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5'
  }[size];

  return (
    <button
      className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      {children}
    </button>
  );
};
