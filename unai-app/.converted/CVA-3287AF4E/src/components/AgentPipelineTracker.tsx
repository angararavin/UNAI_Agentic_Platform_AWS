import React, { useState } from 'react';
import { AgentExecutionLog } from '../types';
import { Bot, CheckCircle2, Clock, Terminal, ChevronDown, ChevronUp, Cpu, ArrowRight } from 'lucide-react';

interface AgentPipelineTrackerProps {
  logs: AgentExecutionLog[];
  isAnalyzing: boolean;
  totalDurationMs?: number;
  providerUsed?: string;
  modelUsed?: string;
}

export const AgentPipelineTracker: React.FC<AgentPipelineTrackerProps> = ({
  logs,
  isAnalyzing,
  totalDurationMs,
  providerUsed,
  modelUsed
}) => {
  const [showLogs, setShowLogs] = useState<boolean>(false);

  const stages = [
    {
      id: 'demand_analyst',
      title: 'Demand Analyst Agent',
      desc: 'Forecast vs Orders & Demand Signals',
      icon: '1'
    },
    {
      id: 'supply_impact_analyst',
      title: 'Supply Impact Analyst Agent',
      desc: 'Inventory, Open POs & Capacity Feasibility',
      icon: '2'
    },
    {
      id: 'planner_recommendation',
      title: 'Planner Recommendation Agent',
      desc: 'Action Matrix & Mitigation Strategy',
      icon: '3'
    }
  ];

  return (
    <div id="agent-pipeline-tracker" className="bg-slate-900 text-white rounded-xl p-4 shadow-sm border border-slate-800 space-y-3">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Bot className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              LangGraph State Execution Pipeline
            </span>
            <span className="text-[11px] text-slate-400 block sm:inline sm:ml-2">
              Sequential State Flow: <code className="text-indigo-400 font-mono">START &rarr; Demand &rarr; Supply &rarr; Planner &rarr; END</code>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          {totalDurationMs !== undefined && (
            <span className="flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded font-mono text-[11px] text-slate-300">
              <Clock className="w-3 h-3 text-indigo-400" />
              {(totalDurationMs / 1000).toFixed(2)}s total
            </span>
          )}
          {modelUsed && (
            <span className="hidden md:flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded font-mono text-[11px] text-slate-300">
              <Cpu className="w-3 h-3 text-emerald-400" />
              {providerUsed}: {modelUsed}
            </span>
          )}
          <button
            id="toggle-agent-logs-btn"
            type="button"
            onClick={() => setShowLogs(!showLogs)}
            className="flex items-center gap-1 text-[11px] font-medium text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
          >
            <Terminal className="w-3 h-3" />
            <span>{showLogs ? 'Hide Logs' : 'View Trace'}</span>
            {showLogs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Visual Pipeline Nodes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
        {stages.map((stage, idx) => {
          const log = logs.find(l => l.node === stage.id);
          const isDone = Boolean(log && log.status === 'completed');
          const isCurrent = isAnalyzing && (!log || log.status === 'running');

          return (
            <div
              key={stage.id}
              id={`pipeline-stage-${stage.id}`}
              className={`p-3 rounded-lg border transition-all flex items-start gap-2.5 ${
                isDone
                  ? 'bg-slate-800/80 border-emerald-500/40 text-slate-200'
                  : isCurrent
                  ? 'bg-indigo-950/40 border-indigo-500 text-indigo-200 animate-pulse'
                  : 'bg-slate-800/30 border-slate-800 text-slate-400'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  isDone
                    ? 'bg-emerald-500 text-slate-950'
                    : isCurrent
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {isDone ? <CheckCircle2 className="w-4 h-4" /> : stage.icon}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold truncate text-slate-200">{stage.title}</h4>
                  {log?.durationMs && (
                    <span className="text-[10px] font-mono text-slate-400">
                      {log.durationMs}ms
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">{stage.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Expandable Trace Log */}
      {showLogs && logs.length > 0 && (
        <div id="agent-logs-container" className="mt-3 p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono space-y-2 max-h-48 overflow-y-auto">
          <div className="text-[11px] text-slate-500 border-b border-slate-900 pb-1 flex justify-between">
            <span>LangGraph Agent Telemetry Stream</span>
            <span>{logs.length} Node Events</span>
          </div>
          {logs.map((log, index) => (
            <div key={index} className="text-slate-300 space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-indigo-400 font-bold">[{log.agent}]</span>
                <span className="text-slate-500 text-[10px]">{log.completedAt ? new Date(log.completedAt).toLocaleTimeString() : ''}</span>
                <span className="text-emerald-400 text-[10px]">+{log.durationMs}ms</span>
                <span className="text-slate-400 text-[10px]">{log.modelUsed}</span>
              </div>
              <p className="text-slate-300 pl-2 border-l-2 border-slate-800 text-[11px]">
                {log.summary}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
