import React from 'react';
import { ControlTowerAnalytics, AgentExecutionRecord } from '../types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { Cpu, Coins } from 'lucide-react';

interface FleetTokenAnalyticsProps {
  analytics: ControlTowerAnalytics | null;
  records: AgentExecutionRecord[];
}

export const FleetTokenAnalytics: React.FC<FleetTokenAnalyticsProps> = ({
  analytics,
  records,
}) => {
  const tokenData = analytics?.tokenAnalytics;

  // Aggregated metrics
  const totalTokens = tokenData?.totalTokens ?? records.reduce((acc, r) => acc + (r.tokenUsage?.totalTokens ?? 320), 0);
  const promptTokens = tokenData?.promptTokens ?? records.reduce((acc, r) => acc + (r.tokenUsage?.promptTokens ?? 220), 0);
  const completionTokens = tokenData?.completionTokens ?? records.reduce((acc, r) => acc + (r.tokenUsage?.completionTokens ?? 100), 0);
  const estCost = tokenData?.estimatedCostUsd ?? Number(((promptTokens * 0.15 + completionTokens * 0.6) / 1000000).toFixed(4));

  // Agent comparison chart data strictly from real analytics / records
  const agentChartData = [
    {
      agent: 'Agent 1',
      fullName: 'Failure Disposition',
      prompt: tokenData?.byAgent?.['agent-1']?.promptTokens ?? 0,
      completion: tokenData?.byAgent?.['agent-1']?.completionTokens ?? 0,
      total: tokenData?.byAgent?.['agent-1']?.totalTokens ?? 0,
      runs: tokenData?.byAgent?.['agent-1']?.executionCount ?? 0,
    },
    {
      agent: 'Agent 2',
      fullName: 'Dwell Time',
      prompt: tokenData?.byAgent?.['agent-2']?.promptTokens ?? 0,
      completion: tokenData?.byAgent?.['agent-2']?.completionTokens ?? 0,
      total: tokenData?.byAgent?.['agent-2']?.totalTokens ?? 0,
      runs: tokenData?.byAgent?.['agent-2']?.executionCount ?? 0,
    },
    {
      agent: 'Agent 3',
      fullName: 'Urgency Flagging',
      prompt: tokenData?.byAgent?.['agent-3']?.promptTokens ?? 0,
      completion: tokenData?.byAgent?.['agent-3']?.completionTokens ?? 0,
      total: tokenData?.byAgent?.['agent-3']?.totalTokens ?? 0,
      runs: tokenData?.byAgent?.['agent-3']?.executionCount ?? 0,
    },
    {
      agent: 'Agent 4',
      fullName: 'Spare Reintegration',
      prompt: tokenData?.byAgent?.['agent-4']?.promptTokens ?? 0,
      completion: tokenData?.byAgent?.['agent-4']?.completionTokens ?? 0,
      total: tokenData?.byAgent?.['agent-4']?.totalTokens ?? 0,
      runs: tokenData?.byAgent?.['agent-4']?.executionCount ?? 0,
    },
  ];

  return (
    <div className="bg-white border border-[#E0E2E6] rounded-lg p-4 space-y-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E0E2E6]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#E8F0FE] border border-[#D2E3FC] flex items-center justify-center text-[#1A73E8]">
            <Cpu className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-[#202124] uppercase tracking-wider font-mono">
              Fleet AI Token Usage & Compute Telemetry
            </h3>
            <span className="text-[10px] text-[#5F6368] font-sans">
              Multi-Agent LLM Resource Consumption & Telemetry Tracking
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-[11px] font-mono text-[#5F6368] bg-[#F8F9FA] px-2.5 py-1 rounded border border-[#E0E2E6]">
            <Coins className="w-3 h-3 text-[#F9AB00]" />
            Fleet Est. Spend: <strong className="text-[#202124]">${estCost.toFixed(4)}</strong> USD
          </span>
        </div>
      </div>

      {/* Minimal KPI grid (3 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="bg-[#F8F9FA] border border-[#E0E2E6] p-2.5 rounded-lg">
          <div className="text-[10px] uppercase font-mono text-[#5F6368]">Fleet Total Tokens</div>
          <div className="text-base font-mono font-bold text-[#202124] mt-0.5">
            {totalTokens.toLocaleString()}
          </div>
          <div className="text-[9px] text-[#5F6368] font-mono mt-0.5">{records.length} total invocations</div>
        </div>

        <div className="bg-[#F8F9FA] border border-[#E0E2E6] p-2.5 rounded-lg">
          <div className="text-[10px] uppercase font-mono text-[#5F6368]">Total Prompt Tokens</div>
          <div className="text-base font-mono font-bold text-[#1A73E8] mt-0.5">
            {promptTokens.toLocaleString()}
          </div>
          <div className="text-[9px] text-[#5F6368] font-mono mt-0.5">
            {totalTokens > 0 ? Math.round((promptTokens / totalTokens) * 100) : 0}% telemetry payload
          </div>
        </div>

        <div className="bg-[#F8F9FA] border border-[#E0E2E6] p-2.5 rounded-lg">
          <div className="text-[10px] uppercase font-mono text-[#5F6368]">Total Output Tokens</div>
          <div className="text-base font-mono font-bold text-[#188038] mt-0.5">
            {completionTokens.toLocaleString()}
          </div>
          <div className="text-[9px] text-[#5F6368] font-mono mt-0.5">
            {totalTokens > 0 ? Math.round((completionTokens / totalTokens) * 100) : 0}% structured decisions
          </div>
        </div>
      </div>

      {/* Chart: Cross-Agent Token Comparison */}
      <div className="pt-1">
        <div className="text-[10px] font-mono uppercase text-[#5F6368] mb-1.5 flex items-center justify-between">
          <span>Token Consumption Breakdown by Agent</span>
          <span className="text-[9px] text-[#80868B]">Prompt vs Completion Distribution</span>
        </div>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={agentChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8EAED" vertical={false} />
              <XAxis
                dataKey="agent"
                tick={{ fill: '#5F6368', fontSize: 10, fontFamily: 'monospace' }}
                axisLine={{ stroke: '#DADCE0' }}
                tickLine={{ stroke: '#DADCE0' }}
              />
              <YAxis
                tick={{ fill: '#5F6368', fontSize: 10, fontFamily: 'monospace' }}
                axisLine={{ stroke: '#DADCE0' }}
                tickLine={{ stroke: '#DADCE0' }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white border border-[#DADCE0] p-2.5 rounded-lg shadow-md text-xs font-mono">
                        <div className="text-[#202124] font-bold mb-1 border-b border-[#E8EAED] pb-1">
                          {data.agent}: {data.fullName}
                        </div>
                        <div className="text-[#1A73E8] flex justify-between gap-4">
                          <span>Prompt Tokens:</span>
                          <strong>{data.prompt.toLocaleString()}</strong>
                        </div>
                        <div className="text-[#188038] flex justify-between gap-4">
                          <span>Completion Tokens:</span>
                          <strong>{data.completion.toLocaleString()}</strong>
                        </div>
                        <div className="text-[#202124] pt-1 border-t border-[#E8EAED] mt-1 flex justify-between gap-4 font-bold">
                          <span>Total Tokens:</span>
                          <strong>{data.total.toLocaleString()}</strong>
                        </div>
                        <div className="text-[#5F6368] text-[10px] mt-1">
                          Invocations: {data.runs}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingTop: '4px' }}
                formatter={(value) => (
                  <span className="text-[#5F6368] capitalize">{value} Tokens</span>
                )}
              />
              <Bar dataKey="prompt" name="Prompt" fill="#1A73E8" radius={[2, 2, 0, 0]} maxBarSize={36} />
              <Bar dataKey="completion" name="Completion" fill="#188038" radius={[2, 2, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
