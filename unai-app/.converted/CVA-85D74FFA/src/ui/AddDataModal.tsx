import React, { useState } from 'react';
import { AgentId } from '../types';
import {
  X,
  Plus,
  Sparkles,
  Database,
  Wrench,
  Clock,
  Flame,
  CheckCheck,
  Check,
  Loader2,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

interface AddDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: AgentId;
  onRecordAdded: () => Promise<void>;
  onRunAgent1?: (input: any) => Promise<any>;
  onRunAgent2?: (input: any) => Promise<any>;
  onRunAgent3?: (input: any) => Promise<any>;
  onRunAgent4?: (input: any) => Promise<any>;
}

// Preset samples to easily 1-click add data for each agent
const AGENT_SAMPLE_DATA: Record<AgentId, Array<{ title: string; desc: string; data: any }>> = {
  'agent-1': [
    {
      title: 'Power Stage MOSFET Short (Rework Candidate)',
      desc: 'High-side VRM driver short on Phase 6 with intact GPU silicon',
      data: {
        trayId: 'TRAY-2026-VRM-8012',
        mpn: 'MPN-8820-GPU-H100-SXM5',
        failureCode: 'ERR_POWER_STAGE_MOSFET',
        failureDescription: 'High-side VRM driver short on Phase 6 causing over-current trip during load-step transient.',
        dchaLogs: 'DCHA v4.2.1 [WARN: VDD_CORE phase 6 gate resistance 1.2 ohm vs 10k nominal]. Silicon intact. VRM replacement viable.',
      },
    },
    {
      title: 'Optical Transceiver Eye Margin Failure (Burn-In Candidate)',
      desc: 'Intermittent optical loss on QSFP112 Port 2 under elevated chamber temp',
      data: {
        trayId: 'TRAY-2026-OPT-5509',
        mpn: 'MPN-7410-NIC-400G-CX7',
        failureCode: 'ERR_OPTICAL_TRANSCEIVER_TX',
        failureDescription: 'Laser diode bias current fluctuation causing intermittent bit errors at 850nm wavelength.',
        dchaLogs: 'DCHA v4.2.1 [WARN: BER 2.4e-9 exceeds 1e-12 spec at +65C]. Requires 24-hr multi-temperature loop analysis.',
      },
    },
  ],
  'agent-2': [
    {
      title: 'Thermal Chamber Burn-In Stall (Breach)',
      desc: 'Thermal oven chamber 4 stalled for 14.5 hours (micro-SLO: 8.0h)',
      data: {
        trayId: 'TRAY-2026-DWELL-4190',
        currentStage: 'THERMAL_CHAMBER_BURN_IN',
        hoursInStage: 14.5,
        microSlo: 8.0,
        location: 'Austin CM Thermal Chamber Bay 4',
        eventHistory: 'Chamber temperature controller warning delayed automated unload script. Shift queue unattended for 6 hours.',
      },
    },
    {
      title: 'Post-Repair DCHA Testing (Within SLO)',
      desc: 'Diagnostics underway at 1.8 hours (micro-SLO: 4.0h)',
      data: {
        trayId: 'TRAY-2026-DWELL-1104',
        currentStage: 'POST_REPAIR_DCHA_TEST',
        hoursInStage: 1.8,
        microSlo: 4.0,
        location: 'San Jose Refurb Facility Bench 12',
        eventHistory: 'Functional pattern tests executing normal vector passes at 45% completion.',
      },
    },
  ],
  'agent-3': [
    {
      title: 'Spine Switch Fatal Outage (P1 Next Flight Out)',
      desc: 'Zero cluster spares available with live distributed training blocked',
      data: {
        trayId: 'TRAY-2026-URG-9021',
        failureType: 'Primary Spine Switch Outage',
        failureCode: 'CRIT_SPINE_SWITCH_DOWN',
        dataCenter: 'DC-IOWA-CENTRAL-CLUSTER-2',
        spareInventory: 0,
        businessImpact: 'Affects 8,192 GPU training cluster nodes. Cluster idle SLA penalty $32,000/hr.',
        carrierStatus: 'Next Flight Out (NFO) air courier available with 4-hour departure cutoff.',
        cmQueueStatus: 'CM priority hotline standby line activated.',
      },
    },
    {
      title: 'Standby Retimer Failure (P3 Regional Ground)',
      desc: 'Redundant rack path available; 4 spares in stock',
      data: {
        trayId: 'TRAY-2026-URG-3390',
        failureType: 'Redundant Retimer Card Glitch',
        failureCode: 'WARN_PCIE_STANDBY_RETIMER',
        dataCenter: 'DC-NORTH-OREGON-POD-4',
        spareInventory: 4,
        businessImpact: 'Redundant path active; zero current user degradation. Buffer healthy.',
        carrierStatus: 'Scheduled 3-day consolidated freight truck route available.',
        cmQueueStatus: 'Standard batch processing queue turnaround 5 days.',
      },
    },
  ],
  'agent-4': [
    {
      title: 'OEM Certified Reintegration (Eligible)',
      desc: 'Serial verified match, OEM warranty valid through 2028',
      data: {
        trayId: 'TRAY-2026-REC-7719',
        rmaId: 'RMA-2026-US-99102',
        serialNumber: 'SN-H100-2025-449102-B',
        returnedSerial: 'SN-H100-2025-449102-B',
        repairStatus: 'Completed - Full 48hr Burn-In Verified',
        warrantyStatus: 'In Warranty (Active OEM Contract)',
        manifestDetails: 'CM Return Manifest #CM-9941: Complete reflow and test vector validation passed 100%.',
      },
    },
    {
      title: 'Serial Mismatch Flag (Quarantine)',
      desc: 'Returned serial does not match original RMA dispatch record',
      data: {
        trayId: 'TRAY-2026-REC-1198',
        rmaId: 'RMA-2026-EU-33109',
        serialNumber: 'SN-CX7-2024-883100',
        returnedSerial: 'SN-CX7-2023-110994-MISMATCH',
        repairStatus: 'Completed',
        warrantyStatus: 'In Warranty',
        manifestDetails: 'Barcode scanner flag: Returned serial does not correspond to RMA outbound manifest.',
      },
    },
  ],
};

