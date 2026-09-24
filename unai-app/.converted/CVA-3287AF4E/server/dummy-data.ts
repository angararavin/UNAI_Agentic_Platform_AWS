import { SupplyItem } from '../src/types';

export const INITIAL_SUPPLY_ITEMS: SupplyItem[] = [
  {
    sku: 'SKU-1049',
    name: 'Industrial Lithium Battery Pack 48V 100Ah',
    category: 'Energy Storage Systems',
    unit: 'Units',
    unitCost: 1250,
    customerSegment: 'Commercial ESS & AGV Fleets',
    baselineDailyForecast: 45,
    forecastHorizonDays: 14,
    currentInventory: 320,
    safetyStock: 150,
    reservedInventory: 110,
    warehouseLocation: 'WH-Central (Dallas, TX)',
    dailyBurnRate: 42,
    supplier: {
      name: 'VoltCore Cell Technologies (Seoul, KR)',
      leadTimeDays: 28,
      expediteAvailable: true,
      expediteLeadTimeDays: 12,
      expediteCostPerUnit: 180,
      reliabilityRating: 94
    },
    openPurchaseOrders: [
      {
        poNumber: 'PO-2024-8831',
        supplier: 'VoltCore Cell Technologies',
        units: 400,
        orderDate: '2025-02-18',
        expectedArrivalDays: 9,
        status: 'IN_TRANSIT',
        canBeExpedited: false
      },
      {
        poNumber: 'PO-2024-9104',
        supplier: 'VoltCore Cell Technologies',
        units: 600,
        orderDate: '2025-03-01',
        expectedArrivalDays: 22,
        status: 'ORDERED',
        canBeExpedited: true
      }
    ],
    productionCapacity: {
      lineId: 'LINE-ESS-01',
      lineName: 'High-Voltage Automated Pack Assembly Line A',
      dailyCapacityUnits: 60,
      currentlyAllocatedUnits: 48,
      surgeHeadroomUnits: 12,
      maintenanceScheduledDays: 18
    },
    recentCustomerOrders: [
      {
        orderId: 'ORD-7712',
        customer: 'Amazon Robotics Fulfillment',
        units: 180,
        orderDate: '2025-03-10',
        requestedLeadDays: 10,
        priority: 'High'
      },
      {
        orderId: 'ORD-7690',
        customer: 'ProLogistix Fleet Systems',
        units: 140,
        orderDate: '2025-03-08',
        requestedLeadDays: 14,
        priority: 'Standard'
      }
    ]
  },
  {
    sku: 'SKU-2082',
    name: 'High-Torque BLDC Motor Driver Assembly 3.5kW',
    category: 'Motion Control & Drives',
    unit: 'Units',
    unitCost: 480,
    customerSegment: 'Industrial Automation & CNC Machinery',
    baselineDailyForecast: 80,
    forecastHorizonDays: 14,
    currentInventory: 540,
    safetyStock: 250,
    reservedInventory: 220,
    warehouseLocation: 'WH-Midwest (Chicago, IL)',
    dailyBurnRate: 76,
    supplier: {
      name: 'SemiconDrive Silicon Corp (Hsinchu, TW)',
      leadTimeDays: 45,
      expediteAvailable: true,
      expediteLeadTimeDays: 21,
      expediteCostPerUnit: 75,
      reliabilityRating: 91
    },
    openPurchaseOrders: [
      {
        poNumber: 'PO-2024-7402',
        supplier: 'SemiconDrive Silicon Corp',
        units: 800,
        orderDate: '2025-02-10',
        expectedArrivalDays: 16,
        status: 'DISPATCHED',
        canBeExpedited: true
      }
    ],
    productionCapacity: {
      lineId: 'LINE-DRV-03',
      lineName: 'SMT & Power Electronics SMT Line 3',
      dailyCapacityUnits: 110,
      currentlyAllocatedUnits: 95,
      surgeHeadroomUnits: 15,
      maintenanceScheduledDays: 7
    },
    recentCustomerOrders: [
      {
        orderId: 'ORD-6520',
        customer: 'Fanuc Integration Partner',
        units: 350,
        orderDate: '2025-03-11',
        requestedLeadDays: 7,
        priority: 'Critical'
      }
    ]
  },
  {
    sku: 'SKU-3301',
    name: 'Microcontroller Telemetry Core Board v3.2',
    category: 'Embedded Computing',
    unit: 'Units',
    unitCost: 195,
    customerSegment: 'Smart Metering & Grid Infrastructure',
    baselineDailyForecast: 150,
    forecastHorizonDays: 14,
    currentInventory: 1100,
    safetyStock: 600,
    reservedInventory: 450,
    warehouseLocation: 'WH-West (San Jose, CA)',
    dailyBurnRate: 140,
    supplier: {
      name: 'Shenzhen MicroFab PCB Ltd (Shenzhen, CN)',
      leadTimeDays: 35,
      expediteAvailable: false,
      expediteLeadTimeDays: 35,
      expediteCostPerUnit: 0,
      reliabilityRating: 88
    },
    openPurchaseOrders: [
      {
        poNumber: 'PO-2024-6990',
        supplier: 'Shenzhen MicroFab PCB Ltd',
        units: 2000,
        orderDate: '2025-02-25',
        expectedArrivalDays: 18,
        status: 'ORDERED',
        canBeExpedited: false
      }
    ],
    productionCapacity: {
      lineId: 'LINE-PCB-02',
      lineName: 'Precision Pick & Place SMT Cell 2',
      dailyCapacityUnits: 250,
      currentlyAllocatedUnits: 190,
      surgeHeadroomUnits: 60,
      maintenanceScheduledDays: null
    },
    recentCustomerOrders: [
      {
        orderId: 'ORD-8101',
        customer: 'National Grid Smart metering',
        units: 1200,
        orderDate: '2025-03-12',
        requestedLeadDays: 12,
        priority: 'High'
      }
    ]
  },
  {
    sku: 'SKU-4415',
    name: 'Heavy-Duty Hydraulic Actuator Valve 12kN',
    category: 'Fluid & Hydraulic Power',
    unit: 'Units',
    unitCost: 890,
    customerSegment: 'Heavy Off-Highway & Agricultural Machinery',
    baselineDailyForecast: 25,
    forecastHorizonDays: 14,
    currentInventory: 140,
    safetyStock: 80,
    reservedInventory: 50,
    warehouseLocation: 'WH-South (Atlanta, GA)',
    dailyBurnRate: 24,
    supplier: {
      name: 'RheinHydro Precision Forgings (Stuttgart, DE)',
      leadTimeDays: 40,
      expediteAvailable: true,
      expediteLeadTimeDays: 18,
      expediteCostPerUnit: 140,
      reliabilityRating: 97
    },
    openPurchaseOrders: [
      {
        poNumber: 'PO-2024-5112',
        supplier: 'RheinHydro Precision Forgings',
        units: 250,
        orderDate: '2025-02-05',
        expectedArrivalDays: 6,
        status: 'IN_TRANSIT',
        canBeExpedited: false
      }
    ],
    productionCapacity: {
      lineId: 'LINE-HYD-01',
      lineName: 'CNC Precision Machining & Hydro-Testing Rig',
      dailyCapacityUnits: 35,
      currentlyAllocatedUnits: 30,
      surgeHeadroomUnits: 5,
      maintenanceScheduledDays: 4
    },
    recentCustomerOrders: [
      {
        orderId: 'ORD-9022',
        customer: 'Caterpillar OEM Regional Plant',
        units: 160,
        orderDate: '2025-03-12',
        requestedLeadDays: 8,
        priority: 'Critical'
      }
    ]
  },
  {
    sku: 'SKU-5190',
    name: 'Ruggedized Optical Transceiver Module 100G',
    category: 'Telecom & Aerospace Avionics',
    unit: 'Units',
    unitCost: 650,
    customerSegment: 'Defense & Aerospace Networks',
    baselineDailyForecast: 35,
    forecastHorizonDays: 14,
    currentInventory: 210,
    safetyStock: 120,
    reservedInventory: 85,
    warehouseLocation: 'WH-East (Philadelphia, PA)',
    dailyBurnRate: 32,
    supplier: {
      name: 'PhotonAero Photonics (Zurich, CH)',
      leadTimeDays: 50,
      expediteAvailable: true,
      expediteLeadTimeDays: 20,
      expediteCostPerUnit: 110,
      reliabilityRating: 96
    },
    openPurchaseOrders: [
      {
        poNumber: 'PO-2024-3321',
        supplier: 'PhotonAero Photonics',
        units: 300,
        orderDate: '2025-02-14',
        expectedArrivalDays: 14,
        status: 'ORDERED',
        canBeExpedited: true
      }
    ],
    productionCapacity: {
      lineId: 'LINE-OPT-04',
      lineName: 'Cleanroom Class 1000 Optical Alignment Station',
      dailyCapacityUnits: 45,
      currentlyAllocatedUnits: 38,
      surgeHeadroomUnits: 7,
      maintenanceScheduledDays: null
    },
    recentCustomerOrders: [
      {
        orderId: 'ORD-7319',
        customer: 'Lockheed Martin Avionics Div',
        units: 220,
        orderDate: '2025-03-13',
        requestedLeadDays: 10,
        priority: 'Critical'
      }
    ]
  }
];
