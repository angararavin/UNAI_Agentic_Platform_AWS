import React, { useState } from 'react';
import {
  Layers,
  Wrench,
  Clock,
  Flame,
  CheckCheck,
  Coins,
  RotateCcw,
  RefreshCw,
  ShieldAlert,
  Cpu,
  Sliders,
  Sun,
  Moon,
} from 'lucide-react';
import { AISettings, ControlTowerAnalytics } from '../types';

export type TabType = 'tower' | 'agent-1' | 'agent-2' | 'agent-3' | 'agent-4';

interface HeaderProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  analytics: ControlTowerAnalytics | null;
  settings?: AISettings | null;
  onResetData: () => void;
  onRefresh?: () => void | Promise<void>;
  isRefreshing?: boolean;
  onOpenSettings?: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  analytics,
  settings,
  onResetData,
  onRefresh,
  isRefreshing = false,
  isDarkMode = false,
  onToggleDarkMode,
}) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const pendingCount = analytics?.pendingReviewCount || 0;

  const tabs: {
    id: TabType;
    label: string;
    description: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    {
      id: 'tower',
      label: 'Control Tower',
      description: 'Unified Fleet Operations & Multi-Agent Orchestration',
      icon: <Layers className="w-4 h-4" />,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    {
      id: 'agent-1',
      label: 'Agent 1: Disposition',
      description: 'Hardware Fault Analysis & Board-level Disposition',
      icon: <Wrench className="w-4 h-4" />,
      badge: analytics?.agent1Metrics?.pendingReview || undefined,
    },
    {
      id: 'agent-2',
      label: 'Agent 2: Dwell Time',
      description: 'Micro-SLO Bottleneck Detection & Dwell Monitoring',
      icon: <Clock className="w-4 h-4" />,
      badge: analytics?.agent2Metrics?.pendingReview || undefined,
    },
    {
      id: 'agent-3',
      label: 'Agent 3: Urgency',
      description: 'Dynamic RDD Prioritization & Outage Risk Scoring',
      icon: <Flame className="w-4 h-4" />,
      badge: analytics?.agent3Metrics?.pendingReview || undefined,
    },
    {
      id: 'agent-4',
      label: 'Agent 4: Reintegration',
      description: 'Return Manifest Verification & Depot Spare Pool Reintegration',
      icon: <CheckCheck className="w-4 h-4" />,
      badge: analytics?.agent4Metrics?.pendingReview || undefined,
    },
  ];

  return (
    <header className="bg-white dark:bg-[#202124] border-b border-[#E0E2E6] dark:border-[#3C4043] text-[#202124] dark:text-[#E8EAED] sticky top-0 z-40 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors">
      {/* Top bar with title and action buttons */}
      <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-6">
        <div className="flex items-center justify-between h-14 border-b border-[#E0E2E6] dark:border-[#3C4043]">
          <div className="flex items-center gap-3">
            {/* Google "G" Logo */}
            <div className="w-8 h-8 rounded-full bg-white dark:bg-[#303134] border border-[#E0E2E6] dark:border-[#5F6368] shadow-xs flex items-center justify-center select-none flex-shrink-0" title="Google">
              <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base sm:text-lg font-['Google_Sans',_Roboto,_sans-serif] font-bold tracking-tight text-[#202124] dark:text-[#E8EAED]">
                  Google's <span className="text-[#1A73E8] dark:text-[#8AB4F8]">Agentic Control Tower</span>
                </h1>
              </div>
              <p className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6] hidden sm:block font-['Google_Sans_Text',_Roboto,_sans-serif]">
                Hardware Lifecycle • Dwell Monitoring • Dynamic Urgency • Spare Pool Reintegration
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Pending Alert Badge */}
            {pendingCount > 0 && (
              <button
                onClick={() => onTabChange('tower')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#FEF7E0] hover:bg-[#FEEFC3] border border-[#F9AB00] text-[#B06000] text-[11px] font-mono font-bold animate-pulse shadow-xs cursor-pointer select-none transition-colors"
                title={`${pendingCount} decisions require Human-in-the-Loop review`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-[#E37400]" />
                <span>{pendingCount} PENDING REVIEW</span>
              </button>
            )}

            {/* Refresh / Re-sync Telemetry Button */}
            {onRefresh && (
              <button
                onClick={() => onRefresh()}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-[#E8F0FE] text-[#1A73E8] border border-[#DADCE0] hover:border-[#1A73E8] text-xs font-mono font-medium shadow-xs transition-all cursor-pointer select-none active:scale-95 disabled:opacity-50"
                title="Fetch latest telemetry and re-sync all records from backend"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="font-semibold">{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
              </button>
            )}

            {/* Dark Mode Toggle Switch */}
            {onToggleDarkMode && (
              <button
                type="button"
                onClick={onToggleDarkMode}
                className="p-1.5 text-[#5F6368] hover:text-[#202124] dark:text-[#9AA0A6] dark:hover:text-[#E8EAED] bg-white dark:bg-[#303134] hover:bg-[#F1F3F4] dark:hover:bg-[#3C4043] border border-[#DADCE0] dark:border-[#5F6368] rounded-md shadow-xs transition-colors cursor-pointer select-none"
                title={isDarkMode ? 'Switch to Light theme' : 'Switch to Dark theme'}
                aria-label="Toggle theme"
              >
                {isDarkMode ? (
                  <Sun className="w-3.5 h-3.5 text-[#F9AB00]" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-[#5F6368]" />
                )}
              </button>
            )}

            {/* Clear / Reset ledger button with accessible inline confirmation */}
            {showResetConfirm ? (
              <div className="flex items-center gap-1.5 bg-[#FEF7E0] border border-[#F9AB00] px-2.5 py-1 rounded-md text-xs shadow-xs animate-in fade-in">
                <span className="text-[#804200] font-medium text-[11px]">Reset all?</span>
                <button
                  onClick={() => {
                    setShowResetConfirm(false);
                    onResetData();
                  }}
                  className="px-2 py-0.5 bg-[#D93025] hover:bg-[#B31412] text-white rounded font-bold text-[10px] cursor-pointer shadow-xs transition-colors"
                >
                  Yes, Reset
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="px-2 py-0.5 bg-white hover:bg-[#F1F3F4] text-[#3C4043] rounded border border-[#DADCE0] text-[10px] cursor-pointer shadow-xs transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="p-1.5 text-[#5F6368] hover:text-[#D93025] bg-white hover:bg-[#FCE8E6] border border-[#DADCE0] hover:border-[#F28B82] rounded-md shadow-xs transition-colors cursor-pointer select-none"
                title="Reset all records to factory baseline test cases"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Top Pane Tabs Navigation - Google Cloud Console / Material Style */}
        <nav className="flex space-x-1.5 py-1.5 overflow-x-auto scrollbar-none" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                title={`${tab.label} — ${tab.description}`}
                className={`group flex items-center gap-2 px-3 py-1.5 text-xs font-['Google_Sans',_Roboto,_sans-serif] font-medium whitespace-nowrap transition-all duration-150 rounded-t-md cursor-pointer select-none active:scale-[0.98] ${
                  isActive
                    ? 'border-b-2 border-[#1A73E8] dark:border-[#8AB4F8] bg-[#E8F0FE] dark:bg-[#1A73E8]/20 text-[#1A73E8] dark:text-[#8AB4F8] font-semibold shadow-xs'
                    : 'border-b-2 border-transparent text-[#5F6368] dark:text-[#9AA0A6] hover:text-[#202124] dark:hover:text-[#E8EAED] hover:bg-[#F1F3F4] dark:hover:bg-[#303134]'
                }`}
              >
                <span className={`transition-transform duration-150 group-hover:scale-105 ${isActive ? 'text-[#1A73E8]' : 'text-[#5F6368] group-hover:text-[#1A73E8]'}`}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="text-[10px] font-['Roboto_Mono',_monospace] font-bold px-1.5 py-0.5 rounded-full bg-[#FEF7E0] text-[#B06000] border border-[#FEEFC3]">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
