import React, { useState } from 'react';
import { Agent3Input, Agent3Output, AgentExecutionRecord, ControlTowerAnalytics } from '../types';
import { AGENT3_PRESETS } from '../presets';
import { ConfidenceGauge } from './ConfidenceGauge';
import { AgentTokenAnalytics } from './AgentTokenAnalytics';
import { Agent3UrgencyChart } from './AgentDomainCharts';
import { AddDataModal } from './AddDataModal';
import { ExplainTooltip, EXPLAIN_REGISTRY } from './ExplainTooltip';
import {
  Flame,
  Play,
  FileText,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Calendar,
  Plus,
} from 'lucide-react';

interface Agent3ViewProps {
  analytics: ControlTowerAnalytics | null;
  records: AgentExecutionRecord[];
  onRunAgent: (input: Agent3Input) => Promise<{ record: AgentExecutionRecord; output: Agent3Output }>;
  onSelectRecordForReview: (record: AgentExecutionRecord) => void;
  onRefresh?: () => Promise<void>;
  threshold?: number;
  onUpdateThreshold?: (agentId: string, threshold: number) => Promise<void>;
}

export const Agent3View: React.FC<Agent3ViewProps> = ({
  analytics,
  records,
  onRunAgent,
  onSelectRecordForReview,
  onRefresh,
  threshold = 90,
}) => {
  const agentRecords = records.filter((r) => r.agentId === 'agent-3');
  const metrics = analytics?.agent3Metrics;
  const [isAddDataOpen, setIsAddDataOpen] = useState(false);

  const [form, setForm] = useState<Agent3Input>({
    trayId: 'TRAY-2026-URG-0012',
    failureType: 'Hard Node Isolation Outage',
    failureCode: 'CRIT_SPINE_SWITCH_DOWN',
    dataCenter: 'DC-NORTH-OREGON-POD-4',
    spareInventory: 0,
    businessImpact: 'Affects 16,384 GPU distributed cluster training checkpoint. SLA penalty accumulating at $45,000/hr.',
    carrierStatus: 'Next Flight Out (NFO) available with guaranteed same-day dispatch.',
    cmQueueStatus: 'Expedited hot-line priority line slot 1 reserved.',
  });

  const [running, setRunning] = useState(false);
  const [latestResult, setLatestResult] = useState<{
    record: AgentExecutionRecord;
    output: Agent3Output;
  } | null>(null);

  const loadPreset = (index: number) => {
    const preset = AGENT3_PRESETS[index];
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
        spareInventory: parseInt(String(form.spareInventory), 10) || 0,
        threshold,
      });
      setLatestResult(res);
    } catch (err: any) {
      alert(`Agent 3 execution failed: ${err.message}`);
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
            <div className="p-1.5 rounded-md bg-[#FCE8E6] text-[#D93025] border border-[#FAD2CF]">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold text-[#202124] uppercase tracking-wider font-mono">Agent 3 — Urgency Flagging Agent</h2>
                <ExplainTooltip
                  content={{
                    title: 'Agent 3: Urgency Flagging',
                    whatItMeans: 'Evaluates DC spare counts, critical cluster downtime, and carrier options to assign RMA priority (P1-P4).',
                    howItIsCalculated: 'Scored on multi-factor matrix: spare inventory, SLA financial penalty, and carrier transit feasibility.',
                    benchmarkOrAction: 'P1 triggers Next Flight Out (NFO) expedite; P2 dispatches priority air freight.',
                  }}
                />
              </div>
              <div className="mt-1.5 px-3 py-1.5 rounded-md bg-[#FCE8E6] border border-[#FAD2CF] shadow-2xs">
                <p className="text-xs text-[#C5221F] font-medium leading-relaxed">
                  Supply chain triage & SLA defense: calculates hardware urgency tiers (P1-P4) and enforces Required Delivery Dates (RDD) based on datacenter spare buffer depletion.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="agent-3-corner-add-data-btn"
            onClick={() => setIsAddDataOpen(true)}
            className="px-3 py-2 bg-[#1A73E8] hover:bg-[#1557B0] text-white rounded-md font-mono text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
            title="Add RMA Data for Agent 3"
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
                      whatItMeans: `Autonomous decision threshold for Agent 3. Confidence ≥ ${threshold}% auto-executes; lower scores require human triage.`,
                      howItIsCalculated: `Threshold: ${threshold}% (configured via AGENT_3_THRESHOLD in .env).`,
                      benchmarkOrAction: 'Adjust AGENT_3_THRESHOLD in your .env file to update fleet safety policy.',
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

      {/* Agent 3 Analytics Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white p-3 rounded-lg border border-[#DADCE0] shadow-xs">
          <div className="text-[10px] font-bold uppercase text-[#5F6368] tracking-wider flex items-center justify-between">
            <span>Total Prioritized</span>
            <ExplainTooltip
              content={{
                title: 'Total Prioritized',
                whatItMeans: 'Total RMA trays evaluated by Agent 3 for triage and logistics scheduling.',
                howItIsCalculated: 'Total audit runs in Agent 3 telemetry store.',
              }}
            />
          </div>
          <div className="text-xl font-mono font-bold text-[#202124] mt-0.5">{metrics?.total ?? 0}</div>
          <div className="text-[9px] font-mono text-[#5F6368] mt-0.5">Urgency evaluations</div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-[#DADCE0] shadow-xs">
          <div className="text-[10px] font-bold uppercase text-[#5F6368] tracking-wider flex items-center justify-between">
            <span>P1 Critical (NFO)</span>
            <ExplainTooltip content={EXPLAIN_REGISTRY.p1Critical} />
          </div>
          <div className="text-xl font-mono font-bold text-[#D93025] mt-0.5">{metrics?.p1Count ?? 0}</div>
          <div className="text-[9px] font-mono text-[#5F6368] mt-0.5">Zero spare emergencies</div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-[#DADCE0] shadow-xs">
          <div className="text-[10px] font-bold uppercase text-[#5F6368] tracking-wider flex items-center justify-between">
            <span>P2 Priority Air</span>
            <ExplainTooltip
              content={{
                title: 'P2 Priority Air',
                whatItMeans: 'High SLA sensitivity with low or single-spare buffer remaining at the data center.',
                howItIsCalculated: 'Spare count = 1, or cluster impact is tier 2.',
                benchmarkOrAction: 'Expedited air freight with target delivery in 24 hours.',
              }}
            />
          </div>
          <div className="text-xl font-mono font-bold text-[#B06000] mt-0.5">{metrics?.p2Count ?? 0}</div>
          <div className="text-[9px] font-mono text-[#5F6368] mt-0.5">High SLA sensitivity</div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-[#DADCE0] shadow-xs">
          <div className="text-[10px] font-bold uppercase text-[#5F6368] tracking-wider flex items-center justify-between">
            <span>P3 / P4 Standard</span>
            <ExplainTooltip
              content={{
                title: 'P3 / P4 Standard',
                whatItMeans: 'Routine or preventive hardware repairs with adequate spare stock.',
                howItIsCalculated: 'DC spares ≥ 2 and standard SLA timeline intact.',
                benchmarkOrAction: 'Routed via ground or standard freight.',
              }}
            />
          </div>
          <div className="text-xl font-mono font-bold text-[#1A73E8] mt-0.5">
            {(metrics?.p3Count ?? 0) + (metrics?.p4Count ?? 0)}
          </div>
          <div className="text-[9px] font-mono text-[#5F6368] mt-0.5">Standard logistics</div>
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
              <Sparkles className="w-3.5 h-3.5 text-[#D93025]" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#202124]">Execute Agent 3 with Urgency Context</h3>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="mb-3">
            <label className="block text-[10px] font-bold text-[#5F6368] uppercase tracking-wider mb-1.5">
              Load Infrastructure & Logistics Preset:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {AGENT3_PRESETS.map((p, idx) => (
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
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
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5F6368] mb-1">Data Center POD</label>
                <input
                  type="text"
                  required
                  value={form.dataCenter}
                  onChange={(e) => setForm({ ...form, dataCenter: e.target.value })}
                  placeholder="e.g. DC-NORTH-OREGON-POD-4"
                  className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-[#DADCE0] rounded text-[#202124] focus:border-[#1A73E8] focus:outline-none placeholder-[#80868B] shadow-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5F6368] mb-1">Local Spare Inventory</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={form.spareInventory}
                  onChange={(e) => setForm({ ...form, spareInventory: parseInt(e.target.value, 10) || 0 })}
                  className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-[#DADCE0] rounded text-[#202124] focus:border-[#1A73E8] focus:outline-none shadow-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5F6368] mb-1">Failure Type</label>
                <input
                  type="text"
                  required
                  value={form.failureType}
                  onChange={(e) => setForm({ ...form, failureType: e.target.value })}
                  className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-[#DADCE0] rounded text-[#202124] focus:border-[#1A73E8] focus:outline-none shadow-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5F6368] mb-1">Failure Code</label>
                <input
                  type="text"
                  required
                  value={form.failureCode}
                  onChange={(e) => setForm({ ...form, failureCode: e.target.value })}
                  className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-[#DADCE0] rounded text-[#202124] focus:border-[#1A73E8] focus:outline-none shadow-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5F6368] mb-1">Business & Customer SLA Impact</label>
              <textarea
                rows={2}
                required
                value={form.businessImpact}
                onChange={(e) => setForm({ ...form, businessImpact: e.target.value })}
                placeholder="Workload sensitivity, revenue at risk, affected training cluster..."
                className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-[#DADCE0] rounded text-[#202124] focus:border-[#1A73E8] focus:outline-none placeholder-[#80868B] shadow-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5F6368] mb-1">Carrier Status</label>
                <input
                  type="text"
                  required
                  value={form.carrierStatus}
                  onChange={(e) => setForm({ ...form, carrierStatus: e.target.value })}
                  placeholder="e.g. NFO available or Weather delay"
                  className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-[#DADCE0] rounded text-[#202124] focus:border-[#1A73E8] focus:outline-none placeholder-[#80868B] shadow-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5F6368] mb-1">CM Queue Status</label>
                <input
                  type="text"
                  required
                  value={form.cmQueueStatus}
                  onChange={(e) => setForm({ ...form, cmQueueStatus: e.target.value })}
                  placeholder="e.g. Expedited hot-line reserved"
                  className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-[#DADCE0] rounded text-[#202124] focus:border-[#1A73E8] focus:outline-none placeholder-[#80868B] shadow-xs"
                />
              </div>
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

        {/* Right Output: Real Agent 3 Output Display */}
        <div className="lg:col-span-5 bg-white border border-[#DADCE0] rounded-lg p-4 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#E8EAED]">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#202124]">Agent 3 Priority & RDD Output</h3>
              {latestResult && (
                <span className="text-[10px] font-mono text-[#5F6368]">
                  {latestResult.record.engineUsed} ({latestResult.record.latencyMs}ms)
                </span>
              )}
            </div>

            {latestResult ? (
              <div className="space-y-3">
                {/* Priority & Urgency Banner */}
                <div className="p-3 rounded-lg border border-[#DADCE0] bg-[#F8F9FA] flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-[#5F6368] uppercase tracking-wider block">
                        Priority Level & Urgency
                      </span>
                      <ExplainTooltip
                        content={{
                          title: 'Priority Level & Urgency',
                          whatItMeans: `${latestResult.output.priority}: ${latestResult.output.urgencyLevel}. Determines fulfillment speed and transportation mode.`,
                          howItIsCalculated: 'Derived from spare inventory, SLA impact rate ($/hr), and carrier expedited feasibility.',
                          benchmarkOrAction: latestResult.output.priority === 'P1'
                            ? 'Immediate emergency NFO flight dispatch required.'
                            : 'Standard or priority air logistics schedule.',
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={`text-lg font-mono font-extrabold px-2 py-0.5 rounded text-white ${
                          latestResult.output.priority === 'P1'
                            ? 'bg-[#D93025]'
                            : latestResult.output.priority === 'P2'
                            ? 'bg-[#F9AB00] text-[#202124]'
                            : latestResult.output.priority === 'P3'
                            ? 'bg-[#1A73E8]'
                            : 'bg-[#5F6368]'
                        }`}
                      >
                        {latestResult.output.priority}
                      </span>
                      <span className="text-sm font-mono font-bold text-[#202124]">
                        {latestResult.output.urgencyLevel}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-[10px] font-bold text-[#5F6368] uppercase tracking-wider block">
                        Risk Level
                      </span>
                      <ExplainTooltip
                        content={{
                          title: 'Risk Level',
                          whatItMeans: `${latestResult.output.risk} Risk: Operational vulnerability to DC outage or SLA penalties if replacement is delayed.`,
                          howItIsCalculated: 'Combines remaining spares, single-point-of-failure risk, and financial burn rate.',
                        }}
                      />
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                        latestResult.output.risk === 'High'
                          ? 'bg-[#FCE8E6] text-[#C5221F] border border-[#FAD2CF]'
                          : latestResult.output.risk === 'Medium'
                          ? 'bg-[#FEF7E0] text-[#B06000] border border-[#FEEFC3]'
                          : 'bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]'
                      }`}
                    >
                      {latestResult.output.risk}
                    </span>
                  </div>
                </div>

                {/* Recommended RDD */}
                <div className="p-2.5 bg-[#FCE8E6] rounded-lg border border-[#FAD2CF] flex items-center justify-between font-mono">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-md bg-white text-[#D93025] border border-[#FAD2CF]">
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-[#D93025] uppercase tracking-wider block">
                        Recommended Required Delivery Date (RDD)
                      </span>
                      <span className="font-bold text-xs text-[#202124]">
                        {latestResult.output.recommendedRdd}
                      </span>
                    </div>
                  </div>
                  <ExplainTooltip content={EXPLAIN_REGISTRY.rdd} />
                </div>

                {/* Reasoning */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-[10px] font-bold text-[#5F6368] uppercase tracking-wider">
                      Multi-Factor Urgency Reasoning
                    </h4>
                    <ExplainTooltip
                      content={{
                        title: 'Urgency Reasoning',
                        whatItMeans: 'AI-grounded synthesis of logistics, spare levels, and financial risk explaining why this urgency tier was selected.',
                        howItIsCalculated: 'Generated by AI Engine / Rule Engine based on data center parameters.',
                      }}
                    />
                  </div>
                  <p className="text-xs text-[#202124] bg-[#F8F9FA] p-2.5 rounded-lg border border-[#DADCE0] leading-relaxed font-sans">
                    {latestResult.output.reasoning}
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
                      <span className="text-[11px]">Score &lt; {threshold}%. Requires human review.</span>
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
                    <span className="text-[11px]">Confidence ≥ {threshold}%. Priority level & RDD auto-approved.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-[#5F6368] space-y-2">
                <FileText className="w-8 h-8 mx-auto text-[#80868B]" />
                <p className="text-xs font-mono">No active execution. Select a preset or input urgency factors on the left.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analytics & Token Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Agent3UrgencyChart records={records} />
        <AgentTokenAnalytics agentId="agent-3" agentName="Agent 3 (Urgency Flagging)" records={records} />
      </div>

      {/* Agent 3 Audit History Table */}
      <div className="bg-white border border-[#DADCE0] rounded-lg overflow-hidden shadow-xs">
        <div className="p-3 border-b border-[#E8EAED] bg-[#F8F9FA] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#202124]">Agent 3 Execution History</h3>
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
                <th className="py-2.5 px-3">Data Center</th>
                <th className="py-2.5 px-3">Priority / Urgency</th>
                <th className="py-2.5 px-3">Recommended RDD</th>
                <th className="py-2.5 px-3">Confidence</th>
                <th className="py-2.5 px-3">Approval Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EAED]">
              {agentRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-[#5F6368] font-sans">
                    No runs recorded for Agent 3 yet. Click &quot;Execute&quot; or &quot;Add Data&quot; to begin.
                  </td>
                </tr>
              ) : (
                agentRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-[#F8F9FA] transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[#5F6368]">
                      {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-[#202124]">{r.trayId}</td>
                    <td className="py-2.5 px-3 font-mono text-[#5F6368]">{r.input.dataCenter}</td>
                    <td className="py-2.5 px-3 font-bold text-[#202124]">
                      <span className="px-1.5 py-0.5 rounded bg-[#F1F3F4] border border-[#DADCE0] text-[#202124] mr-1.5 font-mono text-[10px]">
                        {r.overriddenOutput?.priority || r.output.priority}
                      </span>
                      <span className="text-[11px] font-mono">{r.overriddenOutput?.urgencyLevel || r.output.urgencyLevel}</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[#5F6368]">
                      {r.output.recommendedRdd}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold">
                      <span className={r.confidenceScore >= 90 ? 'text-[#188038]' : 'text-[#B06000]'}>
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
        agentId="agent-3"
        onRecordAdded={async () => {
          if (onRefresh) await onRefresh();
        }}
        onRunAgent3={onRunAgent}
      />
    </div>
  );
};
