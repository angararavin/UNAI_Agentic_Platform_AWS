import { Agent1Input, Agent2Input, Agent3Input, Agent4Input } from './types';

export interface PresetItem<T> {
  name: string;
  description: string;
  expectedOutcome: string;
  data: T;
}

export const AGENT1_PRESETS: PresetItem<Agent1Input>[] = [
  {
    name: "HBM3 Memory Bus Parity Fault (Repaired)",
    description: "Solder joint degradation on HBM3 channel B. DCHA shows isolated lane failure with high repairability score.",
    expectedOutcome: "Auto-Approved (Confidence ~88% >= 85%) -> Repaired",
    data: {
      trayId: "TRAY-2026-HBM-4081",
      mpn: "MPN-8820-GPU-H100-SXM5",
      failureCode: "ERR_HBM_PARITY_CH_B",
      failureDescription: "Single-lane memory bus parity check failure detected under sustained GEMM workload. Thermal delta within nominal limits.",
      dchaLogs: "DCHA v4.2.1 [PASS: Core Voltage, PASS: PCIe Gen5, FAIL: HBM Channel B Lane 4]. Diagnostic trace: Impedance mismatch 14.2 ohms (spec: 50 ohms). Micro-ball grid solder fatigue identified. Reflow and BGA re-balling profile: REC-094 approved."
    }
  },
  {
    name: "Catastrophic Silicon Delamination (Replaced)",
    description: "Thermal thermal runaway with substrate crack. DCHA confirms irreversible die fracture.",
    expectedOutcome: "Auto-Approved (Confidence ~94% >= 85%) -> Replaced",
    data: {
      trayId: "TRAY-2026-DIECRACK-771",
      mpn: "MPN-8820-GPU-H100-SXM5",
      failureCode: "ERR_ASIC_FATAL_DELAMINATION",
      failureDescription: "Substrate delamination and silicon fracture following 98C thermal excursion in chassis slot 3. Main power rail short to ground.",
      dchaLogs: "DCHA v4.2.1 [CRITICAL FAIL: VDD_CORE SHORT]. Micro-CT acoustic scan: 18mm shear fracture along interposer boundary layer. Internal copper trace severed. Unit is non-salvageable by contract manufacturer."
    }
  },
  {
    name: "Intermittent PCIe Gen5 Training (Further Diagnosed)",
    description: "Link drops from x16 to x4 under non-deterministic conditions. Inconclusive initial bench tests.",
    expectedOutcome: "Human Review Required (Confidence ~74% < 85%) -> Further Diagnosed",
    data: {
      trayId: "TRAY-2026-PCIE-1092",
      mpn: "MPN-7410-NIC-400G-CX7",
      failureCode: "ERR_PCIE_DEGRADED_WIDTH",
      failureDescription: "Link randomly falls back to PCIe Gen5 x4 during warm reboot cycles. Retimer registers show intermittent eye margin collapse.",
      dchaLogs: "DCHA v4.2.1 [WARN: Eye diagram margin at 12% on Lane 7]. Cold ambient run: PASS 16 GT/s. Warm chamber run (+55C): 4 errors in 10^12 bits. Root cause ambiguous between retimer ASIC firmware jitter and board capacitance."
    }
  }
];

export const AGENT2_PRESETS: PresetItem<Agent2Input>[] = [
  {
    name: "Contract Manufacturer Inbound Queue Breach",
    description: "Tray sitting on CM receiving dock for 18.5 hours vs Micro-SLO limit of 8.0 hours.",
    expectedOutcome: "Auto-Approved (Confidence ~91% >= 80%) -> Breached, Bottleneck: CM Inbound",
    data: {
      trayId: "TRAY-2026-DWELL-3301",
      currentStage: "CM_INBOUND_QUEUE",
      hoursInStage: 18.5,
      microSlo: 8.0,
      location: "San Jose Contract Facility Dock 4",
      eventHistory: "2026-09-01 14:00 - Arrived at receiving dock\n2026-09-01 16:30 - Barcode scanned by inbound operator\n2026-09-02 02:00 - Shift change without intake ticket assignment\n2026-09-02 08:30 - No staging movement recorded for 12+ hours"
    }
  },
  {
    name: "Carrier Hub Staging Impending Breach",
    description: "Tray in air freight transfer hub with 3.8 hours vs 4.0 hour Micro-SLO.",
    expectedOutcome: "Human Review Required (Confidence ~74% < 80%) -> At Risk",
    data: {
      trayId: "TRAY-2026-DWELL-8910",
      currentStage: "CARRIER_HUB_TRANSIT",
      hoursInStage: 3.8,
      microSlo: 4.0,
      location: "Memphis Air Cargo Sorting Terminal B",
      eventHistory: "2026-09-02 19:15 - Offloaded from flight FX-401\n2026-09-02 21:00 - Weather delay reported on connecting outbound feeder\n2026-09-02 22:50 - Ground sort queue backlogged 45 minutes"
    }
  },
  {
    name: "Clean Room Thermal Cycling within SLO",
    description: "Tray currently undergoing burn-in chamber profile within prescribed timing window.",
    expectedOutcome: "Auto-Approved (Confidence ~95% >= 80%) -> Within SLO",
    data: {
      trayId: "TRAY-2026-DWELL-1102",
      currentStage: "BURN_IN_CHAMBER_TEST",
      hoursInStage: 2.1,
      microSlo: 6.0,
      location: "Fremont Tech Center Chamber #3",
      eventHistory: "2026-09-02 21:00 - Tray loaded into Chamber 3\n2026-09-02 21:30 - Ramp to +65C completed\n2026-09-02 23:05 - Step 3 of 5 running on schedule"
    }
  }
];

