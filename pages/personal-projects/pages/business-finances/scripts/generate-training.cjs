/* Training-pack generator: derive workbook fields and examples from register schemas.
   Generated sample files are separate from users' IndexedDB records. */
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
const ExcelJS = require("exceljs");
const { jsPDF } = require("jspdf");
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Footer,
  PageNumber,
} = require("docx");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "training-pack");
fs.mkdirSync(output, { recursive: true });
const dom = new JSDOM("<!doctype html>", { runScripts: "outside-only" });
dom.window.IAP = {};
dom.window.eval(fs.readFileSync(path.join(root, "assets/js/schemas.js"), "utf8"));
const schemas = dom.window.IAP.Schemas.list().filter(
  (schema) => !["journals", "accounts", "tax_codes", "accounting_periods"].includes(schema.key),
);

const companyFields = [
  { key: "legalName", label: "Legal Company Name", type: "text", required: true },
  { key: "tradingName", label: "Trading Name", type: "text" },
  { key: "registrationNumber", label: "Registration Number", type: "text" },
  { key: "taxNumber", label: "Tax Number", type: "text" },
  { key: "currency", label: "Currency", type: "text" },
  { key: "vatRegistered", label: "VAT / Sales Tax Registered", type: "boolean" },
  { key: "vatRate", label: "Standard Tax Rate %", type: "number" },
  { key: "financialYearEndMonth", label: "Financial Year-end Month", type: "number" },
  { key: "address", label: "Address", type: "text" },
];

