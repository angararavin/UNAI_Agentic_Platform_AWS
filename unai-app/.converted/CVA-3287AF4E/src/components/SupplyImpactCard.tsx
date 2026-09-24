import React from 'react';
import { SupplyImpactAnalysisOutput, SupplyItem, SurgeInput } from '../types';
import { ShieldAlert, AlertOctagon, Layers, Clock, Factory, DollarSign, Truck, AlertTriangle, CheckCircle } from 'lucide-react';

interface SupplyImpactCardProps {
  supplyAnalysis: SupplyImpactAnalysisOutput;
  item: SupplyItem;
  input: SurgeInput;
}

export const SupplyImpactCard: React.FC<SupplyImpactCardProps> = ({
  supplyAnalysis,
  item,
  input
}) => {
  const isDeficit = supplyAnalysis.netInventoryBalance < 0;

  const severityBadge = {
    NONE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
    HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
    CRITICAL: 'bg-rose-50 text-rose-700 border-rose-200'
  }[supplyAnalysis.stockoutSeverity] || 'bg-slate-50 text-slate-700 border-slate-200';

  const feasibilityBadge = {
    FEASIBLE: 'bg-emerald-100 text-emerald-800',
    PARTIALLY_FEASIBLE: 'bg-amber-100 text-amber-800',
    BOTTLENECKED: 'bg-orange-100 text-orange-800',
    INFEASIBLE: 'bg-rose-100 text-rose-800'
  }[supplyAnalysis.productionFeasibility] || 'bg-slate-100 text-slate-800';

  return (
    <div id="supply-impact-analyst-agent-card" className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Stage 2 Header */}
      <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            2
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Supply Impact Analyst Agent
              <span className="text-[11px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                Stage 2 &bull; Inventory & Capacity Stress-Test
              </span>
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1 ${severityBadge}`}>
            <AlertOctagon className="w-3 h-3" />
            Supply Risk: {supplyAnalysis.stockoutSeverity}
          </span>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${feasibilityBadge}`}>
            {supplyAnalysis.productionFeasibility}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold uppercase text-slate-500 block">Net Supply Balance</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className={`text-xl font-bold ${isDeficit ? 'text-rose-600' : 'text-emerald-600'}`}>
                {isDeficit ? '' : '+'}{supplyAnalysis.netInventoryBalance}
              </span>
              <span className="text-xs text-slate-500 font-medium">{item.unit}</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              {isDeficit ? 'Stockout deficit' : 'Coverage surplus'}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold uppercase text-slate-500 block">Stockout Window</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-bold text-slate-900">
                {supplyAnalysis.projectedStockoutDays !== null ? `Day ${supplyAnalysis.projectedStockoutDays}` : 'None'}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              {supplyAnalysis.projectedStockoutDays !== null ? 'Without line intervention' : 'Covered in horizon'}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold uppercase text-slate-500 block">Line Utilization</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-bold text-slate-900">{supplyAnalysis.capacityUtilizationAfterSurge}%</span>
              <span className="text-xs text-slate-500 font-medium">peak</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Base: {supplyAnalysis.capacityUtilizationBeforeSurge}%
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold uppercase text-slate-500 block">Financial Exposure</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-bold text-amber-700">
                ${(supplyAnalysis.financialExposureEstimateUsd || 0).toLocaleString()}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Unfulfilled order value</span>
          </div>
        </div>

        {/* Capacity Utilization Progress Bar */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span className="flex items-center gap-1.5">
              <Factory className="w-3.5 h-3.5 text-slate-500" />
              Plant Line Capacity Stress ({item.productionCapacity.lineName})
            </span>
            <span className="font-mono text-slate-900">
              {supplyAnalysis.capacityUtilizationAfterSurge}% capacity required
            </span>
          </div>

          <div className="h-3 bg-slate-200 rounded-full overflow-hidden flex">
            {/* Baseline allocation */}
            <div
              className="h-full bg-slate-500"
              style={{ width: `${Math.min(100, supplyAnalysis.capacityUtilizationBeforeSurge)}%` }}
              title={`Pre-surge baseline: ${supplyAnalysis.capacityUtilizationBeforeSurge}%`}
            />
            {/* Surge incremental */}
            <div
              className={`h-full ${supplyAnalysis.capacityUtilizationAfterSurge > 100 ? 'bg-rose-500' : 'bg-indigo-600'}`}
              style={{
                width: `${Math.min(100, Math.max(0, supplyAnalysis.capacityUtilizationAfterSurge - supplyAnalysis.capacityUtilizationBeforeSurge))}%`
              }}
              title="Surge incremental demand"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-500 inline-block" />
                Base Planned ({supplyAnalysis.capacityUtilizationBeforeSurge}%)
              </span>
              <span className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${supplyAnalysis.capacityUtilizationAfterSurge > 100 ? 'bg-rose-500' : 'bg-indigo-600'} inline-block`} />
                Surge Demand
              </span>
            </div>
            <span>Max Rating: {item.productionCapacity.dailyCapacityUnits} units/day</span>
          </div>
        </div>

        {/* Bottleneck Summary & Assessment */}
        <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Supply & Constraint Bottleneck Synthesis
          </h4>
          <p className="text-xs text-slate-700 leading-relaxed font-normal">
            {supplyAnalysis.bottleneckSummary}
          </p>
        </div>

        {/* PO Timeline and Supplier Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {/* Supplier Lead Time Constraint */}
          <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-slate-500" />
                Supplier Lead-Time Constraint
              </span>
              <span className="text-[11px] text-slate-500">{item.supplier.name}</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {supplyAnalysis.supplierLeadTimeConstraint}
            </p>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">
                Standard: <strong>{item.supplier.leadTimeDays}d</strong> &bull; Expedite: <strong>{item.supplier.expediteLeadTimeDays}d</strong>
              </span>
              {item.supplier.expediteAvailable ? (
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Expedite Feasible
                </span>
              ) : (
                <span className="text-rose-700 font-semibold">Expedite Unavailable</span>
              )}
            </div>
          </div>

          {/* Open PO Arrival Timing */}
          <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                Open Purchase Order Pipeline
              </span>
              <span className="font-semibold text-emerald-700 text-xs">
                +{supplyAnalysis.openPoContributionUnits} units arriving
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {supplyAnalysis.poArrivalTimingAssessment}
            </p>
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
              <span>{item.openPurchaseOrders.length} Open PO(s) on file</span>
              <span>Warehouse: {item.warehouseLocation}</span>
            </div>
          </div>
        </div>

        {/* Critical Components at Risk */}
        {supplyAnalysis.criticalComponentsAtRisk.length > 0 && (
          <div>
            <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-1.5">
              Identified Critical Bill-of-Materials (BOM) & Components at Risk
            </span>
            <div className="flex flex-wrap gap-1.5">
              {supplyAnalysis.criticalComponentsAtRisk.map((comp, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200"
                >
                  <AlertTriangle className="w-3 h-3 text-rose-500" />
                  {comp}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
