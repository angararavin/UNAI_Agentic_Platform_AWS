import React, { useState, useRef, useEffect, useCallback } from 'react';
import { HelpCircle, Info } from 'lucide-react';

export interface ExplainContent {
  title: string;
  whatItMeans: string;
  howItIsCalculated?: string;
  benchmarkOrAction?: string;
}

interface ExplainTooltipProps {
  content: ExplainContent;
  children?: React.ReactNode;
  variant?: 'icon' | 'badge' | 'underline' | 'pill';
  align?: 'left' | 'center' | 'right';
  className?: string;
}

interface Coords {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  placement: 'top' | 'bottom';
  arrowLeft: number;
}

export const ExplainTooltip: React.FC<ExplainTooltipProps> = ({
  content,
  children,
  variant = 'icon',
  align = 'center',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const tooltipWidth = Math.min(320, window.innerWidth - 24);

    // Vertical space check: need ~240px
    const spaceAbove = rect.top;
    const placement: 'top' | 'bottom' = spaceAbove < 240 ? 'bottom' : 'top';

    const triggerCenter = rect.left + rect.width / 2;
    let left = triggerCenter - tooltipWidth / 2;

    // Strict clamp to viewport margins
    if (left < 12) {
      left = 12;
    } else if (left + tooltipWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - 12 - tooltipWidth);
    }

    const arrowLeft = Math.max(14, Math.min(tooltipWidth - 14, triggerCenter - left));

    if (placement === 'bottom') {
      setCoords({
        top: Math.round(rect.bottom + 8),
        left: Math.round(left),
        width: tooltipWidth,
        placement: 'bottom',
        arrowLeft: Math.round(arrowLeft),
      });
    } else {
      setCoords({
        bottom: Math.round(window.innerHeight - rect.top + 8),
        left: Math.round(left),
        width: tooltipWidth,
        placement: 'top',
        arrowLeft: Math.round(arrowLeft),
      });
    }
  }, []);

  // Update coordinates when opened or on scroll/resize
  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const onScroll = () => updatePosition();
      const onResize = () => updatePosition();
      window.addEventListener('scroll', onScroll, true);
      window.addEventListener('resize', onResize);
      return () => {
        window.removeEventListener('scroll', onScroll, true);
        window.removeEventListener('resize', onResize);
      };
    }
  }, [isOpen, updatePosition]);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {/* Trigger element based on variant */}
      {variant === 'icon' && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
          className="inline-flex items-center text-[#5F6368] hover:text-[#1A73E8] p-0.5 rounded transition-colors cursor-pointer focus:outline-hidden"
          title={`Explain: ${content.title}`}
          aria-label={`Explain: ${content.title}`}
        >
          {children || <HelpCircle className="w-3.5 h-3.5" />}
        </button>
      )}

      {variant === 'underline' && (
        <span
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
          className="inline-flex items-center gap-1 border-b border-dotted border-[#5F6368] hover:border-[#1A73E8] text-inherit cursor-help transition-colors"
        >
          {children}
          <Info className="w-3 h-3 text-[#5F6368] shrink-0" />
        </span>
      )}

      {variant === 'badge' && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#E8F0FE] text-[#1A73E8] hover:bg-[#D2E3FC] border border-[#D2E3FC] transition-colors cursor-pointer"
        >
          {children || <span>Explain</span>}
          <HelpCircle className="w-3 h-3" />
        </button>
      )}

      {variant === 'pill' && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
          className="cursor-help"
        >
          {children}
        </div>
      )}

      {/* Popover Card rendered with viewport-clamped fixed coordinates */}
      {isOpen && coords && (
        <div
          ref={popoverRef}
          role="tooltip"
          className="fixed z-[9999] bg-white border border-[#DADCE0] rounded-lg shadow-xl p-3 text-left animate-in fade-in zoom-in-95 duration-100 font-sans"
          style={{
            ...(coords.top !== undefined ? { top: `${coords.top}px` } : { bottom: `${coords.bottom}px` }),
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            maxWidth: 'calc(100vw - 24px)',
          }}
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#E8EAED]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#1A73E8]" />
              <h5 className="text-xs font-bold font-mono text-[#202124] uppercase tracking-wide">
                {content.title}
              </h5>
            </div>
            <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#F1F3F4] text-[#5F6368]">
              Explainability
            </span>
          </div>

          {/* Core explanation */}
          <div className="space-y-2 text-[11px] leading-relaxed">
            <div>
              <div className="text-[10px] font-bold text-[#5F6368] uppercase tracking-wider mb-0.5">
                What it means
              </div>
              <p className="text-[#202124] font-normal">{content.whatItMeans}</p>
            </div>

            {content.howItIsCalculated && (
              <div className="bg-[#F8F9FA] p-2 rounded border border-[#E8EAED]">
                <div className="text-[10px] font-bold text-[#1A73E8] uppercase tracking-wider mb-0.5">
                  How it's calculated
                </div>
                <p className="text-[#3C4043] font-mono text-[10px]">
                  {content.howItIsCalculated}
                </p>
              </div>
            )}

            {content.benchmarkOrAction && (
              <div className="text-[10px] text-[#5F6368]">
                <strong className="text-[#202124] font-semibold">Operational Rule: </strong>
                {content.benchmarkOrAction}
              </div>
            )}
          </div>

          {/* Arrow indicator */}
          {coords.placement === 'top' ? (
            <div
              className="absolute top-full -mt-px w-2 h-2 bg-white border-r border-b border-[#DADCE0] rotate-45 -translate-x-1/2 pointer-events-none"
              style={{ left: `${coords.arrowLeft}px` }}
            />
          ) : (
            <div
              className="absolute bottom-full -mb-px w-2 h-2 bg-white border-l border-t border-[#DADCE0] rotate-45 -translate-x-1/2 pointer-events-none"
              style={{ left: `${coords.arrowLeft}px` }}
            />
          )}
        </div>
      )}
    </div>
  );
};

