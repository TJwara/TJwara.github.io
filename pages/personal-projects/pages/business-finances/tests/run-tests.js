/* Accounting regression tests. jsdom supplies the page and fake-indexeddb supplies storage;
   the browser modules are loaded in the same dependency order as business-finances.html. */
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { TextEncoder, TextDecoder } = require("util");
const { JSDOM, VirtualConsole } = require("jsdom");
const { indexedDB, IDBKeyRange } = require("fake-indexeddb");

const root = path.resolve(__dirname, "..");
const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", (error) => {
  if (!/navigation \(except hash changes\)/i.test(error.message)) console.error(error);
});
const dom = new JSDOM(
  "<!doctype html><html><body><div id='app'></div><div id='boot'></div><div id='modal-root'></div><div id='toast-root'></div></body></html>",
  { url: "http://localhost/", runScripts: "outside-only", pretendToBeVisual: true, virtualConsole },
);
const { window } = dom;
window.indexedDB = indexedDB;
window.IDBKeyRange = IDBKeyRange;
window.TextEncoder = TextEncoder;
window.TextDecoder = TextDecoder;
window.confirm = () => true;
window.prompt = () => null;
window.open = () => null;
window.URL.createObjectURL = () => "blob:test";
window.URL.revokeObjectURL = () => {};
window.HTMLAnchorElement.prototype.click = () => {};

function load(file) {
  window.eval(fs.readFileSync(path.join(root, file), "utf8"));
}
function amount(value) {
  return Math.round(Number(value) * 100) / 100;
}

