import React, { useState } from 'react';
import { SupplyItem, SurgeInput } from '../../types';
import { Button } from '../ui/Button';
import { Tooltip } from '../ui/Tooltip';
import { TrendingUp, Sliders, Play, Info, HelpCircle } from 'lucide-react';

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
  const [customerName, setCustomerName] = useState<string>('Tier-1 Global Enterprise Partner');
  const [customerPriority, setCustomerPriority] = useState<'Standard' | 'High' | 'Critical'>('Critical');
  const [triggerReason, setTriggerReason] = useState<string>('Automated Hub Expansion & Demand Spike');
  const [showOverrides, setShowOverrides] = useState<boolean>(false);
  const [overrideInventory, setOverrideInventory] = useState<number | undefined>(undefined);
  const [overrideSupplierLeadDays, setOverrideSupplierLeadDays] = useState<number | undefined>(undefined);
  const [overrideDailyCapacity, setOverrideDailyCapacity] = useState<number | undefined>(undefined);

  const applyMultiplier = (mult: number) => {
    setSurgeQuantity(Math.round(baselineForHorizon * mult));
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
      overrideInventory,
      overrideSupplierLeadDays,
      overrideDailyCapacity
    });
  };

  const surgePercent = Math.round((surgeQuantity / (baselineForHorizon || 1)) * 100);

  const priorityDescriptions = {
    Standard: 'Standard Commercial Order: Regular manufacturing queue, standard freight, and normal lead-time allowances without overtime allocation.',
    High: 'High Priority Strategic Account: Authorized for air-freight expedite up to $10,000 and drawing up to 50% of available safety stock.',
    Critical: 'Critical Zero-Stockout SLA: Triggers immediate multi-echelon emergency response, maximum line reallocation, and planner sign-off authorization.'
  };

  return (
    <form
      id="surge-input-form"
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs space-y-4"
    >
      <div className="flex items-center justify-between border-b border-stone-100 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-stone-900 text-white flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-sm font-bold text-stone-900">
            Order Surge Parameters & Filters
          </h3>
          <Tooltip
            position="right"
            content="Configure the sudden demand surge to analyze capacity constraints, inventory stockouts, and mitigation options across the supply chain."
          >
            <Info className="w-3.5 h-3.5 text-stone-400 hover:text-stone-700 cursor-pointer" />
          </Tooltip>
        </div>

        <div className="flex items-center gap-2 text-xs text-stone-500">
          <Tooltip
            position="left"
            content={`Baseline forecast is ${selectedItem.baselineDailyForecast} units/day × ${horizonDays} days = ${baselineForHorizon} units expected normally.`}
          >
            <span className="cursor-help underline decoration-dotted decoration-stone-400">
              Normal Baseline ({horizonDays}d):
            </span>
          </Tooltip>
          <strong className="text-stone-900">{baselineForHorizon} units</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Surge Quantity & Multiplier Filters */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-stone-700 flex items-center gap-1">
              Surge Quantity
              <Tooltip
                position="top"
                content="The total volume of units requested for urgent fulfillment in the target window."
              >
                <HelpCircle className="w-3 h-3 text-stone-400" />
              </Tooltip>
            </label>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              surgePercent > 200 ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800'
            }`}>
              +{surgePercent}%
            </span>
          </div>
          <input
            id="surge-quantity-input"
            type="number"
            min={1}
            required
            value={surgeQuantity}
            onChange={(e) => setSurgeQuantity(Math.max(1, Number(e.target.value)))}
            className="w-full px-3 py-1.5 text-sm font-semibold rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900"
          />
          {/* Quick multiplier filter presets with hover details */}
          <div className="flex gap-1.5 mt-1.5 items-center">
            <span className="text-[10px] text-stone-400">Presets:</span>
            {[
              { label: '1.5x', mult: 1.5, desc: `Sets volume to +50% surge (${Math.round(baselineForHorizon * 1.5)} units)` },
              { label: '2.0x', mult: 2.0, desc: `Sets volume to 2x baseline double surge (${Math.round(baselineForHorizon * 2.0)} units)` },
              { label: '3.0x', mult: 3.0, desc: `Sets volume to 3x severe capacity shock (${Math.round(baselineForHorizon * 3.0)} units)` }
            ].map((p) => (
              <Tooltip key={p.label} position="top" content={p.desc}>
                <button
                  type="button"
                  onClick={() => applyMultiplier(p.mult)}
                  className="px-2 py-0.5 text-[10px] font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded transition-colors cursor-pointer"
                >
                  {p.label}
                </button>
              </Tooltip>
            ))}
          </div>
        </div>

        {/* 2. Target Fulfillment Window */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-stone-700 flex items-center gap-1">
              Fulfillment Window
              <Tooltip
                position="top"
                content="Number of calendar days in which all surge units must be delivered to the client."
              >
                <HelpCircle className="w-3 h-3 text-stone-400" />
              </Tooltip>
            </label>
            <span className="text-[10px] text-stone-400">Days</span>
          </div>
          <input
            id="fulfillment-days-input"
            type="number"
            min={1}
            max={90}
            required
            value={horizonDays}
            onChange={(e) => setHorizonDays(Math.max(1, Number(e.target.value)))}
            className="w-full px-3 py-1.5 text-sm font-semibold rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900"
          />
          <span className="text-[11px] text-stone-500 block mt-1.5">
            Required run-rate: <strong className="text-stone-800">{Math.round(surgeQuantity / horizonDays)}</strong> u/day
          </span>
        </div>

        {/* 3. Customer Priority Filter */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-stone-700 flex items-center gap-1">
              Account Priority Tier
              <Tooltip
                position="top"
                content="Determines contractual penalty exposure and authorized mitigation aggressiveness."
              >
                <HelpCircle className="w-3 h-3 text-stone-400" />
              </Tooltip>
            </label>
          </div>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full px-3 py-1.5 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900 mb-1.5"
            placeholder="Account Name"
          />
          <div className="flex gap-1">
            {(['Standard', 'High', 'Critical'] as const).map((tier) => (
              <Tooltip
                key={tier}
                position="bottom"
                content={priorityDescriptions[tier]}
              >
                <button
                  type="button"
                  onClick={() => setCustomerPriority(tier)}
                  className={`px-2 py-0.5 text-[10px] rounded font-medium transition-colors cursor-pointer ${
                    customerPriority === tier
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {tier}
                </button>
              </Tooltip>
            ))}
          </div>
        </div>

        {/* 4. Trigger Reason & Sensitivity Toggles */}
        <div>
          <label className="text-xs font-semibold text-stone-700 block mb-1">
            Trigger Event Rationale
          </label>
          <input
            type="text"
            value={triggerReason}
            onChange={(e) => setTriggerReason(e.target.value)}
            placeholder="e.g., Unplanned Client Expansion"
            className="w-full px-3 py-1.5 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900"
          />
          <Tooltip
            position="bottom"
            content="Click to expand what-if parameter overrides: simulate altered starting inventory, extended supplier lead times, or line capacity outages."
          >
            <button
              type="button"
              onClick={() => setShowOverrides(!showOverrides)}
              className="text-[11px] text-stone-500 hover:text-stone-900 flex items-center gap-1 mt-1.5 cursor-pointer font-medium"
            >
              <Sliders className="w-3 h-3 text-stone-400" />
              <span>{showOverrides ? 'Hide simulation filters' : 'Advanced What-If Filters'}</span>
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Advanced What-if Filters */}
      {showOverrides && (
        <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <div className="flex items-center gap-1 mb-1">
              <label className="font-medium text-stone-700">Simulate Inventory Level</label>
              <Tooltip
                position="top"
                content={`Baseline is ${selectedItem.currentInventory} units. Override to test lower inventory or a pre-existing stockout.`}
              >
                <HelpCircle className="w-3 h-3 text-stone-400" />
              </Tooltip>
            </div>
            <input
              type="number"
              placeholder={`${selectedItem.currentInventory} units`}
              value={overrideInventory ?? ''}
              onChange={(e) => setOverrideInventory(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-2.5 py-1 rounded border border-stone-300 bg-white"
            />
          </div>
          <div>
            <div className="flex items-center gap-1 mb-1">
              <label className="font-medium text-stone-700">Simulate Supplier Lead Time</label>
              <Tooltip
                position="top"
                content={`Baseline is ${selectedItem.supplier.leadTimeDays} days. Override to test port delays or raw material shortages.`}
              >
                <HelpCircle className="w-3 h-3 text-stone-400" />
              </Tooltip>
            </div>
            <input
              type="number"
              placeholder={`${selectedItem.supplier.leadTimeDays} days`}
              value={overrideSupplierLeadDays ?? ''}
              onChange={(e) => setOverrideSupplierLeadDays(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-2.5 py-1 rounded border border-stone-300 bg-white"
            />
          </div>
          <div>
            <div className="flex items-center gap-1 mb-1">
              <label className="font-medium text-stone-700">Simulate Daily Line Capacity</label>
              <Tooltip
                position="top"
                content={`Baseline is ${selectedItem.productionCapacity.dailyCapacityUnits} u/day. Override to test line maintenance down-time.`}
              >
                <HelpCircle className="w-3 h-3 text-stone-400" />
              </Tooltip>
            </div>
            <input
              type="number"
              placeholder={`${selectedItem.productionCapacity.dailyCapacityUnits} u/d`}
              value={overrideDailyCapacity ?? ''}
              onChange={(e) => setOverrideDailyCapacity(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-2.5 py-1 rounded border border-stone-300 bg-white"
            />
          </div>
        </div>
      )}

      {/* Submit Trigger */}
      <div className="pt-2 flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs text-stone-500">
          Pipeline: <strong className="text-stone-700">Demand &rarr; Supply &rarr; Recommendations &rarr; Human Gate</strong>
        </span>

        <Button
          type="submit"
          variant="primary"
          size="md"
          loading={isAnalyzing}
          icon={<Play className="w-3.5 h-3.5 fill-current" />}
        >
          {isAnalyzing ? 'Running Agents...' : 'Run Surge Impact Analysis'}
        </Button>
      </div>
    </form>
  );
};