// Dictionary of standard explanations for reuse
export const EXPLAIN_REGISTRY = {
  dwellBreached: {
    title: 'Dwell Status: Breached',
    whatItMeans:
      'Actual time in the current processing stage has exceeded the allowable Micro-SLO target (>100% of limit). Indicates an active operational stall.',
    howItIsCalculated: 'Condition: Hours in Stage > Micro-SLO Target',
    benchmarkOrAction:
      'Triggers immediate P1 logistics escalation to transportation managers or station supervisors.',
  },
  dwellAtRisk: {
    title: 'Dwell Status: At Risk',
    whatItMeans:
      'Dwell time is approaching the limit (80% to 100% of Micro-SLO). The tray is vulnerable to SLA breach unless expedited.',
    howItIsCalculated: 'Condition: Hours in Stage >= (0.8 × Micro-SLO)',
    benchmarkOrAction:
      'Proactively alerts staging handlers to re-prioritize bench queues before the cut-off window.',
  },
  dwellWithinSlo: {
    title: 'Dwell Status: Within SLO',
    whatItMeans:
      'Tray processing is nominal and progressing well under the Micro-SLO limit (<80%).',
    howItIsCalculated: 'Condition: Hours in Stage < (0.8 × Micro-SLO)',
    benchmarkOrAction:
      'Standard autonomous monitoring without human intervention required.',
  },
  avgCurrentDwell: {
    title: 'Avg Current Dwell',
    whatItMeans:
      'The average elapsed time active RMA trays have spent waiting or processing in their respective stages.',
    howItIsCalculated:
      'Sum of elapsed stage hours across all active monitored trays ÷ total count of active trays.',
    benchmarkOrAction:
      'Should remain strictly below the Avg Expected SLO (Target baseline).',
  },
  avgExpectedSlo: {
    title: 'Avg Expected SLO',
    whatItMeans:
      'The average allowable target duration across all monitored processing stages.',
    howItIsCalculated:
      'Sum of contractual Micro-SLO target limits ÷ total count of monitored stages.',
    benchmarkOrAction:
      'Serves as the fleet-wide baseline benchmark for cycle time compliance.',
  },
  dwellVariance: {
    title: 'Dwell Variance',
    whatItMeans:
      'The exact numerical difference between actual elapsed dwell time and the target Micro-SLO.',
    howItIsCalculated: 'Dwell Variance = Actual Dwell Time - Micro-SLO',
    benchmarkOrAction:
      'Positive variance indicates hours overdue beyond allowable target; negative indicates ahead of target.',
  },
  delay: {
    title: 'Dwell Delay',
    whatItMeans:
      'The net overdue time accumulated beyond the contractual stage limit.',
    howItIsCalculated: 'Delay = Max(0, Actual Dwell Time - Micro-SLO)',
    benchmarkOrAction:
      'Zero hours indicates on-time execution. Non-zero triggers tier-based escalation.',
  },
  microSlo: {
    title: 'Micro-SLO',
    whatItMeans:
      'Maximum acceptable duration (in hours) configured for a discrete RMA workflow checkpoint (e.g., Inbound Intake, Diagnostic Bench, Thermal Burn-in).',
    howItIsCalculated:
      'Defined operational contract per stage and facility tier.',
    benchmarkOrAction:
      'Enables granular bottleneck detection before overall multi-week RMA SLAs are breached.',
  },
  rootCause: {
    title: 'AI Root Cause Analysis',
    whatItMeans:
      'The primary logistical or diagnostic factor diagnosed by AI as responsible for the stage delay.',
    howItIsCalculated:
      'Synthesized from station queue depth, telemetry timestamps, dock carrier events, and engineer notes.',
    benchmarkOrAction:
      'Provides actionable guidance to resolve the specific operational blockage.',
  },
  escalationRecommendation: {
    title: 'Escalation Recommendation',
    whatItMeans:
      'The automated next step prescribed by the AI agent based on dwell severity and bottleneck analysis.',
    howItIsCalculated:
      'Evaluated against facility escalation matrices and carrier priority tiers.',
    benchmarkOrAction:
      'Examples: Monitor, Notify logistics team, Escalate to transportation manager, Trigger priority carrier assignment.',
  },
  autoApproveRate: {
    title: 'Auto-Approve Rate',
    whatItMeans:
      'The percentage of agent decisions executed autonomously without human intervention.',
    howItIsCalculated:
      '(Auto-Approved Decisions ÷ Total Processed Decisions) × 100',
    benchmarkOrAction:
      'Decisions with confidence equal to or greater than the safety threshold execute instantly.',
  },
  pendingReview: {
    title: 'Pending Human Review',
    whatItMeans:
      'Decisions where AI confidence score fell below the configured safety threshold. Assets are quarantined safely awaiting engineer sign-off.',
    howItIsCalculated: 'Condition: Confidence Score < Configured Threshold',
    benchmarkOrAction:
      'Engineers can Approve, Reject, or Override recommendations in the Control Tower ledger.',
  },
  confidenceScore: {
    title: 'Confidence Score',
    whatItMeans:
      'Statistical certainty (0-100%) calculated by evaluating hardware telemetry clarity, error code consistency, and historical repair pass rates.',
    howItIsCalculated:
      'Multi-factor scoring model based on DCHA logs, manifest parity, and inventory availability.',
    benchmarkOrAction:
      'Tested against the Human Approval Rule to determine auto-approval vs human intervention.',
  },
  meanConfidence: {
    title: 'Mean Confidence',
    whatItMeans:
      'The aggregate average confidence score across all executed agent evaluations.',
    howItIsCalculated:
      'Sum of confidence scores across all recorded actions ÷ total count of actions.',
    benchmarkOrAction:
      'Reflects overall operational health and model agreement across all 4 agent domains.',
  },
  agent1Disposition: {
    title: 'Failure-Based Disposition',
    whatItMeans:
      'Determines whether hardware is Repaired (component rework), Replaced (unrepairable damage), or Further Diagnosed (signal ambiguity).',
    howItIsCalculated:
      'DCHA telemetry logs, PCIe error patterns, and failure history analysis.',
    benchmarkOrAction:
      'High confidence enables automated work-order generation; lower confidence routes to L3 Hardware Lab for review.',
  },
  agent2Dwell: {
    title: 'Agent 2: Dwell Time Monitoring & Escalation',
    whatItMeans:
      'Continuously tracks elapsed hours spent in each repair/logistics stage, comparing against Micro-SLO targets to detect stalls and trigger automatic escalations.',
    howItIsCalculated:
      'Compares live telemetry timestamps with configured Micro-SLO limits, variance calculations, and AI bottleneck diagnosis.',
    benchmarkOrAction:
      'High confidence auto-approves escalation; uncertain confidence flags for operations supervisor review.',
  },
  agent3Urgency: {
    title: 'Urgency & Required Delivery Date',
    whatItMeans:
      'Prioritizes RMA turnaround (P1 Critical to P4 Low) and assigns contractual delivery targets (Next Flight Out, 48h Expedited, Standard).',
    howItIsCalculated:
      'Calculated from datacenter spare pool exhaustion, SLA exposure, and carrier constraints.',
    benchmarkOrAction:
      'High confidence automatically dispatches carrier booking; low confidence requires logistics review.',
  },
  agent4Reintegration: {
    title: 'Spare-Pool Reintegration',
    whatItMeans:
      'Certifies repaired hardware for return to active datacenter inventory (Eligible, Quarantine, or Ineligible).',
    howItIsCalculated:
      'Validation of serial number parity, burn-in retest certification, and warranty status.',
    benchmarkOrAction:
      'Verified confidence triggers automatic PO financial payment release.',
  },
  // Shorthand aliases used across agent views
  withinSlo: {
    title: 'Dwell Status: Within SLO',
    whatItMeans:
      'Tray processing is nominal and progressing well under the Micro-SLO limit (<80%).',
    howItIsCalculated: 'Condition: Hours in Stage < (0.8 × Micro-SLO)',
    benchmarkOrAction:
      'Standard autonomous monitoring without human intervention required.',
  },
  atRisk: {
    title: 'Dwell Status: At Risk',
    whatItMeans:
      'Dwell time is approaching the limit (80% to 100% of Micro-SLO). The tray is vulnerable to SLA breach unless expedited.',
    howItIsCalculated: 'Condition: Hours in Stage >= (0.8 × Micro-SLO)',
    benchmarkOrAction:
      'Proactively alerts staging handlers to re-prioritize bench queues before the cut-off window.',
  },
  breached: {
    title: 'Dwell Status: Breached',
    whatItMeans:
      'Actual time in the current processing stage has exceeded the allowable Micro-SLO target (>100% of limit). Indicates an active operational stall.',
    howItIsCalculated: 'Condition: Hours in Stage > Micro-SLO Target',
    benchmarkOrAction:
      'Triggers immediate P1 logistics escalation to transportation managers or station supervisors.',
  },
  p1Critical: {
    title: 'P1 Critical Priority (NFO)',
    whatItMeans:
      'Data center spares are at zero for this hardware tier, exposing the cluster to immediate catastrophic outage.',
    howItIsCalculated: 'Condition: Spare Inventory = 0 OR SLA impact > $50,000/hr.',
    benchmarkOrAction:
      'Triggers Next Flight Out (NFO) air charter expedite and direct VP logistics notification.',
  },
  eligibleForPool: {
    title: 'Eligible for Spare Pool',
    whatItMeans:
      'Repaired hardware passed all OEM burn-in tests and serial validation matches original RMA manifest.',
    howItIsCalculated: 'Dock Barcode Match + QA Test Certificate Verified + Intact Warranty.',
    benchmarkOrAction:
      'Unit admitted into active spare reserves; inventory counts incremented.',
  },
  quarantineRequired: {
    title: 'Quarantine Required',
    whatItMeans:
      'Barcode serial mismatch or missing burn-in diagnostic test certificate prevents safe return.',
    howItIsCalculated: 'Serial Mismatch OR Unverified QA Certificate.',
    benchmarkOrAction:
      'Hardware isolated in physical quarantine cage to prevent counterfeit or rogue insertion.',
  },
  rdd: {
    title: 'Required Delivery Date (RDD)',
    whatItMeans:
      'The contractual cutoff date and time by which replacement hardware must arrive at the data center dock.',
    howItIsCalculated: 'Calculated from SLA window minus flight/transit lead time.',
    benchmarkOrAction:
      'Carrier service levels (NFO vs Ground) are automatically booked to meet this deadline.',
  },
  serialValidation: {
    title: 'Serial Parity Validation',
    whatItMeans:
      'Bitwise and physical barcode comparison between returned unit and original RMA outbound manifest.',
    howItIsCalculated: 'Barcode Scan == RMA Initial Serial Registration.',
    benchmarkOrAction:
      'Match allows spare pool entry; Mismatch triggers fraud and quarantine protocols.',
  },
};