const samples = {
  Company: [
    {
      companyCode: "DEMO",
      legalName: "Kopano Office Solutions (Pty) Ltd",
      tradingName: "Kopano Office Solutions",
      registrationNumber: "2024/123456/07",
      taxNumber: "4123456789",
      currency: "ZAR",
      vatRegistered: "Yes",
      vatRate: 15,
      financialYearEndMonth: 2,
      address: "18 Market Street, Johannesburg",
    },
  ],
  departments: [
    { code: "DEP-001", name: "Operations", manager: "Thabo Molefe", status: "Active" },
    { code: "DEP-002", name: "Administration", manager: "Naledi Khumalo", status: "Active" },
  ],
  cost_centres: [
    {
      code: "CC-001",
      name: "Furniture Production",
      departmentCode: "DEP-001",
      manager: "Thabo Molefe",
      type: "Production",
      status: "Active",
    },
    {
      code: "CC-002",
      name: "Head Office",
      departmentCode: "DEP-002",
      manager: "Naledi Khumalo",
      type: "Administration",
      status: "Active",
    },
  ],
  customers: [
    {
      code: "CUS-001",
      name: "Ubuntu Consulting",
      registrationNumber: "2018/111111/07",
      taxNumber: "4789012345",
      email: "accounts@ubuntu.example",
      phone: "+27 11 555 0101",
      address: "Rosebank, Johannesburg",
      creditLimit: 150000,
      paymentTermsDays: 30,
      status: "Active",
    },
    {
      code: "CUS-002",
      name: "Metsi Schools Group",
      registrationNumber: "2012/222222/07",
      taxNumber: "4011223344",
      email: "finance@metsi.example",
      phone: "+27 12 555 0120",
      address: "Pretoria",
      creditLimit: 250000,
      paymentTermsDays: 30,
      status: "Active",
    },
  ],
  suppliers: [
    {
      code: "SUP-001",
      name: "Timber Source SA",
      registrationNumber: "2010/333333/07",
      taxNumber: "4555666777",
      email: "billing@timber.example",
      phone: "+27 11 555 0160",
      address: "Germiston",
      paymentTermsDays: 30,
      status: "Active",
    },
    {
      code: "SUP-002",
      name: "City Property Holdings",
      registrationNumber: "2005/444444/07",
      taxNumber: "4666777888",
      email: "rent@cityproperty.example",
      phone: "+27 11 555 0180",
      address: "Johannesburg",
      paymentTermsDays: 7,
      status: "Active",
    },
  ],
  projects: [
    {
      code: "PRJ-001",
      name: "Metsi School Furniture Rollout",
      customerCode: "CUS-002",
      manager: "Ayesha Patel",
      startDate: "2026-07-01",
      endDate: "2026-11-30",
      contractValue: 450000,
      approvedBudget: 310000,
      plannedProfit: 140000,
      status: "Active",
    },
  ],
  products: [
    {
      code: "PROD-001",
      name: "Executive Office Desk",
      type: "Manufactured item",
      category: "Office furniture",
      unit: "desk",
      sellingPrice: 5200,
      expectedMonthlyVolume: 35,
      targetMargin: 32,
      revenueAccount: "4000",
      cogsAccount: "5000",
      status: "Active",
    },
    {
      code: "SERV-001",
      name: "On-site Furniture Installation",
      type: "Service",
      category: "Installation",
      unit: "installation",
      sellingPrice: 1250,
      expectedMonthlyVolume: 28,
      targetMargin: 35,
      revenueAccount: "4100",
      cogsAccount: "5000",
      status: "Active",
    },
  ],
  employees: [
    {
      code: "EMP-001",
      fullName: "Naledi Khumalo",
      role: "General Manager",
      departmentCode: "DEP-002",
      costCentreCode: "CC-002",
      productCode: "",
      projectCode: "",
      payBasis: "Monthly",
      basePay: 42000,
      hoursPerWeek: 40,
      overtimeRate: 0,
      expectedOvertimeHours: 0,
      monthlyAllowances: 3500,
      employerContributions: 5200,
      costBehaviour: "Fixed",
      status: "Active",
    },
    {
      code: "EMP-002",
      fullName: "Musa Dlamini",
      role: "Production Supervisor",
      departmentCode: "DEP-001",
      costCentreCode: "CC-001",
      productCode: "",
      projectCode: "",
      payBasis: "Monthly",
      basePay: 27000,
      hoursPerWeek: 40,
      overtimeRate: 240,
      expectedOvertimeHours: 6,
      monthlyAllowances: 1200,
      employerContributions: 3100,
      costBehaviour: "Fixed",
      status: "Active",
    },
  ],
  recurring_expenses: [
    {
      code: "EXP-001",
      name: "Factory and office rent",
      category: "Rent",
      amount: 38000,
      frequency: "Monthly",
      costBehaviour: "Fixed",
      cashClassification: "Cash operating expense",
      costCentreCode: "CC-002",
      productCode: "",
      projectCode: "",
      expenseAccount: "6100",
      status: "Active",
    },
    {
      code: "EXP-002",
      name: "Electricity and water",
      category: "Utilities",
      amount: 12500,
      frequency: "Monthly",
      costBehaviour: "Semi-variable",
      cashClassification: "Cash operating expense",
      costCentreCode: "CC-001",
      productCode: "",
      projectCode: "",
      expenseAccount: "6200",
      status: "Active",
    },
    {
      code: "EXP-003",
      name: "Business insurance",
      category: "Insurance",
      amount: 36000,
      frequency: "Annual",
      costBehaviour: "Fixed",
      cashClassification: "Cash operating expense",
      costCentreCode: "CC-002",
      productCode: "",
      projectCode: "",
      expenseAccount: "6600",
      status: "Active",
    },
    {
      code: "EXP-004",
      name: "Accounting and payroll software",
      category: "Software",
      amount: 2900,
      frequency: "Monthly",
      costBehaviour: "Fixed",
      cashClassification: "Cash operating expense",
      costCentreCode: "CC-002",
      productCode: "",
      projectCode: "",
      expenseAccount: "6600",
      status: "Active",
    },
  ],
  bank_accounts: [
    {
      code: "BANK-001",
      name: "Operating Bank Account",
      bankName: "Example Bank",
      accountNumber: "1234567890",
      accountType: "Current",
      ledgerAccount: "1010",
      openingDate: "2026-08-01",
      openingBalance: 0,
      creditLimit: 50000,
      status: "Active",
    },
  ],
  customer_invoices: [
    {
      invoiceNumber: "INV-0001",
      date: "2026-08-03",
      dueDate: "2026-09-02",
      customerCode: "CUS-001",
      productCode: "PROD-001",
      projectCode: "",
      description: "20 Executive Office Desks",
      quantity: 20,
      unitPrice: 5200,
      discountPercent: 0,
      taxCode: "VAT15",
      revenueAccount: "4000",
      costCentreCode: "CC-001",
      status: "Approved",
    },
    {
      invoiceNumber: "INV-0002",
      date: "2026-08-06",
      dueDate: "2026-09-05",
      customerCode: "CUS-002",
      productCode: "SERV-001",
      projectCode: "PRJ-001",
      description: "School furniture installation phase 1",
      quantity: 40,
      unitPrice: 1250,
      discountPercent: 5,
      taxCode: "VAT15",
      revenueAccount: "4100",
      costCentreCode: "CC-001",
      status: "Approved",
    },
  ],
  supplier_bills: [
    {
      billNumber: "TB-8841",
      date: "2026-08-02",
      dueDate: "2026-09-01",
      supplierCode: "SUP-001",
      description: "Timber board delivery",
      amountExclTax: 56000,
      taxCode: "VAT15",
      debitAccount: "1200",
      costCentreCode: "CC-001",
      productCode: "PROD-001",
      projectCode: "",
      status: "Approved",
    },
    {
      billNumber: "RENT-AUG",
      date: "2026-08-01",
      dueDate: "2026-08-07",
      supplierCode: "SUP-002",
      description: "August factory and office rent",
      amountExclTax: 38000,
      taxCode: "VAT15",
      debitAccount: "6100",
      costCentreCode: "CC-002",
      productCode: "",
      projectCode: "",
      status: "Approved",
    },
  ],
  receipts: [
    {
      receiptNumber: "REC-0001",
      date: "2026-08-20",
      customerCode: "CUS-001",
      invoiceNumber: "INV-0001",
      bankAccountCode: "BANK-001",
      amount: 70000,
      reference: "UBU-INV001",
      status: "Posted",
    },
  ],
  payments: [
    {
      paymentNumber: "PAY-0001",
      date: "2026-08-07",
      supplierCode: "SUP-002",
      billNumber: "RENT-AUG",
      bankAccountCode: "BANK-001",
      debitAccount: "2000",
      amount: 43700,
      reference: "RENT-AUG",
      status: "Posted",
    },
  ],
  bank_transactions: [
    {
      transactionId: "",
      date: "2026-08-10",
      bankAccountCode: "BANK-001",
      description: "Monthly bank service fee",
      debit: 485,
      credit: 0,
      counterAccount: "6500",
      reference: "FEE-AUG",
      reconciled: "Yes",
      status: "Ready to post",
    },
  ],
  fixed_assets: [
    {
      assetCode: "AST-001",
      description: "CNC Wood Router",
      purchaseDate: "2025-03-01",
      purchaseCost: 360000,
      residualValue: 30000,
      usefulLifeYears: 5,
      method: "Straight line",
      reducingRate: 0,
      assetAccount: "1500",
      accumulatedDepreciationAccount: "1510",
      depreciationExpenseAccount: "6300",
      costCentreCode: "CC-001",
      productCode: "PROD-001",
      status: "Active",
    },
  ],
  inventory_movements: [
    {
      movementNumber: "MOV-001",
      date: "2026-08-01",
      materialCode: "MAT-001",
      type: "Opening",
      quantity: 150,
      unitCost: 620,
      productCode: "",
      projectCode: "",
      reference: "OPENING",
      status: "Posted",
    },
    {
      movementNumber: "MOV-002",
      date: "2026-08-12",
      materialCode: "MAT-001",
      type: "Issue to production",
      quantity: 30,
      unitCost: 620,
      productCode: "PROD-001",
      projectCode: "",
      reference: "BATCH-0801",
      status: "Posted",
    },
  ],
  loans: [
    {
      code: "LOAN-001",
      name: "CNC Equipment Finance",
      lender: "Example Bank",
      startDate: "2025-03-01",
      openingBalance: 280000,
      annualInterestRate: 11.5,
      termMonths: 60,
      remainingMonths: 43,
      instalmentAmount: 6158,
      loanAccount: "2400",
      interestAccount: "6400",
      bankAccountCode: "BANK-001",
      status: "Active",
    },
  ],
  loan_payments: [
    {
      paymentNumber: "LPAY-001",
      date: "2026-08-25",
      loanCode: "LOAN-001",
      bankAccountCode: "BANK-001",
      principal: 3475,
      interest: 2683,
      fees: 0,
      status: "Posted",
    },
  ],
  owner_transactions: [
    {
      transactionNumber: "OWN-001",
      date: "2026-08-01",
      owner: "Founding Shareholders",
      type: "Capital introduced",
      amount: 125000,
      bankAccountCode: "BANK-001",
      equityOrLoanAccount: "3000",
      status: "Posted",
    },
  ],
  materials: [
    {
      code: "MAT-001",
      name: "Oak Veneered Board",
      unit: "sheet",
      standardCost: 620,
      supplierCode: "SUP-001",
      inventoryAccount: "1200",
      usageAccount: "5100",
      reorderLevel: 45,
      safetyStock: 25,
      status: "Active",
    },
    {
      code: "MAT-002",
      name: "Steel Desk Frame",
      unit: "frame",
      standardCost: 780,
      supplierCode: "SUP-001",
      inventoryAccount: "1200",
      usageAccount: "5100",
      reorderLevel: 30,
      safetyStock: 15,
      status: "Active",
    },
    {
      code: "MAT-003",
      name: "Finishing and Fastener Kit",
      unit: "kit",
      standardCost: 185,
      supplierCode: "SUP-001",
      inventoryAccount: "1200",
      usageAccount: "5100",
      reorderLevel: 40,
      safetyStock: 20,
      status: "Active",
    },
  ],
  labour_resources: [
    {
      code: "LAB-001",
      role: "Cabinet Maker",
      normalRate: 210,
      overtimeRate: 315,
      productiveHoursPerDay: 7,
      costCentreCode: "CC-001",
      status: "Active",
    },
    {
      code: "LAB-002",
      role: "Installer",
      normalRate: 190,
      overtimeRate: 285,
      productiveHoursPerDay: 7,
      costCentreCode: "CC-001",
      status: "Active",
    },
  ],
  equipment: [
    {
      code: "EQ-001",
      name: "CNC Wood Router",
      ownership: "Owned",
      purchaseCost: 360000,
      hireRatePerHour: 0,
      operatingCostPerHour: 95,
      depreciationPerHour: 40,
      availableHoursPerMonth: 150,
      status: "Active",
    },
    {
      code: "EQ-002",
      name: "Delivery and Installation Van",
      ownership: "Leased",
      purchaseCost: 0,
      hireRatePerHour: 145,
      operatingCostPerHour: 85,
      depreciationPerHour: 0,
      availableHoursPerMonth: 120,
      status: "Active",
    },
  ],
  product_materials: [
    {
      code: "PM-001",
      productCode: "PROD-001",
      materialCode: "MAT-001",
      quantityPerUnit: 1.4,
      wastagePercent: 6,
      status: "Active",
    },
    {
      code: "PM-002",
      productCode: "PROD-001",
      materialCode: "MAT-002",
      quantityPerUnit: 1,
      wastagePercent: 2,
      status: "Active",
    },
    {
      code: "PM-003",
      productCode: "PROD-001",
      materialCode: "MAT-003",
      quantityPerUnit: 1,
      wastagePercent: 4,
      status: "Active",
    },
  ],
  product_labour: [
    {
      code: "PL-001",
      productCode: "PROD-001",
      labourCode: "LAB-001",
      hoursPerUnit: 4.5,
      overtimePercent: 5,
      status: "Active",
    },
    {
      code: "PL-002",
      productCode: "SERV-001",
      labourCode: "LAB-002",
      hoursPerUnit: 3,
      overtimePercent: 8,
      status: "Active",
    },
  ],
  product_equipment: [
    {
      code: "PE-001",
      productCode: "PROD-001",
      equipmentCode: "EQ-001",
      hoursPerUnit: 1.4,
      status: "Active",
    },
    {
      code: "PE-002",
      productCode: "SERV-001",
      equipmentCode: "EQ-002",
      hoursPerUnit: 2.5,
      status: "Active",
    },
  ],
  product_operations: [
    {
      code: "OP-001",
      productCode: "PROD-001",
      sequence: 1,
      name: "Cut and route boards",
      setupMinutes: 35,
      runMinutesPerUnit: 55,
      waitMinutes: 10,
      batchSize: 10,
      status: "Active",
    },
    {
      code: "OP-002",
      productCode: "PROD-001",
      sequence: 2,
      name: "Assemble and finish",
      setupMinutes: 20,
      runMinutesPerUnit: 150,
      waitMinutes: 45,
      batchSize: 5,
      status: "Active",
    },
    {
      code: "OP-003",
      productCode: "SERV-001",
      sequence: 1,
      name: "Deliver and install",
      setupMinutes: 20,
      runMinutesPerUnit: 180,
      waitMinutes: 0,
      batchSize: 1,
      status: "Active",
    },
  ],
  overhead_pools: [
    {
      code: "OH-001",
      name: "Administration and occupancy",
      monthlyAmount: 42000,
      costBehaviour: "Fixed",
      allocationBasis: "Direct labour hours",
      costCentreCode: "CC-002",
      expenseAccount: "6100",
      status: "Active",
    },
  ],
  budget_lines: [
    {
      code: "BUD-001",
      period: "2026-08",
      accountCode: "4000",
      costCentreCode: "CC-001",
      productCode: "PROD-001",
      projectCode: "",
      amount: 190000,
      version: "FY2027 Approved",
      status: "Approved",
    },
    {
      code: "BUD-002",
      period: "2026-08",
      accountCode: "6100",
      costCentreCode: "CC-002",
      productCode: "",
      projectCode: "",
      amount: 38000,
      version: "FY2027 Approved",
      status: "Approved",
    },
    {
      code: "BUD-003",
      period: "2026-08",
      accountCode: "6200",
      costCentreCode: "CC-001",
      productCode: "",
      projectCode: "",
      amount: 11000,
      version: "FY2027 Approved",
      status: "Approved",
    },
  ],
  production_actuals: [
    {
      code: "ACT-001",
      date: "2026-08-18",
      productCode: "PROD-001",
      unitsProduced: 20,
      materialCode: "MAT-001",
      actualMaterialQuantity: 31,
      actualMaterialCost: 19840,
      labourCode: "LAB-001",
      actualLabourHours: 96,
      actualLabourCost: 21120,
      actualEquipmentCost: 3800,
      notes: "First August batch",
    },
  ],
  project_tasks: [
    {
      code: "TASK-001",
      projectCode: "PRJ-001",
      name: "Manufacture classroom desks",
      startDate: "2026-07-01",
      endDate: "2026-09-15",
      budget: 190000,
      weightPercent: 60,
      status: "In progress",
    },
    {
      code: "TASK-002",
      projectCode: "PRJ-001",
      name: "Delivery and installation",
      startDate: "2026-09-16",
      endDate: "2026-11-30",
      budget: 120000,
      weightPercent: 40,
      status: "Not started",
    },
  ],
  project_costs: [
    {
      code: "PC-001",
      date: "2026-07-31",
      projectCode: "PRJ-001",
      taskCode: "TASK-001",
      category: "Materials",
      description: "Boards and frames for first production batch",
      amount: 82000,
      supplierCode: "SUP-001",
      committed: "No",
      approved: "Yes",
    },
    {
      code: "PC-002",
      date: "2026-08-20",
      projectCode: "PRJ-001",
      taskCode: "TASK-001",
      category: "Labour",
      description: "Direct production labour",
      amount: 46000,
      supplierCode: "",
      committed: "No",
      approved: "Yes",
    },
  ],
  project_progress: [
    {
      code: "PROG-001",
      date: "2026-08-20",
      projectCode: "PRJ-001",
      taskCode: "TASK-001",
      physicalPercent: 58,
      notes: "116 of 200 classroom desks completed and quality checked",
    },
  ],
  project_risks: [
    {
      code: "RISK-001",
      projectCode: "PRJ-001",
      description: "Steel frame delivery may be two weeks late",
      probabilityPercent: 35,
      financialImpact: 24000,
      owner: "Thabo Molefe",
      mitigation: "Reserve stock with alternate supplier",
      status: "Mitigating",
    },
  ],
  pricing_assumptions: [
    {
      code: "PRICE-001",
      productCode: "PROD-001",
      referencePrice: 5200,
      baselineMonthlyVolume: 35,
      priceElasticity: 0.9,
      minimumPrice: 4500,
      maximumPrice: 7200,
      priceStep: 100,
      capacityMonthly: 48,
      targetMargin: 32,
      status: "Approved",
    },
    {
      code: "PRICE-002",
      productCode: "SERV-001",
      referencePrice: 1250,
      baselineMonthlyVolume: 28,
      priceElasticity: 1.1,
      minimumPrice: 1000,
      maximumPrice: 1900,
      priceStep: 50,
      capacityMonthly: 40,
      targetMargin: 35,
      status: "Approved",
    },
  ],
  scenarios: [
    {
      code: "SCN-001",
      name: "Timber price increase",
      productCode: "PROD-001",
      priceChange: 4,
      volumeChange: -3,
      materialChange: 15,
      labourChange: 0,
      overheadChange: 2,
      notes: "Supplier notice and partial selling-price response",
    },
    {
      code: "SCN-002",
      name: "High-volume quarter",
      productCode: "",
      priceChange: -2,
      volumeChange: 18,
      materialChange: 3,
      labourChange: 8,
      overheadChange: 5,
      notes: "Volume discount and expected overtime",
    },
  ],
  decision_models: [
    {
      code: "DEC-001",
      name: "Lease or buy second delivery vehicle",
      type: "Lease or buy",
      optionA: "Buy used vehicle",
      optionARevenue: 0,
      optionACost: 410000,
      optionB: "Three-year operating lease",
      optionBRevenue: 0,
      optionBCost: 468000,
      qualitativeFactors:
        "Reliability, maintenance risk, cash preservation and expected utilisation",
      status: "Draft",
    },
  ],
  capital_investments: [
    {
      code: "INVEST-001",
      name: "Automated edge-banding machine",
      initialInvestment: 620000,
      discountRate: 14,
      lifeYears: 5,
      annualCashFlows: "185000,210000,225000,235000,240000",
      residualValue: 65000,
      notes: "Savings from faster production and reduced rework",
      status: "Draft",
    },
  ],
  tender_items: [
    {
      code: "RATE-001",
      tenderNumber: "QT-2026-019",
      itemNumber: "1",
      description: "Supply executive office desk",
      unit: "each",
      quantity: 40,
      material: 1900,
      labour: 980,
      equipment: 210,
      subcontractor: 0,
      riskWastage: 120,
      preliminaries: 85,
      overhead: 640,
      profitPercent: 22,
    },
    {
      code: "RATE-002",
      tenderNumber: "QT-2026-019",
      itemNumber: "2",
      description: "Deliver and install desk",
      unit: "each",
      quantity: 40,
      material: 45,
      labour: 610,
      equipment: 575,
      subcontractor: 0,
      riskWastage: 45,
      preliminaries: 60,
      overhead: 180,
      profitPercent: 20,
    },
  ],
};

