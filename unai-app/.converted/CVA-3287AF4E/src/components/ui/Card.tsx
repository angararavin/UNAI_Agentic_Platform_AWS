import React from 'react';

export interface CardProps {
  id?: string;
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  headerAction?: React.ReactNode;
  badge?: React.ReactNode;
  stageNumber?: number | string;
}

export const Card: React.FC<CardProps> = ({
  id,
  children,
  className = '',
  title,
  subtitle,
  headerAction,
  badge,
  stageNumber
}) => {
  return (
    <div
      id={id}
      className={`bg-white rounded-xl border border-stone-200 shadow-xs relative ${className}`}
    >
      {(title || stageNumber || badge || headerAction) && (
        <div className="px-5 py-3.5 bg-stone-50/70 border-b border-stone-200 flex items-center justify-between gap-3 flex-wrap rounded-t-xl">
          <div className="flex items-center gap-2.5 min-w-0">
            {stageNumber !== undefined && (
              <span className="w-6 h-6 rounded-md bg-stone-900 text-white flex items-center justify-center font-semibold text-xs shrink-0">
                {stageNumber}
              </span>
            )}
            <div className="min-w-0">
              {title && <h3 className="text-sm font-semibold text-stone-900 truncate">{title}</h3>}
              {subtitle && <p className="text-xs text-stone-500 truncate">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {badge}
            {headerAction}
          </div>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
};
