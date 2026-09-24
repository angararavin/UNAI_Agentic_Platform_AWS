import React, { useState, useEffect, useCallback } from 'react';
import {
  Agent1Input,
  Agent1Output,
  Agent2Input,
  Agent2Output,
  Agent3Input,
  Agent3Output,
  Agent4Input,
  Agent4Output,
  AgentExecutionRecord,
  AISettings,
  ControlTowerAnalytics,
} from './types';
import {
  Header,
  TabType,
  ControlTowerView,
  Agent1View,
  Agent2View,
  Agent3View,
  Agent4View,
  HumanReviewModal,
} from './ui';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('tower');
  const [analytics, setAnalytics] = useState<ControlTowerAnalytics | null>(null);
  const [records, setRecords] = useState<AgentExecutionRecord[]>([]);
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [selectedRecordForReview, setSelectedRecordForReview] = useState<AgentExecutionRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isKickoffRunning, setIsKickoffRunning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('google_control_tower_theme') === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleToggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('google_control_tower_theme', next ? 'dark' : 'light');
      } catch {}
      return next;
    });
  };

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [analyticsRes, recordsRes, settingsRes] = await Promise.all([
        fetch('/api/analytics'),
        fetch('/api/records'),
        fetch('/api/settings'),
      ]);

      if (!analyticsRes.ok || !recordsRes.ok || !settingsRes.ok) {
        throw new Error('Failed to retrieve control tower data from server');
      }

      const [analyticsData, recordsData, settingsData] = await Promise.all([
        analyticsRes.json(),
        recordsRes.json(),
        settingsRes.json(),
      ]);

      setAnalytics(analyticsData);
      setRecords(recordsData);
      setSettings(settingsData);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Error connecting to Control Tower API');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Agent 1 Run
  const handleRunAgent1 = async (input: Agent1Input): Promise<{ record: AgentExecutionRecord; output: Agent1Output }> => {
    const res = await fetch('/api/agent/1/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Agent 1 failed');
    }
    const data = await res.json();
    await fetchData();
    return data;
  };

  // Agent 2 Run
  const handleRunAgent2 = async (input: Agent2Input): Promise<{ record: AgentExecutionRecord; output: Agent2Output }> => {
    const res = await fetch('/api/agent/2/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Agent 2 failed');
    }
    const data = await res.json();
    await fetchData();
    return data;
  };

  // Agent 3 Run
  const handleRunAgent3 = async (input: Agent3Input): Promise<{ record: AgentExecutionRecord; output: Agent3Output }> => {
    const res = await fetch('/api/agent/3/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Agent 3 failed');
    }
    const data = await res.json();
    await fetchData();
    return data;
  };

  // Agent 4 Run
  const handleRunAgent4 = async (input: Agent4Input): Promise<{ record: AgentExecutionRecord; output: Agent4Output }> => {
    const res = await fetch('/api/agent/4/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Agent 4 failed');
    }
    const data = await res.json();
    await fetchData();
    return data;
  };

  // Kickoff All Agents (Runs all 4 autonomous agents sequentially straight from Control Tower)
  const handleKickoffAllAgents = async () => {
    setIsKickoffRunning(true);
    setError(null);
    try {
      const res = await fetch('/api/fleet/kickoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to kickoff agent fleet');
      }
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to kickoff agent fleet');
    } finally {
      setIsKickoffRunning(false);
    }
  };

  // Human Review Submission
  const handleReviewSubmit = async (
    id: string,
    newStatus: 'human_approved' | 'human_rejected' | 'human_overridden',
    reviewer: string,
    notes: string,
    overriddenOutput?: Record<string, any>
  ) => {
    const res = await fetch(`/api/records/${id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        newStatus,
        approvalStatus: newStatus,
        reviewer,
        reviewedBy: reviewer,
        notes,
        humanReviewNotes: notes,
        overriddenOutput,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to submit review');
    }
    await fetchData();
  };

  // Reset Records to Default State (Inline confirmation handled in Header UI)
  const handleResetData = async () => {
    try {
      setIsRefreshing(true);
      await fetch('/api/records/reset', { method: 'POST' });
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to reset records');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Re-sync all live records and telemetry
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchData();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Update AI Settings
  const handleUpdateSettings = async (newSettings: Partial<AISettings>) => {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings),
    });
    if (!res.ok) {
      throw new Error('Failed to update AI settings');
    }
    const data = await res.json();
    setSettings(data.settings);
  };

  // Update Human Approval Rule Threshold
  const handleUpdateThreshold = async (agentId: string, threshold: number) => {
    const res = await fetch('/api/settings/thresholds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, threshold }),
    });
    if (!res.ok) {
      throw new Error('Failed to update threshold');
    }
    const data = await res.json();
    if (settings) {
      setSettings({
        ...settings,
        approvalThresholds: data.approvalThresholds,
      });
    }
    await fetchData();
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
      isDarkMode
        ? 'dark bg-[#202124] text-[#E8EAED] selection:bg-[#8AB4F8] selection:text-[#202124]'
        : 'bg-[#F8F9FA] text-[#202124] selection:bg-[#1A73E8] selection:text-white'
    }`}>
      {/* Header with Top Tabs Navigation */}
      <Header
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        analytics={analytics}
        settings={settings}
        onResetData={handleResetData}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-5 lg:px-6 py-4">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-[#FCE8E6] border border-[#FAD2CF] flex items-center justify-between text-xs text-[#C5221F] shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#D93025]" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchData}
              className="px-3 py-1 bg-white border border-[#DADCE0] hover:bg-[#F1F3F4] rounded text-[11px] text-[#202124] font-medium shadow-xs transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-[#5F6368] gap-3">
            <RefreshCw className="w-7 h-7 animate-spin text-[#1A73E8]" />
            <p className="text-xs font-mono uppercase tracking-wider text-[#5F6368]">Initializing Control Tower & Hardware Agents...</p>
          </div>
        ) : (
          <>
            {currentTab === 'tower' && (
              <ControlTowerView
                analytics={analytics}
                records={records}
                onSelectRecordForReview={(r) => setSelectedRecordForReview(r)}
                onNavigateTab={(tab) => setCurrentTab(tab)}
                onKickoffAllAgents={handleKickoffAllAgents}
                isKickoffRunning={isKickoffRunning}
              />
            )}

            {currentTab === 'agent-1' && (
              <Agent1View
                analytics={analytics}
                records={records}
                onRunAgent={handleRunAgent1}
                onSelectRecordForReview={(r) => setSelectedRecordForReview(r)}
                onRefresh={fetchData}
                threshold={settings?.approvalThresholds?.['agent-1'] ?? 85}
              />
            )}

            {currentTab === 'agent-2' && (
              <Agent2View
                analytics={analytics}
                records={records}
                onRunAgent={handleRunAgent2}
                onSelectRecordForReview={(r) => setSelectedRecordForReview(r)}
                onRefresh={fetchData}
                threshold={settings?.approvalThresholds?.['agent-2'] ?? 80}
              />
            )}

            {currentTab === 'agent-3' && (
              <Agent3View
                analytics={analytics}
                records={records}
                onRunAgent={handleRunAgent3}
                onSelectRecordForReview={(r) => setSelectedRecordForReview(r)}
                onRefresh={fetchData}
                threshold={settings?.approvalThresholds?.['agent-3'] ?? 90}
              />
            )}

            {currentTab === 'agent-4' && (
              <Agent4View
                analytics={analytics}
                records={records}
                onRunAgent={handleRunAgent4}
                onSelectRecordForReview={(r) => setSelectedRecordForReview(r)}
                onRefresh={fetchData}
                threshold={settings?.approvalThresholds?.['agent-4'] ?? 95}
              />
            )}
          </>
        )}
      </main>

      {/* Shared Human-in-the-Loop Review Modal */}
      {selectedRecordForReview && (
        <HumanReviewModal
          record={selectedRecordForReview}
          onClose={() => setSelectedRecordForReview(null)}
          onReviewSubmit={handleReviewSubmit}
        />
      )}

      {/* Clean Minimal Footer */}
      <footer className="border-t border-[#E0E2E6] dark:border-[#3C4043] bg-white dark:bg-[#202124] py-3 text-xs text-[#5F6368] dark:text-[#9AA0A6] font-['Google_Sans_Text',_sans-serif] mt-auto">
        <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px]">
            <span className="font-semibold text-[#202124] dark:text-[#E8EAED]">RMA Control Tower</span>
            <span>•</span>
            <span>Hardware Multi-Agent Fleet</span>
          </div>
          <div className="text-[11px] font-mono text-[#5F6368] dark:text-[#9AA0A6]">
            Production Ready • Config: .env
          </div>
        </div>
      </footer>
    </div>
  );
}
