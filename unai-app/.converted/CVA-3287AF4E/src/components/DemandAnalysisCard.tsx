import React from 'react';
import { DemandAnalysisOutput, SupplyItem, SurgeInput } from '../types';
import { TrendingUp, Activity, AlertCircle, BarChart3, HelpCircle, Tag, ArrowUpRight } from 'lucide-react';

interface DemandAnalysisCardProps {
  demandAnalysis: DemandAnalysisOutput;
  item: SupplyItem;
  input: SurgeInput;
}

export const DemandAnalysisCard: React.FC<DemandAnalysisCardProps> = ({
  demandAnalysis,
  item,
  input
}) => {
  const normalBaseline = item.baselineDailyForecast * input.targetFulfillmentDays;
  const isSurgeLarge = demandAnalysis.surgePercentage > 150;

  const riskBadgeStyles = {
    LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
    HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
    CRITICAL: 'bg-rose-50 text-rose-700 border-rose-200'
  }[demandAnalysis.riskLevel] || 'bg-slate-50 text-slate-700 border-slate-200';

  return (
    <div id="demand-analyst-agent-card" className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Agent Stage Header */}
      <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            1
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Demand Analyst Agent
              <span className="text-[11px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                Stage 1 &bull; Signal Extraction
              </span>
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1 ${riskBadgeStyles}`}>
            <AlertCircle className="w-3 h-3" />
            Demand Risk: {demandAnalysis.riskLevel}
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {demandAnalysis.demandPattern}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* KPI Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold uppercase text-slate-500 block">Surge Magnitude</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-bold text-slate-900">{demandAnalysis.surgePercentage}%</span>
              <span className="text-xs text-slate-500 font-medium">of baseline</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Standard: 100%</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold uppercase text-slate-500 block">Incremental Delta</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-bold text-indigo-600">+{demandAnalysis.surgeDeltaUnits}</span>
              <span className="text-xs text-slate-500 font-medium">{item.unit}</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Above normal horizon</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold uppercase text-slate-500 block">Surge Velocity</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-bold text-slate-900">
                {Math.round(input.surgeQuantity / input.targetFulfillmentDays)}
              </span>
              <span className="text-xs text-slate-500 font-medium">u/day</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">vs {item.baselineDailyForecast} normal</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold uppercase text-slate-500 block">Target Horizon</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-bold text-slate-900">{input.targetFulfillmentDays}</span>
              <span className="text-xs text-slate-500 font-medium">Days</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Priority: {input.customerPriority}</span>
          </div>
        </div>

        {/* Visual Demand Comparison Bar */}
        <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>Demand Comparison in {input.targetFulfillmentDays}-Day Window</span>
            <span className="font-mono text-indigo-700">
              {input.surgeQuantity} Surge vs {normalBaseline} Planned
            </span>
          </div>

          <div className="space-y-1.5">
            {/* Baseline row */}
            <div className="flex items-center gap-2 text-xs">
              <span className="w-24 text-slate-500 text-[11px] font-medium shrink-0">Baseline Plan</span>
              <div className="flex-1 h-4 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-400 rounded-full"
                  style={{ width: `${Math.min(100, Math.round((normalBaseline / input.surgeQuantity) * 100))}%` }}
                />
              </div>
              <span className="w-16 text-right font-mono text-slate-600 font-semibold text-xs">
                {normalBaseline} u
              </span>
            </div>

            {/* Surge row */}
            <div className="flex items-center gap-2 text-xs">
              <span className="w-24 text-indigo-700 text-[11px] font-bold shrink-0">Surge Request</span>
              <div className="flex-1 h-4 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                  style={{ width: '100%' }}
                />
              </div>
              <span className="w-16 text-right font-mono text-indigo-700 font-bold text-xs">
                {input.surgeQuantity} u
              </span>
            </div>
          </div>
        </div>

        {/* AI Analytical Narrative */}
        <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-blue-600" />
            Demand Signal & Pattern Narrative
          </h4>
          <p className="text-xs text-slate-700 leading-relaxed font-normal">
            {demandAnalysis.demandExplanation}
          </p>
          <p className="text-[11px] text-slate-500 italic pt-1 border-t border-blue-100">
            {demandAnalysis.historicalComparison}
          </p>
        </div>

        {/* Drivers & Underlying Signals Tags */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div>
            <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-1.5">
              Identified Demand Drivers
            </span>
            <div className="flex flex-wrap gap-1.5">
              {demandAnalysis.demandDrivers.map((driver, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200"
                >
                  <Tag className="w-3 h-3 text-slate-400" />
                  {driver}
                </span>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-1.5">
              Underlying Market & Account Signals
            </span>
            <div className="flex flex-wrap gap-1.5">
              {demandAnalysis.underlyingSignals.map((signal, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-800 border border-indigo-200"
                >
                  <ArrowUpRight className="w-3 h-3 text-indigo-500" />
                  {signal}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