function instructionSheet(workbook) {
  const ws = workbook.addWorksheet("Read Me", { properties: { tabColor: { argb: "FF5E0A0A" } } });
  ws.columns = [{ width: 27 }, { width: 105 }];
  [
    [
      "INTEGRATED ACCOUNTING DATA TEMPLATE",
      "Keep worksheet names and row-2 column keys unchanged. Enter data from row 5 downward.",
    ],
    [
      "Company assignment",
      "Enter companies on the Company sheet. Other sheets use Company Name. If the workbook contains one company, Company Name may be left blank and the platform assigns every row automatically.",
    ],
    [
      "Automatic codes",
      "Internal IDs and codes are prefilled and locked. If another structured workbook omits a code column, the platform generates codes in row order.",
    ],
    [
      "Required columns",
      "An asterisk (*) marks a required column. Use the exact values shown in drop-down lists.",
    ],
    [
      "Protected cells",
      "Title, headings, descriptions and examples are locked. White input rows are unlocked.",
    ],
    [
      "Import",
      "In the platform open Administration → Import & backup, then choose the completed workbook.",
    ],
    [
      "Sample file",
      "The sample workbook is ready to import. It creates DEMO — Kopano Office Solutions with linked operational and accounting records.",
    ],
    [
      "Control",
      "Download a platform backup before importing a large workbook and review every row in the Import Result.",
    ],
  ].forEach((row) => ws.addRow(row));
  ws.getRow(1).font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF5E0A0A" } };
  ws.getColumn(2).alignment = { wrapText: true, vertical: "top" };
  ws.eachRow((row) => (row.height = 42));
  return ws.protect("", { selectLockedCells: true, selectUnlockedCells: true });
}

