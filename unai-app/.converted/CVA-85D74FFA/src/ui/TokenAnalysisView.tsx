import React, { useMemo } from 'react';
import { ControlTowerAnalytics, AgentExecutionRecord, AISettings } from '../types';
import {
  Cpu,
  Server,
  Zap,
  Clock,
  Layers,
  CheckCircle2,
  AlertCircle,
  Activity,
  Flame,
  Wrench,
  CheckCheck,
  HardDrive,
  Sliders,
} from 'lucide-react';

interface TokenAnalysisViewProps {
  analytics: ControlTowerAnalytics | null;
  records: AgentExecutionRecord[];
  settings: AISettings | null;
}

export const TokenAnalysisView: React.FC<TokenAnalysisViewProps> = ({
  analytics,
  records,
  settings,
}) => {
  // Compute real token analytics directly from live records
  const tokenStats = useMemo(() => {
    let totalPrompt = 0;
    let totalCompletion = 0;
    let totalLatency = 0;
    let latencyCount = 0;

    const byAgent: Record<string, { prompt: number; completion: number; count: number; totalLatency: number }> = {
      'agent-1': { prompt: 0, completion: 0, count: 0, totalLatency: 0 },
      'agent-2': { prompt: 0, completion: 0, count: 0, totalLatency: 0 },
      'agent-3': { prompt: 0, completion: 0, count: 0, totalLatency: 0 },
      'agent-4': { prompt: 0, completion: 0, count: 0, totalLatency: 0 },
    };

    records.forEach((r) => {
      const p = r.tokenUsage?.promptTokens || 0;
      const c = r.tokenUsage?.completionTokens || 0;
      totalPrompt += p;
      totalCompletion += c;

      if (r.latencyMs) {
        totalLatency += r.latencyMs;
        latencyCount += 1;
      }

      if (byAgent[r.agentId]) {
        byAgent[r.agentId].prompt += p;
        byAgent[r.agentId].completion += c;
        byAgent[r.agentId].count += 1;
        if (r.latencyMs) {
          byAgent[r.agentId].totalLatency += r.latencyMs;
        }
      }
    });

    const total = totalPrompt + totalCompletion;
    const avgLatency = latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0;

    return {
      totalPrompt,
      totalCompletion,
      totalTokens: total,
      avgLatency,
      executionCount: records.length,
      byAgent,
    };
  }, [records]);

  // Active engine information
  const activeEngineLabel = useMemo(() => {
    if (settings?.activeEngine === 'custom') {
      return {
        title: 'NVIDIA NIM API',
        subtitle: settings.customModel || 'meta/llama-3.1-70b-instruct',
        endpoint: settings.customApiUrl || 'https://integrate.api.nvidia.com/v1',
        type: 'Cloud / Microservice NIM',
        badgeColor: 'bg-[#76B900]/15 text-[#76B900] border-[#76B900]/30',
      };
    }
    if (settings?.activeEngine === 'ollama') {
      return {
        title: 'Local Ollama',
        subtitle: settings.ollamaModel || 'llama3',
        endpoint: settings.ollamaHost || 'http://localhost:11434',
        type: 'Local On-Prem / Offline',
        badgeColor: 'bg-[#E8F0FE] text-[#1A73E8] border-[#D2E3FC]',
      };
    }
    return {
      title: 'Deterministic Rules',
      subtitle: 'Rule-based Hardware Heuristics',
      endpoint: 'In-Memory Engine',
      type: 'Zero External Latency',
      badgeColor: 'bg-[#FEF7E0] text-[#B06000] border-[#FEEFC3]',
    };
  }, [settings]);

  const agentConfig = [
    {
      id: 'agent-1',
      name: 'Agent 1: Disposition',
      desc: 'Failure classification & route',
      icon: Wrench,
      accent: 'text-[#1A73E8]',
      bg: 'bg-[#E8F0FE]',
    },
    {
      id: 'agent-2',
      name: 'Agent 2: Dwell Time',
      desc: 'SLO tracking & escalation',
      icon: Clock,
      accent: 'text-[#1A73E8]',
      bg: 'bg-[#E8F0FE]',
    },
    {
      id: 'agent-3',
      name: 'Agent 3: Urgency',
      desc: 'Spare buffer risk tiering',
      icon: Flame,
      accent: 'text-[#D93025]',
      bg: 'bg-[#FCE8E6]',
    },
    {
      id: 'agent-4',
      name: 'Agent 4: Spare Pool',
      desc: 'Inventory match & quarantine',
      icon: CheckCheck,
      accent: 'text-[#188038]',
      bg: 'bg-[#E6F4EA]',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Top Banner: Engine Telemetry Header */}
      <div className="bg-white border border-[#DADCE0] rounded-xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E8F0FE] text-[#1A73E8] border border-[#D2E3FC] flex items-center justify-center font-bold shadow-xs">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-['Google_Sans',_sans-serif] font-bold text-[#202124]">
                  Live Inference Telemetry & Token Attribution
                </h2>
                <span className="text-[10px] font-['Roboto_Mono',_monospace] font-bold uppercase px-2 py-0.5 rounded-full bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]">
                  Live Production Stream
                </span>
              </div>
              <p className="text-xs text-[#5F6368] font-['Google_Sans_Text',_sans-serif] mt-0.5">
                Real-time measurements of model token consumption, inference latency, and hardware telemetry density. Zero mockups.
              </p>
            </div>
          </div>

          {/* Connected Engine Card */}
          <div className="flex items-center gap-3 bg-[#F8F9FA] border border-[#DADCE0] p-3 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-white border border-[#DADCE0] flex items-center justify-center text-[#202124] shadow-xs">
              {settings?.activeEngine === 'custom' ? (
                <Cpu className="w-4 h-4 text-[#76B900]" />
              ) : settings?.activeEngine === 'ollama' ? (
                <Server className="w-4 h-4 text-[#1A73E8]" />
              ) : (
                <Zap className="w-4 h-4 text-[#B06000]" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-['Google_Sans',_sans-serif] font-bold text-[#202124]">
                  {activeEngineLabel.title}
                </span>
                <span className={`text-[9px] font-['Roboto_Mono',_monospace] font-bold uppercase px-1.5 py-0.2 rounded border ${activeEngineLabel.badgeColor}`}>
                  {activeEngineLabel.type}
                </span>
              </div>
              <div className="text-[11px] font-['Roboto_Mono',_monospace] text-[#5F6368] truncate max-w-[260px]">
                {activeEngineLabel.subtitle}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Summary Telemetry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Total Tokens */}
        <div className="bg-white border border-[#DADCE0] p-4 rounded-xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-['Google_Sans',_sans-serif] font-bold uppercase text-[#5F6368] tracking-wider mb-1">
            <span>Total Tokens Processed</span>
            <Cpu className="w-4 h-4 text-[#1A73E8]" />
          </div>
          <div>
            <div className="text-2xl font-['Roboto_Mono',_monospace] font-bold text-[#202124]">
              {tokenStats.totalTokens.toLocaleString()}
            </div>
            <div className="text-xs text-[#5F6368] font-['Roboto_Mono',_monospace] mt-1 flex items-center justify-between">
              <span>Prompt: <strong>{tokenStats.totalPrompt.toLocaleString()}</strong></span>
              <span>Comp: <strong>{tokenStats.totalCompletion.toLocaleString()}</strong></span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#E8EAED] text-[10px] text-[#5F6368] font-['Google_Sans_Text',_sans-serif]">
            Real measured input/output token density
          </div>
        </div>

        {/* Card 2: Average Inference Latency */}
        <div className="bg-white border border-[#DADCE0] p-4 rounded-xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-['Google_Sans',_sans-serif] font-bold uppercase text-[#5F6368] tracking-wider mb-1">
            <span>Avg Inference Latency</span>
            <Clock className="w-4 h-4 text-[#188038]" />
          </div>
          <div>
            <div className="text-2xl font-['Roboto_Mono',_monospace] font-bold text-[#188038]">
              {tokenStats.avgLatency > 0 ? `${tokenStats.avgLatency} ms` : '—'}
            </div>
            <div className="text-xs text-[#5F6368] font-['Google_Sans_Text',_sans-serif] mt-1">
              End-to-end execution round-trip
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#E8EAED] text-[10px] text-[#5F6368] font-['Google_Sans_Text',_sans-serif]">
            Calculated across {tokenStats.executionCount} live requests
          </div>
        </div>

        {/* Card 3: Evaluated Hardware RMA Units */}
        <div className="bg-white border border-[#DADCE0] p-4 rounded-xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-['Google_Sans',_sans-serif] font-bold uppercase text-[#5F6368] tracking-wider mb-1">
            <span>Executed Agent Evaluations</span>
            <Layers className="w-4 h-4 text-[#1A73E8]" />
          </div>
          <div>
            <div className="text-2xl font-['Roboto_Mono',_monospace] font-bold text-[#202124]">
              {tokenStats.executionCount}
            </div>
            <div className="text-xs text-[#5F6368] font-['Google_Sans_Text',_sans-serif] mt-1">
              Live audit records in ledger
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#E8EAED] text-[10px] text-[#5F6368] font-['Google_Sans_Text',_sans-serif]">
            {records.filter(r => r.approvalStatus === 'auto_approved').length} auto-approved • {records.filter(r => r.approvalStatus === 'pending_human_review').length} in review
          </div>
        </div>

        {/* Card 4: Hardware Telemetry Density */}
        <div className="bg-white border border-[#DADCE0] p-4 rounded-xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-['Google_Sans',_sans-serif] font-bold uppercase text-[#5F6368] tracking-wider mb-1">
            <span>Average Tokens / Evaluation</span>
            <HardDrive className="w-4 h-4 text-[#F9AB00]" />
          </div>
          <div>
            <div className="text-2xl font-['Roboto_Mono',_monospace] font-bold text-[#202124]">
              {tokenStats.executionCount > 0
                ? Math.round(tokenStats.totalTokens / tokenStats.executionCount).toLocaleString()
                : '—'}
            </div>
            <div className="text-xs text-[#5F6368] font-['Roboto_Mono',_monospace] mt-1">
              {tokenStats.executionCount > 0
                ? `~${Math.round(tokenStats.totalPrompt / tokenStats.executionCount)} in / ~${Math.round(tokenStats.totalCompletion / tokenStats.executionCount)} out`
                : 'Awaiting execution'}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#E8EAED] text-[10px] text-[#5F6368] font-['Google_Sans_Text',_sans-serif]">
            Standardized JSON schema payload
          </div>
        </div>
      </div>

      {/* Per-Agent Real Attribution Grid */}
      <div className="bg-white border border-[#DADCE0] rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E8EAED]">
          <div>
            <h3 className="text-xs font-['Google_Sans',_sans-serif] font-bold uppercase tracking-wider text-[#202124] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#1A73E8]" />
              Agent Workload & Token Attribution
            </h3>
            <p className="text-[11px] text-[#5F6368] font-['Google_Sans_Text',_sans-serif]">
              Exact token consumption and execution breakdown for each autonomous agent in the control tower
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {agentConfig.map((agent) => {
            const Icon = agent.icon;
            const stats = tokenStats.byAgent[agent.id] || { prompt: 0, completion: 0, count: 0, totalLatency: 0 };
            const agentTotal = stats.prompt + stats.completion;
            const share = tokenStats.totalTokens > 0 ? (agentTotal / tokenStats.totalTokens) * 100 : 25;
            const agentAvgLatency = stats.count > 0 ? Math.round(stats.totalLatency / stats.count) : 0;

            return (
              <div key={agent.id} className="bg-[#F8F9FA] border border-[#DADCE0] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg ${agent.bg} ${agent.accent} flex items-center justify-center`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-['Google_Sans',_sans-serif] font-bold text-[#202124]">
                        {agent.name}
                      </div>
                      <div className="text-[10px] text-[#5F6368]">{agent.desc}</div>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-[#DADCE0] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#1A73E8] h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(stats.count > 0 ? 6 : 0, share)}%` }}
                  />
                </div>

                <div className="pt-1 text-xs font-['Roboto_Mono',_monospace] text-[#5F6368] space-y-1.5">
                  <div className="flex justify-between">
                    <span>Evaluations:</span>
                    <strong className="text-[#202124]">{stats.count}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Tokens:</span>
                    <strong className="text-[#202124]">{agentTotal.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span>Prompt / Comp:</span>
                    <span>{stats.prompt.toLocaleString()} / {stats.completion.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-[#E8EAED]">
                    <span>Avg Latency:</span>
                    <strong className="text-[#1A73E8]">{agentAvgLatency > 0 ? `${agentAvgLatency} ms` : '—'}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Request Audit Stream Table */}
      <div className="bg-white border border-[#DADCE0] rounded-xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-[#E8EAED]">
          <div>
            <h3 className="text-xs font-['Google_Sans',_sans-serif] font-bold uppercase tracking-wider text-[#202124] flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#1A73E8]" />
              Live Inference Request Ledger
            </h3>
            <p className="text-[11px] text-[#5F6368] font-['Google_Sans_Text',_sans-serif]">
              Direct execution log showing model used, real latency, token volume, and disposition confidence
            </p>
          </div>
          <span className="text-xs font-['Roboto_Mono',_monospace] text-[#5F6368]">
            Showing {records.length} records
          </span>
        </div>

        {records.length === 0 ? (
          <div className="p-8 text-center bg-[#F8F9FA] rounded-xl border border-[#DADCE0]">
            <Cpu className="w-8 h-8 text-[#9AA0A6] mx-auto mb-2" />
            <div className="text-xs font-['Google_Sans',_sans-serif] font-bold text-[#202124]">
              Ledger is currently empty
            </div>
            <p className="text-xs text-[#5F6368] mt-1 max-w-sm mx-auto">
              Run an agent evaluation or click &quot;Kickoff Fleet Orchestration&quot; from the Control Tower to generate live inference telemetry with your connected model.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-['Roboto_Mono',_monospace] border-collapse">
              <thead>
                <tr className="bg-[#F8F9FA] border-b border-[#DADCE0] text-[10px] text-[#5F6368] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Agent</th>
                  <th className="py-2.5 px-3">Hardware ID</th>
                  <th className="py-2.5 px-3">Model / Engine</th>
                  <th className="py-2.5 px-3 text-right">Prompt Tokens</th>
                  <th className="py-2.5 px-3 text-right">Completion Tokens</th>
                  <th className="py-2.5 px-3 text-right">Latency</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8EAED]">
                {records.slice(0, 15).map((r) => (
                  <tr key={r.id} className="hover:bg-[#F8F9FA] transition-colors">
                    <td className="py-2 px-3 text-[11px] text-[#5F6368]">
                      {new Date(r.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2 px-3 font-medium text-[#202124]">
                      {r.agentName}
                    </td>
                    <td className="py-2 px-3 font-semibold text-[#1A73E8]">
                      {r.input?.trayId || r.input?.id || '—'}
                    </td>
                    <td className="py-2 px-3 text-[11px] text-[#5F6368] truncate max-w-[150px]">
                      {r.modelUsed || activeEngineLabel.subtitle}
                    </td>
                    <td className="py-2 px-3 text-right text-[#5F6368]">
                      {(r.tokenUsage?.promptTokens || 0).toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right text-[#5F6368]">
                      {(r.tokenUsage?.completionTokens || 0).toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right text-[#188038] font-bold">
                      {r.latencyMs ? `${r.latencyMs} ms` : '—'}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          r.approvalStatus === 'auto_approved'
                            ? 'bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]'
                            : r.approvalStatus === 'pending_human_review'
                            ? 'bg-[#FEF7E0] text-[#B06000] border border-[#FEEFC3]'
                            : 'bg-[#E8F0FE] text-[#1A73E8] border-[#D2E3FC]'
                        }`}
                      >
                        {r.approvalStatus.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