async function main() {
  load("assets/js/core.js");
  load("assets/js/schemas.js");
  load("assets/js/accounting.js");
  load("assets/js/managerial.js");
  load("assets/js/reports.js");
  const IA = window.IAP;
  await IA.DB.init();

  assert(IA.Schemas.list().length >= 39, "Complete register schema is loaded");
  const automaticSchemas = IA.Schemas.list().filter((schema) => schema.generatedIdentity);
  assert(
    automaticSchemas.length >= 35,
    "Internal identifiers are configured for automatic numbering across the platform",
  );
  automaticSchemas.forEach((schema) => {
    const field = schema.fields.find((candidate) => candidate.key === schema.identity);
    assert(
      field && field.generated && !field.required,
      `${schema.label} identity is automatic and not required from the user`,
    );
  });
  const company = await IA.Companies.save({
    legalName: "Integrated Test Company",
    companyCode: "ITC",
    currency: "ZAR",
    vatRegistered: true,
    vatRate: 15,
    financialYearEndMonth: 2,
  });
  await IA.Accounting.provisionCompany(company.id);
  let snap = await IA.Records.snapshot(company.id);
  assert(snap.data.accounts.length >= 30, "Standard chart of accounts provisioned");
  assert.strictEqual(
    snap.data.accounting_periods.length,
    12,
    "Twelve open accounting periods provisioned",
  );
  assert.strictEqual(snap.data.bank_accounts.length, 1, "Starter bank register provisioned");

  await IA.Records.save(company.id, "customers", {
    code: "CUS-001",
    name: "Test Customer",
    registrationNumber: "",
    taxNumber: "",
    email: "",
    phone: "",
    address: "",
    creditLimit: 100000,
    paymentTermsDays: 30,
    status: "Active",
  });
  await IA.Records.save(company.id, "suppliers", {
    code: "SUP-001",
    name: "Test Supplier",
    registrationNumber: "",
    taxNumber: "",
    email: "",
    phone: "",
    address: "",
    paymentTermsDays: 30,
    status: "Active",
  });
  await IA.Records.save(company.id, "products", {
    code: "PROD-001",
    name: "Test Product",
    type: "Manufactured item",
    category: "Test",
    unit: "each",
    sellingPrice: 250,
    expectedMonthlyVolume: 100,
    targetMargin: 30,
    revenueAccount: "4000",
    cogsAccount: "5000",
    status: "Active",
  });
  await IA.Records.save(company.id, "materials", {
    code: "MAT-001",
    name: "Input Material",
    unit: "kg",
    standardCost: 40,
    supplierCode: "SUP-001",
    inventoryAccount: "1200",
    usageAccount: "5100",
    reorderLevel: 20,
    safetyStock: 10,
    status: "Active",
  });
  await IA.Records.save(company.id, "labour_resources", {
    code: "LAB-001",
    role: "Technician",
    normalRate: 80,
    overtimeRate: 120,
    productiveHoursPerDay: 8,
    costCentreCode: "",
    status: "Active",
  });
  await IA.Records.save(company.id, "equipment", {
    code: "EQ-001",
    name: "Machine",
    ownership: "Owned",
    purchaseCost: 100000,
    hireRatePerHour: 0,
    operatingCostPerHour: 15,
    depreciationPerHour: 10,
    availableHoursPerMonth: 160,
    status: "Active",
  });
  await IA.Records.save(company.id, "product_materials", {
    code: "PM-001",
    productCode: "PROD-001",
    materialCode: "MAT-001",
    quantityPerUnit: 2,
    wastagePercent: 5,
    status: "Active",
  });
  await IA.Records.save(company.id, "product_labour", {
    code: "PL-001",
    productCode: "PROD-001",
    labourCode: "LAB-001",
    hoursPerUnit: 0.5,
    overtimePercent: 0,
    status: "Active",
  });
  await IA.Records.save(company.id, "product_equipment", {
    code: "PE-001",
    productCode: "PROD-001",
    equipmentCode: "EQ-001",
    hoursPerUnit: 0.25,
    status: "Active",
  });
  await IA.Records.save(company.id, "recurring_expenses", {
    code: "EXP-001",
    name: "Rent",
    category: "Occupancy",
    amount: 5000,
    frequency: "Monthly",
    costBehaviour: "Fixed",
    cashClassification: "Cash operating expense",
    costCentreCode: "",
    productCode: "",
    projectCode: "",
    expenseAccount: "6100",
    status: "Active",
  });
  await IA.Records.save(company.id, "employees", {
    code: "EMP-001",
    fullName: "Office Manager",
    role: "Manager",
    departmentCode: "",
    costCentreCode: "",
    productCode: "",
    projectCode: "",
    payBasis: "Monthly",
    basePay: 12000,
    hoursPerWeek: 40,
    overtimeRate: 0,
    expectedOvertimeHours: 0,
    monthlyAllowances: 1000,
    employerContributions: 1500,
    costBehaviour: "Fixed",
    status: "Active",
  });

  const bankTransactionWithoutId = await IA.Records.save(
    company.id,
    "bank_transactions",
    {
      transactionId: "",
      date: IA.Util.today(),
      bankAccountCode: "BANK-001",
      description: "Statement transaction without a bank-provided ID",
      debit: 125,
      credit: 0,
      counterAccount: "",
      reference: "",
      reconciled: "",
      status: "",
    },
    null,
    "Excel import test",
  );
  const secondBankTransactionWithoutId = await IA.Records.save(
    company.id,
    "bank_transactions",
    {
      date: IA.Util.today(),
      bankAccountCode: "BANK-001",
      description: "Second statement transaction without a bank-provided ID",
      debit: 0,
      credit: 250,
      counterAccount: "",
      reference: "",
      reconciled: "",
      status: "",
    },
    null,
    "Excel import test",
  );
  assert.strictEqual(
    bankTransactionWithoutId.data.transactionId,
    "TRAN-001",
    "The first missing bank Transaction ID becomes TRAN-001",
  );
  assert.strictEqual(
    secondBankTransactionWithoutId.data.transactionId,
    "TRAN-002",
    "The second missing bank Transaction ID becomes TRAN-002",
  );
  assert.notStrictEqual(
    secondBankTransactionWithoutId.data.transactionId,
    bankTransactionWithoutId.data.transactionId,
    "Generated bank Transaction IDs are unique",
  );
  assert.strictEqual(
    bankTransactionWithoutId.data.status,
    "Unclassified",
    "Blank bank posting status defaults to Unclassified",
  );
  assert.strictEqual(
    bankTransactionWithoutId.data.reconciled,
    false,
    "Blank bank reconciliation status defaults to false",
  );

  const automaticCompany = await IA.Companies.save({
    legalName: "Automatic Number Test Company",
    currency: "ZAR",
    vatRegistered: false,
    financialYearEndMonth: 2,
  });
  await IA.Accounting.provisionCompany(automaticCompany.id);
  const automaticCustomer = await IA.Records.save(automaticCompany.id, "customers", {
    name: "Automatic Customer",
    status: "Active",
  });
  const automaticSupplier = await IA.Records.save(automaticCompany.id, "suppliers", {
    name: "Automatic Supplier",
    status: "Active",
  });
  const automaticProduct = await IA.Records.save(automaticCompany.id, "products", {
    name: "Automatic Product",
    type: "Product",
    unit: "each",
    status: "Active",
  });
  const automaticInvoice = await IA.Records.save(automaticCompany.id, "customer_invoices", {
    date: IA.Util.today(),
    customerCode: automaticCustomer.data.code,
    productCode: automaticProduct.data.code,
    description: "Automatic invoice",
    quantity: 1,
    unitPrice: 100,
    revenueAccount: "4000",
    status: "Draft",
  });
  const automaticBill = await IA.Records.save(automaticCompany.id, "supplier_bills", {
    billNumber: "SUPPLIER-778",
    date: IA.Util.today(),
    supplierCode: automaticSupplier.data.code,
    description: "Automatic bill",
    amountExclTax: 50,
    debitAccount: "6100",
    status: "Draft",
  });
  assert.strictEqual(automaticCustomer.data.code, "CUS-001", "Customer code is automatic");
  assert.strictEqual(automaticSupplier.data.code, "SUP-001", "Supplier code is automatic");
  assert.strictEqual(automaticProduct.data.code, "PROD-001", "Product code is automatic");
  assert.strictEqual(
    automaticInvoice.data.invoiceNumber,
    "INV-0001",
    "Customer invoice number is automatic",
  );
  assert.strictEqual(
    automaticBill.data.billId,
    "BILL-0001",
    "Supplier bill receives a separate automatic internal ID",
  );
  assert.strictEqual(
    automaticBill.data.billNumber,
    "SUPPLIER-778",
    "Supplier's external invoice number is preserved",
  );

  const postedAutomaticInvoice = await IA.Records.save(
    automaticCompany.id,
    "customer_invoices",
    Object.assign({}, automaticInvoice.data, { status: "Approved" }),
    automaticInvoice,
  );
  await IA.Accounting.autoPost(automaticCompany.id, postedAutomaticInvoice);
  const editedAutomaticInvoice = await IA.Records.save(
    automaticCompany.id,
    "customer_invoices",
    Object.assign({}, postedAutomaticInvoice.data, { unitPrice: 125 }),
    postedAutomaticInvoice,
    postedAutomaticInvoice.source,
    { replacePosted: true },
  );
  await IA.Accounting.autoPost(automaticCompany.id, editedAutomaticInvoice);
  let automaticSnap = await IA.Records.snapshot(automaticCompany.id);
  assert.strictEqual(
    automaticSnap.data.journals.filter(
      (row) => row.data.sourceId === editedAutomaticInvoice.id && row.data.status === "Posted",
    ).length,
    1,
    "Editing a posted source record replaces its generated journal instead of blocking the edit",
  );
  const cascadeResult = await IA.Records.remove(automaticCustomer.id, { cascade: true });
  assert(
    cascadeResult.deletedCount >= 3,
    "Deleting a master record removes its linked source and journal records",
  );
  assert.strictEqual(
    await IA.Records.get(editedAutomaticInvoice.id),
    null,
    "Linked imported or manually added records are removed by confirmed cascade deletion",
  );
  const clearResult = await IA.Companies.clearData(automaticCompany.id);
  assert(
    clearResult.recordsRemoved > 0 && (await IA.Records.list(automaticCompany.id)).length === 0,
    "Clear company data removes records without deleting the company",
  );
  assert(
    await IA.Companies.get(automaticCompany.id),
    "The company remains after its data is cleared",
  );
  await IA.Accounting.provisionCompany(automaticCompany.id);
  automaticSnap = await IA.Records.snapshot(automaticCompany.id);
  assert(
    automaticSnap.data.accounts.length >= 30 && automaticSnap.data.accounting_periods.length === 12,
    "Cleared company can immediately receive a clean accounting foundation",
  );
  await IA.Companies.remove(automaticCompany.id);
  assert.strictEqual(
    await IA.Companies.get(automaticCompany.id),
    null,
    "Company deletion removes the company and all of its data",
  );

  const invoice = await IA.Records.save(company.id, "customer_invoices", {
    invoiceNumber: "INV-001",
    date: IA.Util.today(),
    dueDate: IA.Util.today(),
    customerCode: "CUS-001",
    productCode: "PROD-001",
    projectCode: "",
    description: "Ten test products",
    quantity: 10,
    unitPrice: 250,
    discountPercent: 0,
    taxCode: "VAT15",
    revenueAccount: "4000",
    costCentreCode: "",
    status: "Approved",
  });
  await IA.Accounting.autoPost(company.id, invoice);
  const bill = await IA.Records.save(company.id, "supplier_bills", {
    billNumber: "BILL-001",
    date: IA.Util.today(),
    dueDate: IA.Util.today(),
    supplierCode: "SUP-001",
    description: "Monthly rent",
    amountExclTax: 1000,
    taxCode: "VAT15",
    debitAccount: "6100",
    costCentreCode: "",
    productCode: "",
    projectCode: "",
    status: "Approved",
  });
  await IA.Accounting.autoPost(company.id, bill);
  const receipt = await IA.Records.save(company.id, "receipts", {
    receiptNumber: "RCT-001",
    date: IA.Util.today(),
    customerCode: "CUS-001",
    invoiceNumber: "INV-001",
    bankAccountCode: "BANK-001",
    amount: 1000,
    reference: "BANK-RCT",
    status: "Posted",
  });
  await IA.Accounting.autoPost(company.id, receipt);
  await IA.Accounting.autoPost(company.id, receipt);

  snap = await IA.Records.snapshot(company.id);
  assert.strictEqual(
    snap.data.journals.length,
    3,
    "Source documents generated three journals and repeated posting did not duplicate them",
  );
  snap.data.journals.forEach((journal) =>
    assert.strictEqual(
      amount(IA.Util.sum(journal.data.lines, (line) => line.debit)),
      amount(IA.Util.sum(journal.data.lines, (line) => line.credit)),
      `${journal.data.journalNumber} balances`,
    ),
  );
  const tb = IA.Accounting.trialBalance(snap);
  assert.strictEqual(
    amount(IA.Util.sum(tb, (row) => row.debit)),
    amount(IA.Util.sum(tb, (row) => row.credit)),
    "Trial balance debits equal credits",
  );
  assert.strictEqual(
    IA.Accounting.diagnostics(snap).trialBalanceDifference,
    0,
    "Accounting diagnostics confirm zero trial-balance difference",
  );

  const pnl = IA.Accounting.incomeStatement(snap, {
    from: `${IA.Util.month(IA.Util.today())}-01`,
    to: `${IA.Util.month(IA.Util.today())}-31`,
  });
  assert.strictEqual(
    pnl.revenue,
    2500,
    "Income statement recognises invoice revenue excluding tax",
  );
  assert.strictEqual(
    pnl.expenses,
    1000,
    "Income statement recognises supplier expense excluding recoverable tax",
  );
  const ar = IA.Accounting.aging(snap, "receivables");
  assert.strictEqual(
    ar.total,
    1875,
    "Receivables aging deducts linked receipt from tax-inclusive invoice",
  );
  let sourceLock = "";
  try {
    await IA.Records.save(
      company.id,
      "customer_invoices",
      Object.assign({}, invoice.data, { unitPrice: 251 }),
      invoice,
    );
  } catch (error) {
    sourceLock = error.message;
  }
  assert(
    /Reverse that journal/i.test(sourceLock),
    "Posted source records cannot be silently edited",
  );
  let deleteLock = "";
  try {
    await IA.Records.remove(invoice.id);
  } catch (error) {
    deleteLock = error.message;
  }
  assert(/cannot be deleted/i.test(deleteLock), "Posted source records cannot be deleted");

  const costing = IA.Managerial.productCosts(snap);
  assert.strictEqual(costing.rows.length, 1, "Product cost card generated");
  assert.strictEqual(costing.rows[0].materialCost, 84, "Wastage-adjusted material cost calculated");
  assert.strictEqual(costing.rows[0].labourCost, 40, "Labour cost calculated");
  assert.strictEqual(
    costing.rows[0].equipmentCost,
    6.25,
    "Owned equipment operating and depreciation cost calculated",
  );
  assert(
    costing.rows[0].overheadPerUnit > 0,
    "Salaries and recurring costs are automatically allocated as overhead",
  );
  const price = IA.Managerial.pricing(snap).rows[0];
  assert(price.recommendedPrice >= price.fullCost, "Recommended price covers full cost");
  const be = IA.Managerial.breakEven(snap);
  assert(
    be.monthlyFixedCosts >= 19500,
    "Break-even includes indirect salary and recurring expense",
  );

  const report = await IA.Reports.prepare("income-statement", company, snap, {});
  assert.strictEqual(
    report.title,
    "Statement of Profit or Loss",
    "Financial statement report generated",
  );
  assert(report.tables.length >= 3, "Income statement has report sections");
  const management = await IA.Reports.prepare("management-summary", company, snap, {});
  assert(management.kpis.length >= 6, "Plain-language management summary generated");
  load("assets/vendor/exceljs.min.js");
  load("assets/vendor/docx.iife.js");
  load("assets/vendor/jspdf.umd.min.js");
  load("assets/vendor/jspdf.plugin.autotable.min.js");
  window.HTMLAnchorElement.prototype.click = () => {};
  IA.Util.download = () => {};
  await IA.Reports.exportExcel(report);
  window.docx.Packer.toBlob = async () => new window.Blob(["word-export-test"]);
  await IA.Reports.exportWord(report);
  window.jspdf.jsPDF.prototype.save = function save() {
    return this;
  };
  IA.Reports.exportPdf(report);
  assert(
    window.ExcelJS && window.docx && window.jspdf,
    "Excel, Word and PDF report exporters execute with packaged libraries",
  );

  let periodError = "";
  const period = snap.data.accounting_periods.find(
    (row) => row.data.period === IA.Util.month(IA.Util.today()),
  );
  await IA.Records.save(
    company.id,
    "accounting_periods",
    Object.assign({}, period.data, {
      status: "Closed",
      closedBy: "Test",
      closedAt: new Date().toISOString(),
    }),
    period,
  );
  snap = await IA.Records.snapshot(company.id);
  try {
    IA.Accounting.assertOpenPeriod(snap, IA.Util.today());
  } catch (error) {
    periodError = error.message;
  }
  assert(/closed/i.test(periodError), "Closed periods prevent posting");

  load("assets/js/app.js");
  await new Promise((resolve) => setTimeout(resolve, 80));
  assert(window.document.querySelector(".sidebar"), "Application shell renders");
  assert(
    /What your business needs to know/.test(window.document.getElementById("main").textContent),
    "Managerial dashboard renders from live accounting data",
  );
  window.document.querySelector('[data-action="quick-add"]').click();
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert(window.document.querySelector(".modal-layer"), "Quick-add modal opens");
  window.document.querySelector(".modal-layer").click();
  assert(window.document.querySelector(".modal-layer"), "Clicking outside does not close a modal");
  window.document.dispatchEvent(
    new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );
  assert(window.document.querySelector(".modal-layer"), "Escape does not close a modal");
  window.document.querySelector("[data-close-modal]").click();
  assert(!window.document.querySelector(".modal-layer"), "Top-right close button closes a modal");

  window.document.querySelector('[data-route="companies"]').click();
  await new Promise((resolve) => setTimeout(resolve, 30));
  window.document.querySelector('[data-action="add-company"]').click();
  await new Promise((resolve) => setTimeout(resolve, 10));
  window.document.querySelector("[data-company-submit]").click();
  assert(
    !window.document.getElementById("modal-feedback").hidden,
    "Company form shows a visible required-field explanation",
  );
  const companyForm = window.document.getElementById("company-form");
  companyForm.elements.legalName.value = "COURSEMACCON BUSINESS SOLUTIONS (PTY) LTD";
  companyForm.elements.legalName.dispatchEvent(new window.Event("input", { bubbles: true }));
  companyForm.elements.registrationNumber.value = "2023 / 134341 / 07";
  assert.strictEqual(
    companyForm.elements.companyCode.value,
    "COURSEMACC",
    "Company code is visibly generated from the legal name",
  );
  window.document.querySelector("[data-company-submit]").click();
  const companyDeadline = Date.now() + 5000;
  let interfaceCompany;
  while (Date.now() < companyDeadline) {
    interfaceCompany = (await IA.Companies.list()).find(
      (row) => row.legalName === "COURSEMACCON BUSINESS SOLUTIONS (PTY) LTD",
    );
    if (interfaceCompany && !window.document.querySelector(".modal-layer")) break;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert(
    interfaceCompany,
    "Create and Prepare Company button creates the company through the interface",
  );
  const interfaceSnap = await IA.Records.snapshot(interfaceCompany.id);
  assert(
    interfaceSnap.data.accounts.length >= 30 && interfaceSnap.data.accounting_periods.length === 12,
    "Company button also prepares the accounting foundation",
  );

  window.document.querySelector('[data-action="quick-add"]').click();
  await new Promise((resolve) => setTimeout(resolve, 10));
  window.document.querySelector('[data-action="quick-choice:products"]').click();
  await new Promise((resolve) => setTimeout(resolve, 10));
  const productForm = window.document.getElementById("record-form");
  productForm.elements.name.value = "Interface Test Service";
  productForm.elements.unit.value = "service";
  window.document.querySelector('[data-action="submit-form:record-form"]').click();
  const productDeadline = Date.now() + 3000;
  while (
    Date.now() < productDeadline &&
    !(await IA.Records.list(interfaceCompany.id, "products")).length
  )
    await new Promise((resolve) => setTimeout(resolve, 50));
  assert.strictEqual(
    (await IA.Records.list(interfaceCompany.id, "products")).length,
    1,
    "Generic Save button works through the interface",
  );
  window.document.querySelector('[data-route="register:products"]').click();
  await new Promise((resolve) => setTimeout(resolve, 40));
  assert(
    window.document.querySelector(
      `[data-action="edit:products:${(await IA.Records.list(interfaceCompany.id, "products"))[0].id}"]`,
    ),
    "Every register row exposes an Edit action",
  );
  assert(
    window.document.querySelector(
      `[data-action="delete:products:${(await IA.Records.list(interfaceCompany.id, "products"))[0].id}"]`,
    ),
    "Every deletable register row exposes a Delete action",
  );
  window.document.querySelector('[data-route="companies"]').click();
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert(
    window.document.querySelector(`[data-action="clear-company:${interfaceCompany.id}"]`),
    "Administration exposes Clear data for each company",
  );
  assert(
    window.document.querySelector(`[data-action="delete-company:${interfaceCompany.id}"]`),
    "Administration exposes Delete company for each company",
  );

  window.document.querySelector('[data-action="switch-view"]').click();
  await new Promise((resolve) => setTimeout(resolve, 80));
  assert(
    /Financial control centre/.test(window.document.getElementById("main").textContent),
    "Accounting-view switch and financial dashboard button path work",
  );
  assert(
    /--navy:\s*#5e0a0a/.test(fs.readFileSync(path.join(root, "assets/css/app.css"), "utf8")),
    "The primary application theme is #5e0a0a and white",
  );

  async function auditVisibleRoutes(viewName) {
    const routes = [
      ...new Set(
        Array.from(
          window.document.querySelectorAll(".sidebar [data-route]"),
          (node) => node.dataset.route,
        ),
      ),
    ];
    for (const route of routes) {
      const node = window.document.querySelector(`.sidebar [data-route="${route}"]`);
      node.click();
      const routeDeadline = Date.now() + 1500;
      while (Date.now() < routeDeadline && window.document.querySelector("#main .loading"))
        await new Promise((resolve) => setTimeout(resolve, 10));
      assert(
        !/could not be prepared/i.test(window.document.getElementById("main").textContent),
        `${viewName} route ${route} renders without an action error`,
      );
    }
    return routes.length;
  }
  const financialRouteCount = await auditVisibleRoutes("Financial Accounting");
  window.document.querySelector('[data-action="switch-view"]').click();
  await new Promise((resolve) => setTimeout(resolve, 60));
  const managerialRouteCount = await auditVisibleRoutes("Cost & Managerial Accounting");
  assert(
    financialRouteCount >= 20 && managerialRouteCount >= 20,
    "All visible navigation buttons in both accounting views were exercised",
  );

  window.document.querySelector('[data-action="switch-view"]').click();
  await new Promise((resolve) => setTimeout(resolve, 60));
  window.document.querySelector('[data-action="quick-add"]').click();
  await new Promise((resolve) => setTimeout(resolve, 10));
  window.document.querySelector('[data-action="quick-choice:journals"]').click();
  await new Promise((resolve) => setTimeout(resolve, 20));
  const journalForm = window.document.getElementById("journal-form"),
    journalRows = journalForm.querySelectorAll("#journal-lines tr");
  journalForm.elements.reference.value = "UI-CONTROL";
  journalForm.elements.description.value = "Interface journal control test";
  journalForm.elements.status.value = "Draft";
  journalRows[0].querySelector('[name="accountCode"]').value = "1010";
  journalRows[0].querySelector('[name="debit"]').value = "100";
  journalRows[1].querySelector('[name="accountCode"]').value = "3000";
  journalRows[1].querySelector('[name="credit"]').value = "100";
  window.document.querySelector('[data-action="submit-form:journal-form"]').click();
  const journalDeadline = Date.now() + 3000;
  while (
    Date.now() < journalDeadline &&
    !(await IA.Records.list(interfaceCompany.id, "journals")).some(
      (row) => row.data.reference === "UI-CONTROL",
    )
  )
    await new Promise((resolve) => setTimeout(resolve, 50));
  assert(
    (await IA.Records.list(interfaceCompany.id, "journals")).some(
      (row) => row.data.reference === "UI-CONTROL",
    ),
    "Create Journal button works through the interface",
  );

  load("assets/vendor/xlsx.full.min.js");
  const importInput = window.document.createElement("input");
  importInput.id = "import-file";
  const sampleWorkbookPath = path.join(
    root,
    "training-pack/Integrated_Accounting_Sample_Data.xlsx",
  );
  const sampleWorkbookSize = fs.statSync(sampleWorkbookPath).size;
  assert(sampleWorkbookSize > 100000, "Packaged Excel sample is a complete workbook before import");
  const sampleBytes = fs.readFileSync(sampleWorkbookPath);
  const browserBytes = new window.Uint8Array(sampleBytes.length);
  browserBytes.set(sampleBytes);
  // Use a test-only upload name so browser download shims can never collide with
  // or truncate the release workbook while exercising the import controller.
  const sampleFile = {
    name: "iap-import-control.xlsx",
    arrayBuffer: async () => browserBytes.buffer,
  };
  Object.defineProperty(importInput, "files", { value: [sampleFile] });
  window.document.body.appendChild(importInput);
  importInput.dispatchEvent(new window.Event("change", { bubbles: true }));
  const deadline = Date.now() + 15000;
  let demoCompany;
  while (Date.now() < deadline) {
    demoCompany = (await IA.Companies.list()).find(
      (row) => row.legalName === "Kopano Office Solutions (Pty) Ltd",
    );
    if (
      demoCompany &&
      window.document.getElementById("import-results") &&
      /Import result/i.test(window.document.getElementById("import-results").textContent)
    )
      break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert(
    demoCompany,
    "Excel Company sheet automatically creates a missing company without a Company Code",
  );
  const demoSnap = await IA.Records.snapshot(demoCompany.id);
  assert.strictEqual(
    demoSnap.data.products.length,
    2,
    "Excel importer assigns products to the new company",
  );
  assert(
    demoSnap.data.materials.length >= 3 && demoSnap.data.product_materials.length >= 3,
    "Excel importer assigns linked costing data",
  );
  assert.strictEqual(
    demoSnap.data.bank_transactions.length,
    1,
    "Locked unused Transaction ID rows are ignored during Excel import",
  );
  assert.strictEqual(
    demoSnap.data.bank_transactions[0].data.transactionId,
    "TRAN-001",
    "Excel bank transaction keeps the locked generated TRAN number",
  );
  assert(
    demoSnap.data.journals.length >= 10,
    "Eligible Excel source documents automatically post balanced journals",
  );
  assert.strictEqual(
    IA.Accounting.diagnostics(demoSnap).trialBalanceDifference,
    0,
    "Imported company ledger remains balanced",
  );
  assert.strictEqual(
    fs.statSync(sampleWorkbookPath).size,
    sampleWorkbookSize,
    "Import test leaves the packaged Excel sample unchanged",
  );

  const codeFreeWorkbook = window.XLSX.utils.book_new();
  window.XLSX.utils.book_append_sheet(
    codeFreeWorkbook,
    window.XLSX.utils.aoa_to_sheet([
      ["legalName*", "currency"],
      ["No Code Import Company", "ZAR"],
    ]),
    "Company",
  );
  window.XLSX.utils.book_append_sheet(
    codeFreeWorkbook,
    window.XLSX.utils.aoa_to_sheet([
      ["name*", "type", "unit*", "status"],
      ["Code-free Product", "Product", "each", "Active"],
    ]),
    "products",
  );
  window.XLSX.utils.book_append_sheet(
    codeFreeWorkbook,
    window.XLSX.utils.aoa_to_sheet([
      ["name*", "unit*", "standardCost*", "status"],
      ["Code-free Material", "sheet", 125, "Active"],
    ]),
    "materials",
  );
  window.XLSX.utils.book_append_sheet(
    codeFreeWorkbook,
    window.XLSX.utils.aoa_to_sheet([
      ["productCode*", "materialCode*", "quantityPerUnit*", "status"],
      ["Code-free Product", "Code-free Material", 2, "Active"],
    ]),
    "product_materials",
  );
  window.XLSX.utils.book_append_sheet(
    codeFreeWorkbook,
    window.XLSX.utils.aoa_to_sheet([
      ["date*", "description*", "debit", "credit"],
      [IA.Util.today(), "Code-free bank charge", 35, 0],
    ]),
    "bank_transactions",
  );
  const codeFreeBytes = window.XLSX.write(codeFreeWorkbook, { bookType: "xlsx", type: "array" });
  const codeFreeInput = window.document.createElement("input");
  codeFreeInput.id = "import-file";
  Object.defineProperty(codeFreeInput, "files", {
    value: [{ name: "code-free-import.xlsx", arrayBuffer: async () => codeFreeBytes }],
  });
  window.document.body.appendChild(codeFreeInput);
  codeFreeInput.dispatchEvent(new window.Event("change", { bubbles: true }));
  const codeFreeDeadline = Date.now() + 12000;
  let codeFreeCompany, codeFreeSnap;
  while (Date.now() < codeFreeDeadline) {
    codeFreeCompany = (await IA.Companies.list()).find(
      (row) => row.legalName === "No Code Import Company",
    );
    if (codeFreeCompany) {
      codeFreeSnap = await IA.Records.snapshot(codeFreeCompany.id);
      if (codeFreeSnap.data.product_materials.length && codeFreeSnap.data.bank_transactions.length)
        break;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert(
    codeFreeCompany && codeFreeSnap,
    "Workbook without any code columns creates its company and records",
  );
  assert.strictEqual(
    codeFreeSnap.data.products[0].data.code,
    "PROD-001",
    "First code-free product receives PROD-001",
  );
  assert.strictEqual(
    codeFreeSnap.data.materials[0].data.code,
    "MAT-001",
    "First code-free material receives MAT-001",
  );
  assert.strictEqual(
    codeFreeSnap.data.product_materials[0].data.code,
    "PM-001",
    "First code-free product requirement receives PM-001",
  );
  assert.strictEqual(
    codeFreeSnap.data.product_materials[0].data.productCode,
    "PROD-001",
    "Product relationship is resolved from the product name",
  );
  assert.strictEqual(
    codeFreeSnap.data.product_materials[0].data.materialCode,
    "MAT-001",
    "Material relationship is resolved from the material name",
  );
  assert.strictEqual(
    codeFreeSnap.data.bank_transactions[0].data.transactionId,
    "TRAN-001",
    "First code-free bank transaction receives TRAN-001",
  );
  assert.strictEqual(
    codeFreeSnap.data.bank_transactions[0].data.bankAccountCode,
    "BANK-001",
    "The only bank account is assigned automatically when its code is omitted",
  );

  console.log(
    "PASS: accounting engines, automatic IDs, code-free linked Excel import, record edit/delete, company clear/delete, Excel/PDF/Word reports, period controls, #5e0a0a theme, company setup, manual journals, both-view navigation and modal controls",
  );
}

main()
  .then(() => window.close())
  .catch((error) => {
    window.close();
    console.error(error);
    process.exitCode = 1;
  });