function exampleFor(fields, name) {
  const row = {};
  fields.forEach((field) => {
    if (field.generated) row[field.key] = "";
    else if (field.key === "companyName") row[field.key] = "Kopano Office Solutions (Pty) Ltd";
    else if (field.key === "legalName") row[field.key] = "Example Company (Pty) Ltd";
    else if (field.type === "date") row[field.key] = "2026-08-01";
    else if (field.type === "month") row[field.key] = "2026-08";
    else if (field.type === "boolean") row[field.key] = "No";
    else if (field.type === "select") row[field.key] = (field.options || [""])[0];
    else if (["number", "currency", "percent"].includes(field.type)) row[field.key] = 0;
    else if (/code|number/i.test(field.key))
      row[field.key] = `${name.slice(0, 8).toUpperCase()}-EXAMPLE`;
    else row[field.key] = "Example only — enter real data below";
  });
  return row;
}

async function dataSheet(workbook, name, fields, rows, sampleMode) {
  const ws = workbook.addWorksheet(name.slice(0, 31), {
    properties: { tabColor: { argb: name === "Company" ? "FF5E0A0A" : "FF7A1A1A" } },
  });
  ws.addRow([`${name} DATA — protected headings; enter data below row 4`]);
  ws.mergeCells(1, 1, 1, fields.length);
  ws.addRow(fields.map((field) => `${field.key}${field.required ? "*" : ""}`));
  ws.addRow(
    fields.map((field) => `${field.label || field.key}${field.type ? ` (${field.type})` : ""}`),
  );
  const example = exampleFor(fields, name);
  ws.addRow(fields.map((field) => example[field.key]));
  (rows || []).forEach((row) =>
    ws.addRow(fields.map((field) => (row[field.key] == null ? "" : row[field.key]))),
  );
  ws.getRow(1).font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF5E0A0A" } };
  ws.getRow(2).font = { bold: true, color: { argb: "FFFFFFFF" } };
  ws.getRow(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF7A1A1A" } };
  ws.getRow(3).font = { italic: true, color: { argb: "FF526477" }, size: 9 };
  ws.getRow(4).font = { italic: true, color: { argb: "FF8A5715" }, size: 9 };
  ws.views = [{ state: "frozen", ySplit: 3 }];
  ws.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: fields.length } };
  fields.forEach((field, index) => {
    const column = ws.getColumn(index + 1);
    column.width = Math.min(38, Math.max(16, (field.label || field.key).length + 4));
    for (let row = 5; row <= 1004; row += 1) {
      const cell = ws.getCell(row, index + 1);
      if (field.generated) {
        if (!cell.value)
          cell.value = `${field.generatedPrefix || "ID"}${field.generatedSeparator == null ? "-" : field.generatedSeparator}${String(row - 4).padStart(field.generatedDigits || 3, "0")}`;
        cell.protection = { locked: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F3F4" } };
      } else {
        cell.protection = { locked: false };
        if (field.type === "select" && field.options && field.options.join(",").length < 250)
          cell.dataValidation = {
            type: "list",
            allowBlank: !field.required,
            formulae: [`"${field.options.join(",")}"`],
          };
        if (field.type === "boolean")
          cell.dataValidation = { type: "list", allowBlank: true, formulae: ['"Yes,No"'] };
      }
    }
  });
  if (sampleMode && rows && rows.length) {
    for (let row = 5; row < 5 + rows.length; row += 1)
      ws.getRow(row).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2FAF9" } };
  }
  await ws.protect("", {
    selectLockedCells: true,
    selectUnlockedCells: true,
    insertRows: true,
    deleteRows: false,
    formatCells: false,
    formatColumns: false,
  });
}

