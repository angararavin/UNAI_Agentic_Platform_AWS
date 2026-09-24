import React, { useState } from 'react';
import { Agent1Input, Agent1Output, AgentExecutionRecord, ControlTowerAnalytics } from '../types';
import { AGENT1_PRESETS } from '../presets';
import { ConfidenceGauge } from './ConfidenceGauge';
import { AgentTokenAnalytics } from './AgentTokenAnalytics';
import { Agent1DispositionChart } from './AgentDomainCharts';
import { AddDataModal } from './AddDataModal';
import { ExplainTooltip, EXPLAIN_REGISTRY } from './ExplainTooltip';
import {
  Wrench,
  Play,
  FileText,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  Plus,
} from 'lucide-react';

interface Agent1ViewProps {
  analytics: ControlTowerAnalytics | null;
  records: AgentExecutionRecord[];
  onRunAgent: (input: Agent1Input) => Promise<{ record: AgentExecutionRecord; output: Agent1Output }>;
  onSelectRecordForReview: (record: AgentExecutionRecord) => void;
  onRefresh?: () => Promise<void>;
  threshold?: number;
  onUpdateThreshold?: (agentId: string, newThreshold: number) => Promise<void>;
}

export const Agent1View: React.FC<Agent1ViewProps> = ({
  analytics,
  records,
  onRunAgent,
  onSelectRecordForReview,
  onRefresh,
  threshold = 85,
}) => {
  const agentRecords = records.filter((r) => r.agentId === 'agent-1');
  const metrics = analytics?.agent1Metrics;
  const [isAddDataOpen, setIsAddDataOpen] = useState(false);

  const [form, setForm] = useState<Agent1Input>({
    trayId: 'TRAY-2026-HBM-4081',
    mpn: 'MPN-8820-GPU-H100-SXM5',
    failureCode: 'ERR_HBM_PARITY_CH_B',
    failureDescription: 'Single-lane memory bus parity check failure detected under sustained GEMM workload.',
    dchaLogs: 'DCHA v4.2.1 [PASS: Core Voltage, FAIL: HBM Channel B Lane 4]. Micro-ball solder fatigue. Reflow profile: REC-094 approved.',
  });

  const [running, setRunning] = useState(false);
  const [latestResult, setLatestResult] = useState<{
    record: AgentExecutionRecord;
    output: Agent1Output;
  } | null>(null);

  const loadPreset = (index: number) => {
    const preset = AGENT1_PRESETS[index];
    if (preset) {
      setForm(preset.data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRunning(true);
    try {
      const res = await onRunAgent({ ...form, threshold });
      setLatestResult(res);
    } catch (err: any) {
      alert(`Agent 1 execution failed: ${err.message}`);
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
            <div className="p-1.5 rounded-md bg-[#E8F0FE] text-[#1A73E8] border border-[#D2E3FC]">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[#202124] uppercase tracking-wider font-mono">
                  Agent 1 — Failure-Based Disposition Agent
                </h2>
                <ExplainTooltip content={EXPLAIN_REGISTRY.agent1Disposition} />
              </div>
              <div className="mt-1.5 px-3 py-1.5 rounded-md bg-[#E8F0FE] border border-[#D2E3FC] shadow-2xs">
                <p className="text-xs text-[#174EA6] font-medium leading-relaxed">
                  Autonomous classification engine: evaluates hardware failure evidence and DCHA telemetry to determine whether trays are Repaired, Replaced, or routed for Further Diagnosis.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="agent-1-corner-add-data-btn"
            onClick={() => setIsAddDataOpen(true)}
            className="px-3 py-2 bg-[#1A73E8] hover:bg-[#1557B0] text-white rounded-md font-mono text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
            title="Add RMA Data for Agent 1"
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
                      whatItMeans: `Autonomous safety boundary for Agent 1. Predictions with confidence at or above ${threshold}% execute automatically.`,
                      howItIsCalculated: `Threshold: ${threshold}% (configured via AGENT_1_THRESHOLD in .env). If confidence < ${threshold}%, asset is routed to human review.`,
                      benchmarkOrAction: 'Adjust AGENT_1_THRESHOLD in your .env file to update fleet safety policy.',
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

      {/* Agent 1 Analytics Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white p-3 rounded-lg border border-[#DADCE0] shadow-xs">
          <div className="text-[10px] font-bold uppercase text-[#5F6368] tracking-wider flex items-center justify-between">
            <span>Total Processed</span>
            <ExplainTooltip
              content={{
                title: 'Total Processed',
                whatItMeans: 'Cumulative volume of RMA trays analyzed by Agent 1.',
                howItIsCalculated: 'Count of unique telemetry events parsed.',
              }}
            />
          </div>
          <div className="text-xl font-mono font-bold text-[#202124] mt-0.5">{metrics?.total ?? 0}</div>
          <div className="text-[9px] font-mono text-[#5F6368] mt-0.5">Dispositions evaluated</div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-[#DADCE0] shadow-xs">
          <div className="text-[10px] font-bold uppercase text-[#5F6368] tracking-wider flex items-center justify-between">
            <span>Repaired Units</span>
            <ExplainTooltip
              content={{
                title: 'Repaired Units',
                whatItMeans: 'Trays with localized repairable component faults (e.g. solder reflow, resistor swaps).',
                howItIsCalculated: 'Disposition = Repaired.',
              }}
            />
          </div>
          <div className="text-xl font-mono font-bold text-[#188038] mt-0.5">{metrics?.repairedCount ?? 0}</div>
          <div className="text-[9px] font-mono text-[#5F6368] mt-0.5">Rework candidates</div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-[#DADCE0] shadow-xs">
          <div className="text-[10px] font-bold uppercase text-[#5F6368] tracking-wider flex items-center justify-between">
            <span>Replaced Units</span>
            <ExplainTooltip
              content={{
                title: 'Replaced Units',
                whatItMeans: 'Trays suffering catastrophic silicon or PCB destruction beyond cost-effective repair.',
                howItIsCalculated: 'Disposition = Replaced.',
              }}
            />
          </div>
          <div className="text-xl font-mono font-bold text-[#D93025] mt-0.5">{metrics?.replacedCount ?? 0}</div>
          <div className="text-[9px] font-mono text-[#5F6368] mt-0.5">Fatal hardware scrap</div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-[#DADCE0] shadow-xs">
          <div className="text-[10px] font-bold uppercase text-[#5F6368] tracking-wider flex items-center justify-between">
            <span>Further Diagnosed</span>
            <ExplainTooltip
              content={{
                title: 'Further Diagnosed',
                whatItMeans: 'Telemetry ambiguity requiring physical lab probing or thermal stress chamber testing.',
                howItIsCalculated: 'Disposition = Further Diagnosed.',
              }}
            />
          </div>
          <div className="text-xl font-mono font-bold text-[#B06000] mt-0.5">{metrics?.furtherDiagnosedCount ?? 0}</div>
          <div className="text-[9px] font-mono text-[#5F6368] mt-0.5">Inconclusive telemetry</div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-[#DADCE0] col-span-2 md:col-span-1 shadow-xs">
          <div className="text-[10px] font-bold uppercase text-[#5F6368] tracking-wider flex items-center justify-between">
            <span>Pending Review</span>
            <ExplainTooltip content={EXPLAIN_REGISTRY.pendingReview} />
          </div>
          <div className="text-xl font-mono font-bold text-[#B06000] mt-0.5">{metrics?.pendingReview ?? 0}</div>
          <div className="text-[9px] font-mono text-[#5F6368] mt-0.5">Below {threshold}% confidence</div>
        </div>
      </div>

      {/* Main Grid: Real Runner Form + Output Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left Form: Real Agent Inputs */}
        <div className="lg:col-span-7 bg-white border border-[#DADCE0] rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#E8EAED]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#1A73E8]" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#202124]">Execute Agent 1 on Hardware Telemetry</h3>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="mb-3">
            <label className="block text-[10px] font-bold text-[#5F6368] uppercase tracking-wider mb-1.5">
              Load Hardware Failure Presets:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {AGENT1_PRESETS.map((p, idx) => (
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
                  placeholder="e.g. TRAY-2026-HBM-4081"
                  className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-[#DADCE0] rounded text-[#202124] focus:border-[#1A73E8] focus:outline-none placeholder-[#80868B] shadow-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5F6368] mb-1">MPN (Part Number)</label>
                <input
                  type="text"
                  required
                  value={form.mpn}
                  onChange={(e) => setForm({ ...form, mpn: e.target.value })}
                  placeholder="e.g. MPN-8820-GPU-H100-SXM5"
                  className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-[#DADCE0] rounded text-[#202124] focus:border-[#1A73E8] focus:outline-none placeholder-[#80868B] shadow-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5F6368] mb-1">Failure Code</label>
              <input
                type="text"
                required
                value={form.failureCode}
                onChange={(e) => setForm({ ...form, failureCode: e.target.value })}
                placeholder="e.g. ERR_HBM_PARITY_CH_B"
                className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-[#DADCE0] rounded text-[#202124] focus:border-[#1A73E8] focus:outline-none placeholder-[#80868B] shadow-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5F6368] mb-1">Failure Description</label>
              <textarea
                rows={2}
                required
                value={form.failureDescription}
                onChange={(e) => setForm({ ...form, failureDescription: e.target.value })}
                placeholder="Describe detected failure symptoms..."
                className="w-full text-xs px-2.5 py-1.5 bg-white border border-[#DADCE0] rounded text-[#202124] focus:border-[#1A73E8] focus:outline-none placeholder-[#80868B] font-mono shadow-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5F6368] mb-1">DCHA Diagnostic Logs</label>
              <textarea
                rows={3}
                required
                value={form.dchaLogs}
                onChange={(e) => setForm({ ...form, dchaLogs: e.target.value })}
                placeholder="Paste DCHA test telemetry, register dumps, micro-CT or vector logs..."
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

        {/* Right Output: Real Agent 1 Output Display */}
        <div className="lg:col-span-5 bg-white border border-[#DADCE0] rounded-lg p-4 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#E8EAED]">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#202124]">Agent 1 Decision Output</h3>
              {latestResult && (
                <span className="text-[10px] font-mono text-[#5F6368]">
                  {latestResult.record.engineUsed} ({latestResult.record.latencyMs}ms)
                </span>
              )}
            </div>

            {latestResult ? (
              <div className="space-y-3">
                {/* Disposition Badge */}
                <div className="p-3 rounded-lg border border-[#DADCE0] bg-[#F8F9FA] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-[#5F6368] uppercase tracking-wider block">
                      Recommended Disposition
                    </span>
                    <span
                      className={`text-base font-mono font-bold mt-0.5 inline-block ${
                        latestResult.output.recommendedDisposition === 'Repaired'
                          ? 'text-[#188038]'
                          : latestResult.output.recommendedDisposition === 'Replaced'
                          ? 'text-[#D93025]'
                          : 'text-[#B06000]'
                      }`}
                    >
                      {latestResult.output.recommendedDisposition}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold text-[#5F6368] uppercase tracking-wider block">Risk Level</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                        latestResult.output.risk === 'Low'
                          ? 'bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]'
                          : latestResult.output.risk === 'High'
                          ? 'bg-[#FCE8E6] text-[#C5221F] border border-[#FAD2CF]'
                          : 'bg-[#FEF7E0] text-[#B06000] border border-[#FEEFC3]'
                      }`}
                    >
                      {latestResult.output.risk}
                    </span>
                  </div>
                </div>

                {/* Technical Rationale */}
                <div className="p-3 rounded-lg border border-[#DADCE0] bg-[#F8F9FA] space-y-1">
                  <span className="text-[10px] font-bold text-[#5F6368] uppercase tracking-wider block">
                    Telemetry Rationale & Failure Mode
                  </span>
                  <div className="font-mono text-xs font-bold text-[#202124]">
                    {latestResult.output.identifiedFailureMode ||
                      (latestResult.output.recommendedDisposition === 'Replaced'
                        ? 'Catastrophic Silicon Die Delamination & Substrate Shear Fracture'
                        : latestResult.output.recommendedDisposition === 'Further Diagnosed'
                        ? 'Intermittent PCIe Gen5 Retimer Signaling & Jitter Margin Collapse'
                        : 'HBM3 Parity Check Bus Joint Fatigue / Voltage Regulator Ripple')}
                  </div>
                  <p className="text-xs text-[#5F6368] mt-1 leading-relaxed">
                    {latestResult.output.reasoning}
                  </p>
                </div>

                {/* Routing & Repair Steps */}
                <div className="p-3 rounded-lg border border-[#DADCE0] bg-[#F8F9FA] text-xs font-mono space-y-1">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-[#5F6368] shrink-0">Dispatch Route:</span>
                    <strong className="text-[#202124] text-right font-medium">
                      {latestResult.output.suggestedRouting ||
                        latestResult.output.dispatchRoute ||
                        (latestResult.output.recommendedDisposition === 'Replaced'
                          ? 'Fremont Central Scrap & Silicon Reclamation Hub (Bay 4)'
                          : latestResult.output.recommendedDisposition === 'Further Diagnosed'
                          ? 'Mountain View L3 Advanced Diagnostic Lab (Signal Integrity Bench #2)'
                          : 'San Jose Tier-1 Contract Manufacturer Facility (Line B-2 Rework)')}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5F6368]">Est. Rework Cost:</span>
                    <strong className="text-[#202124]">
                      ${latestResult.output.estimatedCostUsd ??
                        (latestResult.output.recommendedDisposition === 'Replaced' ? 1450 : latestResult.output.recommendedDisposition === 'Further Diagnosed' ? 380 : 185)} USD
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5F6368]">Est. Repair TAT:</span>
                    <strong className="text-[#202124]">
                      {latestResult.output.estimatedTatDays ??
                        (latestResult.output.recommendedDisposition === 'Replaced' ? 1 : latestResult.output.recommendedDisposition === 'Further Diagnosed' ? 7 : 3)} Days
                    </strong>
                  </div>
                </div>

                {/* Confidence & Auto Approval Check */}
                <div className="p-3 rounded-lg border border-[#DADCE0] bg-[#F8F9FA]">
                  <ConfidenceGauge
                    score={latestResult.output.confidenceScore}
                    threshold={threshold}
                  />
                </div>

                {/* Status Callout Banner */}
                {latestResult.output.humanApprovalRequired ? (
                  <div className="p-3 bg-[#FEF7E0] border border-[#FEEFC3] rounded-lg flex items-center justify-between text-xs text-[#B06000] font-mono">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-[#E37400] shrink-0 animate-pulse" />
                      <span className="text-[11px]">Flagged for Human Review (Confidence &lt; {threshold}%)</span>
                    </div>
                    <button
                      onClick={() => onSelectRecordForReview(latestResult.record)}
                      className="px-2.5 py-1 bg-[#1A73E8] hover:bg-[#1557B0] text-white rounded text-[10px] font-bold flex items-center gap-1 transition-colors shadow-xs cursor-pointer"
                    >
                      Review Now
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="p-2.5 bg-[#E6F4EA] border border-[#CEEAD6] rounded-lg flex items-center gap-2 text-xs text-[#137333] font-mono">
                    <ShieldCheck className="w-4 h-4 text-[#188038] shrink-0" />
                    <span className="text-[11px]">Confidence ≥ {threshold}%. Auto Approved. Ready for execution.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-[#5F6368] space-y-2">
                <FileText className="w-8 h-8 mx-auto text-[#80868B]" />
                <p className="text-xs font-mono">No active execution. Select a preset or input tray evidence on the left.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analytics & Token Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Agent1DispositionChart records={records} />
        <AgentTokenAnalytics agentId="agent-1" agentName="Agent 1 (Failure Disposition)" records={records} />
      </div>

      {/* Agent 1 Audit History Table */}
      <div className="bg-white border border-[#DADCE0] rounded-lg overflow-hidden shadow-xs">
        <div className="p-3 border-b border-[#E8EAED] bg-[#F8F9FA] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#202124]">Agent 1 Execution History</h3>
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
                <th className="py-2.5 px-3">Failure Code</th>
                <th className="py-2.5 px-3">Recommended Disposition</th>
                <th className="py-2.5 px-3">Confidence</th>
                <th className="py-2.5 px-3">Approval Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EAED]">
              {agentRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-[#5F6368] font-sans">
                    No runs recorded for Agent 1 yet. Click &quot;Execute&quot; or &quot;Add Data&quot; to begin.
                  </td>
                </tr>
              ) : (
                agentRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-[#F8F9FA] transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[#5F6368]">
                      {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-[#202124]">{r.trayId}</td>
                    <td className="py-2.5 px-3 font-mono text-[#5F6368]">{r.input.failureCode}</td>
                    <td className="py-2.5 px-3 font-semibold text-[#202124]">
                      {r.overriddenOutput?.recommendedDisposition || r.output.recommendedDisposition}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold">
                      <span className={r.confidenceScore >= 85 ? 'text-[#188038]' : 'text-[#B06000]'}>
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
        agentId="agent-1"
        onRecordAdded={async () => {
          if (onRefresh) await onRefresh();
        }}
        onRunAgent1={onRunAgent}
      />
    </div>
  );
};
