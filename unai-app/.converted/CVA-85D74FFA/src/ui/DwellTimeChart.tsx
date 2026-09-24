import React from 'react';
import { AgentExecutionRecord } from '../types';
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
import { Clock, Info } from 'lucide-react';
import { ExplainTooltip, EXPLAIN_REGISTRY } from './ExplainTooltip';

interface DwellTimeChartProps {
  records: AgentExecutionRecord[];
}

export const DwellTimeChart: React.FC<DwellTimeChartProps> = ({ records }) => {
  const agent2Records = records.filter((r) => r.agentId === 'agent-2');

  const chartData = [...agent2Records]
    .reverse()
    .map((r) => {
      const expected = Number(r.output?.microSlo ?? r.input?.microSlo ?? 0);
      const current = Number(r.output?.hoursInStage ?? r.input?.hoursInStage ?? 0);
      const status = r.overriddenOutput?.dwellStatus || r.output?.dwellStatus || 'Within SLO';
      const variance = Number((current - expected).toFixed(1));

      return {
        id: r.id,
        trayId: r.trayId,
        label: r.trayId.length > 12 ? r.trayId.slice(-9) : r.trayId,
        stage: r.input?.currentStage || 'Stage',
        expectedHours: expected,
        currentHours: current,
        status,
        variance,
        isBreached: current > expected,
        isAtRisk: status === 'At Risk' || (current >= expected * 0.8 && current <= expected),
      };
    });

  // Calculate high-level summary from real data
  const totalItems = chartData.length;
  const compliantCount = chartData.filter((d) => !d.isBreached).length;
  const complianceRate = totalItems > 0 ? Math.round((compliantCount / totalItems) * 100) : 100;
  const avgExpected = totalItems > 0
    ? Number((chartData.reduce((acc, d) => acc + d.expectedHours, 0) / totalItems).toFixed(1))
    : 0;
  const avgCurrent = totalItems > 0
    ? Number((chartData.reduce((acc, d) => acc + d.currentHours, 0) / totalItems).toFixed(1))
    : 0;

  return (
    <div className="bg-white border border-[#DADCE0] rounded-lg p-4 space-y-3 shadow-xs">
      {/* Header with Minimal Clean Aesthetic */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E8EAED]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#E8F0FE] border border-[#D2E3FC] flex items-center justify-center text-[#1A73E8]">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-[#202124] uppercase tracking-wider font-mono">
              Stage Dwell Time: Expected vs Current
            </h4>
            <span className="text-[10px] text-[#5F6368] font-sans">
              Micro-SLO Target vs Actual Elapsed Duration across RMA Trays
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-[#F8F9FA] border border-[#DADCE0] text-[#202124]">
            SLO Compliance: <strong className={complianceRate >= 80 ? 'text-[#188038]' : 'text-[#B06000]'}>{complianceRate}%</strong>
          </span>
        </div>
      </div>

      {/* Minimal KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-[#F8F9FA] border border-[#DADCE0] p-2.5 rounded-lg">
          <div className="text-[10px] uppercase font-mono text-[#5F6368] flex items-center justify-between">
            <span>Stages Monitored</span>
            <ExplainTooltip
              content={{
                title: 'Stages Monitored',
                whatItMeans: 'Count of unique active hardware trays with active dwell checkpoints in the system.',
                howItIsCalculated: 'Total distinct tray records processed in Agent 2.',
                benchmarkOrAction: 'Continuous tracking across all contract manufacturer nodes.',
              }}
            />
          </div>
          <div className="text-base font-mono font-bold text-[#202124] mt-0.5">{totalItems} Trays</div>
          <div className="text-[9px] text-[#5F6368] font-mono mt-0.5">Recorded checkpoints</div>
        </div>

        <div className="bg-[#F8F9FA] border border-[#DADCE0] p-2.5 rounded-lg">
          <div className="text-[10px] uppercase font-mono text-[#5F6368] flex items-center justify-between">
            <span>Avg Expected SLO</span>
            <ExplainTooltip content={EXPLAIN_REGISTRY.avgExpectedSlo} />
          </div>
          <div className="text-base font-mono font-bold text-[#1A73E8] mt-0.5">{avgExpected}h</div>
          <div className="text-[9px] text-[#5F6368] font-mono mt-0.5">Target baseline</div>
        </div>

        <div className="bg-[#F8F9FA] border border-[#DADCE0] p-2.5 rounded-lg group">
          <div className="text-[10px] uppercase font-mono text-[#5F6368] flex items-center justify-between">
            <ExplainTooltip
              content={EXPLAIN_REGISTRY.avgCurrentDwell}
              variant="underline"
            >
              <span>Avg Current Dwell</span>
            </ExplainTooltip>
            <ExplainTooltip content={EXPLAIN_REGISTRY.avgCurrentDwell} />
          </div>
          <div className={`text-base font-mono font-bold mt-0.5 ${avgCurrent > avgExpected ? 'text-[#D93025]' : 'text-[#188038]'}`}>
            {avgCurrent}h
          </div>
          <div className="text-[9px] text-[#5F6368] font-mono mt-0.5">
            {avgCurrent > avgExpected ? `+${(avgCurrent - avgExpected).toFixed(1)}h over SLO` : 'Within safe range'}
          </div>
        </div>

        <div className="bg-[#F8F9FA] border border-[#DADCE0] p-2.5 rounded-lg">
          <div className="text-[10px] uppercase font-mono text-[#5F6368] flex items-center justify-between">
            <span>Breached Status</span>
            <ExplainTooltip content={EXPLAIN_REGISTRY.dwellBreached} />
          </div>
          <div className="text-base font-mono font-bold text-[#D93025] mt-0.5">
            {chartData.filter((d) => d.status === 'Breached').length}
          </div>
          <div className="text-[9px] text-[#5F6368] font-mono mt-0.5">
            {chartData.filter((d) => d.status === 'At Risk').length} stages at-risk
          </div>
        </div>
      </div>

      {/* Recharts Bar Chart: Expected vs Current */}
      {chartData.length > 0 ? (
        <div className="pt-1">
          <div className="text-[10px] font-mono uppercase text-[#5F6368] mb-1.5 flex items-center justify-between">
            <span>Dwell Hours Comparison per Tray</span>
            <span className="text-[9px] text-[#80868B]">Hours in Stage vs Micro-SLO Target</span>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8EAED" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#5F6368', fontSize: 10, fontFamily: 'monospace' }}
                  axisLine={{ stroke: '#DADCE0' }}
                  tickLine={{ stroke: '#DADCE0' }}
                />
                <YAxis
                  tick={{ fill: '#5F6368', fontSize: 10, fontFamily: 'monospace' }}
                  axisLine={{ stroke: '#DADCE0' }}
                  tickLine={{ stroke: '#DADCE0' }}
                  unit="h"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white border border-[#DADCE0] p-2.5 rounded-lg shadow-md text-xs font-mono">
                          <div className="text-[#202124] font-bold mb-1 border-b border-[#E8EAED] pb-1">
                            {d.trayId}
                          </div>
                          <div className="text-[#5F6368] text-[10px] mb-1.5 truncate max-w-[200px]">
                            Stage: {d.stage}
                          </div>
                          <div className="text-[#1A73E8] flex justify-between gap-4">
                            <span>Expected (Micro-SLO):</span>
                            <strong>{d.expectedHours}h</strong>
                          </div>
                          <div className={`flex justify-between gap-4 ${d.isBreached ? 'text-[#D93025]' : 'text-[#188038]'}`}>
                            <span>Current Dwell:</span>
                            <strong>{d.currentHours}h</strong>
                          </div>
                          <div className="text-[#202124] pt-1 border-t border-[#E8EAED] mt-1 flex justify-between gap-4 font-bold text-[11px]">
                            <span>Variance:</span>
                            <span className={d.variance > 0 ? 'text-[#D93025]' : 'text-[#188038]'}>
                              {d.variance > 0 ? `+${d.variance}h (Over)` : `${d.variance}h (Under)`}
                            </span>
                          </div>
                          <div className="mt-1 text-[10px] text-[#5F6368]">
                            Status: <span className="font-bold text-[#202124]">{d.status}</span>
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
                    <span className="text-[#5F6368]">
                      {value === 'expectedHours' ? 'Expected Micro-SLO (h)' : 'Current Hours in Stage (h)'}
                    </span>
                  )}
                />
                <Bar
                  dataKey="expectedHours"
                  name="expectedHours"
                  fill="#1A73E8"
                  radius={[2, 2, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="currentHours"
                  name="currentHours"
                  fill="#EA4335"
                  radius={[2, 2, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="py-4 text-center text-xs font-sans text-[#5F6368]">
          No dwell time executions recorded yet. Run Agent 2 to see comparison telemetry.
        </div>
      )}

      {/* 2-3 Line Visual Explainability */}
      <div className="bg-[#F8F9FA] border border-[#E8EAED] rounded-md p-2.5 flex items-start gap-2 text-[11px] leading-relaxed text-[#3C4043]">
        <Info className="w-3.5 h-3.5 text-[#1A73E8] shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-[#202124] uppercase text-[10px] tracking-wider font-mono mr-1.5">
            Analysis Explainability:
          </span>
          Tracks real-time elapsed hours for each hardware tray at contract manufacturer checkpoints against target Micro-SLOs. Highlights process bottlenecks in thermal chambers or testing queues before minor operational delays escalate into SLA breaches.
        </div>
      </div>
    </div>
  );
};
