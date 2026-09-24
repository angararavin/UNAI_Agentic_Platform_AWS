import React, { useState } from 'react';
import { Agent2Input, Agent2Output, AgentExecutionRecord, ControlTowerAnalytics } from '../types';
import { AGENT2_PRESETS } from '../presets';
import { ConfidenceGauge } from './ConfidenceGauge';
import { DwellTimeChart } from './DwellTimeChart';
import { AgentTokenAnalytics } from './AgentTokenAnalytics';
import { AddDataModal } from './AddDataModal';
import { ExplainTooltip, EXPLAIN_REGISTRY } from './ExplainTooltip';
import {
  Clock,
  Play,
  FileText,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Plus,
} from 'lucide-react';

interface Agent2ViewProps {
  analytics: ControlTowerAnalytics | null;
  records: AgentExecutionRecord[];
  onRunAgent: (input: Agent2Input) => Promise<{ record: AgentExecutionRecord; output: Agent2Output }>;
  onSelectRecordForReview: (record: AgentExecutionRecord) => void;
  onRefresh?: () => Promise<void>;
  threshold?: number;
  onUpdateThreshold?: (agentId: string, newThreshold: number) => Promise<void>;
}

export const Agent2View: React.FC<Agent2ViewProps> = ({
  analytics,
  records,
  onRunAgent,
  onSelectRecordForReview,
  onRefresh,
  threshold = 80,
}) => {
  const agentRecords = records.filter((r) => r.agentId === 'agent-2');
  const metrics = analytics?.agent2Metrics;
  const [isAddDataOpen, setIsAddDataOpen] = useState(false);

  const [form, setForm] = useState<Agent2Input>({
    trayId: 'TRAY-2026-DWELL-3301',
    currentStage: 'CM_INBOUND_QUEUE',
    hoursInStage: 18.5,
    microSlo: 8.0,
    location: 'San Jose Contract Facility Dock 4',
    eventHistory: '2026-09-01 14:00 - Arrived at receiving dock\n2026-09-01 16:30 - Barcode scanned by inbound operator\n2026-09-02 02:00 - Shift change without intake ticket assignment\n2026-09-02 08:30 - No staging movement recorded for 12+ hours',
  });

  const [running, setRunning] = useState(false);
  const [latestResult, setLatestResult] = useState<{
    record: AgentExecutionRecord;
    output: Agent2Output;
  } | null>(null);

  const loadPreset = (index: number) => {
    const preset = AGENT2_PRESETS[index];
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
        hoursInStage: Number(form.hoursInStage),
        microSlo: Number(form.microSlo),
        threshold,
      });
      setLatestResult(res);
    } catch (err: any) {
      alert(`Agent 2 execution failed: ${err.message}`);
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
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[#202124] uppercase tracking-wider font-mono">
                  Agent 2 — Dwell Time Monitoring & Escalation Agent
                </h2>
                <ExplainTooltip content={EXPLAIN_REGISTRY.agent2Dwell} />
              </div>
              <div className="mt-1.5 px-3 py-1.5 rounded-md bg-[#E8F0FE] border border-[#D2E3FC] shadow-2xs">
                <p className="text-xs text-[#174EA6] font-medium leading-relaxed">
                  Real-time SLA telemetry sentinel: continuously audits tray stage durations against Micro-SLO contracts, predicts bottlenecks, and dispatches automated escalations.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="agent-2-corner-add-data-btn"
            onClick={() => setIsAddDataOpen(true)}
            className="px-3 py-2 bg-[#1A73E8] hover:bg-[#1557B0] text-white rounded-md font-mono text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
            title="Add RMA Data for Agent 2"
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
                      whatItMeans: `Autonomous decision threshold for Agent 2. Confidence ≥ ${threshold}% auto-executes; lower scores require human triage.`,
                      howItIsCalculated: `Threshold: ${threshold}% (configured via AGENT_2_THRESHOLD in .env).`,
                      benchmarkOrAction: 'Adjust AGENT_2_THRESHOLD in your .env file to update fleet safety policy.',
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

      {/* Agent 2 Analytics Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white p-3 rounded-lg border border-[#DADCE0] shadow-xs">
          <div className="text-[10px] font-bold uppercase text-[#5F6368] tracking-wider flex items-center justify-between">
            <span>Total Monitored</span>
            <ExplainTooltip
              content={{
                title: 'Total Monitored',
                whatItMeans: 'Total number of RMA assets currently or historically tracked for stage dwell.',
                howItIsCalculated: 'Sum of all Agent 2 telemetry audit records.',
              }}
            />
          </div>
          <div className="text-xl font-mono font-bold text-[#202124] mt-0.5">{metrics?.total ?? 0}</div>
          <div className="text-[9px] font-mono text-[#5F6368] mt-0.5">Dwell checkpoints</div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-[#DADCE0] shadow-xs">
          <div className="text-[10px] font-bold uppercase text-[#5F6368] tracking-wider flex items-center justify-between">
            <span>Within SLO</span>
            <ExplainTooltip content={EXPLAIN_REGISTRY.withinSlo} />
          </div>
          <div className="text-xl font-mono font-bold text-[#188038] mt-0.5">{metrics?.withinSloCount ?? 0}</div>
          <div className="text-[9px] font-mono text-[#5F6368] mt-0.5">Normal throughput</div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-[#DADCE0] shadow-xs">
          <div className="text-[10px] font-bold uppercase text-[#5F6368] tracking-wider flex items-center justify-between">
            <span>At Risk Stages</span>
            <ExplainTooltip content={EXPLAIN_REGISTRY.atRisk} />
          </div>
          <div className="text-xl font-mono font-bold text-[#B06000] mt-0.5">{metrics?.atRiskCount ?? 0}</div>
          <div className="text-[9px] font-mono text-[#5F6368] mt-0.5">≥80% of Micro-SLO</div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-[#DADCE0] shadow-xs">
          <div className="text-[10px] font-bold uppercase text-[#5F6368] tracking-wider flex items-center justify-between">
            <span>Breached Stages</span>
            <ExplainTooltip content={EXPLAIN_REGISTRY.breached} />
          </div>
          <div className="text-xl font-mono font-bold text-[#D93025] mt-0.5">{metrics?.breachedCount ?? 0}</div>
          <div className="text-[9px] font-mono text-[#5F6368] mt-0.5">Exceeded Micro-SLO</div>
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
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#202124]">Execute Agent 2 on Stage Dwell Telemetry</h3>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="mb-3">
            <label className="block text-[10px] font-bold text-[#5F6368] uppercase tracking-wider mb-1.5">
              Load Stage Dwell Scenario Preset:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {AGENT2_PRESETS.map((p, idx) => (
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
                  placeholder="e.g. TRAY-2026-DWELL-3301"
                  className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-[#DADCE0] rounded text-[#202124] focus:border-[#1A73E8] focus:outline-none placeholder-[#80868B] shadow-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5F6368] mb-1">Current Stage</label>
                <select
                  value={form.currentStage}
                  onChange={(e) => setForm({ ...form, currentStage: e.target.value })}
                  className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-[#DADCE0] rounded text-[#202124] focus:border-[#1A73E8] focus:outline-none shadow-xs"
                >
                  <option value="CM_INBOUND_QUEUE">CM Inbound Queue</option>
                  <option value="THERMAL_CHAMBER_STAGE">Thermal Chamber Stage</option>
                  <option value="DIAGNOSTIC_BENCH">Diagnostic Bench</option>
                  <option value="SPARE_STAGING">Spare Staging</option>
                  <option value="PACKOUT_INSPECTION">Packout Inspection</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5F6368] mb-1">Hours in Stage (Elapsed)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={form.hoursInStage}
                  onChange={(e) => setForm({ ...form, hoursInStage: parseFloat(e.target.value) || 0 })}
                  className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-[#DADCE0] rounded text-[#202124] focus:border-[#1A73E8] focus:outline-none placeholder-[#80868B] shadow-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5F6368] mb-1">Micro-SLO Target (Hours)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={form.microSlo}
                  onChange={(e) => setForm({ ...form, microSlo: parseFloat(e.target.value) || 0 })}
                  className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-[#DADCE0] rounded text-[#202124] focus:border-[#1A73E8] focus:outline-none placeholder-[#80868B] shadow-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5F6368] mb-1">Facility / Dock Location</label>
              <input
                type="text"
                required
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. San Jose Contract Facility Dock 4"
                className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-[#DADCE0] rounded text-[#202124] focus:border-[#1A73E8] focus:outline-none placeholder-[#80868B] shadow-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5F6368] mb-1">Timestamped Event Log History</label>
              <textarea
                rows={3}
                required
                value={form.eventHistory}
                onChange={(e) => setForm({ ...form, eventHistory: e.target.value })}
                placeholder="Paste event timestamps..."
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

        {/* Right Output: Real Agent 2 Output Display */}
        <div className="lg:col-span-5 bg-white border border-[#DADCE0] rounded-lg p-4 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#E8EAED]">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#202124]">Agent 2 Audit Output</h3>
              {latestResult && (
                <span className="text-[10px] font-mono text-[#5F6368]">
                  {latestResult.record.engineUsed} ({latestResult.record.latencyMs}ms)
                </span>
              )}
            </div>

            {latestResult ? (
              <div className="space-y-3">
                {/* Dwell Status Badge & Breach Status */}
                <div className="p-3 rounded-lg border border-[#DADCE0] bg-[#F8F9FA] flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-[#5F6368] uppercase tracking-wider block">
                        Dwell Status
                      </span>
                      <ExplainTooltip
                        content={
                          latestResult.output.dwellStatus === 'Breached'
                            ? EXPLAIN_REGISTRY.breached
                            : latestResult.output.dwellStatus === 'At Risk'
                            ? EXPLAIN_REGISTRY.atRisk
                            : EXPLAIN_REGISTRY.withinSlo
                        }
                      />
                    </div>
                    <span
                      className={`text-base font-mono font-bold mt-0.5 inline-block ${
                        latestResult.output.dwellStatus === 'Within SLO'
                          ? 'text-[#188038]'
                          : latestResult.output.dwellStatus === 'At Risk'
                          ? 'text-[#B06000]'
                          : 'text-[#D93025]'
                      }`}
                    >
                      {latestResult.output.dwellStatus}
                    </span>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-[10px] font-bold text-[#5F6368] uppercase tracking-wider block">SLO Breach?</span>
                      <ExplainTooltip
                        content={{
                          title: 'SLO Breach Status',
                          whatItMeans: latestResult.output.sloBreach
                            ? 'BREACH DETECTED: Stage dwell time exceeded the Micro-SLO target.'
                            : 'COMPLIANT: Stage dwell is within acceptable operational thresholds.',
                          howItIsCalculated: 'Dwell Time > Micro-SLO.',
                          benchmarkOrAction: latestResult.output.sloBreach
                            ? 'Immediate carrier re-dispatch or manager escalation required.'
                            : 'Continue normal workflow monitoring.',
                        }}
                      />
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                        latestResult.output.sloBreach
                          ? 'bg-[#FCE8E6] text-[#C5221F] border border-[#FAD2CF]'
                          : 'bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]'
                      }`}
                    >
                      {latestResult.output.sloBreach ? 'BREACH DETECTED' : 'COMPLIANT'}
                    </span>
                  </div>
                </div>

                {/* AI Analysis Block */}
                <div className="p-3 bg-[#FFFFFF] rounded-lg border border-[#DADCE0] space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E8EAED]">
                    <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-[#202124] uppercase tracking-wide">
                      <Sparkles className="w-3.5 h-3.5 text-[#1A73E8]" />
                      <span>AI Analysis</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#E8F0FE] text-[#1A73E8] font-semibold border border-[#D2E3FC]">
                      SLO Stage Telemetry
                    </span>
                  </div>

                  {/* Dwell Time, Micro-SLO, Variance */}
                  <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                    <div className="p-2 rounded bg-[#F8F9FA] border border-[#E8EAED]">
                      <div className="text-[10px] text-[#5F6368] uppercase font-bold flex items-center justify-between">
                        <span>Dwell Time</span>
                        <ExplainTooltip
                          content={{
                            title: 'Dwell Time',
                            whatItMeans: 'Actual time spent by this tray in the current processing stage.',
                            howItIsCalculated: 'Elapsed hours from stage check-in to current timestamp.',
                          }}
                        />
                      </div>
                      <div className="text-sm font-bold text-[#202124] mt-0.5">
                        {latestResult.output.dwellTime ?? latestResult.output.hoursInStage} Hours
                      </div>
                      <div className="text-[9px] text-[#5F6368] font-sans">Actual in stage</div>
                    </div>

                    <div className="p-2 rounded bg-[#F8F9FA] border border-[#E8EAED]">
                      <div className="text-[10px] text-[#5F6368] uppercase font-bold flex items-center justify-between">
                        <span>Micro-SLO</span>
                        <ExplainTooltip content={EXPLAIN_REGISTRY.microSlo} />
                      </div>
                      <div className="text-sm font-bold text-[#1A73E8] mt-0.5">
                        {latestResult.output.microSlo} Hours
                      </div>
                      <div className="text-[9px] text-[#5F6368] font-sans">Target threshold</div>
                    </div>

                    {(() => {
                      const actual = latestResult.output.dwellTime ?? latestResult.output.hoursInStage;
                      const slo = latestResult.output.microSlo;
                      const variance = latestResult.output.dwellVariance !== undefined 
                        ? latestResult.output.dwellVariance 
                        : Number((actual - slo).toFixed(1));
                      const isOver = variance > 0;
                      return (
                        <div className="p-2 rounded bg-[#F8F9FA] border border-[#E8EAED]">
                          <div className="text-[10px] text-[#5F6368] uppercase font-bold flex items-center justify-between">
                            <span>Variance</span>
                            <ExplainTooltip content={EXPLAIN_REGISTRY.dwellVariance} />
                          </div>
                          <div className={`text-sm font-bold mt-0.5 ${isOver ? 'text-[#D93025]' : 'text-[#188038]'}`}>
                            {isOver ? `+${variance}h` : `${variance}h`}
                          </div>
                          <div className="text-[9px] font-sans text-[#5F6368]">
                            {isOver ? `${variance}h over target` : 'Within target'}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Target Determination & Delay */}
                  {(() => {
                    const actual = latestResult.output.dwellTime ?? latestResult.output.hoursInStage;
                    const slo = latestResult.output.microSlo;
                    const delayHours = latestResult.output.delay !== undefined
                      ? latestResult.output.delay
                      : Math.max(0, Number((actual - slo).toFixed(1)));
                    const isWithin = actual <= slo;
                    return (
                      <div className="p-2.5 rounded bg-[#F8F9FA] border border-[#E8EAED] text-xs font-mono flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-[#5F6368] uppercase font-bold flex items-center gap-1">
                            <span>Target Status</span>
                            <ExplainTooltip
                              content={{
                                title: 'Target Determination',
                                whatItMeans: isWithin
                                  ? 'Within Target: Case throughput meets operational stage benchmarks.'
                                  : 'Target Breached: Tray duration has exceeded permissible stage limits.',
                                howItIsCalculated: 'Dwell Time <= Micro-SLO = Within Target; Dwell Time > Micro-SLO = Target Breached.',
                              }}
                            />
                          </div>
                          <div className="text-xs font-bold mt-0.5 flex items-center gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isWithin ? 'bg-[#188038]' : 'bg-[#D93025]'
                              }`}
                            />
                            <span className={isWithin ? 'text-[#188038]' : 'text-[#D93025]'}>
                              {isWithin ? 'Within Target' : 'Target Breached'}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[10px] text-[#5F6368] uppercase font-bold flex items-center justify-end gap-1">
                            <span>Delay Amount</span>
                            <ExplainTooltip content={EXPLAIN_REGISTRY.delay} />
                          </div>
                          <div className={`text-xs font-bold mt-0.5 ${delayHours > 0 ? 'text-[#D93025]' : 'text-[#188038]'}`}>
                            {delayHours > 0 ? `${delayHours}h Overdue` : '0h (On Track)'}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Root Cause of Delay */}
                  <div className="p-2.5 rounded bg-[#F8F9FA] border border-[#E8EAED]">
                    <div className="text-[10px] font-bold text-[#5F6368] uppercase tracking-wider flex items-center justify-between mb-1">
                      <span>Root Cause of Delay</span>
                      <ExplainTooltip content={EXPLAIN_REGISTRY.rootCause} />
                    </div>
                    <div className="text-xs text-[#202124] font-medium leading-relaxed font-sans">
                      {latestResult.output.rootCause || latestResult.output.bottleneckStage || 'No systemic bottleneck detected.'}
                    </div>
                  </div>

                  {/* Escalation Recommendation */}
                  <div className="p-2.5 rounded bg-[#F8F9FA] border border-[#E8EAED]">
                    <div className="text-[10px] font-bold text-[#5F6368] uppercase tracking-wider flex items-center justify-between mb-1">
                      <span>Escalation Recommendation</span>
                      <ExplainTooltip content={EXPLAIN_REGISTRY.escalationRecommendation} />
                    </div>
                    <p className="text-xs text-[#1A73E8] font-semibold leading-relaxed font-sans">
                      {latestResult.output.escalationRecommendation || latestResult.output.recommendedAction}
                    </p>
                  </div>
                </div>

                {/* Timing Comparison Bar */}
                <div className="p-2.5 bg-[#F8F9FA] rounded-lg border border-[#DADCE0] text-xs font-mono">
                  <div className="flex justify-between mb-1.5 text-[#5F6368] text-[11px]">
                    <span>Hours in Stage: <strong className="text-[#202124]">{latestResult.output.hoursInStage}h</strong></span>
                    <span>Micro-SLO: <strong className="text-[#202124]">{latestResult.output.microSlo}h</strong></span>
                  </div>
                  <div className="w-full bg-[#E8EAED] h-2 rounded-full overflow-hidden border border-[#DADCE0]">
                    <div
                      className={`h-full rounded-full ${
                        latestResult.output.hoursInStage > latestResult.output.microSlo
                          ? 'bg-[#D93025]'
                          : latestResult.output.hoursInStage >= latestResult.output.microSlo * 0.8
                          ? 'bg-[#F9AB00]'
                          : 'bg-[#188038]'
                      }`}
                      style={{
                        width: `${Math.min(100, (latestResult.output.hoursInStage / latestResult.output.microSlo) * 100)}%`,
                      }}
                    />
                  </div>
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
                      <span className="text-[11px]">Score &lt; {threshold}%. Routed to human review.</span>
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
                    <span className="text-[11px]">Confidence ≥ {threshold}%. Escalation auto-approved and dispatched.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-[#5F6368] space-y-2">
                <FileText className="w-8 h-8 mx-auto text-[#80868B]" />
                <p className="text-xs font-mono">No active execution. Select a preset or input dwell parameters on the left.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dwell Time Analytics & Token Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <DwellTimeChart records={records} />
        <AgentTokenAnalytics agentId="agent-2" agentName="Agent 2 (Dwell Time)" records={records} />
      </div>

      {/* Agent 2 Audit History Table */}
      <div className="bg-white border border-[#DADCE0] rounded-lg overflow-hidden shadow-xs">
        <div className="p-3 border-b border-[#E8EAED] bg-[#F8F9FA] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#202124]">Agent 2 Execution History</h3>
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
                <th className="py-2.5 px-3">Current Stage</th>
                <th className="py-2.5 px-3">Hours vs SLO</th>
                <th className="py-2.5 px-3">Dwell Status</th>
                <th className="py-2.5 px-3">Confidence</th>
                <th className="py-2.5 px-3">Approval Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EAED]">
              {agentRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-[#5F6368] font-sans">
                    No runs recorded for Agent 2 yet. Click &quot;Execute&quot; or &quot;Add Data&quot; to begin.
                  </td>
                </tr>
              ) : (
                agentRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-[#F8F9FA] transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[#5F6368]">
                      {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-[#202124]">{r.trayId}</td>
                    <td className="py-2.5 px-3 font-mono text-[#5F6368]">{r.input.currentStage}</td>
                    <td className="py-2.5 px-3 font-mono">
                      <span className="text-[#202124] font-bold">{r.input.hoursInStage}h</span> /{' '}
                      <span className="text-[#5F6368]">{r.input.microSlo}h</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`font-semibold ${
                          (r.overriddenOutput?.dwellStatus || r.output.dwellStatus) === 'Within SLO'
                            ? 'text-[#188038]'
                            : (r.overriddenOutput?.dwellStatus || r.output.dwellStatus) === 'At Risk'
                            ? 'text-[#B06000]'
                            : 'text-[#D93025]'
                        }`}
                      >
                        {r.overriddenOutput?.dwellStatus || r.output.dwellStatus}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold">
                      <span className={r.confidenceScore >= 80 ? 'text-[#188038]' : 'text-[#B06000]'}>
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
        agentId="agent-2"
        onRecordAdded={async () => {
          if (onRefresh) await onRefresh();
        }}
        onRunAgent2={onRunAgent}
      />
    </div>
  );
};