async function generate(filename, sampleMode) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Integrated Accounting Platform";
  wb.title = sampleMode
    ? "Integrated Accounting Sample Data"
    : "Integrated Accounting Import Template";
  await instructionSheet(wb);
  await dataSheet(wb, "Company", companyFields, sampleMode ? samples.Company : [], sampleMode);
  for (const schema of schemas) {
    const fields = [{ key: "companyName", label: "Company Name", type: "text" }, ...schema.fields];
    const rows = sampleMode
      ? (samples[schema.key] || []).map((row) =>
          Object.assign({ companyName: "Kopano Office Solutions (Pty) Ltd" }, row),
        )
      : [];
    await dataSheet(wb, schema.key, fields, rows, sampleMode);
  }
  await wb.xlsx.writeFile(path.join(output, filename));
}

function plainMarkdown(text) {
  return String(text)
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

async function generateGuides() {
  const markdown = fs.readFileSync(
    path.join(output, "INTEGRATED_ACCOUNTING_USER_GUIDE.md"),
    "utf8",
  );
  const lines = markdown.split(/\r?\n/);
  const children = [];
  lines.forEach((line) => {
    if (!line.trim()) {
      children.push(new Paragraph(""));
      return;
    }
    if (line.startsWith("# "))
      children.push(
        new Paragraph({
          text: plainMarkdown(line.slice(2)),
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
        }),
      );
    else if (line.startsWith("## "))
      children.push(
        new Paragraph({ text: plainMarkdown(line.slice(3)), heading: HeadingLevel.HEADING_1 }),
      );
    else if (line.startsWith("### "))
      children.push(
        new Paragraph({ text: plainMarkdown(line.slice(4)), heading: HeadingLevel.HEADING_2 }),
      );
    else if (/^\d+\. /.test(line))
      children.push(
        new Paragraph({
          text: plainMarkdown(line.replace(/^\d+\. /, "")),
          numbering: { reference: "numbered", level: 0 },
        }),
      );
    else if (/^- /.test(line))
      children.push(new Paragraph({ text: plainMarkdown(line.slice(2)), bullet: { level: 0 } }));
    else
      children.push(
        new Paragraph({
          children: [new TextRun({ text: plainMarkdown(line), size: 21 })],
          spacing: { after: 100, line: 290 },
        }),
      );
  });
  const word = new Document({
    creator: "Integrated Accounting Platform",
    title: "Integrated Accounting Platform — Complete User Training",
    numbering: {
      config: [
        {
          reference: "numbered",
          levels: [
            {
              level: 0,
              format: "decimal",
              text: "%1.",
              alignment: AlignmentType.START,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    styles: {
      default: {
        document: {
          run: { font: "Aptos", size: 21, color: "243746" },
          paragraph: { spacing: { after: 100 } },
        },
      },
    },
    sections: [
      {
        properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
        children,
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun("Integrated Accounting Platform • Training Guide • "),
                  new TextRun({ children: [PageNumber.CURRENT] }),
                ],
              }),
            ],
          }),
        },
      },
    ],
  });
  fs.writeFileSync(
    path.join(output, "Integrated_Accounting_User_Guide.docx"),
    await Packer.toBuffer(word),
  );

  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const width = pdf.internal.pageSize.getWidth(),
    height = pdf.internal.pageSize.getHeight(),
    margin = 52;
  pdf.setFillColor(94, 10, 10);
  pdf.rect(0, 0, width, height, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(30);
  pdf.text(["Integrated Accounting Platform", "Complete User Training"], margin, 245, {
    lineHeightFactor: 1.25,
  });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(13);
  pdf.setTextColor(204, 224, 235);
  pdf.text(
    ["Cost & Managerial Accounting", "Financial Accounting", "One shared business foundation"],
    margin,
    350,
    { lineHeightFactor: 1.7 },
  );
  pdf.setFontSize(9);
  pdf.text("Version 0.1.4 • August 2026", margin, height - 55);
  pdf.addPage();
  let y = 58;
  const footer = () => {
    pdf.setFontSize(8);
    pdf.setTextColor(110);
    pdf.text(
      `Integrated Accounting Platform • Training Guide • ${pdf.getNumberOfPages()}`,
      width / 2,
      height - 24,
      { align: "center" },
    );
  };
  function newPage() {
    footer();
    pdf.addPage();
    y = 58;
  }
  lines.slice(1).forEach((raw) => {
    if (!raw.trim()) {
      y += 6;
      return;
    }
    let size = 10,
      weight = "normal",
      gapBefore = 0,
      gapAfter = 7,
      text = raw;
    if (raw.startsWith("# ")) {
      size = 22;
      weight = "bold";
      gapAfter = 20;
      text = raw.slice(2);
    } else if (raw.startsWith("## ")) {
      size = 15;
      weight = "bold";
      gapBefore = 10;
      gapAfter = 9;
      text = raw.slice(3);
    } else if (raw.startsWith("### ")) {
      size = 12;
      weight = "bold";
      gapBefore = 7;
      text = raw.slice(4);
    } else if (raw.startsWith("- ")) text = `• ${raw.slice(2)}`;
    text = plainMarkdown(text);
    pdf.setFont("helvetica", weight);
    pdf.setFontSize(size);
    const wrapped = pdf.splitTextToSize(text, width - margin * 2),
      lineHeight = size * 1.4;
    if (y + gapBefore + wrapped.length * lineHeight + gapAfter > height - 45) newPage();
    y += gapBefore;
    pdf.setTextColor(
      raw.startsWith("#") ? 94 : 44,
      raw.startsWith("#") ? 10 : 32,
      raw.startsWith("#") ? 10 : 32,
    );
    pdf.text(wrapped, margin, y);
    y += wrapped.length * lineHeight + gapAfter;
  });
  footer();
  fs.writeFileSync(
    path.join(output, "Integrated_Accounting_User_Guide.pdf"),
    Buffer.from(pdf.output("arraybuffer")),
  );
}

(async () => {
  await generate("Integrated_Accounting_Blank_Import_Template.xlsx", false);
  await generate("Integrated_Accounting_Sample_Data.xlsx", true);
  await generateGuides();
  console.log("Training workbooks and formatted guides generated.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