export const AGENT3_PRESETS: PresetItem<Agent3Input>[] = [
  {
    name: "Tier-1 LLM Cluster Spine Failure (Zero Spares)",
    description: "Critical NVLink spine node in flagship datacenter cluster. Zero buffer inventory in regional warehouse.",
    expectedOutcome: "Auto-Approved (Confidence ~96% >= 90%) -> Critical, Priority P1, RDD: Next Flight Out (<24h)",
    data: {
      trayId: "TRAY-2026-URG-0012",
      failureType: "Hard Node Isolation Outage",
      failureCode: "CRIT_SPINE_SWITCH_DOWN",
      dataCenter: "DC-NORTH-OREGON-POD-4",
      spareInventory: 0,
      businessImpact: "Affects 16,384 GPU distributed cluster training checkpoint. Customer SLA penalty accumulating at $45,000/hr. Zero hot-standby available in North America.",
      carrierStatus: "Next Flight Out (NFO) available with guaranteed same-day dispatch.",
      cmQueueStatus: "Expedited hot-line priority line slot 1 reserved."
    }
  },
  {
    name: "Non-Critical Batch Worker Storage Node",
    description: "Worker tray failure in archival batch cluster with abundant buffer stock.",
    expectedOutcome: "Auto-Approved (Confidence ~93% >= 90%) -> Low, Priority P4, RDD: Standard Logistics (+7 Days)",
    data: {
      trayId: "TRAY-2026-URG-4491",
      failureType: "Redundant SAS Controller Dropout",
      failureCode: "WARN_SAS_CONTROLLER_OFFLINE",
      dataCenter: "DC-IOWA-STORAGE-BUILDING-2",
      spareInventory: 24,
      businessImpact: "Redundant controller automatically assumed workload. Zero user-facing latency impact. 24 verified shelf spares in local cage.",
      carrierStatus: "Standard consolidated ground shipping route running 3x per week.",
      cmQueueStatus: "Normal batch queue, average turnaround 96 hours."
    }
  },
  {
    name: "Regional Edge Node with Single Spare & Storm Alert",
    description: "Edge cluster with 1 spare remaining, but severe winter weather disrupts freight line.",
    expectedOutcome: "Human Review Required (Confidence ~82% < 90%) -> High/Critical, P2",
    data: {
      trayId: "TRAY-2026-URG-6712",
      failureType: "Memory Array ECC Degradation",
      failureCode: "ERR_UNRECORDED_MULTI_ECC",
      dataCenter: "DC-EUROPE-FRANKFURT-EDGE-01",
      spareInventory: 1,
      businessImpact: "Edge node serving low-latency inference endpoint. Only 1 cold spare remains in Frankfurt. Further failure triggers traffic shedding.",
      carrierStatus: "High risk of regional flight cancellations due to winter storm alert over Rhine valley.",
      cmQueueStatus: "Queue operating at 85% capacity with standard turnaround."
    }
  }
];

export const AGENT4_PRESETS: PresetItem<Agent4Input>[] = [
  {
    name: "Valid CM Repair Reintegration (Clean Serial Match)",
    description: "Verified repair return with matching serial, active OEM warranty, and complete test cert.",
    expectedOutcome: "Auto-Approved (Confidence ~97% >= 95%) -> Eligible for Spare Pool",
    data: {
      trayId: "TRAY-2026-REC-5021",
      rmaId: "RMA-2026-US-88301",
      serialNumber: "SN-H100-2025-091823-A",
      returnedSerial: "SN-H100-2025-091823-A",
      repairStatus: "Completed - VRM Rework & 24hr Burn-in Certified",
      warrantyStatus: "In Warranty (OEM Contract EXP: 2028-12-31)",
      manifestDetails: "CM Return Manifest #CM-88190: Solder reflow of U12 voltage regulator. DCHA test log attached and passed 100% vector patterns. Holographic warranty seal intact."
    }
  },
  {
    name: "Serial Number Mismatch (Fraud / Mixed Inventory)",
    description: "Returned chassis serial does not match the original RMA ticket. Older hardware revision returned.",
    expectedOutcome: "Auto-Approved (Confidence ~98% >= 95%) -> Ineligible / Quarantine (Flagged)",
    data: {
      trayId: "TRAY-2026-REC-9944",
      rmaId: "RMA-2026-US-10294",
      serialNumber: "SN-H100-2025-992110-B",
      returnedSerial: "SN-A100-2022-310022-X",
      repairStatus: "Reported Repaired by 3rd Party",
      warrantyStatus: "Void / Revision Inconsistency",
      manifestDetails: "Manifest claims SXM5 H100 tray returned. Receiving dock inspection reveals legacy A100 board assembly with mismatched optical serial. Warranty tamper sticker broken."
    }
  },
  {
    name: "Uncertified Rework with Expired OEM Warranty",
    description: "Serial numbers match, but third-party vendor replaced resistor with non-qualified substitute.",
    expectedOutcome: "Human Review Required (Confidence ~89% < 95%) -> Quarantine / Human Review",
    data: {
      trayId: "TRAY-2026-REC-3320",
      rmaId: "RMA-2026-AP-44019",
      serialNumber: "SN-400G-2024-551029",
      returnedSerial: "SN-400G-2024-551029",
      repairStatus: "Partial - Passive Component Substitute",
      warrantyStatus: "OEM Warranty Expired 30 days ago",
      manifestDetails: "Vendor manifest shows non-standard decoupling capacitor soldered on rail 3. Vendor self-tested for 2 hours, but official 24-hr DCHA burn-in log was not uploaded."
    }
  }
];
