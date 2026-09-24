import React, { useState } from 'react';
import { LLMConfigStatus } from '../../types';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Server, CheckCircle, AlertTriangle, RefreshCw, X, Zap, Shield } from 'lucide-react';

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
    <div id="provider-config-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-xs p-4">
      <div id="provider-config-modal-panel" className="w-full max-w-2xl bg-white rounded-xl shadow-xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-stone-900 text-white flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">LLM Reasoning Engine Settings</h3>
              <p className="text-xs text-stone-500">Configure provider endpoints for the LangGraph agent nodes</p>
            </div>
          </div>
          <button
            id="close-provider-modal-btn"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Providers List */}
          <div className="space-y-2.5">
            {/* 1. Gemini */}
            <div
              className={`p-3.5 rounded-lg border transition-all ${
                config?.activeProvider === 'gemini'
                  ? 'border-stone-900 bg-stone-50'
                  : 'border-stone-200 bg-white hover:border-stone-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="provider"
                    checked={config?.activeProvider === 'gemini'}
                    onChange={() => selectProvider('gemini')}
                    className="w-4 h-4 text-stone-900 accent-stone-900 cursor-pointer"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-stone-900">Google Gemini</span>
                      {config?.activeProvider === 'gemini' && (
                        <Badge variant="neutral" size="sm">Active</Badge>
                      )}
                    </div>
                    <div className="text-xs text-stone-500 mt-0.5">
                      Model: <code className="font-mono text-stone-700">gemini-2.5-flash</code> (Fast structured JSON completions)
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testConnectivity('gemini')}
                  loading={testingProvider === 'gemini'}
                  icon={<Zap className="w-3 h-3 text-amber-500" />}
                >
                  Test
                </Button>
              </div>
            </div>

            {/* 2. Ollama */}
            <div
              className={`p-3.5 rounded-lg border transition-all ${
                config?.activeProvider === 'ollama'
                  ? 'border-stone-900 bg-stone-50'
                  : 'border-stone-200 bg-white hover:border-stone-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="provider"
                    checked={config?.activeProvider === 'ollama'}
                    onChange={() => selectProvider('ollama')}
                    className="w-4 h-4 text-stone-900 accent-stone-900 cursor-pointer"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-stone-900">Ollama Local Engine</span>
                      {config?.activeProvider === 'ollama' && (
                        <Badge variant="neutral" size="sm">Active</Badge>
                      )}
                    </div>
                    <div className="text-xs text-stone-500 mt-0.5 space-x-2">
                      <span>URL: <code className="font-mono text-stone-700">{config?.ollama.baseUrl || 'http://localhost:11434'}</code></span>
                      <span>&bull;</span>
                      <span>Model: <code className="font-mono text-stone-700">{config?.ollama.model || 'llama3.2'}</code></span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testConnectivity('ollama')}
                  loading={testingProvider === 'ollama'}
                  icon={<Zap className="w-3 h-3 text-amber-500" />}
                >
                  Test
                </Button>
              </div>
            </div>

            {/* 3. Custom API */}
            <div
              className={`p-3.5 rounded-lg border transition-all ${
                config?.activeProvider === 'custom_api'
                  ? 'border-stone-900 bg-stone-50'
                  : 'border-stone-200 bg-white hover:border-stone-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="provider"
                    checked={config?.activeProvider === 'custom_api'}
                    onChange={() => selectProvider('custom_api')}
                    className="w-4 h-4 text-stone-900 accent-stone-900 cursor-pointer"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-stone-900">Custom OpenAI-Compatible API</span>
                      {config?.activeProvider === 'custom_api' && (
                        <Badge variant="neutral" size="sm">Active</Badge>
                      )}
                    </div>
                    <div className="text-xs text-stone-500 mt-0.5 space-x-2">
                      <span>URL: <code className="font-mono text-stone-700">{config?.customApi.baseUrl || 'https://api.openai.com/v1'}</code></span>
                      <span>&bull;</span>
                      <span>Model: <code className="font-mono text-stone-700">{config?.customApi.model || 'gpt-4o-mini'}</code></span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testConnectivity('custom_api')}
                  loading={testingProvider === 'custom_api'}
                  icon={<Zap className="w-3 h-3 text-amber-500" />}
                >
                  Test
                </Button>
              </div>
            </div>
          </div>

          {/* Test Feedback Result */}
          {testResult && (
            <div className={`p-3 rounded-lg border text-xs ${
              testResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              <div className="flex items-center gap-2 font-semibold">
                {testResult.success ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                )}
                <span>
                  {testResult.success ? 'Endpoint Reachable' : 'Connection Failed'} ({testResult.latencyMs}ms)
                </span>
              </div>
              <p className="mt-1">{testResult.message || testResult.error}</p>
              {testResult.guidance && (
                <p className="mt-1 text-[11px] opacity-80">{testResult.guidance}</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-stone-200 bg-stone-50/70 flex justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};
