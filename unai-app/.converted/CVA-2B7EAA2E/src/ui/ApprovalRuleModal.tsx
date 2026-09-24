import React, { useState } from 'react';
import { Sliders, ShieldCheck, ShieldAlert, Check, X, Info } from 'lucide-react';

interface ApprovalRuleModalProps {
  agentId: 'agent-1' | 'agent-2' | 'agent-3' | 'agent-4';
  agentName: string;
  currentThreshold: number;
  onClose: () => void;
  onSave: (agentId: string, newThreshold: number) => Promise<void>;
}

export const ApprovalRuleModal: React.FC<ApprovalRuleModalProps> = ({
  agentId,
  agentName,
  currentThreshold,
  onClose,
  onSave,
}) => {
  const [threshold, setThreshold] = useState<number>(currentThreshold);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const presets = [
    { label: 'High Automation', value: 75, desc: 'Faster throughput, lower manual overhead' },
    { label: 'Balanced (Standard)', value: agentId === 'agent-4' ? 95 : agentId === 'agent-3' ? 90 : agentId === 'agent-1' ? 85 : 80, desc: 'Calibrated baseline for operational balance' },
    { label: 'Strict Safety', value: 95, desc: 'Maximum human oversight, zero-risk enforcement' },
  ];

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSave(agentId, threshold);
      setSaveSuccess(true);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      console.error('Failed to save threshold:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-[#DADCE0] rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#E8EAED] flex items-center justify-between bg-[#F8F9FA]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E8F0FE] border border-[#D2E3FC] flex items-center justify-center text-[#1A73E8]">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-mono text-[#202124] uppercase tracking-wide">
                Configure Approval Rule
              </h3>
              <p className="text-[11px] text-[#5F6368]">{agentName}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#5F6368] hover:bg-[#E8EAED] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Threshold value controller */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold font-mono text-[#202124] uppercase tracking-wider">
                Confidence Threshold Floor
              </label>
              <div className="flex items-center gap-1 font-mono text-base font-bold px-2 py-0.5 rounded bg-[#E8F0FE] text-[#1A73E8] border border-[#D2E3FC]">
                <span>{threshold}%</span>
              </div>
            </div>

            <input
              type="range"
              min="50"
              max="99"
              step="1"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full h-2 bg-[#E8EAED] rounded-lg appearance-none cursor-pointer accent-[#1A73E8]"
            />

            <div className="flex justify-between text-[10px] font-mono text-[#80868B] mt-1">
              <span>50% (Permissive)</span>
              <span>80% - 85% (Balanced)</span>
              <span>99% (Strict)</span>
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <div className="text-[10px] font-bold text-[#5F6368] uppercase tracking-wider mb-2 font-mono">
              Quick Rule Presets
            </div>
            <div className="grid grid-cols-3 gap-2">
              {presets.map((p) => {
                const isSelected = threshold === p.value;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setThreshold(p.value)}
                    className={`px-2 py-2 rounded-lg border text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-[#1A73E8] bg-[#E8F0FE] text-[#1A73E8] font-bold'
                        : 'border-[#DADCE0] hover:bg-[#F8F9FA] text-[#3C4043]'
                    }`}
                  >
                    <div className="text-[11px] font-mono leading-tight">{p.label}</div>
                    <div className="text-xs font-mono font-bold mt-1 text-[#202124]">{p.value}%</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Rule Preview */}
          <div className="bg-[#F8F9FA] border border-[#DADCE0] rounded-lg p-3 space-y-2 font-mono text-xs">
            <div className="text-[10px] font-bold uppercase text-[#5F6368] tracking-wider mb-1 flex items-center gap-1">
              <Info className="w-3 h-3 text-[#1A73E8]" />
              <span>Live Rule Behavior Preview</span>
            </div>

            <div className="flex items-center gap-2 p-2 rounded bg-white border border-[#E8EAED]">
              <ShieldCheck className="w-4 h-4 text-[#188038] shrink-0" />
              <div className="text-[11px]">
                Score <strong className="text-[#188038]">≥ {threshold}%</strong>: <span className="text-[#202124]">Auto-Approved</span>
                <div className="text-[10px] text-[#5F6368] font-sans">
                  Action executes autonomously without waiting in human review queues.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded bg-white border border-[#E8EAED]">
              <ShieldAlert className="w-4 h-4 text-[#B06000] shrink-0" />
              <div className="text-[11px]">
                Score <strong className="text-[#B06000]">&lt; {threshold}%</strong>: <span className="text-[#202124]">Human Review Required</span>
                <div className="text-[10px] text-[#5F6368] font-sans">
                  Recommendation is held safely in Control Tower ledger for engineer sign-off.
                </div>
              </div>
            </div>
          </div>

          {/* Explainability note */}
          <p className="text-[11px] text-[#5F6368] leading-relaxed">
            <strong className="text-[#202124]">Operational Impact: </strong>
            Lowering the threshold accelerates cycle-time throughput, while raising it enforces human verification on edge cases.
          </p>
        </div>

        {/* Footer actions */}
        <div className="p-3 bg-[#F8F9FA] border-t border-[#DADCE0] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-3 py-1.5 rounded-md border border-[#DADCE0] text-xs font-semibold text-[#3C4043] hover:bg-white transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-1.5 rounded-md bg-[#1A73E8] hover:bg-[#1557B0] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            {saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Saved!</span>
              </>
            ) : isSaving ? (
              <span>Saving...</span>
            ) : (
              <span>Apply Rule</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
