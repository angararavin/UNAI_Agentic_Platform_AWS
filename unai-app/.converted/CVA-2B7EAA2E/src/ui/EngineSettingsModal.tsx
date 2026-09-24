import React, { useState, useEffect } from 'react';
import { Cpu, Server, Check, X, RefreshCw, AlertCircle, CheckCircle2, Shield, Zap, Sparkles } from 'lucide-react';
import { AISettings } from '../types';

interface EngineSettingsModalProps {
  settings: AISettings | null;
  onClose: () => void;
  onSave: (newSettings: Partial<AISettings>) => Promise<void>;
}

const POPULAR_NIM_MODELS = [
  { id: 'meta/llama-3.1-70b-instruct', label: 'Meta Llama 3.1 70B Instruct (Recommended)' },
  { id: 'meta/llama-3.3-70b-instruct', label: 'Meta Llama 3.3 70B Instruct' },
  { id: 'nvidia/nemotron-4-340b-instruct', label: 'NVIDIA Nemotron-4 340B Instruct' },
  { id: 'meta/llama-3.1-8b-instruct', label: 'Meta Llama 3.1 8B Instruct (Fast)' },
  { id: 'mistralai/mixtral-8x22b-instruct-v0.1', label: 'Mistral Mixtral 8x22B Instruct' },
  { id: 'custom', label: 'Enter Custom Model Identifier...' },
];