export const AddDataModal: React.FC<AddDataModalProps> = ({
  isOpen,
  onClose,
  agentId,
  onRecordAdded,
  onRunAgent1,
  onRunAgent2,
  onRunAgent3,
  onRunAgent4,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states per agent
  const [trayId, setTrayId] = useState<string>(() => `TRAY-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  
  // Agent 1 fields
  const [a1Mpn, setA1Mpn] = useState('MPN-8820-GPU-H100-SXM5');
  const [a1Code, setA1Code] = useState('ERR_POWER_STAGE_MOSFET');
  const [a1Desc, setA1Desc] = useState('High-side VRM driver short on Phase 6 causing over-current trip.');
  const [a1Dcha, setA1Dcha] = useState('DCHA v4.2.1 [WARN: Phase 6 gate impedance abnormal]. Silicon intact. VRM rework viable.');

  // Agent 2 fields
  const [a2Stage, setA2Stage] = useState('THERMAL_CHAMBER_BURN_IN');
  const [a2Hours, setA2Hours] = useState('11.5');
  const [a2Slo, setA2Slo] = useState('8.0');
  const [a2Location, setA2Location] = useState('Austin CM Thermal Bay 4');
  const [a2History, setA2History] = useState('Unload sequence delayed. Automated robotic handler queued.');

  // Agent 3 fields
  const [a3Type, setA3Type] = useState('Primary Spine Switch Outage');
  const [a3Code, setA3Code] = useState('CRIT_SPINE_SWITCH_DOWN');
  const [a3Dc, setA3Dc] = useState('DC-IOWA-CENTRAL-CLUSTER-2');
  const [a3Spares, setA3Spares] = useState('0');
  const [a3Impact, setA3Impact] = useState('Affects 8,192 GPU training cluster nodes. SLA penalty accumulating.');
  const [a3Carrier, setA3Carrier] = useState('Next Flight Out (NFO) air courier available with 4h cutoff.');
  const [a3Cm, setA3Cm] = useState('Priority CM hotline standby slot reserved.');

  // Agent 4 fields
  const [a4Rma, setA4Rma] = useState('RMA-2026-US-99102');
  const [a4Serial, setA4Serial] = useState('SN-H100-2025-449102-B');
  const [a4RetSerial, setA4RetSerial] = useState('SN-H100-2025-449102-B');
  const [a4Repair, setA4Repair] = useState('Completed - Full 48hr Burn-In Verified');
  const [a4Warranty, setA4Warranty] = useState('In Warranty (Active OEM Contract)');
  const [a4Manifest, setA4Manifest] = useState('CM Return Manifest #CM-9941: Complete reflow and test vector validation passed.');

  if (!isOpen) return null;

  const agentConfig = {
    'agent-1': {
      name: 'Agent 1 — Failure-Based Disposition Agent',
      icon: Wrench,
      badge: 'Failure Disposition',
      bgLight: 'bg-[#E8F0FE]',
      borderLight: 'border-[#D2E3FC]',
      textLight: 'text-[#1A73E8]',
    },
    'agent-2': {
      name: 'Agent 2 — Dwell Time Monitoring Agent',
      icon: Clock,
      badge: 'Dwell Time',
      bgLight: 'bg-[#E8F0FE]',
      borderLight: 'border-[#D2E3FC]',
      textLight: 'text-[#1A73E8]',
    },
    'agent-3': {
      name: 'Agent 3 — Urgency Flagging Agent',
      icon: Flame,
      badge: 'Urgency Priority',
      bgLight: 'bg-[#FCE8E6]',
      borderLight: 'border-[#FAD2CF]',
      textLight: 'text-[#D93025]',
    },
    'agent-4': {
      name: 'Agent 4 — Return Receipt & Spare Reintegration Agent',
      icon: CheckCheck,
      badge: 'Spare Reintegration',
      bgLight: 'bg-[#E6F4EA]',
      borderLight: 'border-[#CEEAD6]',
      textLight: 'text-[#188038]',
    },
  }[agentId];

  const Icon = agentConfig.icon;

  const generateRandomTray = () => {
    const prefixes = ['HBM', 'PCIE', 'VRM', 'RET', 'OPT', 'ASIC'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(1000 + Math.random() * 9000);
    setTrayId(`TRAY-2026-${prefix}-${num}`);
  };

  // Submit preset data directly via Agent Run or Direct API
  const handleApplyPreset = async (presetData: any) => {
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      if (agentId === 'agent-1' && onRunAgent1) {
        await onRunAgent1(presetData);
      } else if (agentId === 'agent-2' && onRunAgent2) {
        await onRunAgent2(presetData);
      } else if (agentId === 'agent-3' && onRunAgent3) {
        await onRunAgent3(presetData);
      } else if (agentId === 'agent-4' && onRunAgent4) {
        await onRunAgent4(presetData);
      } else {
        // Direct record post fallback
        const res = await fetch('/api/records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId,
            trayId: presetData.trayId,
            input: presetData,
          }),
        });
        if (!res.ok) throw new Error('Failed to create record');
        await onRecordAdded();
      }

      setSuccessMsg(`Successfully added new RMA record for ${presetData.trayId}!`);
      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to submit data');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit custom form data
  const handleSubmitCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      let inputData: any = {};
      if (agentId === 'agent-1') {
        inputData = {
          trayId: trayId.trim() || `TRAY-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          mpn: a1Mpn,
          failureCode: a1Code,
          failureDescription: a1Desc,
          dchaLogs: a1Dcha,
        };
        if (onRunAgent1) await onRunAgent1(inputData);
      } else if (agentId === 'agent-2') {
        inputData = {
          trayId: trayId.trim() || `TRAY-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          currentStage: a2Stage,
          hoursInStage: parseFloat(a2Hours) || 1.0,
          microSlo: parseFloat(a2Slo) || 4.0,
          location: a2Location,
          eventHistory: a2History,
        };
        if (onRunAgent2) await onRunAgent2(inputData);
      } else if (agentId === 'agent-3') {
        inputData = {
          trayId: trayId.trim() || `TRAY-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          failureType: a3Type,
          failureCode: a3Code,
          dataCenter: a3Dc,
          spareInventory: parseInt(a3Spares) || 0,
          businessImpact: a3Impact,
          carrierStatus: a3Carrier,
          cmQueueStatus: a3Cm,
        };
        if (onRunAgent3) await onRunAgent3(inputData);
      } else if (agentId === 'agent-4') {
        inputData = {
          trayId: trayId.trim() || `TRAY-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          rmaId: a4Rma,
          serialNumber: a4Serial,
          returnedSerial: a4RetSerial,
          repairStatus: a4Repair,
          warrantyStatus: a4Warranty,
          manifestDetails: a4Manifest,
        };
        if (onRunAgent4) await onRunAgent4(inputData);
      }

      await onRecordAdded();
      setSuccessMsg(`Successfully evaluated & dispatched new record for ${inputData.trayId}!`);
      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Error executing agent evaluation');
    } finally {
      setSubmitting(false);
    }
  };

  const presets = AGENT_SAMPLE_DATA[agentId] || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="bg-white border border-[#DADCE0] rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#E8EAED] bg-[#F8F9FA] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center border ${agentConfig.bgLight} ${agentConfig.borderLight} ${agentConfig.textLight}`}
            >
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#202124] font-mono">
                  Add RMA Data Record
                </h3>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${agentConfig.bgLight} ${agentConfig.textLight}`}
                >
                  {agentConfig.badge}
                </span>
              </div>
              <p className="text-[11px] text-[#5F6368] font-mono mt-0.5">
                {agentConfig.name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={submitting}
            className="text-[#5F6368] hover:text-[#202124] p-1 rounded-md hover:bg-[#E8EAED] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher: Quick Presets vs Custom Entry */}
        <div className="flex border-b border-[#E8EAED] bg-[#F8F9FA] px-4 pt-2 gap-2 text-xs font-mono">
          <button
            onClick={() => setActiveTab('presets')}
            className={`pb-2 px-3 border-b-2 font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'presets'
                ? 'border-[#1A73E8] text-[#1A73E8]'
                : 'border-transparent text-[#5F6368] hover:text-[#202124]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            1-Click Sample Scenarios ({presets.length})
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`pb-2 px-3 border-b-2 font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'custom'
                ? 'border-[#1A73E8] text-[#1A73E8]'
                : 'border-transparent text-[#5F6368] hover:text-[#202124]'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Custom Telemetry Form
          </button>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="mx-4 mt-3 p-3 rounded-lg bg-[#FCE8E6] border border-[#FAD2CF] flex items-start gap-2 text-xs text-[#C5221F] font-mono">
            <AlertTriangle className="w-4 h-4 text-[#D93025] shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mx-4 mt-3 p-3 rounded-lg bg-[#E6F4EA] border border-[#CEEAD6] flex items-center gap-2 text-xs text-[#137333] font-mono">
            <Check className="w-4 h-4 text-[#188038] shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'presets' ? (
            <div className="space-y-3">
              <div className="text-xs text-[#5F6368] font-sans">
                Select a validated production RMA test case to evaluate and add immediately to the audit ledger:
              </div>

              <div className="space-y-2.5">
                {presets.map((preset, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-lg border border-[#DADCE0] bg-[#F8F9FA] hover:border-[#1A73E8] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#202124] font-mono">
                          {preset.title}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-[#5F6368] border border-[#DADCE0]">
                          {preset.data.trayId}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#5F6368]">
                        {preset.desc}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleApplyPreset(preset.data)}
                      className="shrink-0 px-3.5 py-1.5 rounded-md bg-[#1A73E8] hover:bg-[#1557B0] text-white text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      {submitting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      <span>Insert Record</span>
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('custom')}
                  className="text-xs text-[#1A73E8] hover:underline font-mono flex items-center gap-1 cursor-pointer"
                >
                  Need to test custom values? Switch to custom form &rarr;
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitCustom} className="space-y-3 text-xs font-mono">
              {/* Common Tray ID */}
              <div>
                <label className="block text-[#5F6368] mb-1 flex items-center justify-between">
                  <span>Tray Identifier (Target Asset)</span>
                  <button
                    type="button"
                    onClick={generateRandomTray}
                    className="text-[11px] text-[#1A73E8] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Generate New ID
                  </button>
                </label>
                <input
                  type="text"
                  value={trayId}
                  onChange={(e) => setTrayId(e.target.value)}
                  className="w-full bg-white border border-[#DADCE0] rounded px-3 py-2 text-[#202124] font-mono focus:border-[#1A73E8] focus:outline-none shadow-xs"
                  required
                />
              </div>

              {/* Agent 1 Specific Fields */}
              {agentId === 'agent-1' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#5F6368] mb-1">Part Number (MPN)</label>
                      <input
                        type="text"
                        value={a1Mpn}
                        onChange={(e) => setA1Mpn(e.target.value)}
                        className="w-full bg-white border border-[#DADCE0] rounded px-3 py-2 text-[#202124] font-mono focus:border-[#1A73E8] focus:outline-none shadow-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[#5F6368] mb-1">Failure Code</label>
                      <input
                        type="text"
                        value={a1Code}
                        onChange={(e) => setA1Code(e.target.value)}
                        className="w-full bg-white border border-[#DADCE0] rounded px-3 py-2 text-[#202124] font-mono focus:border-[#1A73E8] focus:outline-none shadow-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[#5F6368] mb-1">Failure Description</label>
                    <input
                      type="text"
                      value={a1Desc}
                      onChange={(e) => setA1Desc(e.target.value)}
                      className="w-full bg-white border border-[#DADCE0] rounded px-3 py-2 text-[#202124] font-mono focus:border-[#1A73E8] focus:outline-none shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[#5F6368] mb-1">DCHA Automated Diagnostic Logs</label>
                    <textarea
                      rows={2}
                      value={a1Dcha}
                      onChange={(e) => setA1Dcha(e.target.value)}
                      className="w-full bg-white border border-[#DADCE0] rounded px-3 py-2 text-[#202124] font-mono focus:border-[#1A73E8] focus:outline-none shadow-xs"
                    />
                  </div>
                </>
              )}

              {/* Agent 2 Specific Fields */}
              {agentId === 'agent-2' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[#5F6368] mb-1">Current Process Stage</label>
                      <select
                        value={a2Stage}
                        onChange={(e) => setA2Stage(e.target.value)}
                        className="w-full bg-white border border-[#DADCE0] rounded px-3 py-2 text-[#202124] font-mono focus:border-[#1A73E8] focus:outline-none shadow-xs"
                      >
                        <option value="CM_INBOUND_QUEUE">CM_INBOUND_QUEUE (Intake Queue)</option>
                        <option value="THERMAL_CHAMBER_BURN_IN">THERMAL_CHAMBER_BURN_IN (Thermal Oven)</option>
                        <option value="POST_REPAIR_DCHA_TEST">POST_REPAIR_DCHA_TEST (Diagnostic Bench)</option>
                        <option value="CARRIER_HUB_TRANSIT">CARRIER_HUB_TRANSIT (Air Cargo Sort)</option>
                        <option value="DEPOT_STAGING">DEPOT_STAGING (Spare Hub)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[#5F6368] mb-1">Hours in Stage</label>
                      <input
                        type="number"
                        step="0.1"
                        value={a2Hours}
                        onChange={(e) => setA2Hours(e.target.value)}
                        className="w-full bg-white border border-[#DADCE0] rounded px-3 py-2 text-[#202124] font-mono focus:border-[#1A73E8] focus:outline-none shadow-xs"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#5F6368] mb-1">Stage Micro-SLO (Hours)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={a2Slo}
                        onChange={(e) => setA2Slo(e.target.value)}
                        className="w-full bg-white border border-[#DADCE0] rounded px-3 py-2 text-[#202124] font-mono focus:border-[#1A73E8] focus:outline-none shadow-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[#5F6368] mb-1">Physical Location</label>
                      <input
                        type="text"
                        value={a2Location}
                        onChange={(e) => setA2Location(e.target.value)}
                        className="w-full bg-white border border-[#DADCE0] rounded px-3 py-2 text-[#202124] font-mono focus:border-[#1A73E8] focus:outline-none shadow-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[#5F6368] mb-1">Event Log History</label>
                    <textarea
                      rows={2}
                      value={a2History}
                      onChange={(e) => setA2History(e.target.value)}
                      className="w-full bg-white border border-[#DADCE0] rounded px-3 py-2 text-[#202124] font-mono focus:border-[#1A73E8] focus:outline-none shadow-xs"
                    />
                  </div>
                </>
              )}

              {/* Agent 3 Specific Fields */}
              {agentId === 'agent-3' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#5F6368] mb-1">Failure Code / Symptom</label>
                      <input
                        type="text"
                        value={a3Code}
                        onChange={(e) => setA3Code(e.target.value)}
                        className="w-full bg-white border border-[#DADCE0] rounded px-3 py-2 text-[#202124] font-mono focus:border-[#1A73E8] focus:outline-none shadow-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[#5F6368] mb-1">Data Center Site</label>
                      <input
                        type="text"
                        value={a3Dc}
                        onChange={(e) => setA3Dc(e.target.value)}
                        className="w-full bg-white border border-[#DADCE0] rounded px-3 py-2 text-[#202124] font-mono focus:border-[#1A73E8] focus:outline-none shadow-xs"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#5F6368] mb-1">Current Spare Buffer Inventory</label>
                      <input
                        type="number"
                        min="0"
                        value={a3Spares}
                        onChange={(e) => setA3Spares(e.target.value)}
                        className="w-full bg-white border border-[#DADCE0] rounded px-3 py-2 text-[#202124] font-mono focus:border-[#1A73E8] focus:outline-none shadow-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[#5F6368] mb-1">Carrier Flight Status</label>
                      <input
                        type="text"
                        value={a3Carrier}
                        onChange={(e) => setA3Carrier(e.target.value)}
                        className="w-full bg-white border border-[#DADCE0] rounded px-3 py-2 text-[#202124] font-mono focus:border-[#1A73E8] focus:outline-none shadow-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[#5F6368] mb-1">Operational & Financial SLA Impact</label>
                    <textarea
                      rows={2}
                      value={a3Impact}
                      onChange={(e) => setA3Impact(e.target.value)}
                      className="w-full bg-white border border-[#DADCE0] rounded px-3 py-2 text-[#202124] font-mono focus:border-[#1A73E8] focus:outline-none shadow-xs"
                    />
                  </div>
                </>
              )}

              {/* Agent 4 Specific Fields */}
              {agentId === 'agent-4' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#5F6368] mb-1">RMA Reference ID</label>
                      <input
                        type="text"
                        value={a4Rma}
                        onChange={(e) => setA4Rma(e.target.value)}
                        className="w-full bg-white border border-[#DADCE0] rounded px-3 py-2 text-[#202124] font-mono focus:border-[#1A73E8] focus:outline-none shadow-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[#5F6368] mb-1">Expected Asset Serial Number</label>
                      <input
                        type="text"
                        value={a4Serial}
                        onChange={(e) => setA4Serial(e.target.value)}
                        className="w-full bg-white border border-[#DADCE0] rounded px-3 py-2 text-[#202124] font-mono focus:border-[#1A73E8] focus:outline-none shadow-xs"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#5F6368] mb-1">Physically Returned Serial Number</label>
                      <input
                        type="text"
                        value={a4RetSerial}
                        onChange={(e) => setA4RetSerial(e.target.value)}
                        className="w-full bg-white border border-[#DADCE0] rounded px-3 py-2 text-[#202124] font-mono focus:border-[#1A73E8] focus:outline-none shadow-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[#5F6368] mb-1">OEM Warranty Verification</label>
                      <input
                        type="text"
                        value={a4Warranty}
                        onChange={(e) => setA4Warranty(e.target.value)}
                        className="w-full bg-white border border-[#DADCE0] rounded px-3 py-2 text-[#202124] font-mono focus:border-[#1A73E8] focus:outline-none shadow-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[#5F6368] mb-1">CM Return Manifest & Certification Details</label>
                    <textarea
                      rows={2}
                      value={a4Manifest}
                      onChange={(e) => setA4Manifest(e.target.value)}
                      className="w-full bg-white border border-[#DADCE0] rounded px-3 py-2 text-[#202124] font-mono focus:border-[#1A73E8] focus:outline-none shadow-xs"
                    />
                  </div>
                </>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E8EAED]">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="px-3 py-1.5 rounded-md border border-[#DADCE0] text-[#5F6368] hover:text-[#202124] hover:bg-[#F1F3F4] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-md bg-[#1A73E8] hover:bg-[#1557B0] text-white font-medium flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Evaluating Agent...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Dispatch & Save Record</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
