import React from 'react';
import { AnalysisRunResult } from '../types';
import { History, X, Clock, ArrowRight, Download, FileText, CheckCircle2 } from 'lucide-react';

interface AnalysisHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: AnalysisRunResult[];
  onSelectRun: (run: AnalysisRunResult) => void;
  currentRunId?: string;
}

export const AnalysisHistoryDrawer: React.FC<AnalysisHistoryDrawerProps> = ({
  isOpen,
  onClose,
  history,
  onSelectRun,
  currentRunId
}) => {
  if (!isOpen) return null;

  const downloadJson = (run: AnalysisRunResult) => {
    const blob = new Blob([JSON.stringify(run, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `order-surge-analysis-${run.item.sku}-${run.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="history-drawer-backdrop" className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
      <div id="history-drawer-panel" className="w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col">
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Analysis Run History</h3>
            <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.2 rounded-full font-semibold">
              {history.length}
            </span>
          </div>
          <button
            id="close-history-drawer-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Runs List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              No surge analyses recorded yet. Run your first analysis from the dashboard.
            </div>
          ) : (
            history.map((run) => {
              const isSelected = run.id === currentRunId;
              const criticalityColor = {
                NONE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
                HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
                CRITICAL: 'bg-rose-50 text-rose-700 border-rose-200'
              }[run.plannerRecommendations.overallCriticality] || 'bg-slate-50 text-slate-700';

              return (
                <div
                  key={run.id}
                  id={`history-item-${run.id}`}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600/30 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-slate-700">
                          {run.item.sku}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${criticalityColor}`}>
                          {run.plannerRecommendations.overallCriticality}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-900 line-clamp-1 mt-0.5">
                        {run.item.name}
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => downloadJson(run)}
                      className="text-slate-400 hover:text-slate-700 p-1"
                      title="Export JSON"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="mt-2 text-xs text-slate-500 space-y-1">
                    <div className="flex justify-between">
                      <span>Surge Request:</span>
                      <strong className="text-slate-800 font-mono">
                        {run.input.surgeQuantity} units in {run.input.targetFulfillmentDays}d
                      </strong>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>Engine & Latency:</span>
                      <span className="text-slate-600">
                        {run.providerUsed} &bull; {(run.totalDurationMs / 1000).toFixed(1)}s
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      {new Date(run.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectRun(run);
                        onClose();
                      }}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Load View</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
