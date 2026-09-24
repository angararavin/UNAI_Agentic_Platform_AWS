import React, { useState } from 'react';
import { LLMConfigStatus } from '../types';
import { Server, CheckCircle, AlertTriangle, RefreshCw, X, Radio, ArrowRight, Zap, Shield } from 'lucide-react';

interface ProviderConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: LLMConfigStatus | null;
  onProviderChanged: (provider: 'ollama' | 'custom_api' | 'gemini') => void;
  onRefreshConfig: () => void;
}

export const ProviderConfigModal: React.FC<ProviderConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onProviderChanged,
  onRefreshConfig
}) => {
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    provider: string;
    success: boolean;
    latencyMs?: number;
    message?: string;
    error?: string;
    guidance?: string;
  } | null>(null);

  if (!isOpen) return null;

  const testConnectivity = async (provider: 'ollama' | 'custom_api' | 'gemini') => {
    setTestingProvider(provider);
    setTestResult(null);
    try {
      const res = await fetch('/api/config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider })
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({
        provider,
        success: false,
        error: err.message || 'Connection test request failed',
        guidance: 'Ensure network endpoint is reachable from this server environment.'
      });
    } finally {
      setTestingProvider(null);
    }
  };

  const selectProvider = async (provider: 'ollama' | 'custom_api' | 'gemini') => {
    try {
      const res = await fetch('/api/config/provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider })
      });
      if (res.ok) {
        onProviderChanged(provider);
        onRefreshConfig();
      }
    } catch (err) {
      console.error('Failed to change provider:', err);
    }
  };

  return (
    <div id="provider-config-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div id="provider-config-modal-panel" className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">LLM Provider & Engine Settings</h3>
              <p className="text-xs text-slate-500">Configure and verify the AI reasoning engine for the LangGraph agents</p>
            </div>
          </div>
          <button
            id="close-provider-modal-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          <div className="text-xs text-slate-600 bg-blue-50 border border-blue-200 p-3 rounded-lg flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-blue-900">Enterprise Environment Integration:</span>
              <p className="mt-0.5 text-blue-800">
                You can switch between <strong>Ollama</strong> (local/hosted instance) and <strong>Custom API</strong> (OpenAI-compatible endpoints like vLLM, Ollama-OpenAI, or enterprise gateways), or fallback to <strong>Gemini</strong>. Configuration is persisted in <code className="bg-blue-100 px-1 py-0.5 rounded text-blue-900 font-mono">.env</code>.
              </p>
            </div>
          </div>

          {/* Providers List */}
          <div className="space-y-3">
            {/* 1. Ollama */}
            <div
              id="provider-card-ollama"
              className={`p-4 rounded-xl border-2 transition-all ${
                config?.activeProvider === 'ollama'
                  ? 'border-indigo-600 bg-indigo-50/40'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    id="provider-ollama-radio"
                    name="provider"
                    checked={config?.activeProvider === 'ollama'}
                    onChange={() => selectProvider('ollama')}
                    className="w-4 h-4 text-indigo-600 accent-indigo-600"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900">Ollama Local / Remote Engine</span>
                      {config?.activeProvider === 'ollama' && (
                        <span className="text-[11px] font-medium bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 space-x-2">
                      <span>Base URL: <code className="text-slate-700 font-mono">{config?.ollama.baseUrl || 'http://localhost:11434'}</code></span>
                      <span>&bull;</span>
                      <span>Model: <code className="text-slate-700 font-mono">{config?.ollama.model || 'llama3.2'}</code></span>
                    </div>
                  </div>
                </div>

                <button
                  id="test-ollama-btn"
                  onClick={() => testConnectivity('ollama')}
                  disabled={testingProvider === 'ollama'}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {testingProvider === 'ollama' ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      Test Ping
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 2. Custom API */}
            <div
              id="provider-card-custom-api"
              className={`p-4 rounded-xl border-2 transition-all ${
                config?.activeProvider === 'custom_api'
                  ? 'border-indigo-600 bg-indigo-50/40'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    id="provider-custom-api-radio"
                    name="provider"
                    checked={config?.activeProvider === 'custom_api'}
                    onChange={() => selectProvider('custom_api')}
                    className="w-4 h-4 text-indigo-600 accent-indigo-600"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900">Custom OpenAI-Compatible API</span>
                      {config?.activeProvider === 'custom_api' && (
                        <span className="text-[11px] font-medium bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 space-x-2">
                      <span>Endpoint: <code className="text-slate-700 font-mono">{config?.customApi.baseUrl || 'https://api.openai.com/v1'}</code></span>
                      <span>&bull;</span>
                      <span>Model: <code className="text-slate-700 font-mono">{config?.customApi.model || 'gpt-4o-mini'}</code></span>
                    </div>
                  </div>
                </div>

                <button
                  id="test-custom-api-btn"
                  onClick={() => testConnectivity('custom_api')}
                  disabled={testingProvider === 'custom_api'}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {testingProvider === 'custom_api' ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      Test Ping
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 3. Gemini Fallback/Option */}
            <div
              id="provider-card-gemini"
              className={`p-4 rounded-xl border-2 transition-all ${
                config?.activeProvider === 'gemini'
                  ? 'border-indigo-600 bg-indigo-50/40'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    id="provider-gemini-radio"
                    name="provider"
                    checked={config?.activeProvider === 'gemini'}
                    onChange={() => selectProvider('gemini')}
                    className="w-4 h-4 text-indigo-600 accent-indigo-600"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900">Google Gemini Engine</span>
                      {config?.activeProvider === 'gemini' && (
                        <span className="text-[11px] font-medium bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      <span>Model: <code className="text-slate-700 font-mono">gemini-2.5-flash</code> (Available natively in workspace)</span>
                    </div>
                  </div>
                </div>

                <button
                  id="test-gemini-btn"
                  onClick={() => testConnectivity('gemini')}
                  disabled={testingProvider === 'gemini'}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {testingProvider === 'gemini' ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      Test Ping
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Test Diagnostic Box */}
          {testResult && (
            <div
              id="test-diagnostic-output"
              className={`p-4 rounded-xl border ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5 font-semibold text-xs uppercase tracking-wide">
                {testResult.success ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Ping Successful ({testResult.latencyMs}ms)</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Connection Diagnostic Notice</span>
                  </>
                )}
              </div>
              <p className="text-xs font-medium">{testResult.message || testResult.error}</p>
              {testResult.guidance && (
                <p className="text-xs mt-2 pt-2 border-t border-amber-200 text-amber-800">
                  <strong>Recommendation:</strong> {testResult.guidance}
                </p>
              )}
            </div>
          )}

          {/* Architecture info */}
          <div className="border-t border-slate-200 pt-4 text-xs text-slate-500">
            <h4 className="font-semibold text-slate-800 mb-1">LangChain & LangGraph Execution Architecture:</h4>
            <p>
              When a demand surge is analyzed, LangGraph passes structured state through 3 discrete nodes:
              <span className="font-medium text-slate-700"> Demand Analyst</span> &rarr;
              <span className="font-medium text-slate-700"> Supply Impact Analyst</span> &rarr;
              <span className="font-medium text-slate-700"> Planner Recommendation Agent</span>.
              Each agent operates with its specialized system prompt and strict JSON schema guarantees.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            id="close-provider-modal-confirm-btn"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
