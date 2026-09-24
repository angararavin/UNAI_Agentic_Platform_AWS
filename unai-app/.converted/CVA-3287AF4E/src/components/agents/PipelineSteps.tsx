import React from 'react';
import { AnalysisRunResult } from '../../types';
import { Tooltip } from '../ui/Tooltip';

interface PipelineStepsProps {
  run: AnalysisRunResult;
}

export const PipelineSteps: React.FC<PipelineStepsProps> = ({ run }) => {
  const isHumanReviewed = run.humanReview?.status && run.humanReview.status !== 'pending_review';

  const steps = [
    {
      name: 'Demand Signal',
      status: 'completed',
      detail: `${run.demandAnalysis.demandPattern}`,
      tooltip: `Stage 1: Analyzed +${run.demandAnalysis.surgePercentage}% demand spike. Classified signal as ${run.demandAnalysis.demandPattern}.`
    },
    {
      name: 'Supply Impact',
      status: 'completed',
      detail: run.supplyAnalysis.netInventoryBalance < 0 
        ? `${run.supplyAnalysis.netInventoryBalance} Net Deficit` 
        : `+${run.supplyAnalysis.netInventoryBalance} Surplus`,
      tooltip: `Stage 2: Assessed on-hand inventory, open PO arrivals, and line capacity. Net balance: ${run.supplyAnalysis.netInventoryBalance} units.`
    },
    {
      name: 'Recommendations',
      status: 'completed',
      detail: `${run.plannerRecommendations.actionMatrix.length} Mitigations`,
      tooltip: `Stage 3: Generated ${run.plannerRecommendations.actionMatrix.length} concrete mitigation levers under '${run.plannerRecommendations.primaryRecommendedStrategy}' strategy.`
    },
    {
      name: 'Human Review Gate',
      status: isHumanReviewed ? 'completed' : 'active',
      detail: isHumanReviewed ? run.humanReview.status.replace('_', ' ') : 'Awaiting Sign-off',
      tooltip: isHumanReviewed 
        ? `Stage 4: Authorized by planner ${run.humanReview.reviewedBy}. ERP orders and supplier expedite signals dispatched.`
        : 'Stage 4: Awaiting human planner authorization to trigger ERP purchase orders and notifications.'
    }
  ];

  return (
    <div className="bg-white rounded-xl border border-stone-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-1.5 text-stone-500 font-medium">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="uppercase tracking-wider text-[10px]">Multi-Agent Workflow:</span>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        {steps.map((step, idx) => {
          const isDone = step.status === 'completed';
          const isActive = step.status === 'active';

          return (
            <Tooltip key={idx} position="bottom" content={step.tooltip}>
              <div className="flex items-center gap-2 cursor-help">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                  isDone 
                    ? 'bg-stone-900 text-white' 
                    : isActive 
                    ? 'bg-amber-500 text-white ring-2 ring-amber-200' 
                    : 'bg-stone-100 text-stone-400'
                }`}>
                  {isDone ? '✓' : idx + 1}
                </div>
                <div>
                  <span className={`font-semibold block ${isActive ? 'text-stone-900' : 'text-stone-700'}`}>
                    {step.name}
                  </span>
                  <span className="text-[11px] text-stone-500 capitalize">
                    {step.detail}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <span className="text-stone-300 ml-2 hidden sm:inline">&rarr;</span>
                )}
              </div>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
};
