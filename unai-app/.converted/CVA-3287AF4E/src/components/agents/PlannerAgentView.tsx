import React from 'react';
import { PlannerRecommendationOutput, SupplyItem, SurgeInput } from '../../types';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Tooltip } from '../ui/Tooltip';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  CartesianGrid,
  Cell
} from 'recharts';
import { Info, HelpCircle, ShieldAlert } from 'lucide-react';

interface PlannerAgentViewProps {
  recommendations: PlannerRecommendationOutput;
  item: SupplyItem;
  input: SurgeInput;
}

export const PlannerAgentView: React.FC<PlannerAgentViewProps> = ({
  recommendations,
  item,
  input
}) => {
  const criticalityVariant: 'success' | 'warning' | 'danger' = {
    NONE: 'success' as const,
    LOW: 'success' as const,
    MEDIUM: 'warning' as const,
    HIGH: 'warning' as const,
    CRITICAL: 'danger' as const
  }[recommendations.overallCriticality] || 'neutral';

  const actions = recommendations.actionMatrix || [];

  // Data for Chart 1: Units Recovered per Action Item
  const recoveryChartData = actions.map((act, index) => ({
    name: `Act ${index + 1}: ${act.title.split(' ')[0]}`,
    fullName: act.title,
    unitsRecovered: act.expectedUnitsRecovered || 0,
    costUsd: act.estimatedCostImpactUsd || 0,
    owner: act.owner
  }));

  // Data for Chart 2: Cost ($) vs Units Recovered comparison
  const costVsRecoveryData = actions.map((act, index) => ({
    shortTitle: `A${index + 1}`,
    title: act.title,
    cost: act.estimatedCostImpactUsd || 0,
    units: act.expectedUnitsRecovered || 0
  }));

  const totalCost = actions.reduce((sum, a) => sum + (a.estimatedCostImpactUsd || 0), 0);
  const totalUnitsRecoverable = actions.reduce((sum, a) => sum + (a.expectedUnitsRecovered || 0), 0);

  return (
    <Card
      id="planner-agent-view"
      stageNumber={3}
      title="Planner Recommendation Agent"
      subtitle="Visual mitigation impact, capacity trade-offs & action matrix formulation"
      badge={
        <div className="flex items-center gap-2">
          <Tooltip content={`Overall operational urgency classified as ${recommendations.overallCriticality} criticality.`}>
            <Badge variant={criticalityVariant}>
              {recommendations.overallCriticality} Criticality
            </Badge>
          </Tooltip>
          <Tooltip content="Autonomous strategy synthesized by the LangGraph Planner node.">
            <Badge variant="neutral">
              Strategy: {recommendations.primaryRecommendedStrategy.split('&')[0].trim()}
            </Badge>
          </Tooltip>
        </div>
      }
    >
      {/* 1. Quick KPI metric pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <Tooltip
          position="top"
          className="w-full"
          content={`Autonomous strategy: "${recommendations.primaryRecommendedStrategy}". Synthesized by the LangGraph planner agent across ${actions.length} prioritized operational mitigation levers.`}
        >
          <div className="w-full p-3 rounded-lg bg-stone-50 border border-stone-200 hover:border-stone-400 hover:bg-stone-100/60 transition-colors cursor-help">
            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-500 font-medium">Recommended Strategy</span>
              <Info className="w-3 h-3 text-stone-400" />
            </div>
            <div className="mt-0.5">
              <h4 className="text-sm font-bold text-stone-900 line-clamp-1" title={recommendations.primaryRecommendedStrategy}>
                {recommendations.primaryRecommendedStrategy}
              </h4>
            </div>
            <span className="text-[11px] text-stone-400">
              {actions.length} actionable mitigation levers identified
            </span>
          </div>
        </Tooltip>

        <Tooltip
          position="top"
          className="w-full"
          content={`Total unit volume recoverable through the ${actions.length} recommended mitigation actions (+${totalUnitsRecoverable.toLocaleString()} units) to close the surge supply deficit.`}
        >
          <div className="w-full p-3 rounded-lg bg-stone-50 border border-stone-200 hover:border-stone-400 hover:bg-stone-100/60 transition-colors cursor-help">
            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-500 font-medium">Total Recoverable Volume</span>
              <Info className="w-3 h-3 text-stone-400" />
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-bold text-emerald-700">
                +{totalUnitsRecoverable.toLocaleString()}
              </span>
              <span className="text-xs text-stone-500">units</span>
            </div>
            <span className="text-[11px] text-stone-400">
              Across {actions.length} prioritized initiatives
            </span>
          </div>
        </Tooltip>

        <Tooltip
          position="top"
          className="w-full"
          content={`Aggregate budget ceiling of $${totalCost.toLocaleString()} USD needed to execute all recommended mitigations (including air-freight premiums and plant overtime).`}
        >
          <div className="w-full p-3 rounded-lg bg-stone-50 border border-stone-200 hover:border-stone-400 hover:bg-stone-100/60 transition-colors cursor-help">
            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-500 font-medium">Mitigation Budget Ceiling</span>
              <Info className="w-3 h-3 text-stone-400" />
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-bold text-stone-900">
                ${totalCost.toLocaleString()}
              </span>
              <span className="text-xs text-stone-500">USD</span>
            </div>
            <span className="text-[11px] text-stone-400">
              Air-freight & plant overtime surcharges
            </span>
          </div>
        </Tooltip>
      </div>

      {/* 2. Graphical Charts Section (Replacing Text Paragraphs) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1: Units Recovered by Mitigation Lever */}
        <div className="p-3.5 bg-stone-50/50 rounded-xl border border-stone-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-stone-800">
                Units Recovered per Mitigation Lever
              </span>
              <Tooltip content="Graph of unit volume recovered by each recommended mitigation action to resolve the surge deficit.">
                <Info className="w-3 h-3 text-stone-400" />
              </Tooltip>
            </div>
            <span className="text-[11px] text-stone-500">Units</span>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={recoveryChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#78716c' }} />
                <YAxis tick={{ fontSize: 10, fill: '#78716c' }} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: '#1c1917',
                    borderColor: '#44403c',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: '#f5f5f4'
                  }}
                  formatter={(val: number) => [`+${val.toLocaleString()} units`, 'Recovered']}
                  labelFormatter={(name, payload) => payload?.[0]?.payload?.fullName || name}
                />
                <Bar dataKey="unitsRecovered" name="Recovered Units" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Cost Surcharge ($) by Mitigation Lever */}
        <div className="p-3.5 bg-stone-50/50 rounded-xl border border-stone-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-stone-800">
                Cost Impact ($USD) per Mitigation Lever
              </span>
              <Tooltip content="Estimated financial expenditure needed to execute each mitigation option (e.g. freight premium, overtime).">
                <Info className="w-3 h-3 text-stone-400" />
              </Tooltip>
            </div>
            <span className="text-[11px] text-stone-500">Cost ($USD)</span>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costVsRecoveryData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                <XAxis dataKey="shortTitle" tick={{ fontSize: 10, fill: '#78716c' }} />
                <YAxis tick={{ fontSize: 10, fill: '#78716c' }} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: '#1c1917',
                    borderColor: '#44403c',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: '#f5f5f4'
                  }}
                  formatter={(val: number) => [`$${val.toLocaleString()}`, 'Cost']}
                  labelFormatter={(name, payload) => payload?.[0]?.payload?.title || name}
                />
                <Bar dataKey="cost" name="Cost Impact" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  {costVsRecoveryData.map((entry, idx) => (
                    <Cell key={`cost-${idx}`} fill={entry.cost > 0 ? '#3b82f6' : '#9ca3af'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Card>
  );
};
