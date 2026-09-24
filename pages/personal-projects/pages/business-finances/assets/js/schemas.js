/* Register definitions are the source of truth for form fields, reference lookups and import templates.
   Add or change a register here before updating rendering and accounting rules that depend on it. */
(() => {
  "use strict";
  const IA = window.IAP;
  // Each definition identifies its view, icon, fields and generated record-code convention.
  const definitions = [];
  const f = (key, label, type = "text", options = {}) =>
    Object.assign({ key, label, type }, options);
  const status = (options = ["Active", "Inactive"]) =>
    f("status", "Status", "select", { options, default: options[0] });
  const define = (key, label, plural, group, icon, fields, options = {}) =>
    definitions.push(Object.assign({ key, label, plural, group, icon, fields }, options));

  define(
    "departments",
    "Department",
    "Departments",
    "Shared Foundation",
    "network",
    [
      f("code", "Department Code", "text", { required: true }),
      f("name", "Department Name", "text", { required: true }),
      f("manager", "Responsible Manager"),
      status(),
    ],
    { identity: "code", codePrefix: "DEP" },
  );
  define(
    "cost_centres",
    "Cost Centre",
    "Cost Centres",
    "Shared Foundation",
    "land-plot",
    [
      f("code", "Cost Centre Code", "text", { required: true }),
      f("name", "Cost Centre Name", "text", { required: true }),
      f("departmentCode", "Department", "ref", {
        ref: "departments",
        refValue: "code",
        refLabel: "name",
      }),
      f("manager", "Responsible Manager"),
      f("type", "Type", "select", {
        options: [
          "Production",
          "Service delivery",
          "Administration",
          "Selling and distribution",
          "Project",
          "Other",
        ],
      }),
      status(),
    ],
    { identity: "code", codePrefix: "CC" },
  );
  define(
    "customers",
    "Customer",
    "Customers",
    "Shared Foundation",
    "users",
    [
      f("code", "Customer Code", "text", { required: true }),
      f("name", "Customer Name", "text", { required: true }),
      f("registrationNumber", "Registration Number"),
      f("taxNumber", "Tax Number"),
      f("email", "Email", "email"),
      f("phone", "Telephone"),
      f("address", "Address", "textarea"),
      f("creditLimit", "Credit Limit", "currency", { min: 0 }),
      f("paymentTermsDays", "Payment Terms (Days)", "number", { min: 0 }),
      status(),
    ],
    { identity: "code", codePrefix: "CUS" },
  );
  define(
    "suppliers",
    "Supplier",
    "Suppliers",
    "Shared Foundation",
    "truck",
    [
      f("code", "Supplier Code", "text", { required: true }),
      f("name", "Supplier Name", "text", { required: true }),
      f("registrationNumber", "Registration Number"),
      f("taxNumber", "Tax Number"),
      f("email", "Email", "email"),
      f("phone", "Telephone"),
      f("address", "Address", "textarea"),
      f("paymentTermsDays", "Payment Terms (Days)", "number", { min: 0 }),
      status(),
    ],
    { identity: "code", codePrefix: "SUP" },
  );
  define(
    "projects",
    "Project",
    "Projects",
    "Shared Foundation",
    "briefcase-business",
    [
      f("code", "Project Code", "text", { required: true }),
      f("name", "Project Name", "text", { required: true }),
      f("customerCode", "Customer", "ref", {
        ref: "customers",
        refValue: "code",
        refLabel: "name",
      }),
      f("manager", "Project Manager"),
      f("startDate", "Planned Start", "date", { required: true }),
      f("endDate", "Planned Finish", "date", { required: true }),
      f("contractValue", "Contract Value", "currency", { min: 0 }),
      f("approvedBudget", "Approved Cost Budget", "currency", { min: 0 }),
      f("plannedProfit", "Planned Profit", "currency"),
      status(["Planned", "Active", "On hold", "Completed", "Cancelled"]),
    ],
    { identity: "code", codePrefix: "PRJ" },
  );
  define(
    "products",
    "Product or Service",
    "Products & Services",
    "Shared Foundation",
    "package-open",
    [
      f("code", "Product/Service Code", "text", { required: true }),
      f("name", "Product or Service Name", "text", { required: true }),
      f("type", "Type", "select", {
        options: ["Product", "Service", "Manufactured item", "Project service"],
      }),
      f("category", "Category"),
      f("unit", "Unit Sold", "text", { required: true }),
      f("sellingPrice", "Current Selling Price", "currency", { min: 0 }),
      f("expectedMonthlyVolume", "Expected Monthly Sales Quantity", "number", { min: 0 }),
      f("targetMargin", "Target Profit Margin %", "percent", { min: 0, max: 99 }),
      f("revenueAccount", "Sales Revenue Account", "ref", {
        ref: "accounts",
        refValue: "code",
        refLabel: "name",
      }),
      f("cogsAccount", "Cost of Sales Account", "ref", {
        ref: "accounts",
        refValue: "code",
        refLabel: "name",
      }),
      status(),
    ],
    { identity: "code", codePrefix: "PROD" },
  );
  define(
    "employees",
    "Employee or Contractor",
    "Employees & Contractors",
    "Shared Foundation",
    "users-round",
    [
      f("code", "Employee Code", "text", { required: true }),
      f("fullName", "Full Name", "text", { required: true }),
      f("role", "Role"),
      f("departmentCode", "Department", "ref", {
        ref: "departments",
        refValue: "code",
        refLabel: "name",
      }),
      f("costCentreCode", "Cost Centre", "ref", {
        ref: "cost_centres",
        refValue: "code",
        refLabel: "name",
      }),
      f("productCode", "Direct Product/Service", "ref", {
        ref: "products",
        refValue: "code",
        refLabel: "name",
      }),
      f("projectCode", "Direct Project", "ref", {
        ref: "projects",
        refValue: "code",
        refLabel: "name",
      }),
      f("payBasis", "Pay Basis", "select", {
        options: ["Hourly", "Daily", "Weekly", "Fortnightly", "Monthly", "Annual"],
      }),
      f("basePay", "Base Pay for Selected Basis", "currency", { required: true, min: 0 }),
      f("hoursPerWeek", "Hours per Week", "number", { min: 0, default: 40 }),
      f("overtimeRate", "Overtime Rate per Hour", "currency", { min: 0 }),
      f("expectedOvertimeHours", "Expected Overtime Hours/Month", "number", { min: 0 }),
      f("monthlyAllowances", "Monthly Allowances, Bonus & Commission", "currency", { min: 0 }),
      f("employerContributions", "Monthly Employer Contributions", "currency", { min: 0 }),
      f("costBehaviour", "Cost Behaviour", "select", {
        options: ["Fixed", "Variable", "Semi-variable"],
      }),
      status(),
    ],
    { identity: "code", codePrefix: "EMP" },
  );
  define(
    "recurring_expenses",
    "Recurring Business Expense",
    "Recurring Business Expenses",
    "Shared Foundation",
    "calendar-clock",
    [
      f("code", "Expense Code", "text", { required: true }),
      f("name", "Expense Name", "text", { required: true }),
      f("category", "Category"),
      f("amount", "Payment Amount", "currency", { required: true, min: 0 }),
      f("frequency", "Frequency", "select", {
        options: ["Weekly", "Monthly", "Quarterly", "Every 6 months", "Annual"],
      }),
      f("costBehaviour", "Cost Behaviour", "select", {
        options: ["Fixed", "Variable", "Semi-variable"],
      }),
      f("cashClassification", "Cash Treatment", "select", {
        options: ["Cash operating expense", "Non-cash expense", "Capital expenditure"],
      }),
      f("costCentreCode", "Cost Centre", "ref", {
        ref: "cost_centres",
        refValue: "code",
        refLabel: "name",
      }),
      f("productCode", "Direct Product/Service", "ref", {
        ref: "products",
        refValue: "code",
        refLabel: "name",
      }),
      f("projectCode", "Direct Project", "ref", {
        ref: "projects",
        refValue: "code",
        refLabel: "name",
      }),
      f("expenseAccount", "Expense Account", "ref", {
        ref: "accounts",
        refValue: "code",
        refLabel: "name",
      }),
      status(),
    ],
    { identity: "code", codePrefix: "EXP" },
  );

  define(
    "accounting_periods",
    "Accounting Period",
    "Accounting Periods",
    "Financial Accounting",
    "calendar-range",
    [
      f("period", "Period", "month", { required: true }),
      f("startDate", "Start Date", "date", { required: true }),
      f("endDate", "End Date", "date", { required: true }),
      f("status", "Status", "select", {
        options: ["Open", "Soft closed", "Closed"],
        default: "Open",
      }),
      f("closedBy", "Closed By"),
      f("closedAt", "Closed At"),
    ],
    { identity: "period", codePrefix: "PER" },
  );
  define(
    "accounts",
    "General Ledger Account",
    "Chart of Accounts",
    "Financial Accounting",
    "book-open",
    [
      f("code", "Account Code", "text", { required: true }),
      f("name", "Account Name", "text", { required: true }),
      f("type", "Account Type", "select", {
        required: true,
        options: ["Asset", "Liability", "Equity", "Revenue", "Cost of Sales", "Expense"],
      }),
      f("subtype", "Account Subtype"),
      f("parentCode", "Parent Account", "ref", {
        ref: "accounts",
        refValue: "code",
        refLabel: "name",
      }),
      f("statementSection", "Financial Statement Section"),
      f("cashFlowClass", "Cash Flow Classification", "select", {
        options: ["Operating", "Investing", "Financing", "Cash", "Not applicable"],
      }),
      f("allowPosting", "Allow Direct Posting", "boolean", { default: true }),
      f("controlAccount", "Control Account", "boolean", { default: false }),
      status(),
    ],
    { identity: "code", codePrefix: "ACC" },
  );
  define(
    "journals",
    "Journal Entry",
    "Journal Entries",
    "Financial Accounting",
    "notebook-pen",
    [
      f("journalNumber", "Journal Number", "text", { required: true }),
      f("date", "Journal Date", "date", { required: true }),
      f("period", "Accounting Period", "month", { required: true }),
      f("reference", "Reference", "text", { required: true }),
      f("description", "Description", "textarea", { required: true }),
      f("sourceType", "Source Type"),
      f("sourceId", "Source Record ID"),
      f("lines", "Debit and Credit Lines", "json", { required: true }),
      f("status", "Posting Status", "select", {
        options: ["Draft", "Posted", "Reversed"],
        default: "Draft",
      }),
      f("postedAt", "Posted At"),
      f("reversalOf", "Reversal of Journal"),
    ],
    { identity: "journalNumber", codePrefix: "JNL", specialised: true },
  );
  define(
    "tax_codes",
    "Tax Code",
    "Tax Codes",
    "Financial Accounting",
    "badge-percent",
    [
      f("code", "Tax Code", "text", { required: true }),
      f("name", "Tax Name", "text", { required: true }),
      f("rate", "Rate %", "percent", { required: true, min: 0 }),
      f("inputAccount", "Input Tax Account", "ref", {
        ref: "accounts",
        refValue: "code",
        refLabel: "name",
      }),
      f("outputAccount", "Output Tax Account", "ref", {
        ref: "accounts",
        refValue: "code",
        refLabel: "name",
      }),
      f("effectiveFrom", "Effective From", "date"),
      status(),
    ],
    { identity: "code", codePrefix: "TAX" },
  );
  define(
    "bank_accounts",
    "Bank or Cash Account",
    "Bank & Cash Accounts",
    "Financial Accounting",
    "landmark",
    [
      f("code", "Bank Account Code", "text", { required: true }),
      f("name", "Account Name", "text", { required: true }),
      f("bankName", "Bank Name"),
      f("accountNumber", "Bank Account Number"),
      f("accountType", "Account Type", "select", {
        options: ["Current", "Savings", "Credit card", "Petty cash", "Overdraft"],
      }),
      f("ledgerAccount", "General Ledger Account", "ref", {
        required: true,
        ref: "accounts",
        refValue: "code",
        refLabel: "name",
      }),
      f("openingDate", "Opening Balance Date", "date"),
      f("openingBalance", "Opening Balance", "currency"),
      f("creditLimit", "Credit/Overdraft Limit", "currency", { min: 0 }),
      status(),
    ],
    { identity: "code", codePrefix: "BANK", autoPost: true },
  );
  define(
    "customer_invoices",
    "Customer Invoice",
    "Customer Invoices",
    "Financial Accounting",
    "file-plus-2",
    [
      f("invoiceNumber", "Invoice Number", "text", { required: true }),
      f("date", "Invoice Date", "date", { required: true }),
      f("dueDate", "Due Date", "date"),
      f("customerCode", "Customer", "ref", {
        required: true,
        ref: "customers",
        refValue: "code",
        refLabel: "name",
      }),
      f("productCode", "Product/Service", "ref", {
        ref: "products",
        refValue: "code",
        refLabel: "name",
      }),
      f("projectCode", "Project", "ref", { ref: "projects", refValue: "code", refLabel: "name" }),
      f("description", "Description", "textarea"),
      f("quantity", "Quantity", "number", { required: true, min: 0 }),
      f("unitPrice", "Unit Price Excluding Tax", "currency", { required: true, min: 0 }),
      f("discountPercent", "Discount %", "percent", { min: 0, max: 100 }),
      f("taxCode", "Tax Code", "ref", { ref: "tax_codes", refValue: "code", refLabel: "name" }),
      f("revenueAccount", "Revenue Account", "ref", {
        required: true,
        ref: "accounts",
        refValue: "code",
        refLabel: "name",
      }),
      f("costCentreCode", "Cost Centre", "ref", {
        ref: "cost_centres",
        refValue: "code",
        refLabel: "name",
      }),
      f("status", "Status", "select", {
        options: ["Draft", "Approved", "Posted", "Cancelled"],
        default: "Draft",
      }),
    ],
    { identity: "invoiceNumber", codePrefix: "INV", autoPost: true },
  );
  define(
    "supplier_bills",
    "Supplier Bill",
    "Supplier Bills",
    "Financial Accounting",
    "receipt-text",
    [
      f("billId", "Bill ID"),
      f("billNumber", "Supplier Invoice Number", "text", {
        required: true,
        help: "Enter the invoice number printed on the supplier's document.",
      }),
      f("date", "Bill Date", "date", { required: true }),
      f("dueDate", "Due Date", "date"),
      f("supplierCode", "Supplier", "ref", {
        required: true,
        ref: "suppliers",
        refValue: "code",
        refLabel: "name",
      }),
      f("description", "Description", "textarea", { required: true }),
      f("amountExclTax", "Amount Excluding Tax", "currency", { required: true, min: 0 }),
      f("taxCode", "Tax Code", "ref", { ref: "tax_codes", refValue: "code", refLabel: "name" }),
      f("debitAccount", "Expense/Asset Account", "ref", {
        required: true,
        ref: "accounts",
        refValue: "code",
        refLabel: "name",
      }),
      f("costCentreCode", "Cost Centre", "ref", {
        ref: "cost_centres",
        refValue: "code",
        refLabel: "name",
      }),
      f("productCode", "Product/Service", "ref", {
        ref: "products",
        refValue: "code",
        refLabel: "name",
      }),
      f("projectCode", "Project", "ref", { ref: "projects", refValue: "code", refLabel: "name" }),
      f("status", "Status", "select", {
        options: ["Draft", "Approved", "Posted", "Cancelled"],
        default: "Draft",
      }),
    ],
    { identity: "billId", codePrefix: "BILL", autoPost: true },
  );
  define(
    "receipts",
    "Customer Receipt",
    "Customer Receipts",
    "Financial Accounting",
    "circle-arrow-down",
    [
      f("receiptNumber", "Receipt Number", "text", { required: true }),
      f("date", "Receipt Date", "date", { required: true }),
      f("customerCode", "Customer", "ref", {
        required: true,
        ref: "customers",
        refValue: "code",
        refLabel: "name",
      }),
      f("invoiceNumber", "Customer Invoice Number"),
      f("bankAccountCode", "Bank Account", "ref", {
        required: true,
        ref: "bank_accounts",
        refValue: "code",
        refLabel: "name",
      }),
      f("amount", "Amount Received", "currency", { required: true, min: 0 }),
      f("reference", "Bank Reference"),
      f("status", "Status", "select", {
        options: ["Draft", "Posted", "Cancelled"],
        default: "Draft",
      }),
    ],
    { identity: "receiptNumber", codePrefix: "RCT", autoPost: true },
  );
  define(
    "payments",
    "Supplier or Other Payment",
    "Payments",
    "Financial Accounting",
    "circle-arrow-up",
    [
      f("paymentNumber", "Payment Number", "text", { required: true }),
      f("date", "Payment Date", "date", { required: true }),
      f("supplierCode", "Supplier", "ref", {
        ref: "suppliers",
        refValue: "code",
        refLabel: "name",
      }),
      f("billNumber", "Supplier Bill Number"),
      f("bankAccountCode", "Bank Account", "ref", {
        required: true,
        ref: "bank_accounts",
        refValue: "code",
        refLabel: "name",
      }),
      f("debitAccount", "Debit Account", "ref", {
        ref: "accounts",
        refValue: "code",
        refLabel: "name",
      }),
      f("amount", "Amount Paid", "currency", { required: true, min: 0 }),
      f("reference", "Bank Reference"),
      f("status", "Status", "select", {
        options: ["Draft", "Posted", "Cancelled"],
        default: "Draft",
      }),
    ],
    { identity: "paymentNumber", codePrefix: "PAY", autoPost: true },
  );
  define(
    "bank_transactions",
    "Bank Statement Transaction",
    "Bank Statement Transactions",
    "Financial Accounting",
    "arrow-left-right",
    [
      f("transactionId", "Transaction ID", "text", {
        generated: true,
        generatedPrefix: "TRAN",
        generatedSeparator: "-",
        help: "Created automatically as TRAN-001, TRAN-002 and so on. This field is locked in the Excel template.",
      }),
      f("date", "Transaction Date", "date", { required: true }),
      f("bankAccountCode", "Bank Account", "ref", {
        required: true,
        ref: "bank_accounts",
        refValue: "code",
        refLabel: "name",
      }),
      f("description", "Description", "text", { required: true }),
      f("debit", "Money Out", "currency", { min: 0 }),
      f("credit", "Money In", "currency", { min: 0 }),
      f("counterAccount", "Other General Ledger Account", "ref", {
        ref: "accounts",
        refValue: "code",
        refLabel: "name",
      }),
      f("reference", "Reference"),
      f("reconciled", "Reconciled", "boolean", { default: false }),
      f("status", "Posting Status", "select", {
        options: ["Unclassified", "Ready to post", "Posted", "Ignored"],
        default: "Unclassified",
      }),
    ],
    { identity: "transactionId", codePrefix: "TRAN", codeSeparator: "-", autoPost: true },
  );
  define(
    "fixed_assets",
    "Fixed Asset",
    "Fixed Assets",
    "Financial Accounting",
    "building-2",
    [
      f("assetCode", "Asset Code", "text", { required: true }),
      f("description", "Asset Description", "text", { required: true }),
      f("purchaseDate", "Purchase Date", "date", { required: true }),
      f("purchaseCost", "Purchase Cost Excluding Tax", "currency", { required: true, min: 0 }),
      f("residualValue", "Residual Value", "currency", { min: 0 }),
      f("usefulLifeYears", "Useful Life (Years)", "number", { required: true, min: 1 }),
      f("method", "Depreciation Method", "select", {
        options: ["Straight line", "Reducing balance"],
      }),
      f("reducingRate", "Reducing Balance Rate %", "percent", { min: 0 }),
      f("assetAccount", "Asset Cost Account", "ref", {
        required: true,
        ref: "accounts",
        refValue: "code",
        refLabel: "name",
      }),
      f("accumulatedDepreciationAccount", "Accumulated Depreciation Account", "ref", {
        required: true,
        ref: "accounts",
        refValue: "code",
        refLabel: "name",
      }),
      f("depreciationExpenseAccount", "Depreciation Expense Account", "ref", {
        required: true,
        ref: "accounts",
        refValue: "code",
        refLabel: "name",
      }),
      f("costCentreCode", "Cost Centre", "ref", {
        ref: "cost_centres",
        refValue: "code",
        refLabel: "name",
      }),
      f("productCode", "Product/Service", "ref", {
        ref: "products",
        refValue: "code",
        refLabel: "name",
      }),
      status(["Active", "Disposed", "Fully depreciated"]),
    ],
    { identity: "assetCode", codePrefix: "AST" },
  );
  define(
    "inventory_movements",
    "Inventory Movement",
    "Inventory Movements",
    "Financial Accounting",
    "boxes",
    [
      f("movementNumber", "Movement Number", "text", { required: true }),
      f("date", "Movement Date", "date", { required: true }),
      f("materialCode", "Material", "ref", {
        required: true,
        ref: "materials",
        refValue: "code",
        refLabel: "name",
      }),
      f("type", "Movement Type", "select", {
        options: [
          "Opening",
          "Receipt",
          "Issue to production",
          "Return",
          "Adjustment increase",
          "Adjustment decrease",
          "Write-off",
        ],
      }),
      f("quantity", "Quantity", "number", { required: true, min: 0 }),
      f("unitCost", "Unit Cost", "currency", { min: 0 }),
      f("productCode", "Product/Service", "ref", {
        ref: "products",
        refValue: "code",
        refLabel: "name",
      }),
      f("projectCode", "Project", "ref", { ref: "projects", refValue: "code", refLabel: "name" }),
      f("reference", "Reference"),
      f("status", "Status", "select", {
        options: ["Draft", "Posted", "Cancelled"],
        default: "Draft",
      }),
    ],
    { identity: "movementNumber", codePrefix: "MOV", autoPost: true },
  );
  define(
    "loans",
    "Loan or Finance Facility",
    "Loans & Finance Facilities",
    "Financial Accounting",
    "hand-coins",
    [
      f("code", "Loan Code", "text", { required: true }),
      f("name", "Loan Name", "text", { required: true }),
      f("lender", "Lender"),
      f("startDate", "Start Date", "date"),
      f("openingBalance", "Opening Principal Balance", "currency", { required: true, min: 0 }),
      f("annualInterestRate", "Annual Interest Rate %", "percent", { min: 0 }),
      f("termMonths", "Original Term (Months)", "number", { min: 1 }),
      f("remainingMonths", "Remaining Months", "number", { min: 0 }),
      f("instalmentAmount", "Contractual Instalment", "currency", { min: 0 }),
      f("loanAccount", "Loan Liability Account", "ref", {
        required: true,
        ref: "accounts",
        refValue: "code",
        refLabel: "name",
      }),
      f("interestAccount", "Interest Expense Account", "ref", {
        required: true,
        ref: "accounts",
        refValue: "code",
        refLabel: "name",
      }),
      f("bankAccountCode", "Bank Account", "ref", {
        ref: "bank_accounts",
        refValue: "code",
        refLabel: "name",
      }),
      status(),
    ],
    { identity: "code", codePrefix: "LOAN" },
  );
  define(
    "loan_payments",
    "Loan Payment",
    "Loan Payments",
    "Financial Accounting",
    "receipt",
    [
      f("paymentNumber", "Payment Number", "text", { required: true }),
      f("date", "Payment Date", "date", { required: true }),
      f("loanCode", "Loan", "ref", {
        required: true,
        ref: "loans",
        refValue: "code",
        refLabel: "name",
      }),
      f("bankAccountCode", "Bank Account", "ref", {
        required: true,
        ref: "bank_accounts",
        refValue: "code",
        refLabel: "name",
      }),
      f("principal", "Principal", "currency", { required: true, min: 0 }),
      f("interest", "Interest", "currency", { min: 0 }),
      f("fees", "Fees", "currency", { min: 0 }),
      f("status", "Status", "select", {
        options: ["Draft", "Posted", "Cancelled"],
        default: "Draft",
      }),
    ],
    { identity: "paymentNumber", codePrefix: "LPAY", autoPost: true },
  );
  define(
    "owner_transactions",
    "Owner or Equity Transaction",
    "Owner & Equity Transactions",
    "Financial Accounting",
    "user-round-cog",
    [
      f("transactionNumber", "Transaction Number", "text", { required: true }),
      f("date", "Date", "date", { required: true }),
      f("owner", "Owner/Shareholder"),
      f("type", "Transaction Type", "select", {
        options: [
          "Capital introduced",
          "Owner drawings",
          "Dividend",
          "Shareholder loan received",
          "Shareholder loan repayment",
        ],
      }),
      f("amount", "Amount", "currency", { required: true, min: 0 }),
      f("bankAccountCode", "Bank Account", "ref", {
        required: true,
        ref: "bank_accounts",
        refValue: "code",
        refLabel: "name",
      }),
      f("equityOrLoanAccount", "Equity or Shareholder Loan Account", "ref", {
        required: true,
        ref: "accounts",
        refValue: "code",
        refLabel: "name",
      }),
      f("status", "Status", "select", {
        options: ["Draft", "Posted", "Cancelled"],
        default: "Draft",
      }),
    ],
    { identity: "transactionNumber", codePrefix: "OWN", autoPost: true },
  );

  define(
    "materials",
    "Material",
    "Materials",
    "Cost & Managerial Accounting",
    "package",
    [
      f("code", "Material Code", "text", { required: true }),
      f("name", "Material Name", "text", { required: true }),
      f("unit", "Unit", "text", { required: true }),
      f("standardCost", "Standard Unit Cost", "currency", { required: true, min: 0 }),
      f("supplierCode", "Main Supplier", "ref", {
        ref: "suppliers",
        refValue: "code",
        refLabel: "name",
      }),
      f("inventoryAccount", "Inventory Account", "ref", {
        ref: "accounts",
        refValue: "code",
        refLabel: "name",
      }),
      f("usageAccount", "Usage/Cost Account", "ref", {
        ref: "accounts",
        refValue: "code",
        refLabel: "name",
      }),
      f("reorderLevel", "Reorder Level", "number", { min: 0 }),
      f("safetyStock", "Safety Stock", "number", { min: 0 }),
      status(),
    ],
    { identity: "code", codePrefix: "MAT" },
  );
  define(
    "labour_resources",
    "Labour Resource",
    "Labour Resources",
    "Cost & Managerial Accounting",
    "hard-hat",
    [
      f("code", "Labour Code", "text", { required: true }),
      f("role", "Role or Trade", "text", { required: true }),
      f("normalRate", "Normal Hourly Cost", "currency", { required: true, min: 0 }),
      f("overtimeRate", "Overtime Hourly Cost", "currency", { min: 0 }),
      f("productiveHoursPerDay", "Productive Hours per Day", "number", { min: 0, default: 8 }),
      f("costCentreCode", "Cost Centre", "ref", {
        ref: "cost_centres",
        refValue: "code",
        refLabel: "name",
      }),
      status(),
    ],
    { identity: "code", codePrefix: "LAB" },
  );
  define(
    "equipment",
    "Equipment Resource",
    "Equipment Resources",
    "Cost & Managerial Accounting",
    "wrench",
    [
      f("code", "Equipment Code", "text", { required: true }),
      f("name", "Equipment Name", "text", { required: true }),
      f("ownership", "Ownership", "select", { options: ["Owned", "Rented", "Leased"] }),
      f("purchaseCost", "Purchase Cost", "currency", { min: 0 }),
      f("hireRatePerHour", "Hire/Lease Rate per Hour", "currency", { min: 0 }),
      f("operatingCostPerHour", "Operating Cost per Hour", "currency", { min: 0 }),
      f("depreciationPerHour", "Depreciation per Hour", "currency", { min: 0 }),
      f("availableHoursPerMonth", "Available Hours per Month", "number", { min: 0 }),
      status(),
    ],
    { identity: "code", codePrefix: "EQ" },
  );
  define(
    "product_materials",
    "Product Material Requirement",
    "Product Material Requirements",
    "Cost & Managerial Accounting",
    "boxes",
    [
      f("code", "Requirement Code", "text", { required: true }),
      f("productCode", "Product/Service", "ref", {
        required: true,
        ref: "products",
        refValue: "code",
        refLabel: "name",
      }),
      f("materialCode", "Material", "ref", {
        required: true,
        ref: "materials",
        refValue: "code",
        refLabel: "name",
      }),
      f("quantityPerUnit", "Quantity per Output Unit", "number", { required: true, min: 0 }),
      f("wastagePercent", "Wastage %", "percent", { min: 0 }),
      status(),
    ],
    { identity: "code", codePrefix: "PM" },
  );
  define(
    "product_labour",
    "Product Labour Requirement",
    "Product Labour Requirements",
    "Cost & Managerial Accounting",
    "users-round",
    [
      f("code", "Requirement Code", "text", { required: true }),
      f("productCode", "Product/Service", "ref", {
        required: true,
        ref: "products",
        refValue: "code",
        refLabel: "name",
      }),
      f("labourCode", "Labour Resource", "ref", {
        required: true,
        ref: "labour_resources",
        refValue: "code",
        refLabel: "role",
      }),
      f("hoursPerUnit", "Hours per Output Unit", "number", { required: true, min: 0 }),
      f("overtimePercent", "Overtime Mix %", "percent", { min: 0, max: 100 }),
      status(),
    ],
    { identity: "code", codePrefix: "PL" },
  );
  define(
    "product_equipment",
    "Product Equipment Requirement",
    "Product Equipment Requirements",
    "Cost & Managerial Accounting",
    "cog",
    [
      f("code", "Requirement Code", "text", { required: true }),
      f("productCode", "Product/Service", "ref", {
        required: true,
        ref: "products",
        refValue: "code",
        refLabel: "name",
      }),
      f("equipmentCode", "Equipment", "ref", {
        required: true,
        ref: "equipment",
        refValue: "code",
        refLabel: "name",
      }),
      f("hoursPerUnit", "Equipment Hours per Unit", "number", { required: true, min: 0 }),
      status(),
    ],
    { identity: "code", codePrefix: "PE" },
  );
  define(
    "product_operations",
    "Production or Service Step",
    "Production & Service Steps",
    "Cost & Managerial Accounting",
    "list-ordered",
    [
      f("code", "Step Code", "text", { required: true }),
      f("productCode", "Product/Service", "ref", {
        required: true,
        ref: "products",
        refValue: "code",
        refLabel: "name",
      }),
      f("sequence", "Step Number", "number", { required: true, min: 1 }),
      f("name", "Step Name", "text", { required: true }),
      f("setupMinutes", "Setup Minutes", "number", { min: 0 }),
      f("runMinutesPerUnit", "Work Minutes per Unit", "number", { min: 0 }),
      f("waitMinutes", "Waiting Minutes", "number", { min: 0 }),
      f("batchSize", "Normal Batch Size", "number", { min: 1, default: 1 }),
      status(),
    ],
    { identity: "code", codePrefix: "OP" },
  );
  define(
    "overhead_pools",
    "Overhead Cost Pool",
    "Overhead Cost Pools",
    "Cost & Managerial Accounting",
    "split",
    [
      f("code", "Overhead Pool Code", "text", { required: true }),
      f("name", "Overhead Pool Name", "text", { required: true }),
      f("monthlyAmount", "Monthly Pool Amount", "currency", { required: true, min: 0 }),
      f("costBehaviour", "Cost Behaviour", "select", {
        options: ["Fixed", "Variable", "Semi-variable"],
      }),
      f("allocationBasis", "Automatic Allocation Basis", "select", {
        options: [
          "Expected sales value",
          "Expected units",
          "Direct labour hours",
          "Equipment hours",
          "Direct cost",
          "Equal share",
        ],
      }),
      f("costCentreCode", "Cost Centre", "ref", {
        ref: "cost_centres",
        refValue: "code",
        refLabel: "name",
      }),
      f("expenseAccount", "Linked Expense Account", "ref", {
        ref: "accounts",
        refValue: "code",
        refLabel: "name",
      }),
      status(),
    ],
    { identity: "code", codePrefix: "OH" },
  );
  define(
    "budget_lines",
    "Budget Line",
    "Budget Lines",
    "Cost & Managerial Accounting",
    "chart-no-axes-combined",
    [
      f("code", "Budget Line Code", "text", { required: true }),
      f("period", "Budget Period", "month", { required: true }),
      f("accountCode", "General Ledger Account", "ref", {
        required: true,
        ref: "accounts",
        refValue: "code",
        refLabel: "name",
      }),
      f("costCentreCode", "Cost Centre", "ref", {
        ref: "cost_centres",
        refValue: "code",
        refLabel: "name",
      }),
      f("productCode", "Product/Service", "ref", {
        ref: "products",
        refValue: "code",
        refLabel: "name",
      }),
      f("projectCode", "Project", "ref", { ref: "projects", refValue: "code", refLabel: "name" }),
      f("amount", "Budget Amount", "currency", { required: true }),
      f("version", "Budget Version"),
      f("status", "Status", "select", {
        options: ["Draft", "Approved", "Revised"],
        default: "Draft",
      }),
    ],
    { identity: "code", codePrefix: "BUD" },
  );
  define(
    "production_actuals",
    "Production Actual",
    "Production Actuals",
    "Cost & Managerial Accounting",
    "factory",
    [
      f("code", "Production Record Code", "text", { required: true }),
      f("date", "Date", "date", { required: true }),
      f("productCode", "Product/Service", "ref", {
        required: true,
        ref: "products",
        refValue: "code",
        refLabel: "name",
      }),
      f("unitsProduced", "Units Produced", "number", { required: true, min: 0 }),
      f("materialCode", "Material", "ref", {
        ref: "materials",
        refValue: "code",
        refLabel: "name",
      }),
      f("actualMaterialQuantity", "Actual Material Quantity", "number", { min: 0 }),
      f("actualMaterialCost", "Actual Material Cost", "currency", { min: 0 }),
      f("labourCode", "Labour", "ref", {
        ref: "labour_resources",
        refValue: "code",
        refLabel: "role",
      }),
      f("actualLabourHours", "Actual Labour Hours", "number", { min: 0 }),
      f("actualLabourCost", "Actual Labour Cost", "currency", { min: 0 }),
      f("actualEquipmentCost", "Actual Equipment Cost", "currency", { min: 0 }),
      f("notes", "Notes", "textarea"),
    ],
    { identity: "code", codePrefix: "ACT" },
  );
  define(
    "project_tasks",
    "Project Task/WBS",
    "Project Tasks & WBS",
    "Cost & Managerial Accounting",
    "list-tree",
    [
      f("code", "Task Code", "text", { required: true }),
      f("projectCode", "Project", "ref", {
        required: true,
        ref: "projects",
        refValue: "code",
        refLabel: "name",
      }),
      f("name", "Task/WBS Description", "text", { required: true }),
      f("startDate", "Planned Start", "date", { required: true }),
      f("endDate", "Planned Finish", "date", { required: true }),
      f("budget", "Task Budget", "currency", { min: 0 }),
      f("weightPercent", "Progress Weight %", "percent", { min: 0, max: 100 }),
      status(["Not started", "In progress", "Completed", "On hold"]),
    ],
    { identity: "code", codePrefix: "TASK" },
  );
  define(
    "project_costs",
    "Project Actual Cost",
    "Project Actual Costs",
    "Cost & Managerial Accounting",
    "receipt",
    [
      f("code", "Cost Record Code", "text", { required: true }),
      f("date", "Cost Date", "date", { required: true }),
      f("projectCode", "Project", "ref", {
        required: true,
        ref: "projects",
        refValue: "code",
        refLabel: "name",
      }),
      f("taskCode", "Task/WBS Code", "ref", {
        ref: "project_tasks",
        refValue: "code",
        refLabel: "name",
      }),
      f("category", "Cost Category"),
      f("description", "Description", "text", { required: true }),
      f("amount", "Actual Cost", "currency", { required: true, min: 0 }),
      f("supplierCode", "Supplier", "ref", {
        ref: "suppliers",
        refValue: "code",
        refLabel: "name",
      }),
      f("committed", "Committed but Not Yet Paid", "boolean", { default: false }),
      f("approved", "Approved", "boolean", { default: true }),
    ],
    { identity: "code", codePrefix: "PC" },
  );
  define(
    "project_progress",
    "Project Progress Update",
    "Project Progress Updates",
    "Cost & Managerial Accounting",
    "activity",
    [
      f("code", "Progress Record Code", "text", { required: true }),
      f("date", "Assessment Date", "date", { required: true }),
      f("projectCode", "Project", "ref", {
        required: true,
        ref: "projects",
        refValue: "code",
        refLabel: "name",
      }),
      f("taskCode", "Task/WBS", "ref", {
        required: true,
        ref: "project_tasks",
        refValue: "code",
        refLabel: "name",
      }),
      f("physicalPercent", "Physical Completion %", "percent", {
        required: true,
        min: 0,
        max: 100,
      }),
      f("notes", "Evidence and Notes", "textarea"),
    ],
    { identity: "code", codePrefix: "PROG" },
  );
  define(
    "project_risks",
    "Project Risk",
    "Project Risks",
    "Cost & Managerial Accounting",
    "shield-alert",
    [
      f("code", "Risk Code", "text", { required: true }),
      f("projectCode", "Project", "ref", {
        required: true,
        ref: "projects",
        refValue: "code",
        refLabel: "name",
      }),
      f("description", "Risk Description", "textarea", { required: true }),
      f("probabilityPercent", "Probability %", "percent", { min: 0, max: 100 }),
      f("financialImpact", "Financial Impact", "currency", { min: 0 }),
      f("owner", "Risk Owner"),
      f("mitigation", "Mitigation", "textarea"),
      status(["Open", "Mitigating", "Closed"]),
    ],
    { identity: "code", codePrefix: "RISK" },
  );
  define(
    "pricing_assumptions",
    "Pricing Assumption",
    "Pricing Assumptions",
    "Cost & Managerial Accounting",
    "sliders-horizontal",
    [
      f("code", "Pricing Record Code", "text", { required: true }),
      f("productCode", "Product/Service", "ref", {
        required: true,
        ref: "products",
        refValue: "code",
        refLabel: "name",
      }),
      f("referencePrice", "Current/Reference Price", "currency", { required: true, min: 0 }),
      f("baselineMonthlyVolume", "Expected Monthly Quantity", "number", { required: true, min: 0 }),
      f("priceElasticity", "Estimated Price Sensitivity", "number", { min: 0, default: 1 }),
      f("minimumPrice", "Lowest Price to Test", "currency", { min: 0 }),
      f("maximumPrice", "Highest Price to Test", "currency", { min: 0 }),
      f("priceStep", "Price Test Increment", "currency", { min: 0 }),
      f("capacityMonthly", "Maximum Monthly Capacity", "number", { min: 0 }),
      f("targetMargin", "Target Margin %", "percent", { min: 0, max: 99 }),
      status(["Draft", "Approved"]),
    ],
    { identity: "code", codePrefix: "PRICE" },
  );
  define(
    "scenarios",
    "Scenario",
    "Scenarios",
    "Cost & Managerial Accounting",
    "git-branch",
    [
      f("code", "Scenario Code", "text", { required: true }),
      f("name", "Scenario Name", "text", { required: true }),
      f("productCode", "Product/Service", "ref", {
        ref: "products",
        refValue: "code",
        refLabel: "name",
      }),
      f("priceChange", "Price Change %", "percent"),
      f("volumeChange", "Volume Change %", "percent"),
      f("materialChange", "Material Cost Change %", "percent"),
      f("labourChange", "Labour Cost Change %", "percent"),
      f("overheadChange", "Overhead Change %", "percent"),
      f("notes", "Assumptions", "textarea"),
    ],
    { identity: "code", codePrefix: "SCN" },
  );
  define(
    "decision_models",
    "Management Decision",
    "Management Decisions",
    "Cost & Managerial Accounting",
    "git-compare-arrows",
    [
      f("code", "Decision Code", "text", { required: true }),
      f("name", "Decision Name", "text", { required: true }),
      f("type", "Decision Type", "select", {
        options: [
          "Make or buy",
          "Special order",
          "Outsource",
          "Keep or discontinue",
          "Lease or buy",
          "Other",
        ],
      }),
      f("optionA", "Option A"),
      f("optionARevenue", "Option A Relevant Revenue", "currency"),
      f("optionACost", "Option A Relevant Cost", "currency"),
      f("optionB", "Option B"),
      f("optionBRevenue", "Option B Relevant Revenue", "currency"),
      f("optionBCost", "Option B Relevant Cost", "currency"),
      f("qualitativeFactors", "Qualitative Factors", "textarea"),
      status(["Draft", "Approved", "Implemented"]),
    ],
    { identity: "code", codePrefix: "DEC" },
  );
  define(
    "capital_investments",
    "Capital Investment",
    "Capital Investments",
    "Cost & Managerial Accounting",
    "factory",
    [
      f("code", "Investment Code", "text", { required: true }),
      f("name", "Investment Name", "text", { required: true }),
      f("initialInvestment", "Initial Investment", "currency", { required: true, min: 0 }),
      f("discountRate", "Discount Rate %", "percent", { required: true, min: 0 }),
      f("lifeYears", "Life in Years", "number", { required: true, min: 1 }),
      f("annualCashFlows", "Annual Net Cash Flows (comma separated)", "textarea", {
        required: true,
      }),
      f("residualValue", "Residual Value", "currency", { min: 0 }),
      f("notes", "Assumptions", "textarea"),
      status(["Draft", "Approved", "Rejected"]),
    ],
    { identity: "code", codePrefix: "INVEST" },
  );
  define(
    "tender_items",
    "Tender/Quotation Rate",
    "Tender & Quotation Rates",
    "Cost & Managerial Accounting",
    "clipboard-check",
    [
      f("code", "Rate Code", "text", { required: true }),
      f("tenderNumber", "Tender/Quotation Number", "text", { required: true }),
      f("itemNumber", "Line Item Number", "text", { required: true }),
      f("description", "Description", "textarea", { required: true }),
      f("unit", "Unit", "text", { required: true }),
      f("quantity", "Quantity", "number", { required: true, min: 0 }),
      f("material", "Material per Unit", "currency", { min: 0 }),
      f("labour", "Labour per Unit", "currency", { min: 0 }),
      f("equipment", "Equipment per Unit", "currency", { min: 0 }),
      f("subcontractor", "Subcontractor per Unit", "currency", { min: 0 }),
      f("riskWastage", "Risk & Wastage per Unit", "currency", { min: 0 }),
      f("preliminaries", "Preliminaries per Unit", "currency", { min: 0 }),
      f("overhead", "Overhead per Unit", "currency", { min: 0 }),
      f("profitPercent", "Profit Markup %", "percent", { min: 0 }),
    ],
    { identity: "code", codePrefix: "RATE" },
  );

  const automaticIdentities = {
    departments: ["DEP", 3],
    cost_centres: ["CC", 3],
    customers: ["CUS", 3],
    suppliers: ["SUP", 3],
    projects: ["PRJ", 3],
    products: ["PROD", 3],
    employees: ["EMP", 3],
    recurring_expenses: ["EXP", 3],
    journals: ["JNL", 6],
    bank_accounts: ["BANK", 3],
    customer_invoices: ["INV", 4],
    supplier_bills: ["BILL", 4],
    receipts: ["REC", 4],
    payments: ["PAY", 4],
    bank_transactions: ["TRAN", 3],
    fixed_assets: ["AST", 3],
    inventory_movements: ["MOV", 3],
    loans: ["LOAN", 3],
    loan_payments: ["LPAY", 3],
    owner_transactions: ["OWN", 3],
    materials: ["MAT", 3],
    labour_resources: ["LAB", 3],
    equipment: ["EQ", 3],
    product_materials: ["PM", 3],
    product_labour: ["PL", 3],
    product_equipment: ["PE", 3],
    product_operations: ["OP", 3],
    overhead_pools: ["OH", 3],
    budget_lines: ["BUD", 3],
    production_actuals: ["ACT", 3],
    project_tasks: ["TASK", 3],
    project_costs: ["PC", 3],
    project_progress: ["PROG", 3],
    project_risks: ["RISK", 3],
    pricing_assumptions: ["PRICE", 3],
    scenarios: ["SCN", 3],
    decision_models: ["DEC", 3],
    capital_investments: ["INVEST", 3],
    tender_items: ["RATE", 3],
  };
  definitions.forEach((schema) => {
    const config = automaticIdentities[schema.key];
    if (!config || !schema.identity) return;
    const field = schema.fields.find((candidate) => candidate.key === schema.identity);
    if (!field) return;
    schema.codePrefix = config[0];
    schema.codeDigits = config[1];
    schema.codeSeparator = "-";
    schema.generatedIdentity = true;
    field.required = false;
    field.generated = true;
    field.generatedPrefix = config[0];
    field.generatedDigits = config[1];
    field.generatedSeparator = "-";
    field.help = `Created automatically as ${config[0]}-${String(1).padStart(config[1], "0")}, ${config[0]}-${String(2).padStart(config[1], "0")} and so on.`;
  });

  // Lookups keep the UI, imports and persistence aligned on the same register metadata.
  const Schemas = {
    list() {
      return definitions.slice();
    },
    get(key) {
      return definitions.find((schema) => schema.key === key) || null;
    },
    validate(key, data) {
      const schema = Schemas.get(key);
      if (!schema) return ["Unknown data type."];
      const findings = [];
      schema.fields.forEach((field) => {
        const value = data[field.key];
        if (
          field.required &&
          (value === "" ||
            value == null ||
            (field.type === "json" && (!Array.isArray(value) || !value.length)))
        )
          findings.push(`${field.label} is required.`);
        if (
          ["currency", "number", "percent"].includes(field.type) &&
          value !== "" &&
          value != null
        ) {
          const number = IA.Util.number(value, NaN);
          if (!Number.isFinite(number)) findings.push(`${field.label} must be a number.`);
          if (field.min != null && number < field.min)
            findings.push(`${field.label} cannot be below ${field.min}.`);
          if (field.max != null && number > field.max)
            findings.push(`${field.label} cannot exceed ${field.max}.`);
        }
      });
      if (key === "journals" && Array.isArray(data.lines)) {
        const debit = IA.Util.sum(data.lines, (line) => line.debit),
          credit = IA.Util.sum(data.lines, (line) => line.credit);
        if (Math.abs(debit - credit) > 0.005)
          findings.push("Journal debits must equal journal credits.");
        if (debit <= 0) findings.push("A journal must contain a positive amount.");
        data.lines.forEach((line, index) => {
          if (!line.accountCode) findings.push(`Journal line ${index + 1} needs an account.`);
          if (IA.Util.number(line.debit) > 0 && IA.Util.number(line.credit) > 0)
            findings.push(`Journal line ${index + 1} cannot contain both a debit and a credit.`);
        });
      }
      if (key === "bank_transactions") {
        const moneyOut = IA.Util.number(data.debit),
          moneyIn = IA.Util.number(data.credit);
        if ((moneyOut > 0 && moneyIn > 0) || (moneyOut <= 0 && moneyIn <= 0))
          findings.push(
            "Enter either Money Out or Money In for the bank transaction, but not both.",
          );
      }
      return findings;
    },
  };
  IA.Schemas = Schemas;
})();
