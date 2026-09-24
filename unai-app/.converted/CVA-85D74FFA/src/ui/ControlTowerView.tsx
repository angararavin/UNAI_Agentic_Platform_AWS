import React, { useState } from 'react';
import {
  AgentExecutionRecord,
  ControlTowerAnalytics,
} from '../types';
import { ConfidenceGauge } from './ConfidenceGauge';
import { FleetTokenAnalytics } from './FleetTokenAnalytics';
import {
  Activity,
  CheckCircle2,
  Clock,
  Flame,
  Wrench,
  CheckCheck,
  Search,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Bot,
  ExternalLink,
  Play,
  Check,
  Cpu,
  Layers,
  RefreshCw,
  Rocket,
} from 'lucide-react';
import { TabType } from './Header';

interface ControlTowerViewProps {
  analytics: ControlTowerAnalytics | null;
  records: AgentExecutionRecord[];
  onSelectRecordForReview: (record: AgentExecutionRecord) => void;
  onNavigateTab: (tab: TabType) => void;
  onKickoffAllAgents?: () => void;
  isKickoffRunning?: boolean;
}

export const ControlTowerView: React.FC<ControlTowerViewProps> = ({
  analytics,
  records,
  onSelectRecordForReview,
  onNavigateTab,
  onKickoffAllAgents,
  isKickoffRunning = false,
}) => {
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const pendingRecords = records.filter((r) => r.approvalStatus === 'pending_human_review');

  const filteredRecords = records.filter((r) => {
    if (agentFilter !== 'all' && r.agentId !== agentFilter) return false;
    if (statusFilter !== 'all' && r.approvalStatus !== statusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchTray = r.trayId.toLowerCase().includes(q);
      const matchAgent = r.agentName.toLowerCase().includes(q);
      const matchOutput = JSON.stringify(r.output).toLowerCase().includes(q);
      if (!matchTray && !matchAgent && !matchOutput) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Fleet Orchestration & Kickoff Command Bar */}
      <div className="bg-white border border-[#E0E2E6] rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#E8F0FE] border border-[#D2E3FC] flex items-center justify-center text-[#1A73E8] shrink-0">
            <Rocket className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-['Google_Sans',_sans-serif] font-semibold text-[#202124]">
                Fleet Orchestration
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-['Google_Sans_Text',_sans-serif] font-medium rounded-full bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]">
                4 Agents Ready
              </span>
            </div>
            <p className="text-xs text-[#5F6368] mt-0.5 font-['Google_Sans_Text',_sans-serif]">
              Execute all 4 autonomous agents simultaneously straight from the Control Tower (Disposition, Dwell Monitoring, Urgency Triage, and Spare Reintegration).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onKickoffAllAgents}
            disabled={isKickoffRunning}
            className="px-4 py-2 bg-[#1A73E8] hover:bg-[#1557B0] active:bg-[#174EA6] text-white text-xs font-['Google_Sans',_sans-serif] font-medium rounded-md flex items-center gap-2 transition-all disabled:opacity-50 shadow-xs cursor-pointer select-none"
            title="Execute all 4 hardware agents simultaneously"
          >
            {isKickoffRunning ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Kickoff In Progress...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Kickoff All Agents</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Pending Human Reviews Alert Banner */}
      {pendingRecords.length > 0 && (
        <div className="bg-[#FEF7E0] border border-[#FEEFC3] border-l-4 border-l-[#F9AB00] rounded-lg p-3.5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-md bg-[#FFF] text-[#B06000] shrink-0 mt-0.5 border border-[#FEEFC3] shadow-xs">
                <ShieldAlert className="w-4 h-4 text-[#E37400] animate-pulse" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#202124] uppercase tracking-wider font-mono">
                  {pendingRecords.length} DECISION{pendingRecords.length > 1 ? 'S' : ''} AWAITING HUMAN-IN-THE-LOOP REVIEW
                </h3>
                <p className="text-[11px] text-[#5F6368] mt-0.5">
                  AI confidence scored below safety thresholds. Engineering or logistics review is required before asset disposition or carrier dispatch.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onSelectRecordForReview(pendingRecords[0])}
                className="px-3 py-1.5 bg-[#1A73E8] hover:bg-[#1557B0] text-white text-[11px] font-bold font-mono rounded-md flex items-center gap-1.5 transition-colors shadow-xs"
              >
                REVIEW TOP ITEM ({pendingRecords[0].trayId})
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Pending items pill list */}
          <div className="mt-3 pt-2.5 border-t border-[#FEEFC3] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {pendingRecords.map((r) => (
              <div
                key={r.id}
                onClick={() => onSelectRecordForReview(r)}
                className="cursor-pointer bg-white hover:bg-[#F8F9FA] border border-[#DADCE0] hover:border-[#F9AB00] rounded-md p-2 flex items-center justify-between transition-all shadow-xs"
              >
                <div className="overflow-hidden">
                  <div className="font-mono text-xs font-bold text-[#202124] truncate">{r.trayId}</div>
                  <div className="text-[10px] text-[#5F6368] truncate uppercase">{r.agentName}</div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <div className="text-xs font-mono font-bold text-[#B06000]">{r.confidenceScore}%</div>
                  <div className="text-[9px] font-mono text-[#5F6368]">RULE: ≥{r.threshold}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fresh Clean Start Welcome Banner when records is 0 */}
      {records.length === 0 && (
        <div className="bg-white border border-[#DADCE0] rounded-lg p-4 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#E8F0FE] text-[#1A73E8] flex items-center justify-center shrink-0 border border-[#D2E3FC]">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#202124]">
                  Autonomous RMA Control Tower — Ready for Execution
                </h3>
                <p className="text-xs text-[#5F6368] mt-0.5 max-w-2xl">
                  Initial state initialized clean: No input data has been executed yet. Select any agent below to review telemetry, configure custom hardware evidence, and trigger autonomous execution.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onKickoffAllAgents}
                disabled={isKickoffRunning}
                className="px-3.5 py-1.5 bg-[#1A73E8] hover:bg-[#1557B0] text-white text-xs font-bold uppercase tracking-wider font-mono rounded-md flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                title="Run all 4 agents sequentially in a single batch"
              >
                {isKickoffRunning ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Kickoff In Progress...
                  </>
                ) : (
                  <>
                    <Rocket className="w-3.5 h-3.5" />
                    Kickoff All Agents
                  </>
                )}
              </button>
              <button
                onClick={() => onNavigateTab('agent-1')}
                className="px-3 py-1.5 bg-white hover:bg-[#F8F9FA] text-[#1A73E8] border border-[#DADCE0] text-xs font-semibold rounded-md flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Run Agent 1
              </button>
              <button
                onClick={() => onNavigateTab('agent-2')}
                className="px-3 py-1.5 bg-white hover:bg-[#F8F9FA] text-[#1A73E8] border border-[#DADCE0] text-xs font-semibold rounded-md flex items-center gap-1.5 shadow-xs transition-colors"
              >
                Run Agent 2
              </button>
              <button
                onClick={() => onNavigateTab('agent-3')}
                className="px-3 py-1.5 bg-white hover:bg-[#F8F9FA] text-[#1A73E8] border border-[#DADCE0] text-xs font-semibold rounded-md flex items-center gap-1.5 shadow-xs transition-colors"
              >
                Run Agent 3
              </button>
              <button
                onClick={() => onNavigateTab('agent-4')}
                className="px-3 py-1.5 bg-white hover:bg-[#F8F9FA] text-[#1A73E8] border border-[#DADCE0] text-xs font-semibold rounded-md flex items-center gap-1.5 shadow-xs transition-colors"
              >
                Run Agent 4
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Executive KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white border border-[#E0E2E6] hover:border-[#1A73E8]/40 p-3.5 rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase text-[#5F6368] tracking-wider mb-1">
            <span>Total RMAs</span>
            <Activity className="w-3.5 h-3.5 text-[#1A73E8]" />
          </div>
          <div className="text-2xl font-mono font-bold text-[#202124]">{analytics?.totalProcessed ?? 0}</div>
          <div className="text-[10px] text-[#5F6368] mt-1">Across all 4 agents</div>
        </div>

        <div className="bg-white border border-[#E0E2E6] hover:border-[#188038]/40 p-3.5 rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase text-[#5F6368] tracking-wider mb-1">
            <span>Auto-Approve Rate</span>
            <ShieldCheck className="w-3.5 h-3.5 text-[#188038]" />
          </div>
          <div className="text-2xl font-mono font-bold text-[#188038]">{analytics?.autoApprovalRate ?? 0}%</div>
          <div className="text-[10px] text-[#5F6368] mt-1">{analytics?.autoApprovedCount ?? 0} auto-approved</div>
        </div>

        <div className="bg-white border border-[#E0E2E6] hover:border-[#F9AB00]/40 p-3.5 rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase text-[#5F6368] tracking-wider mb-1">
            <span>Pending Review</span>
            <ShieldAlert className="w-3.5 h-3.5 text-[#B06000]" />
          </div>
          <div className="text-2xl font-mono font-bold text-[#B06000]">{analytics?.pendingReviewCount ?? 0}</div>
          <div className="text-[10px] text-[#5F6368] mt-1">Below safety thresholds</div>
        </div>

        <div className="bg-white border border-[#E0E2E6] hover:border-[#8430CE]/40 p-3.5 rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase text-[#5F6368] tracking-wider mb-1">
            <span>Human Overridden</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-[#8430CE]" />
          </div>
          <div className="text-2xl font-mono font-bold text-[#8430CE]">{analytics?.humanReviewedCount ?? 0}</div>
          <div className="text-[10px] text-[#5F6368] mt-1">Manual intervention logged</div>
        </div>

        <div className="bg-white border border-[#E0E2E6] hover:border-[#1A73E8]/40 p-3.5 rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase text-[#5F6368] tracking-wider mb-1">
            <span>Mean Confidence</span>
            <Bot className="w-3.5 h-3.5 text-[#1A73E8]" />
          </div>
          <div className="text-2xl font-mono font-bold text-[#202124]">{analytics?.avgConfidence ?? 0}%</div>
          <div className="text-[10px] text-[#188038] mt-1">High operational fidelity</div>
        </div>
      </div>

      {/* Cross-Agent Status Grid (Cards for 4 agents) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-[11px] font-bold text-[#5F6368] uppercase tracking-wider">
              Agent Domain Performance & Operations
            </h2>
            <span className="text-[10px] text-[#5F6368] font-sans hidden sm:inline">— Autonomous Execution Fleet</span>
          </div>
          <button
            type="button"
            onClick={onKickoffAllAgents}
            disabled={isKickoffRunning}
            className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase rounded bg-[#E8F0FE] hover:bg-[#D2E3FC] text-[#1A73E8] border border-[#D2E3FC] flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isKickoffRunning ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current" />
                <span>Kickoff Fleet</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Agent 1 Card */}
          <div className="bg-white border border-[#E0E2E6] border-l-4 border-l-[#1A73E8] rounded-lg p-3.5 flex flex-col justify-between shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-md bg-[#E8F0FE] text-[#1A73E8] border border-[#D2E3FC]">
                  <Wrench className="w-3.5 h-3.5" />
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#E8F0FE] text-[#1A73E8] border border-[#D2E3FC] font-bold">
                  AGENT 1
                </span>
              </div>
              <h3 className="font-bold text-xs text-[#202124] uppercase tracking-wide">Failure Disposition</h3>
              <p className="text-[11px] text-[#5F6368] mt-1">
                DCHA telemetry & hardware root-cause classification (Repaired / Replaced / Diagnosed).
              </p>

              <div className="mt-3 pt-2 border-t border-[#E8EAED] space-y-1 text-[11px] font-mono">
                <div className="flex justify-between text-[#5F6368]">
                  <span>Processed:</span>
                  <strong className="text-[#202124]">{analytics?.agent1Metrics?.total ?? 0}</strong>
                </div>
                <div className="flex justify-between text-[#5F6368]">
                  <span>Repaired / Replaced:</span>
                  <strong className="text-[#202124]">
                    {analytics?.agent1Metrics?.repairedCount ?? 0} / {analytics?.agent1Metrics?.replacedCount ?? 0}
                  </strong>
                </div>
                <div className="flex justify-between text-[#5F6368]">
                  <span>Pending Review:</span>
                  <span className={`font-bold ${analytics?.agent1Metrics?.pendingReview ? 'text-[#B06000]' : 'text-[#5F6368]'}`}>
                    {analytics?.agent1Metrics?.pendingReview ?? 0}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('agent-1')}
              className="mt-3 w-full py-1.5 bg-[#F8F9FA] hover:bg-[#E8F0FE] text-[#1A73E8] text-[11px] font-bold uppercase tracking-wider rounded-md border border-[#E0E2E6] flex items-center justify-center gap-1 transition-colors shadow-xs"
            >
              Open Agent 1 Console
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          {/* Agent 2 Card */}
          <div className="bg-white border border-[#E0E2E6] border-l-4 border-l-[#4285F4] rounded-lg p-3.5 flex flex-col justify-between shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-md bg-[#E8F0FE] text-[#1A73E8] border border-[#D2E3FC]">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#E8F0FE] text-[#1A73E8] border border-[#D2E3FC] font-bold">
                  AGENT 2
                </span>
              </div>
              <h3 className="font-bold text-xs text-[#202124] uppercase tracking-wide">Dwell Time Monitoring</h3>
              <p className="text-[11px] text-[#5F6368] mt-1">
                Micro-SLO tracking across CM queues, hubs, and thermal burn-in chambers.
              </p>

              <div className="mt-3 pt-2 border-t border-[#E8EAED] space-y-1 text-[11px] font-mono">
                <div className="flex justify-between text-[#5F6368]">
                  <span>Processed:</span>
                  <strong className="text-[#202124]">{analytics?.agent2Metrics?.total ?? 0}</strong>
                </div>
                <div className="flex justify-between text-[#5F6368]">
                  <span>Within SLO / Breached:</span>
                  <strong className="text-[#202124]">
                    {analytics?.agent2Metrics?.withinSloCount ?? 0} / {analytics?.agent2Metrics?.breachedCount ?? 0}
                  </strong>
                </div>
                <div className="flex justify-between text-[#5F6368]">
                  <span>Pending Review:</span>
                  <span className={`font-bold ${analytics?.agent2Metrics?.pendingReview ? 'text-[#B06000]' : 'text-[#5F6368]'}`}>
                    {analytics?.agent2Metrics?.pendingReview ?? 0}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('agent-2')}
              className="mt-3 w-full py-1.5 bg-[#F8F9FA] hover:bg-[#E8F0FE] text-[#1A73E8] text-[11px] font-bold uppercase tracking-wider rounded-md border border-[#E0E2E6] flex items-center justify-center gap-1 transition-colors shadow-xs"
            >
              Open Agent 2 Console
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          {/* Agent 3 Card */}
          <div className="bg-white border border-[#E0E2E6] border-l-4 border-l-[#EA4335] rounded-lg p-3.5 flex flex-col justify-between shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-md bg-[#FCE8E6] text-[#D93025] border border-[#FAD2CF]">
                  <Flame className="w-3.5 h-3.5" />
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#FCE8E6] text-[#D93025] border border-[#FAD2CF] font-bold">
                  AGENT 3
                </span>
              </div>
              <h3 className="font-bold text-xs text-[#202124] uppercase tracking-wide">Urgency Flagging</h3>
              <p className="text-[11px] text-[#5F6368] mt-1">
                Cluster spare inventory and SLA exposure to calculate Required Delivery Dates.
              </p>

              <div className="mt-3 pt-2 border-t border-[#E8EAED] space-y-1 text-[11px] font-mono">
                <div className="flex justify-between text-[#5F6368]">
                  <span>Processed:</span>
                  <strong className="text-[#202124]">{analytics?.agent3Metrics?.total ?? 0}</strong>
                </div>
                <div className="flex justify-between text-[#5F6368]">
                  <span>P1 Critical / P2:</span>
                  <strong className="text-[#202124]">
                    {analytics?.agent3Metrics?.p1Count ?? 0} / {analytics?.agent3Metrics?.p2Count ?? 0}
                  </strong>
                </div>
                <div className="flex justify-between text-[#5F6368]">
                  <span>Pending Review:</span>
                  <span className={`font-bold ${analytics?.agent3Metrics?.pendingReview ? 'text-[#B06000]' : 'text-[#5F6368]'}`}>
                    {analytics?.agent3Metrics?.pendingReview ?? 0}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('agent-3')}
              className="mt-3 w-full py-1.5 bg-[#F8F9FA] hover:bg-[#FCE8E6] text-[#D93025] text-[11px] font-bold uppercase tracking-wider rounded-md border border-[#E0E2E6] flex items-center justify-center gap-1 transition-colors shadow-xs"
            >
              Open Agent 3 Console
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          {/* Agent 4 Card */}
          <div className="bg-white border border-[#E0E2E6] border-l-4 border-l-[#34A853] rounded-lg p-3.5 flex flex-col justify-between shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-md bg-[#E6F4EA] text-[#188038] border border-[#CEEAD6]">
                  <CheckCheck className="w-3.5 h-3.5" />
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#E6F4EA] text-[#188038] border border-[#CEEAD6] font-bold">
                  AGENT 4
                </span>
              </div>
              <h3 className="font-bold text-xs text-[#202124] uppercase tracking-wide">Spare Reintegration</h3>
              <p className="text-[11px] text-[#5F6368] mt-1">
                Serial validation, warranty clearance, and spare-pool depot induction.
              </p>

              <div className="mt-3 pt-2 border-t border-[#E8EAED] space-y-1 text-[11px] font-mono">
                <div className="flex justify-between text-[#5F6368]">
                  <span>Processed:</span>
                  <strong className="text-[#202124]">{analytics?.agent4Metrics?.total ?? 0}</strong>
                </div>
                <div className="flex justify-between text-[#5F6368]">
                  <span>Eligible / Quarantine:</span>
                  <strong className="text-[#202124]">
                    {analytics?.agent4Metrics?.eligibleCount ?? 0} / {analytics?.agent4Metrics?.quarantineCount ?? 0}
                  </strong>
                </div>
                <div className="flex justify-between text-[#5F6368]">
                  <span>Pending Review:</span>
                  <span className={`font-bold ${analytics?.agent4Metrics?.pendingReview ? 'text-[#B06000]' : 'text-[#5F6368]'}`}>
                    {analytics?.agent4Metrics?.pendingReview ?? 0}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('agent-4')}
              className="mt-3 w-full py-1.5 bg-[#F8F9FA] hover:bg-[#E6F4EA] text-[#188038] text-[11px] font-bold uppercase tracking-wider rounded-md border border-[#E0E2E6] flex items-center justify-center gap-1 transition-colors shadow-xs"
            >
              Open Agent 4 Console
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Universal Human-in-the-Loop Architecture Diagram */}
      <div className="bg-white border border-[#E0E2E6] rounded-lg p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#188038]"></span>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#5F6368]">
              Universal Human-in-the-Loop Protocol
            </h3>
          </div>
          <span className="text-[10px] text-[#5F6368] font-sans">
            Standardized Multi-Agent Safety Architecture
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-7 gap-2 items-center text-center text-xs">
          <div className="bg-[#F8F9FA] p-2.5 rounded-md border border-[#E0E2E6]">
            <div className="font-mono font-bold text-xs text-[#202124] uppercase">1. Hardware Input</div>
            <div className="text-[10px] text-[#5F6368] mt-0.5">Tray, DCHA, Manifest</div>
          </div>
          <div className="hidden md:block text-[#80868B] font-bold font-mono">→</div>
          <div className="bg-[#F8F9FA] p-2.5 rounded-md border border-[#E0E2E6]">
            <div className="font-mono font-bold text-xs text-[#1A73E8] uppercase">2. AI Analysis</div>
            <div className="text-[10px] text-[#5F6368] mt-0.5">Autonomous Inference</div>
          </div>
          <div className="hidden md:block text-[#80868B] font-bold font-mono">→</div>
          <div className="bg-[#F8F9FA] p-2.5 rounded-md border border-[#E0E2E6]">
            <div className="font-mono font-bold text-xs text-[#8430CE] uppercase">3. Confidence Check</div>
            <div className="text-[10px] text-[#5F6368] mt-0.5">Agent Threshold Rule</div>
          </div>
          <div className="hidden md:block text-[#80868B] font-bold font-mono">→</div>
          <div className="bg-[#F8F9FA] p-2.5 rounded-md border border-[#E0E2E6]">
            <div className="font-mono font-bold text-xs text-[#188038] uppercase">4. Auto or Review</div>
            <div className="text-[10px] text-[#5F6368] mt-0.5">≥Thresh Auto | &lt;Thresh Review</div>
          </div>
        </div>
      </div>

      {/* Fleet Token Usage & LLM Telemetry Analytics */}
      <FleetTokenAnalytics
        analytics={analytics}
        records={records}
      />

      {/* Unified Transaction Stream / Audit Ledger */}
      <div className="bg-white border border-[#E0E2E6] rounded-lg overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        {/* Table header and filters */}
        <div className="p-3 border-b border-[#E0E2E6] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F8F9FA]">
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#202124]">Audit Ledger & Transaction Stream</h3>
            <p className="text-[11px] text-[#5F6368]">Live telemetry stream of agent executions and human reviews</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3 h-3 text-[#80868B] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Tray, Agent..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-7 pr-2.5 py-1 text-xs font-mono bg-white border border-[#E0E2E6] rounded text-[#202124] focus:border-[#1A73E8] focus:outline-none w-44 placeholder-[#80868B] shadow-xs"
              />
            </div>

            {/* Agent Filter */}
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="text-xs font-mono py-1 px-2 bg-white border border-[#E0E2E6] rounded text-[#202124] focus:border-[#1A73E8] focus:outline-none shadow-xs"
            >
              <option value="all">ALL AGENTS</option>
              <option value="agent-1">A1: DISPOSITION</option>
              <option value="agent-2">A2: DWELL TIME</option>
              <option value="agent-3">A3: URGENCY</option>
              <option value="agent-4">A4: REINTEGRATION</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-mono py-1 px-2 bg-white border border-[#E0E2E6] rounded text-[#202124] focus:border-[#1A73E8] focus:outline-none shadow-xs"
            >
              <option value="all">ALL STATUSES</option>
              <option value="auto_approved">AUTO APPROVED</option>
              <option value="pending_human_review">PENDING REVIEW</option>
              <option value="human_approved">HUMAN APPROVED</option>
              <option value="human_overridden">HUMAN OVERRIDDEN</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#202124]">
            <thead className="bg-[#F8F9FA] text-[10px] font-bold uppercase text-[#5F6368] tracking-wider border-b border-[#E0E2E6]">
              <tr>
                <th className="py-2.5 px-3">Transaction / Time</th>
                <th className="py-2.5 px-3">Tray ID</th>
                <th className="py-2.5 px-3">Agent Domain</th>
                <th className="py-2.5 px-3">AI Outcome</th>
                <th className="py-2.5 px-3">Confidence Score</th>
                <th className="py-2.5 px-3">Approval State</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0E2E6]">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[#5F6368] font-sans">
                    <div className="max-w-md mx-auto space-y-2">
                      <p className="font-semibold text-xs text-[#202124]">No transaction records found</p>
                      <p className="text-[11px] text-[#5F6368]">
                        The control tower starts in a clean state. Select any Agent tab (Agent 1 to 4) to execute an RMA run, or use the Add Data tool.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const outcomePrimary =
                    r.agentId === 'agent-1'
                      ? r.overriddenOutput?.recommendedDisposition || r.output.recommendedDisposition
                      : r.agentId === 'agent-2'
                      ? r.overriddenOutput?.dwellStatus || r.output.dwellStatus
                      : r.agentId === 'agent-3'
                      ? `${r.overriddenOutput?.priority || r.output.priority} (${r.overriddenOutput?.urgencyLevel || r.output.urgencyLevel})`
                      : `${r.overriddenOutput?.sparePoolEligibility || r.output.sparePoolEligibility} (${r.output.returnValidationStatus})`;

                  return (
                    <tr key={r.id} className="hover:bg-[#F8F9FA] transition-colors">
                      <td className="py-2.5 px-3 font-mono text-[11px]">
                        <div className="font-semibold text-[#202124]">{r.id}</div>
                        <div className="text-[#5F6368] text-[10px]">
                          {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 font-mono font-bold text-[#202124] text-xs">
                        {r.trayId}
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="font-medium text-[#202124]">{r.agentName}</span>
                        <div className="text-[10px] text-[#5F6368] font-mono">
                          {r.engineUsed} ({r.latencyMs}ms)
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-[#202124]">{outcomePrimary}</span>
                        {r.overriddenOutput && (
                          <span className="ml-1.5 text-[9px] px-1.5 py-0.2 bg-[#F3E8FD] text-[#8430CE] border border-[#E9D2FD] rounded font-mono font-bold">
                            OVERRIDDEN
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 w-44">
                        <div className="w-full">
                          <ConfidenceGauge score={r.confidenceScore} threshold={r.threshold} size="sm" hideThreshold={true} />
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider font-mono ${
                            r.approvalStatus === 'auto_approved'
                              ? 'bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]'
                              : r.approvalStatus === 'pending_human_review'
                              ? 'bg-[#FEF7E0] text-[#B06000] border border-[#FEEFC3] animate-pulse'
                              : 'bg-[#E8F0FE] text-[#1A73E8] border border-[#D2E3FC]'
                          }`}
                        >
                          {r.approvalStatus === 'pending_human_review' ? (
                            <ShieldAlert className="w-3 h-3 text-[#B06000]" />
                          ) : (
                            <ShieldCheck className="w-3 h-3 text-[#137333]" />
                          )}
                          {r.approvalStatus.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => onSelectRecordForReview(r)}
                          className="px-2.5 py-1 text-[11px] font-mono font-bold text-[#202124] bg-white hover:bg-[#F1F3F4] border border-[#DADCE0] rounded shadow-xs transition-colors"
                        >
                          {r.approvalStatus === 'pending_human_review' ? 'Review & Approve' : 'Inspect'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
