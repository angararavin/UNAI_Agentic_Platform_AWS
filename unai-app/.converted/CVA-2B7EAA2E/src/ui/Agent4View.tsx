import React, { useState } from 'react';
import { Agent4Input, Agent4Output, AgentExecutionRecord, ControlTowerAnalytics } from '../types';
import { AGENT4_PRESETS } from '../presets';
import { ConfidenceGauge } from './ConfidenceGauge';
import { AgentTokenAnalytics } from './AgentTokenAnalytics';
import { Agent4SparePoolChart } from './AgentDomainCharts';
import { AddDataModal } from './AddDataModal';
import { ExplainTooltip, EXPLAIN_REGISTRY } from './ExplainTooltip';
import {
  CheckCheck,
  Play,
  FileText,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Plus,
} from 'lucide-react';

interface Agent4ViewProps {
  analytics: ControlTowerAnalytics | null;
  records: AgentExecutionRecord[];
  onRunAgent: (input: Agent4Input) => Promise<{ record: AgentExecutionRecord; output: Agent4Output }>;
  onSelectRecordForReview: (record: AgentExecutionRecord) => void;
  onRefresh?: () => Promise<void>;
  threshold?: number;
  onUpdateThreshold?: (agentId: string, threshold: number) => Promise<void>;
}

