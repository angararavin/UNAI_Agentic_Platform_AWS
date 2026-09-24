import React, { useState } from 'react';
import { AgentExecutionRecord } from '../types';
import { ConfidenceGauge } from './ConfidenceGauge';
import { X, CheckCircle2, XCircle, Edit3, UserCheck, ShieldAlert } from 'lucide-react';

interface HumanReviewModalProps {
  record: AgentExecutionRecord | null;
  onClose: () => void;
  onReviewSubmit: (
    id: string,
    newStatus: 'human_approved' | 'human_rejected' | 'human_overridden',
    reviewer: string,
    notes: string,
    overriddenOutput?: Record<string, any>
  ) => Promise<void>;
}

export const HumanReviewModal: React.FC<HumanReviewModalProps> = ({
  record,
  onClose,
  onReviewSubmit,
}) => {
  if (!record) return null;

  const [reviewer, setReviewer] = useState(record.reviewedBy || 'Ops Lead (Engineering)');
  const [notes, setNotes] = useState(record.humanReviewNotes || '');
  const [activeTab, setActiveTab] = useState<'approve' | 'reject' | 'override'>('approve');
  const [overrideValue, setOverrideValue] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Suggested override values based on agent
  const getOverrideOptions = () => {
    switch (record.agentId) {
      case 'agent-1':
        return ['Repaired', 'Replaced', 'Further Diagnosed'];
      case 'agent-2':
        return ['Within SLO', 'At Risk', 'Breached'];
      case 'agent-3':
        return ['Critical', 'High', 'Medium', 'Low'];
      case 'agent-4':
        return ['Eligible', 'Ineligible', 'Quarantine'];
      default:
        return [];
    }
  };

  const handleSubmit = async (action: 'human_approved' | 'human_rejected' | 'human_overridden') => {
    setSubmitting(true);
    try {
      let overriddenOutput: Record<string, any> | undefined = undefined;

      if (action === 'human_overridden' && overrideValue) {
        overriddenOutput = { ...record.output };
        if (record.agentId === 'agent-1') {
          overriddenOutput.recommendedDisposition = overrideValue;
        } else if (record.agentId === 'agent-2') {
          overriddenOutput.dwellStatus = overrideValue;
        } else if (record.agentId === 'agent-3') {
          overriddenOutput.urgencyLevel = overrideValue;
          if (overrideValue === 'Critical') overriddenOutput.priority = 'P1';
          else if (overrideValue === 'High') overriddenOutput.priority = 'P2';
          else if (overrideValue === 'Medium') overriddenOutput.priority = 'P3';
          else overriddenOutput.priority = 'P4';
        } else if (record.agentId === 'agent-4') {
          overriddenOutput.sparePoolEligibility = overrideValue;
        }
      }

      await onReviewSubmit(record.id, action, reviewer, notes, overriddenOutput);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-lg border border-[#DADCE0] max-w-2xl w-full overflow-hidden my-8 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E8EAED] bg-[#F8F9FA]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-[#E8F0FE] text-[#1A73E8] border border-[#D2E3FC]">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-[#202124] text-xs uppercase tracking-wider font-mono">Human-in-the-Loop Review</h3>
              <p className="text-[10px] text-[#5F6368] font-mono">
                {record.id} • {record.trayId} • {record.agentName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#5F6368] hover:text-[#202124] rounded-md hover:bg-[#E8EAED] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3.5 max-h-[70vh] overflow-y-auto">
          {/* Status banner */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F8F9FA] border border-[#DADCE0] text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-[#5F6368] text-[10px] uppercase font-bold tracking-wider">Approval State:</span>
              <span
                className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${
                  record.approvalStatus === 'auto_approved'
                    ? 'bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]'
                    : record.approvalStatus === 'pending_human_review'
                    ? 'bg-[#FEF7E0] text-[#B06000] border border-[#FEEFC3] flex items-center gap-1'
                    : 'bg-[#E8F0FE] text-[#1A73E8] border border-[#D2E3FC]'
                }`}
              >
                {record.approvalStatus === 'pending_human_review' && (
                  <ShieldAlert className="w-3 h-3 text-[#E37400]" />
                )}
                {record.approvalStatus.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="text-[#5F6368] text-[10px]">
              Engine: <span className="font-bold text-[#202124]">{record.engineUsed}</span> ({record.latencyMs}ms)
            </div>
          </div>

          {/* Confidence Gauge */}
          <div className="p-3 rounded-lg bg-[#F8F9FA] border border-[#DADCE0]">
            <ConfidenceGauge score={record.confidenceScore} threshold={record.threshold} />
          </div>

          {/* AI Recommended Output */}
          <div>
            <h4 className="text-[10px] font-bold text-[#5F6368] uppercase tracking-wider mb-1.5">
              AI Agent Analysis & Recommended Output
            </h4>
            <div className="bg-[#F8F9FA] border border-[#DADCE0] text-[#188038] rounded-lg p-3 font-mono text-xs overflow-x-auto">
              <pre className="text-[11px] text-[#202124] leading-relaxed">{JSON.stringify(record.output, null, 2)}</pre>
            </div>
          </div>

          {/* Input Snapshot */}
          <div>
            <h4 className="text-[10px] font-bold text-[#5F6368] uppercase tracking-wider mb-1.5">
              Diagnostic & Hardware Input
            </h4>
            <div className="bg-[#F8F9FA] border border-[#DADCE0] rounded-lg p-2.5 text-xs space-y-1.5 text-[#202124] font-mono">
              {Object.entries(record.input).map(([k, v]) => (
                <div key={k} className="grid grid-cols-3 gap-2 border-b border-[#E8EAED] pb-1 last:border-0 last:pb-0">
                  <span className="font-bold text-[#5F6368] text-[10px] uppercase">{k}:</span>
                  <span className="col-span-2 text-[#202124] break-words text-[11px]">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Decision Override Tab controls */}
          <div className="border-t border-[#E8EAED] pt-3">
            <h4 className="text-[10px] font-bold text-[#5F6368] uppercase tracking-wider mb-2">
              Reviewer Decision
            </h4>

            <div className="grid grid-cols-3 gap-2 mb-3 font-mono">
              <button
                type="button"
                onClick={() => setActiveTab('approve')}
                className={`py-1.5 px-2.5 rounded-md text-xs font-bold uppercase tracking-wider border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'approve'
                    ? 'bg-[#E6F4EA] border-[#188038] text-[#137333]'
                    : 'bg-white border-[#DADCE0] text-[#5F6368] hover:text-[#202124] hover:bg-[#F8F9FA]'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#188038]" />
                Approve Output
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('reject')}
                className={`py-1.5 px-2.5 rounded-md text-xs font-bold uppercase tracking-wider border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'reject'
                    ? 'bg-[#FCE8E6] border-[#D93025] text-[#C5221F]'
                    : 'bg-white border-[#DADCE0] text-[#5F6368] hover:text-[#202124] hover:bg-[#F8F9FA]'
                }`}
              >
                <XCircle className="w-3.5 h-3.5 text-[#D93025]" />
                Reject
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('override');
                  if (!overrideValue && getOverrideOptions().length > 0) {
                    setOverrideValue(getOverrideOptions()[0]);
                  }
                }}
                className={`py-1.5 px-2.5 rounded-md text-xs font-bold uppercase tracking-wider border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'override'
                    ? 'bg-[#E8F0FE] border-[#1A73E8] text-[#1A73E8]'
                    : 'bg-white border-[#DADCE0] text-[#5F6368] hover:text-[#202124] hover:bg-[#F8F9FA]'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5 text-[#1A73E8]" />
                Manual Override
              </button>
            </div>

            {/* If Override, show selector */}
            {activeTab === 'override' && (
              <div className="mb-3 p-2.5 bg-[#F8F9FA] border border-[#DADCE0] rounded-lg">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#1A73E8] mb-1">
                  Select Override Decision Value:
                </label>
                <select
                  value={overrideValue}
                  onChange={(e) => setOverrideValue(e.target.value)}
                  className="w-full text-xs font-mono p-2 border border-[#DADCE0] rounded-md bg-white text-[#202124] focus:border-[#1A73E8] focus:outline-none"
                >
                  {getOverrideOptions().map((opt) => (
                    <option key={opt} value={opt} className="bg-white text-[#202124]">
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Reviewer Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-2">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5F6368] mb-1">Reviewer Name / ID</label>
                <input
                  type="text"
                  value={reviewer}
                  onChange={(e) => setReviewer(e.target.value)}
                  placeholder="e.g. Lead Hardware Engineer"
                  className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-[#DADCE0] rounded-md text-[#202124] focus:border-[#1A73E8] focus:outline-none placeholder-[#80868B]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5F6368] mb-1">Audit Notes / Rationale</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Confirmed secondary eye diagram PASS manually"
                  className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-[#DADCE0] rounded-md text-[#202124] focus:border-[#1A73E8] focus:outline-none placeholder-[#80868B]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-4 py-3 border-t border-[#E8EAED] bg-[#F8F9FA]">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-mono text-[#5F6368] bg-white border border-[#DADCE0] rounded-md hover:text-[#202124] hover:bg-[#F1F3F4] cursor-pointer shadow-xs"
          >
            Cancel
          </button>

          {activeTab === 'approve' && (
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit('human_approved')}
              className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider font-mono text-white bg-[#188038] hover:bg-[#137333] rounded-md flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {submitting ? 'Submitting...' : 'Confirm & Approve'}
            </button>
          )}

          {activeTab === 'reject' && (
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit('human_rejected')}
              className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider font-mono text-white bg-[#D93025] hover:bg-[#B3261E] rounded-md flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <XCircle className="w-3.5 h-3.5" />
              {submitting ? 'Submitting...' : 'Confirm Rejection'}
            </button>
          )}

          {activeTab === 'override' && (
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit('human_overridden')}
              className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider font-mono text-white bg-[#1A73E8] hover:bg-[#1557B0] rounded-md flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <Edit3 className="w-3.5 h-3.5" />
              {submitting ? 'Submitting...' : 'Apply Manual Override'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
