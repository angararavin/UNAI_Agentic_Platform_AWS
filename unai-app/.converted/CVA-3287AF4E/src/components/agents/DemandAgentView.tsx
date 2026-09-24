import React from 'react';
import { DemandAnalysisOutput, SupplyItem, SurgeInput } from '../../types';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Tooltip } from '../ui/Tooltip';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Info, HelpCircle } from 'lucide-react';

interface DemandAgentViewProps {
  demandAnalysis: DemandAnalysisOutput;
  item: SupplyItem;
  input: SurgeInput;
}

export const DemandAgentView: React.FC<DemandAgentViewProps> = ({
  demandAnalysis,
  item,
  input
}) => {
  const horizon = Math.max(1, input.targetFulfillmentDays);
  const normalBaseline = item.baselineDailyForecast * horizon;
  const surgeTotal = input.surgeQuantity;
  const surgeDelta = Math.max(0, surgeTotal - normalBaseline);

  const riskVariant: 'success' | 'warning' | 'danger' = {
    LOW: 'success' as const,
    MEDIUM: 'warning' as const,
    HIGH: 'warning' as const,
    CRITICAL: 'danger' as const
  }[demandAnalysis.riskLevel] || 'neutral';

  // Generate daily demand timeline data for charts
  const dailySurgeRate = Math.round(surgeTotal / horizon);
  const dailyTimelineData = Array.from({ length: horizon }, (_, i) => {
    const day = i + 1;
    return {
      day: `Day ${day}`,
      baselineDaily: item.baselineDailyForecast,
      surgeDailyDelta: Math.max(0, dailySurgeRate - item.baselineDailyForecast),
      totalDailySurge: dailySurgeRate,
      cumulativeDemand: dailySurgeRate * day,
      cumulativeBaseline: item.baselineDailyForecast * day
    };
  });

  // Data for Donut chart: Baseline vs Surge Spike
  const compositionData = [
    { name: 'Baseline Demand', value: normalBaseline, color: '#78716c' },
    { name: 'Surge Delta', value: surgeDelta, color: '#f43f5e' }
  ];

  return (
    <Card
      id="demand-agent-view"
      stageNumber={1}
      title="Demand Analyst Agent"
      subtitle="Visual order signal analysis & forecast deviation trajectory"
      badge={
        <div className="flex items-center gap-2">
          <Tooltip content={`Demand evaluated as ${demandAnalysis.riskLevel} risk based on +${demandAnalysis.surgePercentage}% surge magnitude.`}>
            <Badge variant={riskVariant}>
              {demandAnalysis.riskLevel} Risk
            </Badge>
          </Tooltip>
          <Tooltip content={`Signal classification: ${demandAnalysis.demandPattern}`}>
            <Badge variant="neutral">
              {demandAnalysis.demandPattern}
            </Badge>
          </Tooltip>
        </div>
      }
    >
      {/* 1. High-level metric pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <Tooltip
          position="top"
          className="w-full"
          content={`Volume requested above baseline. Normal demand for this ${horizon}-day window is ${normalBaseline.toLocaleString()} units; total requested order is ${surgeTotal.toLocaleString()} units.`}
        >
          <div className="w-full p-3 rounded-lg bg-stone-50 border border-stone-200 hover:border-stone-400 hover:bg-stone-100/60 transition-colors cursor-help">
            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-500 font-medium">Surge Order Delta</span>
              <Info className="w-3 h-3 text-stone-400" />
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-bold text-stone-900">
                +{demandAnalysis.surgeDeltaUnits.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-rose-600">
                +{demandAnalysis.surgePercentage}%
              </span>
            </div>
            <span className="text-[11px] text-stone-400">Total Requested: {surgeTotal.toLocaleString()} units</span>
          </div>
        </Tooltip>

        <Tooltip
          position="top"
          className="w-full"
          content={`Required fulfillment velocity: ${dailySurgeRate} units/day needed vs baseline rate of ${item.baselineDailyForecast} units/day (+${Math.round((dailySurgeRate - item.baselineDailyForecast) / Math.max(1, item.baselineDailyForecast) * 100)}% velocity increase).`}
        >
          <div className="w-full p-3 rounded-lg bg-stone-50 border border-stone-200 hover:border-stone-400 hover:bg-stone-100/60 transition-colors cursor-help">
            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-500 font-medium">Daily Required Run-Rate</span>
              <Info className="w-3 h-3 text-stone-400" />
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-bold text-stone-900">{dailySurgeRate}</span>
              <span className="text-xs text-stone-500">units/day</span>
            </div>
            <span className="text-[11px] text-stone-400">Baseline Rate: {item.baselineDailyForecast} units/day</span>
          </div>
        </Tooltip>

        <Tooltip
          position="top"
          className="w-full"
          content={`Target fulfillment window of ${horizon} calendar days for ${input.customerName || 'Strategic Partner'} under ${input.customerPriority || 'Standard'} priority SLA.`}
        >
          <div className="w-full p-3 rounded-lg bg-stone-50 border border-stone-200 hover:border-stone-400 hover:bg-stone-100/60 transition-colors cursor-help">
            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-500 font-medium">Account Target Window</span>
              <Info className="w-3 h-3 text-stone-400" />
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-bold text-stone-900">{horizon}</span>
              <span className="text-xs text-stone-500">Days</span>
            </div>
            <span className="text-[11px] text-stone-400">Customer: {input.customerName || 'Strategic Partner'}</span>
          </div>
        </Tooltip>
      </div>

      {/* 2. Graphical Charts Section (Replacing Text Paragraphs) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Chart: Daily Demand Profile (Composed: Bars for Daily, Line for Cumulative) */}
        <div className="lg:col-span-2 p-3.5 bg-stone-50/50 rounded-xl border border-stone-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-stone-800">
                Daily Run-Rate Demand Profile vs Baseline
              </span>
              <Tooltip content="Compares normal baseline daily units against the daily units demanded by the surge across the fulfillment window.">
                <Info className="w-3 h-3 text-stone-400" />
              </Tooltip>
            </div>
            <span className="text-[11px] text-stone-500">Units / Day</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dailyTimelineData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#78716c' }} />
                <YAxis tick={{ fontSize: 11, fill: '#78716c' }} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: '#1c1917',
                    borderColor: '#44403c',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: '#f5f5f4'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Bar dataKey="baselineDaily" name="Baseline Demand" stackId="a" fill="#78716c" radius={[0, 0, 0, 0]} />
                <Bar dataKey="surgeDailyDelta" name="Surge Delta Spike" stackId="a" fill="#e11d48" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="totalDailySurge" name="Surge Target Rate" stroke="#1c1917" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Secondary Chart: Demand Volume Composition Donut */}
        <div className="p-3.5 bg-stone-50/50 rounded-xl border border-stone-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-stone-800">Demand Volume Breakdown</span>
              <Tooltip content="Visual ratio of normal baseline demand vs the sudden surge increment.">
                <Info className="w-3 h-3 text-stone-400" />
              </Tooltip>
            </div>

            <div className="h-44 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={compositionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {compositionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(val: number) => [`${val.toLocaleString()} units`, '']}
                    contentStyle={{
                      backgroundColor: '#1c1917',
                      borderColor: '#44403c',
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: '#f5f5f4'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Centered Donut Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs font-bold text-stone-900">+{demandAnalysis.surgePercentage}%</span>
                <span className="text-[10px] text-stone-400">Spike</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-stone-200 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-stone-500" />
                <span className="text-stone-600">Baseline Forecast:</span>
              </div>
              <strong className="text-stone-900">{normalBaseline.toLocaleString()} u</strong>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                <span className="text-stone-600">Surge Excess Delta:</span>
              </div>
              <strong className="text-rose-600">+{surgeDelta.toLocaleString()} u</strong>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
