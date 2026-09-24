import React from 'react';
import { ShieldAlert, ShieldCheck } from 'lucide-react';

interface ConfidenceGaugeProps {
  score: number;
  threshold: number;
  size?: 'sm' | 'md' | 'lg';
  hideThreshold?: boolean;
}

export const ConfidenceGauge: React.FC<ConfidenceGaugeProps> = ({
  score,
  threshold,
  hideThreshold = false,
}) => {
  const isApproved = score >= threshold;
  const clampedScore = Math.max(0, Math.min(100, score));

  const getColor = () => {
    if (clampedScore >= threshold) return 'text-[#188038] bg-[#E6F4EA] border-[#CEEAD6]';
    if (clampedScore >= threshold - 15) return 'text-[#B06000] bg-[#FEF7E0] border-[#FEEFC3]';
    return 'text-[#D93025] bg-[#FCE8E6] border-[#FAD2CF]';
  };

  const getBarColor = () => {
    if (clampedScore >= threshold) return 'bg-[#188038]';
    if (clampedScore >= threshold - 15) return 'bg-[#F9AB00]';
    return 'bg-[#D93025]';
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-mono text-[#5F6368] flex items-center gap-1">
          {isApproved ? (
            <ShieldCheck className="w-3.5 h-3.5 text-[#188038]" />
          ) : (
            <ShieldAlert className="w-3.5 h-3.5 text-[#B06000]" />
          )}
          CONFIDENCE: <strong className="text-[#202124] font-bold">{score}%</strong>
        </span>
        {!hideThreshold && (
          <span className="text-[#5F6368] font-mono text-[10px]">
            RULE THRESHOLD: <span className="font-bold text-[#202124]">{threshold}%</span>
          </span>
        )}
      </div>

      <div className="relative h-1.5 w-full bg-[#E8EAED] rounded-full overflow-hidden border border-[#DADCE0]">
        <div
          className={`h-full transition-all duration-500 rounded-full ${getBarColor()}`}
          style={{ width: `${clampedScore}%` }}
        />
        {/* Threshold indicator pin */}
        {!hideThreshold && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-[#202124] z-10"
            style={{ left: `${threshold}%` }}
            title={`Approval Threshold: ${threshold}%`}
          />
        )}
      </div>

      <div className="flex justify-between items-center text-[9px] font-mono">
        <span className="text-[#80868B]">0%</span>
        <span
          className={`px-1.5 py-0.2 rounded border text-[9px] font-bold tracking-wider uppercase ${getColor()}`}
        >
          {isApproved ? 'AUTO APPROVED' : 'HUMAN REVIEW REQUIRED'}
        </span>
        <span className="text-[#80868B]">100%</span>
      </div>
    </div>
  );
};
