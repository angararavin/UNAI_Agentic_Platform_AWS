import React, { useState, useEffect } from 'react';
import { AnalysisRunResult, ActionItem, HumanDecisionInput } from '../../types';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import {
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Send,
  FileCheck,
  Sparkles,
  Truck,
  RotateCcw
} from 'lucide-react';

interface HumanInTheLoopCardProps {
  run: AnalysisRunResult;
  onDecisionSubmit: (decision: HumanDecisionInput) => Promise<void>;
  isSubmitting?: boolean;
}

export const HumanInTheLoopCard: React.FC<HumanInTheLoopCardProps> = ({
  run,
  onDecisionSubmit,
  isSubmitting = false
}) => {
  const { humanReview, plannerRecommendations, input } = run;
  const actions: ActionItem[] = plannerRecommendations.actionMatrix || [];

  // Local state for human interaction
  const [selectedActionIds, setSelectedActionIds] = useState<string[]>(
    humanReview?.approvedActionIds?.length
      ? humanReview.approvedActionIds
      : actions.map(a => a.id)
  );
  const [allocatedUnits, setAllocatedUnits] = useState<number>(
    humanReview?.allocatedSurgeUnits ?? input.surgeQuantity
  );
  const [commitmentDays, setCommitmentDays] = useState<number>(
    humanReview?.deliveryCommitmentDays ?? input.targetFulfillmentDays
  );
  const [plannerNotes, setPlannerNotes] = useState<string>(
    humanReview?.plannerNotes || ''
  );
  const [reviewerName, setReviewerName] = useState<string>(
    humanReview?.reviewedBy || 'Lead Supply Chain Planner'
  );
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Sync state whenever active run changes
  useEffect(() => {
    setSelectedActionIds(
      humanReview?.approvedActionIds?.length
        ? humanReview.approvedActionIds
        : actions.map(a => a.id)
    );
    setAllocatedUnits(humanReview?.allocatedSurgeUnits ?? input.surgeQuantity);
    setCommitmentDays(humanReview?.deliveryCommitmentDays ?? input.targetFulfillmentDays);
    setPlannerNotes(humanReview?.plannerNotes || '');
    setReviewerName(humanReview?.reviewedBy || 'Lead Supply Chain Planner');
    setIsEditing(false);
  }, [run.id]);

  const isCompleted = humanReview?.status && humanReview.status !== 'pending_review' && !isEditing;

  const toggleAction = (id: string) => {
    setSelectedActionIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selectAllActions = () => {
    setSelectedActionIds(actions.map(a => a.id));
  };

  const deselectAllActions = () => {
    setSelectedActionIds([]);
  };

  const handleApprove = async (status: 'approved' | 'modified' | 'rejected') => {
    await onDecisionSubmit({
      status,
      reviewedBy: reviewerName.trim() || 'Lead Supply Chain Planner',
      approvedActionIds: status === 'rejected' ? [] : selectedActionIds,
      plannerNotes: plannerNotes.trim() || undefined,
      allocatedSurgeUnits: allocatedUnits,
      deliveryCommitmentDays: commitmentDays
    });
    setIsEditing(false);
  };

  // Compute authorized cost from selected actions
  const authorizedCost = actions
    .filter(a => selectedActionIds.includes(a.id))
    .reduce((sum, a) => sum + (a.estimatedCostImpactUsd || 0), 0);

  const statusVariant: 'warning' | 'success' | 'danger' = {
    pending_review: 'warning' as const,
    approved: 'success' as const,
    modified: 'info' as const,
    rejected: 'danger' as const
  }[humanReview?.status || 'pending_review'] || 'warning';

  const statusLabel = {
    pending_review: 'Awaiting Planner Sign-off',
    approved: 'Approved & Dispatched',
    modified: 'Modified & Dispatched',
    rejected: 'Plan Rejected'
  }[humanReview?.status || 'pending_review'];

  return (
    <Card
      id="human-in-the-loop-card"
      stageNumber={4}
      title="Human-in-the-Loop Review Gate"
      subtitle="Operational governance, action authorization & ERP dispatch"
      badge={
        <Badge variant={statusVariant} icon={<ShieldCheck className="w-3.5 h-3.5" />}>
          {statusLabel}
        </Badge>
      }
      className={isCompleted ? 'border-emerald-200/80 bg-stone-50/30' : 'border-stone-300 ring-1 ring-stone-900/5'}
    >
      {isCompleted ? (
        /* COMPLETED / DISPATCHED RECEIPT VIEW */
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-emerald-50/60 border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <h4 className="text-sm font-bold text-emerald-900">
                  Mitigation Plan Executed by Human Planner
                </h4>
              </div>
              <p className="text-xs text-emerald-800 mt-1">
                Reviewed by <span className="font-semibold">{humanReview.reviewedBy}</span> on{' '}
                {humanReview.reviewedAt ? new Date(humanReview.reviewedAt).toLocaleTimeString() : 'recently'}.
                Authorized {humanReview.approvedActionIds.length} of {actions.length} mitigations.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <span className="text-xs font-semibold px-2.5 py-1 bg-white rounded border border-emerald-200 text-emerald-900">
                Budget Authorized: ${humanReview.dispatchSummary?.authorizedCostUsd?.toLocaleString() || authorizedCost.toLocaleString()}
              </span>
              <Button
                variant="outline"
                size="sm"
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                onClick={() => setIsEditing(true)}
              >
                Modify
              </Button>
            </div>
          </div>

          {/* Dispatch Summary Artifacts */}
          {humanReview.dispatchSummary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-white border border-stone-200">
                <span className="font-semibold text-stone-900 flex items-center gap-1.5 mb-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-stone-600" />
                  ERP Orders & Expedite Contracts
                </span>
                {humanReview.dispatchSummary.erpOrdersCreated.length > 0 ? (
                  <div className="space-y-1 text-stone-600">
                    {humanReview.dispatchSummary.erpOrdersCreated.map((po, i) => (
                      <div key={i} className="font-mono text-[11px] bg-stone-50 px-2 py-0.5 rounded border border-stone-200/70 inline-block mr-1 mb-1">
                        {po}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-stone-500">No external purchase orders triggered.</span>
                )}
              </div>

              <div className="p-3 rounded-lg bg-white border border-stone-200">
                <span className="font-semibold text-stone-900 flex items-center gap-1.5 mb-1.5">
                  <Truck className="w-3.5 h-3.5 text-stone-600" />
                  Downstream Notifications
                </span>
                <ul className="space-y-1 text-stone-600">
                  <li className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Supplier priority expedite signal dispatched
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Customer delivery schedule notification queued
                  </li>
                </ul>
              </div>
            </div>
          )}

          {humanReview.plannerNotes && (
            <div className="p-3 rounded-lg bg-white border border-stone-200 text-xs">
              <span className="font-semibold text-stone-700 block mb-0.5">Planner Directives & Notes:</span>
              <p className="text-stone-600 italic">"{humanReview.plannerNotes}"</p>
            </div>
          )}
        </div>
      ) : (
        /* INTERACTIVE REVIEW FORM VIEW */
        <div className="space-y-5">
          <div className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-200/80 flex items-start gap-2.5">
            <UserCheck className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <strong className="font-semibold block text-amber-950 mb-0.5">Human Governance Checkpoint:</strong>
              The AI multi-agent workflow has analyzed demand and supply feasibility. You hold final authority to authorize, tweak, or reject mitigation actions before automated dispatch.
            </div>
          </div>

          {/* Action Items Authorization Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2.5 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Select Mitigations to Authorize ({selectedActionIds.length}/{actions.length})
                </h4>
                <div className="flex items-center gap-1.5 text-xs text-stone-400">
                  <span>&bull;</span>
                  <button
                    type="button"
                    onClick={selectAllActions}
                    disabled={selectedActionIds.length === actions.length}
                    className="text-[11px] font-medium text-stone-700 hover:text-stone-900 underline disabled:opacity-40 disabled:no-underline cursor-pointer"
                  >
                    Select all
                  </button>
                  <span>&bull;</span>
                  <button
                    type="button"
                    onClick={deselectAllActions}
                    disabled={selectedActionIds.length === 0}
                    className="text-[11px] font-medium text-stone-500 hover:text-stone-800 underline disabled:opacity-40 disabled:no-underline cursor-pointer"
                  >
                    Clear all
                  </button>
                </div>
              </div>
              <span className="text-xs font-medium text-stone-600">
                Authorized Budget: <strong className="text-stone-900">${authorizedCost.toLocaleString()}</strong>
              </span>
            </div>

            <div className="space-y-2">
              {actions.map((act) => {
                const isSelected = selectedActionIds.includes(act.id);
                return (
                  <div
                    key={act.id}
                    id={`mitigation-action-row-${act.id}`}
                    onClick={() => toggleAction(act.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        toggleAction(act.id);
                      }
                    }}
                    className={`p-3 rounded-lg border transition-all cursor-pointer flex items-start gap-3 select-none ${
                      isSelected
                        ? 'bg-stone-50/90 border-stone-400 ring-1 ring-stone-900/10'
                        : 'bg-white border-stone-200 opacity-60 hover:opacity-100 hover:border-stone-300'
                    }`}
                  >
                    <div
                      className="pt-0.5 flex items-center justify-center shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        id={`action-checkbox-${act.id}`}
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleAction(act.id)}
                        className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900 cursor-pointer"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-stone-900">
                          {act.title}
                        </span>
                        <div className="flex items-center gap-2">
                          {act.estimatedCostImpactUsd ? (
                            <span className="text-xs font-medium text-stone-700 bg-stone-100 px-2 py-0.5 rounded">
                              +${act.estimatedCostImpactUsd.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                              $0 Cost
                            </span>
                          )}
                          <span className="text-[11px] text-stone-500 font-mono">
                            {act.owner}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                        {act.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Allocation & Commitment Adjustments */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-stone-100">
            <div>
              <label className="text-xs font-medium text-stone-700 block mb-1">
                Authorized Surge Quantity (Units)
              </label>
              <input
                type="number"
                value={allocatedUnits}
                onChange={(e) => setAllocatedUnits(Number(e.target.value))}
                min={1}
                className="w-full text-sm px-3 py-1.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900"
              />
              <span className="text-[11px] text-stone-500 block mt-0.5">
                Requested by customer: {input.surgeQuantity} units
              </span>
            </div>

            <div>
              <label className="text-xs font-medium text-stone-700 block mb-1">
                Delivery Commitment Window (Days)
              </label>
              <input
                type="number"
                value={commitmentDays}
                onChange={(e) => setCommitmentDays(Number(e.target.value))}
                min={1}
                className="w-full text-sm px-3 py-1.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900"
              />
              <span className="text-[11px] text-stone-500 block mt-0.5">
                Customer target: {input.targetFulfillmentDays} days
              </span>
            </div>
          </div>

          {/* Reviewer Name & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-stone-700 block mb-1">
                Planner Sign-off Name
              </label>
              <input
                type="text"
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                placeholder="Planner Name or ID"
                className="w-full text-sm px-3 py-1.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-stone-700 block mb-1">
                Planner Directives / Operational Memo
              </label>
              <input
                type="text"
                value={plannerNotes}
                onChange={(e) => setPlannerNotes(e.target.value)}
                placeholder="e.g., Expedite approved via email from VP Operations; staged shipping agreed with customer"
                className="w-full text-sm px-3 py-1.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900"
              />
            </div>
          </div>

          {/* Decision Buttons */}
          <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="outline"
              size="sm"
              className="text-rose-600 hover:bg-rose-50"
              onClick={() => handleApprove('rejected')}
              loading={isSubmitting}
            >
              Reject Mitigation Plan
            </Button>

            <div className="flex items-center gap-2">
              {selectedActionIds.length < actions.length && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleApprove('modified')}
                  loading={isSubmitting}
                >
                  Approve with Modifications
                </Button>
              )}
              <Button
                variant="primary"
                size="md"
                icon={<Send className="w-3.5 h-3.5" />}
                onClick={() => handleApprove('approved')}
                loading={isSubmitting}
              >
                Authorize & Dispatch Plan
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
