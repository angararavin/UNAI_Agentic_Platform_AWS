import React, { useState } from 'react';
import { PlannerRecommendationOutput, SupplyItem, SurgeInput, ActionItem } from '../types';
import { CheckSquare, Square, AlertCircle, ArrowRight, ShieldCheck, Clock, UserCheck, DollarSign, MessageSquare, RefreshCw, Send, Check } from 'lucide-react';

interface PlannerRecommendationCardProps {
  recommendations: PlannerRecommendationOutput;
  item: SupplyItem;
  input: SurgeInput;
}

export const PlannerRecommendationCard: React.FC<PlannerRecommendationCardProps> = ({
  recommendations,
  item,
  input
}) => {
  // Local state for planner marking action items as acknowledged / dispatched
  const [acknowledgedActions, setAcknowledgedActions] = useState<Record<string, boolean>>({});

  const toggleAction = (id: string) => {
    setAcknowledgedActions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const urgencyBadge = {
    IMMEDIATE: 'bg-rose-100 text-rose-800 border-rose-200',
    WITHIN_24_HOURS: 'bg-amber-100 text-amber-800 border-amber-200',
    WITHIN_48_HOURS: 'bg-blue-100 text-blue-800 border-blue-200',
    NEXT_CYCLE: 'bg-slate-100 text-slate-700 border-slate-200'
  };

  const categoryLabels = {
    SUPPLIER_EXPEDITE: 'Supplier Expedite',
    PRODUCTION_REALLOCATION: 'Production Reallocation',
    SAFETY_STOCK_DRAW: 'Safety Stock Draw',
    CUSTOMER_RATIONING: 'Customer Rationing / Split',
    ALTERNATE_SOURCING: 'Alternate Sourcing'
  };

  const criticalityBadge = {
    NONE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
    HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
    CRITICAL: 'bg-rose-50 text-rose-700 border-rose-200'
  }[recommendations.overallCriticality] || 'bg-slate-50 text-slate-700 border-slate-200';

  const acknowledgedCount = Object.values(acknowledgedActions).filter(Boolean).length;

  return (
    <div id="planner-recommendation-agent-card" className="bg-white rounded-xl border-2 border-indigo-600/30 shadow-sm overflow-hidden">
      {/* Stage 3 Header */}
      <div className="px-5 py-3.5 bg-indigo-900 text-white flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-white text-indigo-950 flex items-center justify-center font-bold text-xs shadow-xs">
            3
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Planner Recommendation Agent
              <span className="text-[11px] font-medium text-indigo-200 bg-indigo-800/80 px-2 py-0.5 rounded">
                Stage 3 &bull; Mitigation & Tactical Actions
              </span>
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1 ${criticalityBadge}`}>
            <AlertCircle className="w-3 h-3" />
            Criticality: {recommendations.overallCriticality}
          </span>
          <span className="text-xs bg-indigo-800 text-indigo-100 px-2.5 py-0.5 rounded-full font-medium">
            {acknowledgedCount}/{recommendations.actionMatrix.length} Actions Dispatched
          </span>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Executive Summary Box */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Executive Situation Summary
            </span>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              Strategy: {recommendations.primaryRecommendedStrategy}
            </span>
          </div>
          <p className="text-sm text-slate-800 leading-relaxed font-normal">
            {recommendations.executiveSummary}
          </p>
        </div>

        {/* Action Items Matrix */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Prioritized Planner Action Matrix ({recommendations.actionMatrix.length} Actions)
            </h4>
            <span className="text-[11px] text-slate-500">
              Click checkbox to acknowledge action dispatch
            </span>
          </div>

          <div className="space-y-2.5">
            {recommendations.actionMatrix.map((action: ActionItem) => {
              const isChecked = Boolean(acknowledgedActions[action.id]);

              return (
                <div
                  key={action.id}
                  id={`action-item-${action.id}`}
                  className={`p-4 rounded-xl border transition-all ${
                    isChecked
                      ? 'bg-slate-50/80 border-slate-200 opacity-70'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={() => toggleAction(action.id)}
                      className="mt-0.5 text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer shrink-0"
                      title={isChecked ? 'Mark as pending' : 'Acknowledge action dispatch'}
                    >
                      {isChecked ? (
                        <div className="w-5 h-5 rounded bg-emerald-600 text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded border-2 border-slate-300 hover:border-indigo-600 bg-white" />
                      )}
                    </button>

                    {/* Action details */}
                    <div className="flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-500">
                            {action.id}
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {categoryLabels[action.category] || action.category}
                          </span>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${urgencyBadge[action.urgency] || 'bg-slate-100 text-slate-700'}`}>
                            {action.urgency.replace(/_/g, ' ')}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs">
                          {action.expectedUnitsRecovered ? (
                            <span className="text-emerald-700 font-semibold font-mono">
                              +{action.expectedUnitsRecovered} Units
                            </span>
                          ) : null}
                          {action.estimatedCostImpactUsd ? (
                            <span className="text-slate-600 font-medium">
                              ${action.estimatedCostImpactUsd.toLocaleString()} impact
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <h5 className={`text-sm font-bold ${isChecked ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                        {action.title}
                      </h5>
                      <p className="text-xs text-slate-600 leading-relaxed font-normal">
                        {action.description}
                      </p>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="flex items-center gap-1 font-medium text-slate-700">
                          <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                          Owner: {action.owner}
                        </span>
                        {isChecked && (
                          <span className="text-emerald-700 font-semibold">
                            Dispatched &bull; Logged in Planner Audit Trail
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Operational Tradeoffs & Customer Communications */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Tradeoffs */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              Operational Tradeoffs & Vulnerabilities
            </h5>
            <ul className="space-y-1.5 text-xs text-slate-600">
              {recommendations.tradeoffsAndRisks.map((tradeoff, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">&bull;</span>
                  <span>{tradeoff}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Communication Playbook */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
              Customer Allocation & Communication Guidance
            </h5>
            <p className="text-xs text-slate-700 leading-relaxed font-normal">
              {recommendations.customerCommunicationStrategy}
            </p>
            <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500">
              <strong>Follow-Up Trigger:</strong> {recommendations.followUpTrigger}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
