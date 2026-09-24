import React from 'react';
import { SupplyImpactAnalysisOutput, SupplyItem, SurgeInput } from '../../types';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Tooltip } from '../ui/Tooltip';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
  Cell
} from 'recharts';
import { Info, AlertTriangle, CheckCircle } from 'lucide-react';

interface SupplyAgentViewProps {
  supplyAnalysis: SupplyImpactAnalysisOutput;
  item: SupplyItem;
  input: SurgeInput;
}

export const SupplyAgentView: React.FC<SupplyAgentViewProps> = ({
  supplyAnalysis,
  item,
  input
}) => {
  const horizon = Math.max(1, input.targetFulfillmentDays);
  const isShortage = supplyAnalysis.netInventoryBalance < 0;
  const netBalanceAbs = Math.abs(supplyAnalysis.netInventoryBalance);

  const feasibilityVariant: 'success' | 'warning' | 'danger' = {
    FEASIBLE: 'success' as const,
    PARTIALLY_FEASIBLE: 'warning' as const,
    BOTTLENECKED: 'danger' as const,
    INFEASIBLE: 'danger' as const
  }[supplyAnalysis.productionFeasibility] || 'neutral';

  const freeStock = Math.max(0, item.currentInventory - item.reservedInventory);
  const arrivingPoUnits = supplyAnalysis.openPoContributionUnits;
  const dailyBurn = Math.round(input.surgeQuantity / horizon);

  // Generate day-by-day inventory simulation data for the trajectory chart
  let runningStock = item.currentInventory;
  const simulationDays = Math.max(horizon + 2, 10);
  const inventoryTrajectoryData = Array.from({ length: simulationDays }, (_, i) => {
    const day = i + 1;
    // Outflow
    const demandOut = day <= horizon ? dailyBurn : item.baselineDailyForecast;
    
    // Inflow from open PO arrivals on matching day
    const poArrival = item.openPurchaseOrders
      .filter(po => po.status !== 'DELIVERED' && po.expectedArrivalDays === day)
      .reduce((sum, po) => sum + po.units, 0);

    runningStock = runningStock - demandOut + poArrival;

    return {
      day: `Day ${day}`,
      projectedStock: runningStock,
      safetyStock: item.safetyStock,
      zeroFloor: 0,
      poArrival: poArrival > 0 ? poArrival : undefined
    };
  });

  // Supply components breakdown data for waterfall/bar chart
  const plantCapacityInWindow = item.productionCapacity.dailyCapacityUnits * horizon;
  const supplyBreakdownData = [
    { category: 'Free On-Hand', units: freeStock, fill: '#3b82f6' },
    { category: 'In-Transit POs', units: arrivingPoUnits, fill: '#10b981' },
    { category: 'Plant Capacity', units: plantCapacityInWindow, fill: '#6366f1' },
    { category: 'Surge Demand', units: input.surgeQuantity, fill: '#78716c' },
    {
      category: isShortage ? 'Net Deficit' : 'Net Surplus',
      units: netBalanceAbs,
      fill: isShortage ? '#e11d48' : '#059669'
    }
  ];

  return (
    <Card
      id="supply-agent-view"
      stageNumber={2}
      title="Supply Impact Analyst Agent"
      subtitle="Visual stockout projections, replenishment curve & capacity alignment"
      badge={
        <div className="flex items-center gap-2">
          <Tooltip content={`Production feasibility rating: ${supplyAnalysis.productionFeasibility}`}>
            <Badge variant={feasibilityVariant}>
              {supplyAnalysis.productionFeasibility.replace('_', ' ')}
            </Badge>
          </Tooltip>
          <Tooltip content={isShortage ? `Stockout predicted in approx ${supplyAnalysis.projectedStockoutDays || 2} days without mitigations.` : 'Pipeline covers surge demand.'}>
            <Badge variant={isShortage ? 'danger' : 'success'}>
              {isShortage ? `Deficit: -${netBalanceAbs} units` : `Surplus: +${netBalanceAbs} units`}
            </Badge>
          </Tooltip>
        </div>
      }
    >
      {/* 1. Metric Overview Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <Tooltip
          position="top"
          className="w-full"
          content={isShortage 
            ? `Deficit of ${Math.abs(supplyAnalysis.netInventoryBalance)} units. Stockout predicted in approx ${supplyAnalysis.projectedStockoutDays || 2} days without mitigations.`
            : `Net surplus of +${supplyAnalysis.netInventoryBalance} units. On-hand and scheduled PO inventory fully covers the surge.`
          }
        >
          <div className="w-full p-3 rounded-lg bg-stone-50 border border-stone-200 hover:border-stone-400 hover:bg-stone-100/60 transition-colors cursor-help">
            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-500 font-medium">Net Inventory Balance</span>
              <Info className="w-3 h-3 text-stone-400" />
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className={`text-xl font-bold ${isShortage ? 'text-rose-600' : 'text-emerald-700'}`}>
                {supplyAnalysis.netInventoryBalance > 0 ? `+${supplyAnalysis.netInventoryBalance}` : supplyAnalysis.netInventoryBalance}
              </span>
              <span className="text-xs text-stone-500">units</span>
            </div>
            <span className="text-[11px] text-stone-400">
              {isShortage ? `Stockout around Day ${supplyAnalysis.projectedStockoutDays || 2}` : 'Healthy coverage'}
            </span>
          </div>
        </Tooltip>

        <Tooltip
          position="top"
          className="w-full"
          content={`Total available inventory in window: ${freeStock} unreserved warehouse stock + ${arrivingPoUnits} units in-transit via open POs arriving before Day ${input.targetFulfillmentDays}.`}
        >
          <div className="w-full p-3 rounded-lg bg-stone-50 border border-stone-200 hover:border-stone-400 hover:bg-stone-100/60 transition-colors cursor-help">
            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-500 font-medium">Available Supply in Window</span>
              <Info className="w-3 h-3 text-stone-400" />
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-bold text-stone-900">
                {(freeStock + arrivingPoUnits).toLocaleString()}
              </span>
              <span className="text-xs text-stone-500">units total</span>
            </div>
            <span className="text-[11px] text-stone-400">{freeStock} free stock + {arrivingPoUnits} PO in-transit</span>
          </div>
        </Tooltip>

        <Tooltip
          position="top"
          className="w-full"
          content={`Component supplier ${item.supplier.name}: Standard lead time is ${item.supplier.leadTimeDays} days. Air-freight expedite option reduces delivery to ${item.supplier.expediteLeadTimeDays} days for a +$${item.supplier.expediteCostPerUnit}/unit surcharge.`}
        >
          <div className="w-full p-3 rounded-lg bg-stone-50 border border-stone-200 hover:border-stone-400 hover:bg-stone-100/60 transition-colors cursor-help">
            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-500 font-medium">Supplier Lead & Expedite</span>
              <Info className="w-3 h-3 text-stone-400" />
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-bold text-stone-900">{item.supplier.leadTimeDays}d</span>
              <span className="text-xs text-stone-500">std &bull; {item.supplier.expediteLeadTimeDays}d exp</span>
            </div>
            <span className="text-[11px] text-stone-400">Expedite fee: +${item.supplier.expediteCostPerUnit}/unit</span>
          </div>
        </Tooltip>
      </div>

      {/* 2. Graphical Charts Section (Replacing Text Paragraphs) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Chart: Day-by-day Inventory Trajectory & Stockout Depletion Curve */}
        <div className="lg:col-span-2 p-3.5 bg-stone-50/50 rounded-xl border border-stone-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-stone-800">
                Projected Inventory Trajectory & Depletion Curve
              </span>
              <Tooltip content="Shows daily on-hand stock burn under surge rate. Dashed amber line is safety stock; red line is stockout breach.">
                <Info className="w-3 h-3 text-stone-400" />
              </Tooltip>
            </div>
            <span className="text-[11px] text-stone-500">Units on Hand</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={inventoryTrajectoryData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="inventoryGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isShortage ? '#e11d48' : '#059669'} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={isShortage ? '#e11d48' : '#059669'} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#78716c' }} />
                <YAxis tick={{ fontSize: 11, fill: '#78716c' }} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: '#1c1917',
                    borderColor: '#44403c',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: '#f5f5f4'
                  }}
                  formatter={(val: number) => [`${val} units`, '']}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <ReferenceLine y={0} stroke="#dc2626" strokeWidth={1.5} label={{ value: 'Stockout (0)', fill: '#dc2626', fontSize: 10 }} />
                <ReferenceLine y={item.safetyStock} stroke="#d97706" strokeDasharray="4 4" label={{ value: `Safety Stock (${item.safetyStock})`, fill: '#d97706', fontSize: 10 }} />
                <Area
                  type="monotone"
                  dataKey="projectedStock"
                  name="Projected Inventory"
                  stroke={isShortage ? '#e11d48' : '#059669'}
                  strokeWidth={2.5}
                  fill="url(#inventoryGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Secondary Chart: Supply Breakdown vs Demand Gap */}
        <div className="p-3.5 bg-stone-50/50 rounded-xl border border-stone-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-stone-800">Supply vs Demand Balance</span>
              <Tooltip content="Visual breakdown of available supply components against total surge demand.">
                <Info className="w-3 h-3 text-stone-400" />
              </Tooltip>
            </div>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={supplyBreakdownData} layout="vertical" margin={{ top: 5, right: 15, left: 35, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e7e5e4" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#78716c' }} />
                  <YAxis type="category" dataKey="category" tick={{ fontSize: 10, fill: '#44403c' }} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#1c1917',
                      borderColor: '#44403c',
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: '#f5f5f4'
                    }}
                    formatter={(val: number) => [`${val.toLocaleString()} units`, 'Volume']}
                  />
                  <Bar dataKey="units" radius={[0, 4, 4, 0]}>
                    {supplyBreakdownData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-2 border-t border-stone-200 text-xs flex items-center justify-between">
            <span className="text-stone-500">Bottleneck Diagnosis:</span>
            <span className="font-semibold text-stone-800 text-[11px] truncate max-w-[170px]" title={supplyAnalysis.bottleneckSummary}>
              {supplyAnalysis.bottleneckSummary}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};
