import React, { useState } from 'react';
import { SupplyItem, SurgeInput } from '../types';
import { Play, TrendingUp, Sliders, Calendar, AlertCircle, Sparkles, Building, UserCheck } from 'lucide-react';

interface SurgeInputFormProps {
  selectedItem: SupplyItem;
  onSubmit: (input: SurgeInput) => void;
  isAnalyzing: boolean;
}

export const SurgeInputForm: React.FC<SurgeInputFormProps> = ({
  selectedItem,
  onSubmit,
  isAnalyzing
}) => {
  const [horizonDays, setHorizonDays] = useState<number>(10);
  const baselineForHorizon = selectedItem.baselineDailyForecast * horizonDays;
  
  // Default surge quantity to 2x baseline
  const [surgeQuantity, setSurgeQuantity] = useState<number>(baselineForHorizon * 2);
  const [customerName, setCustomerName] = useState<string>('Tier-1 Global Strategic Customer');
  const [customerPriority, setCustomerPriority] = useState<'Standard' | 'High' | 'Critical'>('High');
  const [triggerReason, setTriggerReason] = useState<string>('Unforecasted Customer Production Line Expansion');
  const [notes, setNotes] = useState<string>('');
  
  // Advanced sensitivity toggles
  const [showOverrides, setShowOverrides] = useState<boolean>(false);
  const [overrideInventory, setOverrideInventory] = useState<number | undefined>(undefined);
  const [overrideSupplierLeadDays, setOverrideSupplierLeadDays] = useState<number | undefined>(undefined);
  const [overrideDailyCapacity, setOverrideDailyCapacity] = useState<number | undefined>(undefined);

  // Quick preset helper
  const applyPreset = (multiplier: number) => {
    setSurgeQuantity(Math.round(baselineForHorizon * multiplier));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      sku: selectedItem.sku,
      surgeQuantity: Number(surgeQuantity),
      targetFulfillmentDays: Number(horizonDays),
      customerName,
      customerPriority,
      triggerReason,
      notes,
      overrideInventory,
      overrideSupplierLeadDays,
      overrideDailyCapacity
    });
  };

  const surgePercent = Math.round((surgeQuantity / (baselineForHorizon || 1)) * 100);

  return (
    <form id="surge-input-form" onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Demand Surge Parameters</h3>
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Normal Baseline in {horizonDays}d: <span className="font-semibold text-slate-800">{baselineForHorizon} units</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Surge Quantity */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">
              Surge Quantity (Units)
            </label>
            <span className={`text-[11px] font-bold px-1.5 py-0.2 rounded ${
              surgePercent > 200 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'
            }`}>
              {surgePercent}% vs Baseline
            </span>
          </div>
          <input
            id="surge-quantity-input"
            type="number"
            min={1}
            max={20000}
            required
            value={surgeQuantity}
            onChange={(e) => setSurgeQuantity(Math.max(1, Number(e.target.value)))}
            className="w-full px-3 py-2 text-sm font-semibold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          {/* Quick preset buttons */}
          <div className="flex gap-1 pt-1">
            <button
              type="button"
              onClick={() => applyPreset(1.5)}
              className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 hover:bg-slate-200 rounded text-slate-600"
            >
              +50%
            </button>
            <button
              type="button"
              onClick={() => applyPreset(2.0)}
              className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 hover:bg-slate-200 rounded text-slate-600"
            >
              +100% (2x)
            </button>
            <button
              type="button"
              onClick={() => applyPreset(3.0)}
              className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 hover:bg-slate-200 rounded text-slate-600"
            >
              +200% (3x)
            </button>
          </div>
        </div>

        {/* 2. Target Fulfillment Horizon */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Target Fulfillment Window
          </label>
          <select
            id="fulfillment-horizon-select"
            value={horizonDays}
            onChange={(e) => {
              const newDays = Number(e.target.value);
              setHorizonDays(newDays);
              setSurgeQuantity(selectedItem.baselineDailyForecast * newDays * 2);
            }}
            className="w-full px-3 py-2 text-sm font-medium rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value={5}>5 Days (Extreme Urgency)</option>
            <option value={7}>7 Days (1 Week)</option>
            <option value={10}>10 Days (Target SLA)</option>
            <option value={14}>14 Days (Standard Window)</option>
            <option value={21}>21 Days (Extended Window)</option>
          </select>
          <span className="text-[11px] text-slate-400 block">
            Supplier standard lead: {selectedItem.supplier.leadTimeDays}d
          </span>
        </div>

        {/* 3. Customer & Priority */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-slate-400" />
            Customer & Account Priority
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <input
              id="customer-name-input"
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer Name"
              className="px-2.5 py-2 text-xs font-medium rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              id="customer-priority-select"
              value={customerPriority}
              onChange={(e) => setCustomerPriority(e.target.value as any)}
              className="px-2 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Standard">Standard</option>
              <option value="High">High</option>
              <option value="Critical">Critical (Tier-1)</option>
            </select>
          </div>
          <span className="text-[11px] text-slate-400 block truncate">
            Segment: {selectedItem.customerSegment}
          </span>
        </div>

        {/* 4. Trigger Reason */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700">
            Surge Trigger Signal
          </label>
          <select
            id="trigger-reason-select"
            value={triggerReason}
            onChange={(e) => setTriggerReason(e.target.value)}
            className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="Unforecasted Customer Production Line Expansion">Unforecasted OEM Expansion</option>
            <option value="Competitor Component Stockout / Substitution">Competitor Supply Disruption</option>
            <option value="Emergency Fleet Maintenance / Buffer Replenishment">Emergency Fleet Refurbishment</option>
            <option value="End-of-Quarter Promotional Spike">Quarter-End Customer Runaway</option>
            <option value="Regulatory Safety Retrofit Program">Regulatory Mandatory Retrofit</option>
          </select>
          <span className="text-[11px] text-slate-400 block truncate">
            Passed to Demand Analyst Agent
          </span>
        </div>
      </div>

      {/* Collapsible Sensitivity / Supply Overrides */}
      <div className="pt-2 border-t border-slate-100">
        <button
          id="toggle-overrides-btn"
          type="button"
          onClick={() => setShowOverrides(!showOverrides)}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>{showOverrides ? 'Hide' : 'Show'} Supply Chain Scenario Sensitivity Controls</span>
        </button>

        {showOverrides && (
          <div id="overrides-panel" className="mt-3 p-3.5 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="text-slate-600 block mb-1">
                Override Inventory (Current: {selectedItem.currentInventory})
              </label>
              <input
                id="override-inventory-input"
                type="number"
                placeholder={`${selectedItem.currentInventory}`}
                value={overrideInventory !== undefined ? overrideInventory : ''}
                onChange={(e) => setOverrideInventory(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-800"
              />
            </div>
            <div>
              <label className="text-slate-600 block mb-1">
                Override Supplier Lead Days (Standard: {selectedItem.supplier.leadTimeDays}d)
              </label>
              <input
                id="override-lead-days-input"
                type="number"
                placeholder={`${selectedItem.supplier.leadTimeDays}`}
                value={overrideSupplierLeadDays !== undefined ? overrideSupplierLeadDays : ''}
                onChange={(e) => setOverrideSupplierLeadDays(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-800"
              />
            </div>
            <div>
              <label className="text-slate-600 block mb-1">
                Override Plant Daily Capacity (Max: {selectedItem.productionCapacity.dailyCapacityUnits}/d)
              </label>
              <input
                id="override-capacity-input"
                type="number"
                placeholder={`${selectedItem.productionCapacity.dailyCapacityUnits}`}
                value={overrideDailyCapacity !== undefined ? overrideDailyCapacity : ''}
                onChange={(e) => setOverrideDailyCapacity(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-800"
              />
            </div>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex items-center justify-between pt-1">
        <div className="text-xs text-slate-500">
          Executes <strong className="text-slate-700">Demand &rarr; Supply &rarr; Planner</strong> LangGraph multi-agent workflow
        </div>

        <button
          id="run-surge-analysis-btn"
          type="submit"
          disabled={isAnalyzing}
          className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 active:bg-slate-950 rounded-xl shadow-sm flex items-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
        >
          {isAnalyzing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Agents Analyzing Surge...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>Run Multi-Agent Surge Analysis</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
