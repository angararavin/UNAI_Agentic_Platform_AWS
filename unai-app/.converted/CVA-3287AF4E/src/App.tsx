import React, { useState, useEffect } from 'react';
import { SupplyItem, SurgeInput, AnalysisRunResult, LLMConfigStatus, HumanDecisionInput } from './types';
import { Header, ProviderConfigModal, AnalysisHistoryDrawer } from './components/layout';
import { SkuSelector, SurgeInputForm } from './components/forms';
import {
  DemandAgentView,
  SupplyAgentView,
  PlannerAgentView,
  HumanInTheLoopCard,
  PipelineSteps
} from './components/agents';
import { Badge, Button } from './components/ui';
import { AlertCircle, RefreshCw, ChevronDown, ChevronUp, Terminal } from 'lucide-react';

export default function App() {
  const [items, setItems] = useState<SupplyItem[]>([]);
  const [selectedSku, setSelectedSku] = useState<string>('SKU-1049');
  const [currentResult, setCurrentResult] = useState<AnalysisRunResult | null>(null);
  const [history, setHistory] = useState<AnalysisRunResult[]>([]);
  const [config, setConfig] = useState<LLMConfigStatus | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isSubmittingDecision, setIsSubmittingDecision] = useState<boolean>(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState<boolean>(false);
  const [showTechnicalLogs, setShowTechnicalLogs] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load initial catalog & config
  useEffect(() => {
    async function loadData() {
      try {
        const [itemsRes, configRes, historyRes] = await Promise.all([
          fetch('/api/supply-chain/items'),
          fetch('/api/config'),
          fetch('/api/analysis-history')
        ]);

        if (itemsRes.ok) {
          const itemsData: SupplyItem[] = await itemsRes.json();
          setItems(itemsData);
          if (itemsData.length > 0) {
            setSelectedSku(itemsData[0].sku);
            // Run initial analysis so the user gets a working preview right away
            executeSurgeAnalysis({
              sku: itemsData[0].sku,
              surgeQuantity: itemsData[0].baselineDailyForecast * 10 * 2,
              targetFulfillmentDays: 10,
              customerName: 'Robotics Enterprise Hub',
              customerPriority: 'Critical',
              triggerReason: 'Automated Facility Expansion Surge'
            }, itemsData[0]);
          }
        }

        if (configRes.ok) {
          const configData = await configRes.json();
          setConfig(configData);
        }

        if (historyRes.ok) {
          const historyData = await historyRes.json();
          setHistory(historyData);
        }
      } catch (err: any) {
        console.error('Initialization error:', err);
        setErrorMessage('Could not connect to backend service.');
      }
    }

    loadData();
  }, []);

  const refreshConfig = async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const executeSurgeAnalysis = async (input: SurgeInput, overrideItem?: SupplyItem) => {
    setIsAnalyzing(true);
    setErrorMessage(null);

    const targetItem = overrideItem || items.find(i => i.sku === input.sku);
    if (!targetItem) {
      setErrorMessage(`SKU ${input.sku} not found`);
      setIsAnalyzing(false);
      return;
    }

    try {
      const res = await fetch('/api/analyze-surge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Surge analysis failed');
      }

      const result: AnalysisRunResult = await res.json();
      setCurrentResult(result);
      setHistory(prev => [result, ...prev.filter(h => h.id !== result.id)]);
    } catch (err: any) {
      console.error('Analysis error:', err);
      setErrorMessage(err.message || 'Failed to execute multi-agent analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Human in the loop decision submit
  const handleHumanDecisionSubmit = async (decision: HumanDecisionInput) => {
    if (!currentResult) return;
    setIsSubmittingDecision(true);
    try {
      const res = await fetch(`/api/analysis/${currentResult.id}/human-decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(decision)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit human planner decision');
      }

      const data = await res.json();
      if (data.run) {
        setCurrentResult(data.run);
        setHistory(prev => prev.map(h => (h.id === data.run.id ? data.run : h)));
      }
      if (data.item) {
        setItems(prev => prev.map(item => (item.sku === data.item.sku ? data.item : item)));
      }
    } catch (err: any) {
      console.error('HITL error:', err);
      setErrorMessage(err.message || 'Error processing human decision');
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  const selectedItem = items.find(i => i.sku === selectedSku);

  return (
    <div className="min-h-screen bg-stone-100/60 text-stone-900 flex flex-col font-sans antialiased">
      {/* Header */}
      <Header
        config={config}
        onOpenConfig={() => setIsConfigModalOpen(true)}
        onOpenHistory={() => setIsHistoryDrawerOpen(true)}
        historyCount={history.length}
        isAnalyzing={isAnalyzing}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="font-semibold text-rose-700 hover:text-rose-900 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 1. Target SKU Selection */}
        <section aria-label="SKU Selection">
          <SkuSelector
            items={items}
            selectedSku={selectedSku}
            onSelectSku={(sku) => {
              setSelectedSku(sku);
              const item = items.find(i => i.sku === sku);
              if (item) {
                executeSurgeAnalysis({
                  sku,
                  surgeQuantity: item.baselineDailyForecast * 10 * 2,
                  targetFulfillmentDays: 10,
                  customerName: 'Enterprise Account',
                  customerPriority: 'High',
                  triggerReason: 'Customer Unforecasted Capacity Ramp'
                }, item);
              }
            }}
            disabled={isAnalyzing}
          />
        </section>

        {/* 2. Surge Parameters Form */}
        {selectedItem && (
          <section aria-label="Surge Input Parameters">
            <SurgeInputForm
              selectedItem={selectedItem}
              onSubmit={executeSurgeAnalysis}
              isAnalyzing={isAnalyzing}
            />
          </section>
        )}

        {/* 3. Multi-Agent Pipeline Progress Tracker */}
        {currentResult && (
          <section aria-label="Workflow Status">
            <PipelineSteps run={currentResult} />
          </section>
        )}

        {/* 4. Sequential Multi-Agent Outputs & HITL Gate */}
        {currentResult ? (
          <div className="space-y-4">
            {/* Stage 1: Demand Analysis */}
            <DemandAgentView
              demandAnalysis={currentResult.demandAnalysis}
              item={currentResult.item}
              input={currentResult.input}
            />

            {/* Stage 2: Supply Impact */}
            <SupplyAgentView
              supplyAnalysis={currentResult.supplyAnalysis}
              item={currentResult.item}
              input={currentResult.input}
            />

            {/* Stage 3: AI Recommendations */}
            <PlannerAgentView
              recommendations={currentResult.plannerRecommendations}
              item={currentResult.item}
              input={currentResult.input}
            />

            {/* Stage 4: Human-in-the-Loop Review & Decision Gate */}
            <HumanInTheLoopCard
              run={currentResult}
              onDecisionSubmit={handleHumanDecisionSubmit}
              isSubmitting={isSubmittingDecision}
            />

            {/* Collapsible Technical Audit Trail & Agent Logs */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowTechnicalLogs(!showTechnicalLogs)}
                className="text-xs text-stone-500 hover:text-stone-800 flex items-center gap-1.5 cursor-pointer font-medium"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>{showTechnicalLogs ? 'Hide Agent Execution Telemetry' : 'View Agent Execution Telemetry & Latency Logs'}</span>
                {showTechnicalLogs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showTechnicalLogs && (
                <div className="mt-2 p-3 bg-stone-900 text-stone-200 rounded-lg font-mono text-xs space-y-2">
                  <div className="flex items-center justify-between text-stone-400 border-b border-stone-800 pb-1.5">
                    <span>Run ID: {currentResult.id} &bull; Total: {currentResult.totalDurationMs}ms</span>
                    <span>Provider: {currentResult.providerUsed} ({currentResult.modelUsed})</span>
                  </div>
                  <div className="space-y-1">
                    {currentResult.logs.map((log, i) => (
                      <div key={i} className="flex items-start justify-between gap-2 text-[11px]">
                        <span className="text-emerald-400 font-semibold">{log.node}</span>
                        <span className="text-stone-300 truncate max-w-md">{log.summary}</span>
                        <span className="text-stone-500 shrink-0">{log.durationMs}ms</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-stone-200 p-12 text-center text-stone-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-stone-600" />
            Initializing supply chain agents...
          </div>
        )}
      </main>

      {/* Modals & Slide-overs */}
      <ProviderConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        config={config}
        onProviderChanged={(newProvider) => {
          if (config) {
            setConfig({ ...config, activeProvider: newProvider });
          }
        }}
        onRefreshConfig={refreshConfig}
      />

      <AnalysisHistoryDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        history={history}
        onSelectRun={(run) => {
          setCurrentResult(run);
          setSelectedSku(run.item.sku);
        }}
        currentRunId={currentResult?.id}
      />
    </div>
  );
}