export const EngineSettingsModal: React.FC<EngineSettingsModalProps> = ({
  settings,
  onClose,
  onSave,
}) => {
  const [activeEngine, setActiveEngine] = useState<'ollama' | 'custom' | 'heuristic'>(
    (settings?.activeEngine as any) === 'ollama' ? 'ollama' : (settings?.activeEngine as any) === 'custom' ? 'custom' : 'ollama'
  );

  // Ollama configuration
  const [ollamaHost, setOllamaHost] = useState<string>(settings?.ollamaHost || 'http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState<string>(settings?.ollamaModel || 'llama3');

  // NVIDIA NIM / Custom REST API configuration
  const [customApiUrl, setCustomApiUrl] = useState<string>(
    settings?.customApiUrl || 'https://integrate.api.nvidia.com/v1'
  );
  const [customApiKey, setCustomApiKey] = useState<string>('');
  const [customModel, setCustomModel] = useState<string>(
    settings?.customModel || 'meta/llama-3.1-70b-instruct'
  );
  const [isCustomModelInput, setIsCustomModelInput] = useState<boolean>(
    !POPULAR_NIM_MODELS.some(m => m.id === (settings?.customModel || 'meta/llama-3.1-70b-instruct'))
  );

  // Testing status
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Saving status
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (settings) {
      if (settings.activeEngine === 'ollama' || settings.activeEngine === 'custom' || settings.activeEngine === 'heuristic') {
        setActiveEngine(settings.activeEngine as any);
      }
      if (settings.ollamaHost) setOllamaHost(settings.ollamaHost);
      if (settings.ollamaModel) setOllamaModel(settings.ollamaModel);
      if (settings.customApiUrl) setCustomApiUrl(settings.customApiUrl);
      if (settings.customModel) {
        setCustomModel(settings.customModel);
        setIsCustomModelInput(!POPULAR_NIM_MODELS.some(m => m.id === settings.customModel));
      }
    }
  }, [settings]);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/settings/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engine: activeEngine,
          host: ollamaHost,
          customUrl: customApiUrl,
          apiKey: customApiKey,
        }),
      });
      const data = await res.json();
      setTestResult({
        success: !!data.success,
        message: data.message || (data.success ? 'Connection verified successfully!' : 'Connection failed.'),
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Connection failed: ${err.message || 'Network error'}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const payload: Partial<AISettings> = {
        activeEngine,
        ollamaHost,
        ollamaModel,
        customApiUrl,
        customModel,
      };
      if (customApiKey) {
        payload.customApiKey = customApiKey;
      }

      await onSave(payload);
      setSaveSuccess(true);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Failed to save settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-[#DADCE0] rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#E8EAED] flex items-center justify-between bg-[#F8F9FA]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#E8F0FE] border border-[#D2E3FC] flex items-center justify-center text-[#1A73E8] shadow-xs">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-['Google_Sans',_sans-serif] font-bold text-[#202124]">
                AI Execution Engine Settings
              </h3>
              <p className="text-xs text-[#5F6368] font-['Google_Sans_Text',_sans-serif]">
                Direct live inference via NVIDIA NIM API or local Ollama (Zero mockups)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#5F6368] hover:text-[#202124] hover:bg-[#F1F3F4] rounded-full transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Primary Engine Selection */}
          <div className="space-y-2">
            <label className="text-xs font-['Google_Sans',_sans-serif] font-semibold text-[#202124] uppercase tracking-wider">
              Select Active Engine
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: NVIDIA NIM / Custom API */}
              <div
                onClick={() => {
                  setActiveEngine('custom');
                  setTestResult(null);
                }}
                className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  activeEngine === 'custom'
                    ? 'border-[#1A73E8] bg-[#E8F0FE]/40 shadow-xs'
                    : 'border-[#DADCE0] bg-white hover:border-[#BDC1C6]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#76B900]/15 text-[#76B900] font-black text-xs flex items-center justify-center border border-[#76B900]/30">
                      NIM
                    </div>
                    <span className="text-xs font-['Google_Sans',_sans-serif] font-bold text-[#202124]">
                      NVIDIA NIM API
                    </span>
                  </div>
                  {activeEngine === 'custom' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#1A73E8] ring-4 ring-[#E8F0FE]" />
                  )}
                </div>
                <p className="text-[11px] text-[#5F6368] font-['Google_Sans_Text',_sans-serif]">
                  Cloud or self-hosted NVIDIA NIM microservices with high-performance LLMs.
                </p>
              </div>

              {/* Option 2: Local Ollama */}
              <div
                onClick={() => {
                  setActiveEngine('ollama');
                  setTestResult(null);
                }}
                className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  activeEngine === 'ollama'
                    ? 'border-[#1A73E8] bg-[#E8F0FE]/40 shadow-xs'
                    : 'border-[#DADCE0] bg-white hover:border-[#BDC1C6]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#202124] text-white font-bold text-xs flex items-center justify-center">
                      <Server className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-['Google_Sans',_sans-serif] font-bold text-[#202124]">
                      Local Ollama
                    </span>
                  </div>
                  {activeEngine === 'ollama' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#1A73E8] ring-4 ring-[#E8F0FE]" />
                  )}
                </div>
                <p className="text-[11px] text-[#5F6368] font-['Google_Sans_Text',_sans-serif]">
                  100% offline, on-premise execution on your local machine or private server.
                </p>
              </div>
            </div>
          </div>

          {/* Engine Parameters */}
          {activeEngine === 'custom' && (
            <div className="bg-[#F8F9FA] border border-[#DADCE0] rounded-xl p-4 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-[#E8EAED]">
                <span className="text-xs font-['Google_Sans',_sans-serif] font-bold text-[#202124] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#1A73E8]" />
                  NVIDIA NIM Configuration
                </span>
                <span className="text-[10px] font-['Roboto_Mono',_monospace] text-[#5F6368]">
                  OpenAI-Compatible
                </span>
              </div>

              {/* Endpoint URL */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#3C4043]">
                  NIM API Base URL:
                </label>
                <input
                  type="text"
                  value={customApiUrl}
                  onChange={(e) => setCustomApiUrl(e.target.value)}
                  placeholder="https://integrate.api.nvidia.com/v1"
                  className="w-full text-xs font-['Roboto_Mono',_monospace] py-2 px-3 bg-white border border-[#DADCE0] rounded-lg focus:border-[#1A73E8] focus:outline-none"
                />
                <p className="text-[10px] text-[#5F6368]">
                  Default for NVIDIA NIM: <code className="text-[#1A73E8]">https://integrate.api.nvidia.com/v1</code>
                </p>
              </div>

              {/* API Key */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#3C4043] flex items-center justify-between">
                  <span>NVIDIA NIM API Key (Bearer Token):</span>
                  {settings?.hasApiKey && !customApiKey && (
                    <span className="text-[10px] text-[#137333] font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Key saved on server
                    </span>
                  )}
                </label>
                <input
                  type="password"
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  placeholder="nvapi-..."
                  className="w-full text-xs font-['Roboto_Mono',_monospace] py-2 px-3 bg-white border border-[#DADCE0] rounded-lg focus:border-[#1A73E8] focus:outline-none"
                />
                <p className="text-[10px] text-[#5F6368]">
                  Obtain from build.nvidia.com (Format: <code className="text-[#202124]">nvapi-...</code>).
                </p>
              </div>

              {/* Target Model */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#3C4043]">
                  Target Model Identifier:
                </label>
                {!isCustomModelInput ? (
                  <div className="space-y-2">
                    <select
                      value={customModel}
                      onChange={(e) => {
                        if (e.target.value === 'custom') {
                          setIsCustomModelInput(true);
                          setCustomModel('');
                        } else {
                          setCustomModel(e.target.value);
                        }
                      }}
                      className="w-full text-xs font-['Roboto_Mono',_monospace] py-2 px-3 bg-white border border-[#DADCE0] rounded-lg focus:border-[#1A73E8] focus:outline-none"
                    >
                      {POPULAR_NIM_MODELS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customModel}
                        onChange={(e) => setCustomModel(e.target.value)}
                        placeholder="e.g. meta/llama-3.1-70b-instruct"
                        className="flex-1 text-xs font-['Roboto_Mono',_monospace] py-2 px-3 bg-white border border-[#DADCE0] rounded-lg focus:border-[#1A73E8] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomModelInput(false);
                          setCustomModel(POPULAR_NIM_MODELS[0].id);
                        }}
                        className="px-2.5 py-1 text-xs bg-white border border-[#DADCE0] hover:bg-[#F1F3F4] text-[#5F6368] rounded-lg cursor-pointer"
                      >
                        Presets
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeEngine === 'ollama' && (
            <div className="bg-[#F8F9FA] border border-[#DADCE0] rounded-xl p-4 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-[#E8EAED]">
                <span className="text-xs font-['Google_Sans',_sans-serif] font-bold text-[#202124] flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-[#202124]" />
                  Local Ollama Configuration
                </span>
                <span className="text-[10px] font-['Roboto_Mono',_monospace] text-[#137333] bg-[#E6F4EA] px-2 py-0.5 rounded-full border border-[#CEEAD6]">
                  Offline / On-Prem
                </span>
              </div>

              {/* Ollama Host */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#3C4043]">
                  Ollama Base Host URL:
                </label>
                <input
                  type="text"
                  value={ollamaHost}
                  onChange={(e) => setOllamaHost(e.target.value)}
                  placeholder="http://localhost:11434"
                  className="w-full text-xs font-['Roboto_Mono',_monospace] py-2 px-3 bg-white border border-[#DADCE0] rounded-lg focus:border-[#1A73E8] focus:outline-none"
                />
                <p className="text-[10px] text-[#5F6368]">
                  Default: <code className="text-[#1A73E8]">http://localhost:11434</code> (ensure <code className="text-[#202124]">ollama serve</code> is running)
                </p>
              </div>

              {/* Ollama Model Tag */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#3C4043]">
                  Model Tag:
                </label>
                <input
                  type="text"
                  value={ollamaModel}
                  onChange={(e) => setOllamaModel(e.target.value)}
                  placeholder="llama3"
                  className="w-full text-xs font-['Roboto_Mono',_monospace] py-2 px-3 bg-white border border-[#DADCE0] rounded-lg focus:border-[#1A73E8] focus:outline-none"
                />
                <p className="text-[10px] text-[#5F6368]">
                  e.g., <code className="text-[#202124]">llama3</code>, <code className="text-[#202124]">mistral</code>, <code className="text-[#202124]">qwen2.5</code>, <code className="text-[#202124]">phi3</code>
                </p>
              </div>
            </div>
          )}

          {/* Fallback Heuristic Note */}
          <div className="p-3 bg-[#FEF7E0] border border-[#FEEFC3] rounded-xl flex items-start gap-2.5 text-xs text-[#804200]">
            <Shield className="w-4 h-4 text-[#B06000] shrink-0 mt-0.5" />
            <div className="font-['Google_Sans_Text',_sans-serif]">
              <strong>Deterministic Hardware Rules:</strong> If your selected engine experiences network timeouts or becomes unreachable, the system automatically falls back to deterministic rule logic to guarantee zero downtime.
            </div>
          </div>

          {/* Test Connection Banner */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs animate-in fade-in ${
                testResult.success
                  ? 'bg-[#E6F4EA] border-[#CEEAD6] text-[#137333]'
                  : 'bg-[#FCE8E6] border-[#FAD2CF] text-[#C5221F]'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span className="font-['Google_Sans_Text',_sans-serif] leading-relaxed">
                {testResult.message}
              </span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#E8EAED] bg-[#F8F9FA] flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-[#F1F3F4] text-[#3C4043] border border-[#DADCE0] text-xs font-['Google_Sans',_sans-serif] font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            {isTesting ? 'Testing Connection...' : 'Test Connection'}
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 bg-white hover:bg-[#F1F3F4] text-[#5F6368] border border-[#DADCE0] text-xs font-['Google_Sans',_sans-serif] font-medium rounded-lg cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 sm:flex-none px-5 py-2 bg-[#1A73E8] hover:bg-[#1557B0] text-white text-xs font-['Google_Sans',_sans-serif] font-semibold rounded-lg flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Saved!
                </>
              ) : (
                'Save & Apply Engine'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
