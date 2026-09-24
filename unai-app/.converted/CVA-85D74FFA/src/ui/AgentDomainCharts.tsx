import React from 'react';
import { AgentExecutionRecord } from '../types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { Wrench, Flame, CheckCheck, Info } from 'lucide-react';

/* =========================================================================
   Agent 1: Disposition Distribution Chart (Repaired, Replaced, Diagnosed)
   ========================================================================= */
interface Agent1DispositionChartProps {
  records: AgentExecutionRecord[];
}

export const Agent1DispositionChart: React.FC<Agent1DispositionChartProps> = ({ records }) => {
  const a1Records = records.filter((r) => r.agentId === 'agent-1');

  let repaired = 0;
  let replaced = 0;
  let diagnosed = 0;

  for (const r of a1Records) {
    const disp = r.overriddenOutput?.recommendedDisposition || r.output?.recommendedDisposition;
    if (disp === 'Repaired') repaired++;
    else if (disp === 'Replaced') replaced++;
    else if (disp === 'Further Diagnosed') diagnosed++;
  }

  const chartData = [
    { name: 'Repaired', count: repaired, color: '#188038', description: 'Viable rework / reflow' },
    { name: 'Replaced', count: replaced, color: '#D93025', description: 'Scrap & socket reclaim' },
    { name: 'Diagnosed', count: diagnosed, color: '#B06000', description: 'Thermal loop burn-in' },
  ];

  const total = repaired + replaced + diagnosed;

  return (
    <div className="bg-white border border-[#DADCE0] rounded-lg p-4 space-y-3 shadow-xs">
      <div className="flex items-center justify-between pb-2 border-b border-[#E8EAED]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#E8F0FE] border border-[#D2E3FC] flex items-center justify-center text-[#1A73E8]">
            <Wrench className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-[#202124] uppercase tracking-wider font-mono">
              Hardware Disposition Distribution
            </h4>
            <span className="text-[10px] text-[#5F6368] font-sans">
              DCHA-grounded classification breakdown
            </span>
          </div>
        </div>
        <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-[#F8F9FA] border border-[#DADCE0] text-[#202124]">
          Total Trays: <strong className="text-[#202124]">{total}</strong>
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-[#F8F9FA] border border-[#DADCE0] p-2 rounded-lg">
          <div className="text-[10px] font-mono uppercase text-[#5F6368]">Repaired</div>
          <div className="text-base font-mono font-bold text-[#188038] mt-0.5">{repaired}</div>
          <div className="text-[9px] text-[#5F6368] font-mono mt-0.5">
            {total > 0 ? Math.round((repaired / total) * 100) : 0}% of runs
          </div>
        </div>
        <div className="bg-[#F8F9FA] border border-[#DADCE0] p-2 rounded-lg">
          <div className="text-[10px] font-mono uppercase text-[#5F6368]">Replaced</div>
          <div className="text-base font-mono font-bold text-[#D93025] mt-0.5">{replaced}</div>
          <div className="text-[9px] text-[#5F6368] font-mono mt-0.5">
            {total > 0 ? Math.round((replaced / total) * 100) : 0}% of runs
          </div>
        </div>
        <div className="bg-[#F8F9FA] border border-[#DADCE0] p-2 rounded-lg">
          <div className="text-[10px] font-mono uppercase text-[#5F6368]">Diagnosed</div>
          <div className="text-base font-mono font-bold text-[#B06000] mt-0.5">{diagnosed}</div>
          <div className="text-[9px] text-[#5F6368] font-mono mt-0.5">
            {total > 0 ? Math.round((diagnosed / total) * 100) : 0}% of runs
          </div>
        </div>
      </div>

      <div className="h-36 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 15, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8EAED" horizontal={false} />
            <XAxis
              type="number"
              allowDecimals={false}
              tick={{ fill: '#5F6368', fontSize: 10, fontFamily: 'monospace' }}
              axisLine={{ stroke: '#DADCE0' }}
              tickLine={{ stroke: '#DADCE0' }}
            />
            <YAxis
              dataKey="name"
              type="category"
              tick={{ fill: '#5F6368', fontSize: 11, fontFamily: 'monospace' }}
              axisLine={{ stroke: '#DADCE0' }}
              tickLine={{ stroke: '#DADCE0' }}
              width={75}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="bg-white border border-[#DADCE0] p-2 rounded shadow-md text-xs font-mono">
                      <div className="font-bold text-[#202124] mb-0.5">{d.name}</div>
                      <div className="text-[#5F6368] text-[10px] mb-1">{d.description}</div>
                      <div className="text-[#1A73E8] font-bold">Volume: {d.count} unit(s)</div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="count" radius={[0, 2, 2, 0]} maxBarSize={20}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 2-3 Line Visual Explainability */}
      <div className="bg-[#F8F9FA] border border-[#E8EAED] rounded-md p-2.5 flex items-start gap-2 text-[11px] leading-relaxed text-[#3C4043]">
        <Info className="w-3.5 h-3.5 text-[#1A73E8] shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-[#202124] uppercase text-[10px] tracking-wider font-mono mr-1.5">
            Analysis Explainability:
          </span>
          Analyzes diagnostic telemetry to evaluate economic repair viability versus total replacement. Trays with component-level faults (e.g. capacitors, voltage regulators) are routed for rework, while severe silicon or substrate failures trigger immediate socket reclaim and replacement.
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   Agent 3: Urgency Priority Distribution Chart (P1, P2, P3, P4)
   ========================================================================= */
interface Agent3UrgencyChartProps {
  records: AgentExecutionRecord[];
}

export const Agent3UrgencyChart: React.FC<Agent3UrgencyChartProps> = ({ records }) => {
  const a3Records = records.filter((r) => r.agentId === 'agent-3');

  let p1 = 0;
  let p2 = 0;
  let p3 = 0;
  let p4 = 0;

  for (const r of a3Records) {
    const priority = r.overriddenOutput?.priority || r.output?.priority;
    if (priority === 'P1') p1++;
    else if (priority === 'P2') p2++;
    else if (priority === 'P3') p3++;
    else if (priority === 'P4') p4++;
  }

  const chartData = [
    { name: 'P1 Critical', count: p1, color: '#D93025', rdd: 'Next Flight Out (<24h)' },
    { name: 'P2 High', count: p2, color: '#F9AB00', rdd: 'Priority Air (<48h)' },
    { name: 'P3 Medium', count: p3, color: '#1A73E8', rdd: 'Regional Ground (<5d)' },
    { name: 'P4 Low', count: p4, color: '#188038', rdd: 'Consolidated Freight (<10d)' },
  ];

  const total = p1 + p2 + p3 + p4;

  return (
    <div className="bg-white border border-[#DADCE0] rounded-lg p-4 space-y-3 shadow-xs">
      <div className="flex items-center justify-between pb-2 border-b border-[#E8EAED]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#FCE8E6] border border-[#FAD2CF] flex items-center justify-center text-[#D93025]">
            <Flame className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-[#202124] uppercase tracking-wider font-mono">
              Urgency Priority & SLA Exposure
            </h4>
            <span className="text-[10px] text-[#5F6368] font-sans">
              Cluster spare buffer & Required Delivery Date (RDD)
            </span>
          </div>
        </div>
        <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-[#F8F9FA] border border-[#DADCE0] text-[#202124]">
          Evaluated: <strong className="text-[#202124]">{total}</strong>
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="bg-[#F8F9FA] border border-[#DADCE0] p-2 rounded-lg">
          <div className="text-[10px] font-mono uppercase text-[#D93025]">P1 Crit</div>
          <div className="text-base font-mono font-bold text-[#202124] mt-0.5">{p1}</div>
          <div className="text-[9px] text-[#5F6368] font-mono mt-0.5">&lt;24h NFO</div>
        </div>
        <div className="bg-[#F8F9FA] border border-[#DADCE0] p-2 rounded-lg">
          <div className="text-[10px] font-mono uppercase text-[#B06000]">P2 High</div>
          <div className="text-base font-mono font-bold text-[#202124] mt-0.5">{p2}</div>
          <div className="text-[9px] text-[#5F6368] font-mono mt-0.5">&lt;48h Air</div>
        </div>
        <div className="bg-[#F8F9FA] border border-[#DADCE0] p-2 rounded-lg">
          <div className="text-[10px] font-mono uppercase text-[#1A73E8]">P3 Med</div>
          <div className="text-base font-mono font-bold text-[#202124] mt-0.5">{p3}</div>
          <div className="text-[9px] text-[#5F6368] font-mono mt-0.5">&lt;5d Ground</div>
        </div>
        <div className="bg-[#F8F9FA] border border-[#DADCE0] p-2 rounded-lg">
          <div className="text-[10px] font-mono uppercase text-[#188038]">P4 Low</div>
          <div className="text-base font-mono font-bold text-[#202124] mt-0.5">{p4}</div>
          <div className="text-[9px] text-[#5F6368] font-mono mt-0.5">&lt;10d Stock</div>
        </div>
      </div>

      <div className="h-36 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8EAED" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: '#5F6368', fontSize: 10, fontFamily: 'monospace' }}
              axisLine={{ stroke: '#DADCE0' }}
              tickLine={{ stroke: '#DADCE0' }}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: '#5F6368', fontSize: 10, fontFamily: 'monospace' }}
              axisLine={{ stroke: '#DADCE0' }}
              tickLine={{ stroke: '#DADCE0' }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="bg-white border border-[#DADCE0] p-2 rounded shadow-md text-xs font-mono">
                      <div className="font-bold text-[#202124] mb-0.5">{d.name}</div>
                      <div className="text-[#5F6368] text-[10px] mb-1">Target RDD: {d.rdd}</div>
                      <div className="text-[#1A73E8] font-bold">Total: {d.count} unit(s)</div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="count" radius={[2, 2, 0, 0]} maxBarSize={28}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 2-3 Line Visual Explainability */}
      <div className="bg-[#F8F9FA] border border-[#E8EAED] rounded-md p-2.5 flex items-start gap-2 text-[11px] leading-relaxed text-[#3C4043]">
        <Info className="w-3.5 h-3.5 text-[#D93025] shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-[#202124] uppercase text-[10px] tracking-wider font-mono mr-1.5">
            Analysis Explainability:
          </span>
          Evaluates datacenter spare inventory health against SLA contractual limits and carrier transit feasibility to assign urgency tiers (P1-P4). Depleted buffers on critical clusters trigger P1 expedited Next Flight Out routing to avoid costly downtime penalties.
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   Agent 4: Spare Pool Eligibility Chart (Eligible, Quarantine, Ineligible)
   ========================================================================= */
interface Agent4SparePoolChartProps {
  records: AgentExecutionRecord[];
}

export const Agent4SparePoolChart: React.FC<Agent4SparePoolChartProps> = ({ records }) => {
  const a4Records = records.filter((r) => r.agentId === 'agent-4');

  let eligible = 0;
  let quarantine = 0;
  let ineligible = 0;

  for (const r of a4Records) {
    const pool = r.overriddenOutput?.sparePoolEligibility || r.output?.sparePoolEligibility;
    if (pool === 'Eligible') eligible++;
    else if (pool === 'Quarantine') quarantine++;
    else if (pool === 'Ineligible') ineligible++;
  }

  const chartData = [
    { name: 'Eligible', count: eligible, color: '#188038', desc: 'Depot Induction Ready' },
    { name: 'Quarantine', count: quarantine, color: '#B06000', desc: 'Hold for Level-2 QA' },
    { name: 'Ineligible', count: ineligible, color: '#D93025', desc: 'Vendor Reject / Scrap' },
  ];

  const total = eligible + quarantine + ineligible;

  return (
    <div className="bg-white border border-[#DADCE0] rounded-lg p-4 space-y-3 shadow-xs">
      <div className="flex items-center justify-between pb-2 border-b border-[#E8EAED]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#E6F4EA] border border-[#CEEAD6] flex items-center justify-center text-[#188038]">
            <CheckCheck className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-[#202124] uppercase tracking-wider font-mono">
              Spare Pool Reintegration Status
            </h4>
            <span className="text-[10px] text-[#5F6368] font-sans">
              Serial match, warranty clearance & depot eligibility
            </span>
          </div>
        </div>
        <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-[#F8F9FA] border border-[#DADCE0] text-[#202124]">
          Assets: <strong className="text-[#202124]">{total}</strong>
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-[#F8F9FA] border border-[#DADCE0] p-2 rounded-lg">
          <div className="text-[10px] font-mono uppercase text-[#188038]">Eligible</div>
          <div className="text-base font-mono font-bold text-[#202124] mt-0.5">{eligible}</div>
          <div className="text-[9px] text-[#5F6368] font-mono mt-0.5">Tier-1 Spares Pool</div>
        </div>
        <div className="bg-[#F8F9FA] border border-[#DADCE0] p-2 rounded-lg">
          <div className="text-[10px] font-mono uppercase text-[#B06000]">Quarantine</div>
          <div className="text-base font-mono font-bold text-[#202124] mt-0.5">{quarantine}</div>
          <div className="text-[9px] text-[#5F6368] font-mono mt-0.5">Physical Zone Q-3</div>
        </div>
        <div className="bg-[#F8F9FA] border border-[#DADCE0] p-2 rounded-lg">
          <div className="text-[10px] font-mono uppercase text-[#D93025]">Ineligible</div>
          <div className="text-base font-mono font-bold text-[#202124] mt-0.5">{ineligible}</div>
          <div className="text-[9px] text-[#5F6368] font-mono mt-0.5">RMA Rejection</div>
        </div>
      </div>

      <div className="h-36 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 15, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8EAED" horizontal={false} />
            <XAxis
              type="number"
              allowDecimals={false}
              tick={{ fill: '#5F6368', fontSize: 10, fontFamily: 'monospace' }}
              axisLine={{ stroke: '#DADCE0' }}
              tickLine={{ stroke: '#DADCE0' }}
            />
            <YAxis
              dataKey="name"
              type="category"
              tick={{ fill: '#5F6368', fontSize: 11, fontFamily: 'monospace' }}
              axisLine={{ stroke: '#DADCE0' }}
              tickLine={{ stroke: '#DADCE0' }}
              width={75}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="bg-white border border-[#DADCE0] p-2 rounded shadow-md text-xs font-mono">
                      <div className="font-bold text-[#202124] mb-0.5">{d.name}</div>
                      <div className="text-[#5F6368] text-[10px] mb-1">{d.desc}</div>
                      <div className="text-[#188038] font-bold">Count: {d.count} unit(s)</div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="count" radius={[0, 2, 2, 0]} maxBarSize={20}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 2-3 Line Visual Explainability */}
      <div className="bg-[#F8F9FA] border border-[#E8EAED] rounded-md p-2.5 flex items-start gap-2 text-[11px] leading-relaxed text-[#3C4043]">
        <Info className="w-3.5 h-3.5 text-[#188038] shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-[#202124] uppercase text-[10px] tracking-wider font-mono mr-1.5">
            Analysis Explainability:
          </span>
          Verifies physical dock receipts, barcode optical scans, and burn-in QA certificates against the original RMA manifest. Validated zero-fault hardware is immediately restocked into active Tier-1 datacenter inventory, while unverified or defective units are safely quarantined.
        </div>
      </div>
    </div>
  );
};
