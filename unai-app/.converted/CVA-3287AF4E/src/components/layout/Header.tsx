import React from 'react';
import { LLMConfigStatus } from '../../types';
import { Button } from '../ui/Button';
import { Tooltip } from '../ui/Tooltip';
import { Network, History, Activity, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  config?: LLMConfigStatus | null;
  onOpenConfig?: () => void;
  onOpenHistory: () => void;
  historyCount: number;
  isAnalyzing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenHistory,
  historyCount,
  isAnalyzing
}) => {
  return (
    <header id="app-header" className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-15 flex items-center justify-between">
        {/* Left: App Title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-stone-900 text-white flex items-center justify-center">
            <Network className="w-4 h-4 text-stone-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-stone-900 tracking-tight">
                Order Surge Impact Analysis
              </h1>
              <Tooltip
                position="bottom"
                content="Autonomous LangGraph multi-agent architecture with Demand Analyst, Supply Impact, Planner Recommender, and Human Decision Gate."
              >
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-stone-100 text-stone-700 border border-stone-200 cursor-help">
                  <ShieldCheck className="w-3 h-3 text-stone-500" />
                  LangGraph + HITL
                </span>
              </Tooltip>
            </div>
            <p className="text-[11px] text-stone-500 hidden sm:block">
              Autonomous multi-agent demand & supply intelligence with Human-in-the-Loop governance
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {isAnalyzing && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-stone-100 text-stone-800 text-xs font-medium">
              <Activity className="w-3 h-3 animate-spin text-stone-600" />
              <span className="hidden sm:inline">Agents Processing...</span>
            </div>
          )}

          <Tooltip
            position="bottom"
            content={`${historyCount} saved analysis runs in local session memory. Click to review or export past surge analyses.`}
          >
            <Button
              id="history-drawer-toggle-btn"
              variant="outline"
              size="sm"
              onClick={onOpenHistory}
              icon={<History className="w-3.5 h-3.5 text-stone-500" />}
            >
              <span>Runs</span>
              {historyCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-stone-900 text-white">
                  {historyCount}
                </span>
              )}
            </Button>
          </Tooltip>
        </div>
      </div>
    </header>
  );
};
