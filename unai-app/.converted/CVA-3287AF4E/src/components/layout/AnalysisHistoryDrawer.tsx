import React from 'react';
import { AnalysisRunResult } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { History, X, Download, FileText, ArrowRight, ShieldCheck } from 'lucide-react';

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
    a.download = `order-surge-${run.item.sku}-${run.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="history-drawer-backdrop" className="fixed inset-0 z-50 flex justify-end bg-stone-900/40 backdrop-blur-xs">
      <div id="history-drawer-panel" className="w-full max-w-md bg-white h-full shadow-xl border-l border-stone-200 flex flex-col">
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/80">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-stone-700" />
            <h3 className="text-sm font-bold text-stone-900">Analysis Run History</h3>
            <span className="text-xs bg-stone-200 text-stone-800 px-2 py-0.5 rounded-full font-semibold">
              {history.length}
            </span>
          </div>
          <button
            id="close-history-drawer-btn"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Runs List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-12 text-stone-400 text-xs">
              <FileText className="w-8 h-8 mx-auto mb-2 text-stone-300" />
              No surge analyses recorded yet. Run your first analysis from the dashboard.
            </div>
          ) : (
            history.map((run) => {
              const isSelected = run.id === currentRunId;
              const hitlStatus = run.humanReview?.status || 'pending_review';

              const hitlBadgeVariant: 'success' | 'warning' | 'info' | 'danger' = {
                pending_review: 'warning' as const,
                approved: 'success' as const,
                modified: 'info' as const,
                rejected: 'danger' as const
              }[hitlStatus];

              const hitlBadgeLabel = {
                pending_review: 'Pending Sign-off',
                approved: 'Approved',
                modified: 'Modified',
                rejected: 'Rejected'
              }[hitlStatus];

              return (
                <div
                  key={run.id}
                  id={`history-item-${run.id}`}
                  className={`p-3 rounded-lg border transition-all ${
                    isSelected
                      ? 'border-stone-900 bg-stone-50'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-stone-900">
                          {run.item.sku}
                        </span>
                        <Badge variant={hitlBadgeVariant} size="sm">
                          {hitlBadgeLabel}
                        </Badge>
                      </div>
                      <span className="text-xs text-stone-700 font-medium block truncate max-w-[240px] mt-0.5">
                        {run.item.name}
                      </span>
                    </div>

                    <span className="text-[11px] text-stone-400">
                      {new Date(run.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="mt-2 text-xs text-stone-600 flex items-center justify-between">
                    <span>
                      Surge: <strong>{run.input.surgeQuantity} units</strong> in {run.input.targetFulfillmentDays}d
                    </span>
                    <span className={run.supplyAnalysis.netInventoryBalance < 0 ? 'text-rose-600 font-semibold' : 'text-emerald-700 font-semibold'}>
                      {run.supplyAnalysis.netInventoryBalance < 0 ? `${run.supplyAnalysis.netInventoryBalance} Net` : `+${run.supplyAnalysis.netInventoryBalance} Net`}
                    </span>
                  </div>

                  <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between">
                    <button
                      onClick={() => downloadJson(run)}
                      className="text-[11px] text-stone-500 hover:text-stone-900 flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      JSON
                    </button>

                    <Button
                      variant={isSelected ? 'secondary' : 'outline'}
                      size="sm"
                      onClick={() => {
                        onSelectRun(run);
                        onClose();
                      }}
                    >
                      {isSelected ? 'Viewing' : 'Load Plan'}
                    </Button>
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
