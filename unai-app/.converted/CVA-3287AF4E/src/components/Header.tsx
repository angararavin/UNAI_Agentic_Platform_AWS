import React from 'react';
import { LLMConfigStatus } from '../types';
import { Network, Server, History, Sparkles, Activity, Layers } from 'lucide-react';

interface HeaderProps {
  config: LLMConfigStatus | null;
  onOpenConfig: () => void;
  onOpenHistory: () => void;
  historyCount: number;
  isAnalyzing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  config,
  onOpenConfig,
  onOpenHistory,
  historyCount,
  isAnalyzing
}) => {
  const providerLabel = config?.activeProvider === 'ollama'
    ? 'Ollama Engine'
    : config?.activeProvider === 'custom_api'
    ? 'Custom API (OpenAI-Compatible)'
    : 'Gemini Engine';

  return (
    <header id="app-header" className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Branding & Tagline */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
            <Network className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Order Surge Impact Analysis
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Layers className="w-3 h-3 text-indigo-500" />
                LangGraph Multi-Agent
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Demand Surge &bull; Supply Constraint &bull; Planner Action Intelligence
            </p>
          </div>
        </div>

        {/* Right: Controls & Status */}
        <div className="flex items-center gap-2.5">
          {/* Active status pulse if analyzing */}
          {isAnalyzing && (
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-medium animate-pulse">
              <Activity className="w-3.5 h-3.5 animate-spin" />
              <span>Agents Processing...</span>
            </div>
          )}

          {/* Provider Pill Button */}
          <button
            id="llm-provider-config-btn"
            onClick={onOpenConfig}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Configure LLM Provider (Ollama / Custom API)"
          >
            <Server className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Engine:</span>
            <span className="font-semibold text-slate-900">{providerLabel}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200"></span>
          </button>

          {/* History Button */}
          <button
            id="history-drawer-toggle-btn"
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Runs</span>
            {historyCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-900 text-white">
                {historyCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
