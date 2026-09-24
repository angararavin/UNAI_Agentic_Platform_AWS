import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  tooltipClassName?: string;
  delay?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  className = '',
  tooltipClassName = '',
  delay = 60
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; actualPosition: 'top' | 'bottom' | 'left' | 'right' }>({
    top: 0,
    left: 0,
    actualPosition: position
  });

  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipEl = tooltipRef.current;

    // Use measured dimensions or reasonable defaults before layout
    const tooltipRect = tooltipEl ? tooltipEl.getBoundingClientRect() : null;
    const tooltipWidth = tooltipRect ? tooltipRect.width : 280;
    const tooltipHeight = tooltipRect ? tooltipRect.height : 54;
    const gap = 8;
    const padding = 12; // Min distance from viewport edges

    let finalPos = position;
    let top = 0;
    let left = 0;

    // Viewport bounds
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (position === 'top') {
      if (triggerRect.top - tooltipHeight - gap < padding) {
        finalPos = 'bottom';
      }
    } else if (position === 'bottom') {
      if (triggerRect.bottom + tooltipHeight + gap > viewportHeight - padding) {
        finalPos = 'top';
      }
    } else if (position === 'left') {
      if (triggerRect.left - tooltipWidth - gap < padding) {
        finalPos = 'right';
      }
    } else if (position === 'right') {
      if (triggerRect.right + tooltipWidth + gap > viewportWidth - padding) {
        finalPos = 'left';
      }
    }

    if (finalPos === 'top') {
      top = triggerRect.top - tooltipHeight - gap;
      left = triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2;
    } else if (finalPos === 'bottom') {
      top = triggerRect.bottom + gap;
      left = triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2;
    } else if (finalPos === 'left') {
      left = triggerRect.left - tooltipWidth - gap;
      top = triggerRect.top + triggerRect.height / 2 - tooltipHeight / 2;
    } else {
      // right
      left = triggerRect.right + gap;
      top = triggerRect.top + triggerRect.height / 2 - tooltipHeight / 2;
    }

    // Clamp horizontally to stay strictly inside the visible viewport
    if (left < padding) {
      left = padding;
    } else if (left + tooltipWidth > viewportWidth - padding) {
      left = Math.max(padding, viewportWidth - tooltipWidth - padding);
    }

    // Clamp vertically
    if (top < padding) {
      top = padding;
    } else if (top + tooltipHeight > viewportHeight - padding) {
      top = Math.max(padding, viewportHeight - tooltipHeight - padding);
    }

    setCoords({ top, left, actualPosition: finalPos });
  };

  const handleMouseEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsVisible(false);
  };

  // Re-measure after element renders to ensure pixel-perfect alignment
  useEffect(() => {
    if (isVisible) {
      // Immediate position calculation
      updatePosition();
      // Double check position on next animation frame after portal DOM layout
      const raf = requestAnimationFrame(() => {
        updatePosition();
      });

      const onScrollOrResize = () => updatePosition();
      window.addEventListener('scroll', onScrollOrResize, true);
      window.addEventListener('resize', onScrollOrResize);
      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('scroll', onScrollOrResize, true);
        window.removeEventListener('resize', onScrollOrResize);
      };
    }
  }, [isVisible]);

  return (
    <div
      ref={triggerRef}
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {children}
      {isVisible && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              zIndex: 99999
            }}
            className={`pointer-events-none transition-opacity duration-100 ease-out opacity-100 animate-in fade-in ${tooltipClassName}`}
          >
            <div className="bg-stone-900 text-stone-100 text-xs rounded-lg shadow-2xl px-3 py-2 border border-stone-700 max-w-xs sm:max-w-sm whitespace-normal leading-relaxed">
              {content}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
