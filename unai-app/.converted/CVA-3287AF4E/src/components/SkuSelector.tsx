import React from 'react';
import { SupplyItem } from '../types';
import { Package, ShieldAlert, Truck, Factory, ChevronRight, Check } from 'lucide-react';

interface SkuSelectorProps {
  items: SupplyItem[];
  selectedSku: string;
  onSelectSku: (sku: string) => void;
  disabled?: boolean;
}

export const SkuSelector: React.FC<SkuSelectorProps> = ({
  items,
  selectedSku,
  onSelectSku,
  disabled
}) => {
  return (
    <div id="sku-selector-container" className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Target Supply Item (SKU)
        </label>
        <span className="text-xs text-slate-400">
          {items.length} Production SKUs loaded
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((item) => {
          const isSelected = item.sku === selectedSku;
          const openPoUnits = item.openPurchaseOrders.reduce((sum, po) => sum + po.units, 0);

          return (
            <button
              key={item.sku}
              id={`sku-card-${item.sku}`}
              type="button"
              disabled={disabled}
              onClick={() => onSelectSku(item.sku)}
              className={`text-left p-3.5 rounded-xl border-2 transition-all flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-600/20'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
              } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {/* Card Header */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded">
                    {item.sku}
                  </span>
                  {isSelected ? (
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-slate-400">
                      ${item.unitCost}/unit
                    </span>
                  )}
                </div>

                <h4 className="mt-1.5 text-sm font-semibold text-slate-900 line-clamp-1">
                  {item.name}
                </h4>
                <p className="text-xs text-slate-500">{item.category}</p>
              </div>

              {/* Card Supply Metrics */}
              <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block">Forecast</span>
                  <span className="font-semibold text-slate-800">{item.baselineDailyForecast}/d</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block">On-Hand</span>
                  <span className="font-semibold text-slate-800">{item.currentInventory}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block">In-PO</span>
                  <span className="font-semibold text-emerald-700">+{openPoUnits}</span>
                </div>
              </div>

              {/* Plant line badge */}
              <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5 truncate">
                <Factory className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">{item.productionCapacity.lineName}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
