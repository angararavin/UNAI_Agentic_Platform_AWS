import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SupplyItem } from '../../types';
import { Tooltip } from '../ui/Tooltip';
import { Factory, Check, Truck, Info, Clock } from 'lucide-react';

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
  const [hoveredSku, setHoveredSku] = useState<string | null>(null);
  const [popoverCoords, setPopoverCoords] = useState<{ top: number; left: number } | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const updatePopoverPosition = (sku: string) => {
    const el = cardRefs.current.get(sku);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const popoverWidth = 340;
    const popoverHeight = 280;
    const gap = 8;
    const padding = 12;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Default: position directly below card
    let top = rect.bottom + gap;
    // If not enough vertical room below, position above
    if (top + popoverHeight > viewportHeight - padding) {
      top = Math.max(padding, rect.top - popoverHeight - gap);
    }

    // Horizontal positioning: align with card left, but clamp to stay inside window
    let left = rect.left;
    if (left + popoverWidth > viewportWidth - padding) {
      left = Math.max(padding, viewportWidth - popoverWidth - padding);
    }
    if (left < padding) {
      left = padding;
    }

    setPopoverCoords({ top, left });
  };

  const handleMouseEnter = (sku: string) => {
    setHoveredSku(sku);
    updatePopoverPosition(sku);
  };

  const handleMouseLeave = () => {
    setHoveredSku(null);
    setPopoverCoords(null);
  };

  useEffect(() => {
    if (hoveredSku) {
      const onScrollOrResize = () => updatePopoverPosition(hoveredSku);
      window.addEventListener('scroll', onScrollOrResize, true);
      window.addEventListener('resize', onScrollOrResize);
      return () => {
        window.removeEventListener('scroll', onScrollOrResize, true);
        window.removeEventListener('resize', onScrollOrResize);
      };
    }
  }, [hoveredSku]);

  const activeHoveredItem = items.find(i => i.sku === hoveredSku);

  return (
    <div id="sku-selector-container" className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Target Item Filter
          </label>
          <Tooltip
            position="right"
            content="Click to switch active supply item. Hover over any SKU card to inspect real-time inventory, supplier lead-times, and line capacity."
          >
            <Info className="w-3.5 h-3.5 text-stone-400 hover:text-stone-700 cursor-pointer" />
          </Tooltip>
        </div>
        <span className="text-xs text-stone-400">
          Hover for deep inventory specs &bull; {items.length} SKUs
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {items.map((item) => {
          const isSelected = item.sku === selectedSku;
          const openPoUnits = item.openPurchaseOrders.reduce((sum, po) => sum + po.units, 0);

          return (
            <div
              key={item.sku}
              ref={(el) => {
                if (el) cardRefs.current.set(item.sku, el);
                else cardRefs.current.delete(item.sku);
              }}
              className="relative"
              onMouseEnter={() => handleMouseEnter(item.sku)}
              onMouseLeave={handleMouseLeave}
            >
              <button
                id={`sku-card-${item.sku}`}
                type="button"
                disabled={disabled}
                onClick={() => onSelectSku(item.sku)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'border-stone-900 bg-stone-50 ring-1 ring-stone-900 shadow-sm'
                    : 'border-stone-200 bg-white hover:border-stone-400 hover:shadow-sm'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-stone-900 bg-stone-100 px-2 py-0.5 rounded">
                      {item.sku}
                    </span>
                    {isSelected ? (
                      <span className="w-4 h-4 rounded-full bg-stone-900 text-white flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    ) : (
                      <span className="text-[11px] text-stone-400 font-mono">
                        ${item.unitCost}/u
                      </span>
                    )}
                  </div>

                  <h4 className="mt-2 text-sm font-semibold text-stone-900 line-clamp-1">
                    {item.name}
                  </h4>
                  <p className="text-xs text-stone-500">{item.category}</p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-stone-100 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-stone-400 font-medium block">Forecast</span>
                    <span className="font-semibold text-stone-800">{item.baselineDailyForecast}/d</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 font-medium block">On-Hand</span>
                    <span className="font-semibold text-stone-800">{item.currentInventory}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 font-medium block">Open POs</span>
                    <span className="font-semibold text-stone-800">+{openPoUnits}</span>
                  </div>
                </div>

                {/* Sub-label showing hover cue */}
                <div className="mt-2 flex items-center justify-between text-[10px] text-stone-400 pt-1">
                  <span>Plant: {item.productionCapacity.lineName.split('-')[0]}</span>
                  <span className="text-stone-500 font-medium group-hover:underline flex items-center gap-0.5">
                    Hover for specs &rarr;
                  </span>
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* Floating Hover Card Portal - Guaranteed 100% visible, never clipped or hidden */}
      {activeHoveredItem && popoverCoords && typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: `${popoverCoords.top}px`,
              left: `${popoverCoords.left}px`,
              zIndex: 99999,
              width: '340px'
            }}
            className="pointer-events-none transition-all duration-150 animate-in fade-in p-3.5 bg-stone-900 text-white rounded-xl shadow-2xl border border-stone-700 text-xs space-y-2.5"
          >
            <div className="flex items-center justify-between border-b border-stone-800 pb-1.5">
              <div>
                <span className="font-mono font-bold text-stone-200">{activeHoveredItem.sku}</span>
                <span className="text-[10px] text-stone-400 block">{activeHoveredItem.category}</span>
              </div>
              <span className="font-mono text-emerald-400 font-bold">${activeHoveredItem.unitCost} / unit</span>
            </div>

            {/* Stock Details */}
            <div className="grid grid-cols-2 gap-2 text-[11px] bg-stone-800/60 p-2 rounded-lg border border-stone-800">
              <div>
                <span className="text-stone-400 block">Available (Free):</span>
                <span className="font-semibold text-stone-100">
                  {Math.max(0, activeHoveredItem.currentInventory - activeHoveredItem.reservedInventory)} units
                </span>
              </div>
              <div>
                <span className="text-stone-400 block">Reserved Stock:</span>
                <span className="font-semibold text-amber-300">{activeHoveredItem.reservedInventory} units</span>
              </div>
              <div>
                <span className="text-stone-400 block">Safety Stock Floor:</span>
                <span className="font-semibold text-stone-100">{activeHoveredItem.safetyStock} units</span>
              </div>
              <div>
                <span className="text-stone-400 block">In-Transit Pipeline:</span>
                <span className="font-semibold text-emerald-400">
                  +{activeHoveredItem.openPurchaseOrders.reduce((sum, po) => sum + po.units, 0)} units
                </span>
              </div>
            </div>

            {/* Supplier & Lead Times */}
            <div className="space-y-1 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-stone-400 flex items-center gap-1">
                  <Truck className="w-3 h-3 text-stone-400" />
                  Supplier:
                </span>
                <span className="text-stone-200 font-medium truncate max-w-[170px]">
                  {activeHoveredItem.supplier.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-stone-400" />
                  Standard Lead Time:
                </span>
                <span className="text-stone-200 font-medium">{activeHoveredItem.supplier.leadTimeDays} days</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-400">Expedite Air Option:</span>
                <span className="text-amber-300 font-medium">
                  {activeHoveredItem.supplier.expediteLeadTimeDays}d (+${activeHoveredItem.supplier.expediteCostPerUnit}/u)
                </span>
              </div>
            </div>

            {/* Manufacturing Plant Line */}
            <div className="pt-1.5 border-t border-stone-800 text-[11px] flex items-center justify-between text-stone-300">
              <span className="flex items-center gap-1">
                <Factory className="w-3 h-3 text-stone-400" />
                {activeHoveredItem.productionCapacity.lineName}
              </span>
              <span>
                Headroom: <strong className="text-white">+{activeHoveredItem.productionCapacity.surgeHeadroomUnits}/d</strong>
              </span>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