export const Agent4View: React.FC<Agent4ViewProps> = ({
  analytics,
  records,
  onRunAgent,
  onSelectRecordForReview,
  onRefresh,
  threshold = 95,
}) => {
  const agentRecords = records.filter((r) => r.agentId === 'agent-4');
  const metrics = analytics?.agent4Metrics;
  const [isAddDataOpen, setIsAddDataOpen] = useState(false);

  const [form, setForm] = useState<Agent4Input>({
    trayId: 'TRAY-2026-REINT-9921',
    rmaId: 'RMA-US-883921',
    serialNumber: 'SN-NV-H100-992381-A',
    returnedSerial: 'SN-NV-H100-992381-A',
    repairStatus: 'Repaired and 72-hr Burn-in Certified at Foxconn Austin Lab',
    warrantyStatus: 'Active OEM Hardware Warranty (Valid through Dec 2027)',
    manifestDetails: 'Inbound air freight airway bill 992-881283. Tamper-evident holographic security seal verified intact by dock receiver.',
  });

  const [running, setRunning] = useState(false);
  const [latestResult, setLatestResult] = useState<{
    record: AgentExecutionRecord;
    output: Agent4Output;
  } | null>(null);

  const loadPreset = (index: number) => {
    const preset = AGENT4_PRESETS[index];
    if (preset) {
      setForm(preset.data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRunning(true);
    try {
      const res = await onRunAgent({
        ...form,
        threshold,
      });
      setLatestResult(res);
    } catch (err: any) {
      alert(`Agent 4 execution failed: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Rule Summary */}
      <div className="bg-white border border-[#DADCE0] rounded-lg p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-[#E6F4EA] text-[#188038] border border-[#CEEAD6]">
              <CheckCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold text-[#202124] uppercase tracking-wider font-mono">
                  Agent 4 — Return Receipt & Spare-Pool Reintegration Agent
                </h2>
                <ExplainTooltip
                  content={{
                    title: 'Agent 4: Spare-Pool Reintegration',
                    whatItMeans: 'Audits physical dock receipts, barcode serial matches, and burn-in QA certificates to safely restock spares.',
                    howItIsCalculated: 'Rigorous barcode comparison against original RMA manifest, burn-in validation, and warranty certificate inspection.',
                    benchmarkOrAction: 'Approved units restocked into DC inventory immediately; mismatches quarantined to prevent rogue or counterfeit hardware.',
                  }}
                />
              </div>
              <div className="mt-1.5 px-3 py-1.5 rounded-md bg-[#E6F4EA] border border-[#CEEAD6] shadow-2xs">
                <p className="text-xs text-[#0D652D] font-medium leading-relaxed">
                  Dockside asset gatekeeper: validates inbound physical barcodes against manifests, audits burn-in QA logs, and authorizes Tier-1 spare pool restocking or quarantine.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="agent-4-corner-add-data-btn"
            onClick={() => setIsAddDataOpen(true)}
            className="px-3 py-2 bg-[#1A73E8] hover:bg-[#1557B0] text-white rounded-md font-mono text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
            title="Add RMA Data for Agent 4"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Data</span>
          </button>

          <div className="flex items-center gap-3 bg-[#F8F9FA] border border-[#DADCE0] px-3 py-2 rounded-md text-xs font-mono">
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 text-[10px] font-bold text-[#5F6368] uppercase tracking-wider">
                  <span>Human Approval Rule</span>
                  <ExplainTooltip
                    content={{
                      title: 'Human Approval Rule',
                      whatItMeans: `Autonomous decision threshold for Agent 4. Confidence ≥ ${threshold}% auto-executes; lower scores require human triage.`,
                      howItIsCalculated: `Threshold: ${threshold}% (configured via AGENT_4_THRESHOLD in .env).`,
                      benchmarkOrAction: 'Adjust AGENT_4_THRESHOLD in your .env file to update fleet safety policy.',
                    }}
                  />
                </div>
                <span className="text-[10px] font-mono font-medium text-[#5F6368] bg-[#F1F3F4] px-1.5 py-0.5 rounded border border-[#DADCE0]">
                  .env Policy: ≥{threshold}%
                </span>
              </div>
              <div className="text-[#202124] text-[11px] mt-0.5">
                Confidence <span className="font-bold text-[#188038]">≥ {threshold}%</span> → Auto Approved
              </div>
              <div className="text-[#202124] text-[11px]">
                Confidence <span className="font-bold text-[#B06000]">&lt; {threshold}%</span> → Human Approval Required
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Agent 4 Analytics Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white p-3 rounded-lg border border-[#DADCE0] shadow-xs">
          <div className="text-[10px] font-bold uppercase text-[#5F6368] tracking-wider flex items-center justify-between">
            <span>Total Validated</span>
            <ExplainTooltip
              content={{
                title: 'Total Validated',
                whatItMeans: 'Total number of returned trays inspected by Agent 4.',
                howItIsCalculated: 'Total audit records executed in Agent 4 telemetry.',
              }}
            />
          </div>
          <div className="text-xl font-mono font-bold text-[#202124] mt-0.5">{metrics?.total ?? 0}</div>
          <div className="text-[9px] font-mono text-[#5F6368] mt-0.5">Receipt checks</div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-[#DADCE0] shadow-xs">
          <div className="text-[10px] font-bold uppercase text-[#5F6368] tracking-wider flex items-center justify-between">
            <span>Eligible for Pool</span>
            <ExplainTooltip content={EXPLAIN_REGISTRY.eligibleForPool} />
          </div>
          <div className="text-xl font-mono font-bold text-[#188038] mt-0.5">{metrics?.eligibleCount ?? 0}</div>
          <div className="text-[9px] font-mono text-[#5F6368] mt-0.5">Ready for deployment</div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-[#DADCE0] shadow-xs">
          <div className="text-[10px] font-bold uppercase text-[#5F6368] tracking-wider flex items-center justify-between">
            <span>Quarantine Required</span>
            <ExplainTooltip content={EXPLAIN_REGISTRY.quarantineRequired} />
          </div>
          <div className="text-xl font-mono font-bold text-[#B06000] mt-0.5">{metrics?.quarantineCount ?? 0}</div>
          <div className="text-[9px] font-mono text-[#5F6368] mt-0.5">Serial mismatch/QA</div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-[#DADCE0] shadow-xs">
          <div className="text-[10px] font-bold uppercase text-[#5F6368] tracking-wider flex items-center justify-between">
            <span>Ineligible / Scrap</span>
            <ExplainTooltip
              content={{
                title: 'Ineligible / Scrap',
                whatItMeans: 'Hardware failed physical burn-in testing or warranty has permanently lapsed.',
                howItIsCalculated: 'OEM diagnostic fail or uncertified vendor return.',
                benchmarkOrAction: 'Route to certified electronic recycling or supplier credit claim.',
              }}
            />
          </div>
          <div className="text-xl font-mono font-bold text-[#D93025] mt-0.5">{metrics?.ineligibleCount ?? 0}</div>
          <div className="text-[9px] font-mono text-[#5F6368] mt-0.5">Warranty void / failed</div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-[#DADCE0] col-span-2 md:col-span-1 shadow-xs">
          <div className="text-[10px] font-bold uppercase text-[#5F6368] tracking-wider flex items-center justify-between">
            <span>Pending Review</span>
            <ExplainTooltip content={EXPLAIN_REGISTRY.pendingReview} />
          </div>
          <div className="text-xl font-mono font-bold text-[#B06000] mt-0.5">{metrics?.pendingReview ?? 0}</div>
          <div className="text-[9px] font-mono text-[#5F6368] mt-0.5">Below {threshold}% threshold</div>
        </div>
      </div>

      {/* Main Grid: Real Runner Form + Output Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left Form: Real Agent Inputs */}
        <div className="lg:col-span-7 bg-white border border-[#DADCE0] rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#E8EAED]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#188038]" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#202124]">Execute Agent 4 with Dock Receipt & Barcode Data</h3>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="mb-3">
            <label className="block text-[10px] font-bold text-[#5F6368] uppercase tracking-wider mb-1.5">
              Load Receipt & Verification Preset:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {AGENT4_PRESETS.map((p, idx) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => loadPreset(idx)}
                  className="p-2 text-left rounded-md bg-[#F8F9FA] border border-[#DADCE0] hover:border-[#1A73E8] hover:bg-[#E8F0FE] transition-colors shadow-xs"
                >
                  <div className="font-bold font-mono text-xs text-[#202124] truncate">{p.name}</div>
                  <div className="text-[10px] text-[#5F6368] line-clamp-1 mt-0.5">{p.expectedOutcome}</div>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5F6368] mb-1">Tray ID</label>
                <input
                  type="text"
                  required
                  value={form.trayId}
                  onChange={(e) => setForm({ ...form, trayId: e.target.value })}
                  className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-[#DADCE0] rounded text-[#202124] focus:border-[#1A73E8] focus:outline-none shadow-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5F6368] mb-1">RMA ID</label>
                <input
                  type="text"
                  required
                  value={form.rmaId}
                  onChange={(e) => setForm({ ...form, rmaId: e.target.value })}
                  className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-[#DADCE0] rounded text-[#202124] focus:border-[#1A73E8] focus:outline-none shadow-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5F6368] mb-1">Original Manifest Serial Number</label>
                <input
                  type="text"
                  required
                  value={form.serialNumber}
                  onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                  className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-[#DADCE0] rounded text-[#202124] focus:border-[#1A73E8] focus:outline-none shadow-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5F6368] mb-1">Dock Scanned Barcode Serial</label>
                <input
                  type="text"
                  required
                  value={form.returnedSerial}
                  onChange={(e) => setForm({ ...form, returnedSerial: e.target.value })}
                  className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-[#DADCE0] rounded text-[#202124] focus:border-[#1A73E8] focus:outline-none shadow-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5F6368] mb-1">Repair / Certification Status</label>
              <input
                type="text"
                required
                value={form.repairStatus}
                onChange={(e) => setForm({ ...form, repairStatus: e.target.value })}
                className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-[#DADCE0] rounded text-[#202124] focus:border-[#1A73E8] focus:outline-none shadow-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5F6368] mb-1">Warranty & Entitlement Status</label>
              <input
                type="text"
                required
                value={form.warrantyStatus}
                onChange={(e) => setForm({ ...form, warrantyStatus: e.target.value })}
                className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-[#DADCE0] rounded text-[#202124] focus:border-[#1A73E8] focus:outline-none shadow-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5F6368] mb-1">Manifest & Physical Inspection Details</label>
              <textarea
                rows={2}
                required
                value={form.manifestDetails}
                onChange={(e) => setForm({ ...form, manifestDetails: e.target.value })}
                placeholder="Airway bill, security seal condition, dock inspection notes..."
                className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-[#DADCE0] rounded text-[#202124] focus:border-[#1A73E8] focus:outline-none placeholder-[#80868B] shadow-xs"
              />
            </div>

            <div className="pt-1 flex justify-end">
              <button
                type="submit"
                disabled={running}
                className="px-4 py-2 bg-[#1A73E8] hover:bg-[#1557B0] text-white text-xs font-bold uppercase tracking-wider font-mono rounded-md flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
              >
                <Play className="w-3 h-3 fill-current" />
                {running ? 'Executing...' : 'Execute'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Output: Real Agent 4 Output Display */}
        <div className="lg:col-span-5 bg-white border border-[#DADCE0] rounded-lg p-4 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#E8EAED]">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#202124]">Agent 4 Reintegration Output</h3>
              {latestResult && (
                <span className="text-[10px] font-mono text-[#5F6368]">
                  {latestResult.record.engineUsed} ({latestResult.record.latencyMs}ms)
                </span>
              )}
            </div>

            {latestResult ? (
              <div className="space-y-3">
                {/* Spare Pool Eligibility Status */}
                <div className="p-3 rounded-lg border border-[#DADCE0] bg-[#F8F9FA] flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-[#5F6368] uppercase tracking-wider block">
                        Spare-Pool Eligibility
                      </span>
                      <ExplainTooltip
                        content={{
                          title: 'Spare-Pool Eligibility',
                          whatItMeans: `${latestResult.output.sparePoolEligibility}: Status governing whether the unit is admitted into production spare reserves.`,
                          howItIsCalculated: 'Requires Pass on dock barcode match, OEM certified repair burn-in, and intact warranty.',
                          benchmarkOrAction: latestResult.output.sparePoolEligibility === 'Eligible'
                            ? 'Auto-increment DC ready inventory.'
                            : 'Route to quarantine hold area.',
                        }}
                      />
                    </div>
                    <span
                      className={`text-base font-mono font-bold mt-0.5 inline-block ${
                        latestResult.output.sparePoolEligibility === 'Eligible'
                          ? 'text-[#188038]'
                          : latestResult.output.sparePoolEligibility === 'Quarantine'
                          ? 'text-[#B06000]'
                          : 'text-[#D93025]'
                      }`}
                    >
                      {latestResult.output.sparePoolEligibility}
                    </span>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-[10px] font-bold text-[#5F6368] uppercase tracking-wider block">Return Status</span>
                      <ExplainTooltip
                        content={{
                          title: 'Return Validation Status',
                          whatItMeans: `${latestResult.output.returnValidationStatus}: Overall gate decision for dock intake.`,
                          howItIsCalculated: 'Pass = All validation criteria met; Fail = Critical integrity or barcode mismatch.',
                        }}
                      />
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                        latestResult.output.returnValidationStatus === 'Pass'
                          ? 'bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]'
                          : latestResult.output.returnValidationStatus === 'Fail'
                          ? 'bg-[#FCE8E6] text-[#C5221F] border border-[#FAD2CF]'
                          : 'bg-[#FEF7E0] text-[#B06000] border border-[#FEEFC3]'
                      }`}
                    >
                      {latestResult.output.returnValidationStatus}
                    </span>
                  </div>
                </div>

                {/* Sub-Checks Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2 rounded-lg bg-[#F8F9FA] border border-[#DADCE0]">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-[#5F6368] uppercase font-bold">Serial Verification</span>
                      <ExplainTooltip content={EXPLAIN_REGISTRY.serialValidation} />
                    </div>
                    <span
                      className={`font-bold inline-block mt-0.5 ${
                        latestResult.output.serialValidation === 'Match'
                          ? 'text-[#188038]'
                          : 'text-[#D93025]'
                      }`}
                    >
                      {latestResult.output.serialValidation}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-[#F8F9FA] border border-[#DADCE0]">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-[#5F6368] uppercase font-bold">Repair Quality Check</span>
                      <ExplainTooltip
                        content={{
                          title: 'Repair Quality Check',
                          whatItMeans: `${latestResult.output.repairValidation}: Confirms that returned tray passed mandatory OEM burn-in tests.`,
                          howItIsCalculated: 'Verified against signed test manifests from certified repair depots.',
                        }}
                      />
                    </div>
                    <span
                      className={`font-bold inline-block mt-0.5 ${
                        latestResult.output.repairValidation === 'Verified'
                          ? 'text-[#188038]'
                          : 'text-[#B06000]'
                      }`}
                    >
                      {latestResult.output.repairValidation}
                    </span>
                  </div>
                </div>

                {/* Recommended Action */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-[10px] font-bold text-[#5F6368] uppercase tracking-wider">
                      Recommended Logistics & Financial Action
                    </h4>
                    <ExplainTooltip
                      content={{
                        title: 'Recommended Action',
                        whatItMeans: 'Operational instruction for warehouse technicians and ERP billing reconciliation.',
                        howItIsCalculated: 'Generated based on eligibility status and warranty coverage validation.',
                      }}
                    />
                  </div>
                  <p className="text-xs text-[#202124] bg-[#F8F9FA] p-2.5 rounded-lg border border-[#DADCE0] leading-relaxed font-sans">
                    {latestResult.output.recommendedAction}
                  </p>
                </div>

                {/* Confidence Gauge */}
                <div className="p-2.5 bg-[#F8F9FA] rounded-lg border border-[#DADCE0]">
                  <ConfidenceGauge
                    score={latestResult.output.confidenceScore}
                    threshold={threshold}
                  />
                </div>

                {/* Approval Notice */}
                {latestResult.output.humanApprovalRequired ? (
                  <div className="p-2.5 bg-[#FEF7E0] border border-[#FEEFC3] rounded-lg flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2 text-[#B06000] font-medium">
                      <ShieldAlert className="w-4 h-4 text-[#E37400] shrink-0" />
                      <span className="text-[11px]">Score &lt; {threshold}%. Strict spare pool rule requires sign-off.</span>
                    </div>
                    <button
                      onClick={() => onSelectRecordForReview(latestResult.record)}
                      className="px-2.5 py-1 bg-[#1A73E8] hover:bg-[#1557B0] text-white rounded text-[10px] font-bold uppercase shrink-0 shadow-xs cursor-pointer"
                    >
                      Review Now
                    </button>
                  </div>
                ) : (
                  <div className="p-2.5 bg-[#E6F4EA] border border-[#CEEAD6] rounded-lg flex items-center gap-2 text-xs text-[#137333] font-mono">
                    <ShieldCheck className="w-4 h-4 text-[#188038] shrink-0" />
                    <span className="text-[11px]">Confidence ≥ {threshold}%. Reintegration auto-approved for depot induction.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-[#5F6368] space-y-2">
                <FileText className="w-8 h-8 mx-auto text-[#80868B]" />
                <p className="text-xs font-mono">No active execution. Select a preset or input return details on the left.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analytics & Token Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Agent4SparePoolChart records={records} />
        <AgentTokenAnalytics agentId="agent-4" agentName="Agent 4 (Spare Reintegration)" records={records} />
      </div>

      {/* Agent 4 Audit History Table */}
      <div className="bg-white border border-[#DADCE0] rounded-lg overflow-hidden shadow-xs">
        <div className="p-3 border-b border-[#E8EAED] bg-[#F8F9FA] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#202124]">Agent 4 Execution History</h3>
            <span className="text-[10px] font-mono text-[#5F6368]">({agentRecords.length} records)</span>
          </div>
          <button
            onClick={() => setIsAddDataOpen(true)}
            className="px-2.5 py-1 bg-white hover:bg-[#F1F3F4] text-[#1A73E8] border border-[#DADCE0] rounded text-xs font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Data</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#202124]">
            <thead className="bg-[#F8F9FA] text-[10px] font-bold uppercase text-[#5F6368] tracking-wider border-b border-[#DADCE0]">
              <tr>
                <th className="py-2.5 px-3">Time</th>
                <th className="py-2.5 px-3">Tray ID</th>
                <th className="py-2.5 px-3">RMA ID</th>
                <th className="py-2.5 px-3">Serial Match</th>
                <th className="py-2.5 px-3">Spare Pool Status</th>
                <th className="py-2.5 px-3">Confidence</th>
                <th className="py-2.5 px-3">Approval Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EAED]">
              {agentRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-[#5F6368] font-sans">
                    No runs recorded for Agent 4 yet. Click &quot;Execute&quot; or &quot;Add Data&quot; to begin.
                  </td>
                </tr>
              ) : (
                agentRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-[#F8F9FA] transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[#5F6368]">
                      {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-[#202124]">{r.trayId}</td>
                    <td className="py-2.5 px-3 font-mono text-[#5F6368]">{r.input.rmaId}</td>
                    <td className="py-2.5 px-3 font-mono">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold font-mono ${
                          r.output.serialValidation === 'Match'
                            ? 'text-[#188038] bg-[#E6F4EA] border border-[#CEEAD6]'
                            : 'text-[#D93025] bg-[#FCE8E6] border border-[#FAD2CF]'
                        }`}
                      >
                        {r.output.serialValidation}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-[#202124]">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold font-mono uppercase ${
                          (r.overriddenOutput?.sparePoolEligibility || r.output.sparePoolEligibility) === 'Eligible'
                            ? 'bg-[#E6F4EA] text-[#188038] border border-[#CEEAD6]'
                            : (r.overriddenOutput?.sparePoolEligibility || r.output.sparePoolEligibility) === 'Quarantine'
                            ? 'bg-[#FEF7E0] text-[#B06000] border border-[#FEEFC3]'
                            : 'bg-[#FCE8E6] text-[#D93025] border border-[#FAD2CF]'
                        }`}
                      >
                        {r.overriddenOutput?.sparePoolEligibility || r.output.sparePoolEligibility}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold">
                      <span className={r.confidenceScore >= 95 ? 'text-[#188038]' : 'text-[#B06000]'}>
                        {r.confidenceScore}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold font-mono uppercase tracking-wider ${
                          r.approvalStatus === 'auto_approved'
                            ? 'bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]'
                            : r.approvalStatus === 'pending_human_review'
                            ? 'bg-[#FEF7E0] text-[#B06000] border border-[#FEEFC3]'
                            : 'bg-[#E8F0FE] text-[#1A73E8] border border-[#D2E3FC]'
                        }`}
                      >
                        {r.approvalStatus.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => onSelectRecordForReview(r)}
                        className="px-2.5 py-1 text-[11px] font-mono text-[#202124] hover:bg-[#F1F3F4] bg-white rounded border border-[#DADCE0] shadow-xs transition-colors cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Data Modal */}
      <AddDataModal
        isOpen={isAddDataOpen}
        onClose={() => setIsAddDataOpen(false)}
        agentId="agent-4"
        onRecordAdded={async () => {
          if (onRefresh) await onRefresh();
        }}
        onRunAgent4={onRunAgent}
      />
    </div>
  );
};
