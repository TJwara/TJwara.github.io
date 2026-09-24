/* Double-entry accounting engine. Reads a company snapshot and creates balanced journal entries.
   Financial reports consume posted journals; source-document posting must remain consistent with them. */
(() => {
  "use strict";
  const IA = window.IAP;
  const U = IA.Util;
  const round = (value) => Math.round((U.number(value) + Number.EPSILON) * 100) / 100;
  const D = (accountCode, amount, dimensions = {}) =>
    Object.assign({ accountCode, debit: round(amount), credit: 0 }, dimensions);
  const C = (accountCode, amount, dimensions = {}) =>
    Object.assign({ accountCode, debit: 0, credit: round(amount) }, dimensions);
  const rowData = (row) => (row && row.data ? row.data : row || {});
  const active = (row) => rowData(row).status !== "Inactive";

  // Initial chart provisioned for a new company; codes are referenced by posting rules below.
  const DEFAULT_ACCOUNTS = [
    ["1000", "Cash and cash equivalents", "Asset", "Current assets", "Cash", false],
    ["1010", "Main bank account", "Asset", "Current assets", "Cash", true],
    ["1020", "Petty cash", "Asset", "Current assets", "Cash", true],
    ["1100", "Trade receivables", "Asset", "Current assets", "Operating", true, true],
    ["1200", "Inventory", "Asset", "Current assets", "Operating", true, true],
    ["1300", "Input VAT / tax receivable", "Asset", "Current assets", "Operating", true, true],
    ["1400", "Prepayments", "Asset", "Current assets", "Operating", true],
    ["1500", "Property, plant and equipment", "Asset", "Non-current assets", "Investing", true],
    ["1510", "Accumulated depreciation", "Asset", "Non-current assets", "Investing", true],
    ["2000", "Trade payables", "Liability", "Current liabilities", "Operating", true, true],
    [
      "2100",
      "Output VAT / tax payable",
      "Liability",
      "Current liabilities",
      "Operating",
      true,
      true,
    ],
    [
      "2200",
      "Payroll and statutory liabilities",
      "Liability",
      "Current liabilities",
      "Operating",
      true,
    ],
    ["2300", "Accrued expenses", "Liability", "Current liabilities", "Operating", true],
    ["2400", "Loans and borrowings", "Liability", "Non-current liabilities", "Financing", true],
    ["2500", "Shareholder loans", "Liability", "Non-current liabilities", "Financing", true],
    ["3000", "Owner capital / share capital", "Equity", "Contributed capital", "Financing", true],
    ["3100", "Retained earnings", "Equity", "Retained earnings", "Financing", true],
    ["3200", "Drawings and dividends", "Equity", "Distributions", "Financing", true],
    ["4000", "Product sales", "Revenue", "Revenue", "Operating", true],
    ["4100", "Service revenue", "Revenue", "Revenue", "Operating", true],
    ["4900", "Other income", "Revenue", "Other income", "Operating", true],
    ["5000", "Cost of sales", "Cost of Sales", "Cost of sales", "Operating", true],
    ["5100", "Materials consumed", "Cost of Sales", "Direct materials", "Operating", true],
    ["5200", "Direct labour", "Cost of Sales", "Direct labour", "Operating", true],
    [
      "5300",
      "Production and service overheads",
      "Cost of Sales",
      "Production overhead",
      "Operating",
      true,
    ],
    ["6000", "Salaries and wages", "Expense", "Employee costs", "Operating", true],
    ["6100", "Rent and occupancy", "Expense", "Occupancy", "Operating", true],
    ["6200", "Utilities", "Expense", "Utilities", "Operating", true],
    ["6300", "Depreciation", "Expense", "Depreciation", "Operating", true],
    ["6400", "Finance costs and interest", "Expense", "Finance costs", "Financing", true],
    ["6500", "Bank charges", "Expense", "Bank charges", "Operating", true],
    ["6600", "General and administrative expenses", "Expense", "Administration", "Operating", true],
    ["6700", "Selling and distribution expenses", "Expense", "Selling costs", "Operating", true],
    ["6999", "Suspense and clearing", "Asset", "Current assets", "Operating", true],
  ];

  function byCode(rows, code) {
    return (
      (rows || []).find(
        (row) => String(rowData(row).code || "").toUpperCase() === String(code || "").toUpperCase(),
      ) || null
    );
  }

  function accounts(snap) {
    return (snap.data.accounts || []).filter(active);
  }
  function journals(snap, postedOnly = true) {
    return (snap.data.journals || []).filter((row) => !postedOnly || row.data.status === "Posted");
  }
  function bankLedger(snap, bankCode) {
    const bank = byCode(snap.data.bank_accounts, bankCode);
    if (!bank) throw new Error(`Bank account ${bankCode || ""} was not found.`);
    return bank.data.ledgerAccount;
  }
  function tax(snap, code) {
    const record = byCode(snap.data.tax_codes, code);
    return record
      ? record.data
      : { code: "NO-VAT", rate: 0, inputAccount: "1300", outputAccount: "2100" };
  }
  function dimensions(data) {
    return {
      costCentreCode: data.costCentreCode || "",
      productCode: data.productCode || "",
      projectCode: data.projectCode || "",
      customerCode: data.customerCode || "",
      supplierCode: data.supplierCode || "",
    };
  }

  // Create required accounts, tax codes, periods and bank setup only when absent.
  async function provisionCompany(companyId) {
    const company = await IA.Companies.get(companyId);
    if (!company) throw new Error("The company could not be found.");
    let snap = await IA.Records.snapshot(companyId);
    if (!(snap.data.accounts || []).length) {
      for (const account of DEFAULT_ACCOUNTS) {
        await IA.Records.internalSave(
          companyId,
          "accounts",
          {
            code: account[0],
            name: account[1],
            type: account[2],
            subtype: account[3],
            parentCode: "",
            statementSection: account[3],
            cashFlowClass: account[4],
            allowPosting: account[5],
            controlAccount: !!account[6],
            status: "Active",
          },
          null,
          "system: standard chart of accounts",
        );
      }
    }
    snap = await IA.Records.snapshot(companyId);
    if (!(snap.data.tax_codes || []).length) {
      const rate = company.vatRegistered ? U.number(company.vatRate, 15) : 0;
      const codes = [
        {
          code: `VAT${String(rate).replace(/\D/g, "") || "0"}`,
          name: `Standard tax ${rate}%`,
          rate,
          inputAccount: "1300",
          outputAccount: "2100",
          effectiveFrom: `${new Date().getFullYear()}-01-01`,
          status: "Active",
        },
        {
          code: "ZERO",
          name: "Zero-rated",
          rate: 0,
          inputAccount: "1300",
          outputAccount: "2100",
          effectiveFrom: `${new Date().getFullYear()}-01-01`,
          status: "Active",
        },
        {
          code: "NO-VAT",
          name: "No tax",
          rate: 0,
          inputAccount: "",
          outputAccount: "",
          effectiveFrom: `${new Date().getFullYear()}-01-01`,
          status: "Active",
        },
      ];
      for (const item of codes)
        await IA.Records.internalSave(
          companyId,
          "tax_codes",
          item,
          null,
          "system: standard tax codes",
        );
    }
    snap = await IA.Records.snapshot(companyId);
    if (!(snap.data.accounting_periods || []).length) {
      const year = new Date().getFullYear();
      for (let month = 0; month < 12; month += 1) {
        const mm = String(month + 1).padStart(2, "0");
        const last = String(new Date(Date.UTC(year, month + 1, 0)).getUTCDate()).padStart(2, "0");
        await IA.Records.internalSave(
          companyId,
          "accounting_periods",
          {
            period: `${year}-${mm}`,
            startDate: `${year}-${mm}-01`,
            endDate: `${year}-${mm}-${last}`,
            status: "Open",
            closedBy: "",
            closedAt: "",
          },
          null,
          "system: accounting calendar",
        );
      }
    }
    snap = await IA.Records.snapshot(companyId);
    if (!(snap.data.bank_accounts || []).length) {
      await IA.Records.internalSave(
        companyId,
        "bank_accounts",
        {
          code: "BANK-001",
          name: "Main bank account",
          bankName: "",
          accountNumber: "",
          accountType: "Current",
          ledgerAccount: "1010",
          openingDate: U.today(),
          openingBalance: 0,
          creditLimit: 0,
          status: "Active",
        },
        null,
        "system: starter bank account",
      );
    }
    await IA.Audit.log(
      companyId,
      "Provisioned",
      "financial_accounting",
      companyId,
      "Standard chart, tax codes, accounting periods and bank register created",
    );
    return IA.Records.snapshot(companyId);
  }

  function periodRecord(snap, date) {
    const month = U.month(date);
    return (snap.data.accounting_periods || []).find((row) => row.data.period === month) || null;
  }
  // Never post into a closed accounting period.
  function assertOpenPeriod(snap, date) {
    const period = periodRecord(snap, date);
    if (period && period.data.status === "Closed")
      throw new Error(
        `${period.data.period} is closed. Reopen it or post a reversing adjustment in an open period.`,
      );
    return period;
  }
  // Enforce valid posting accounts and equal debit/credit totals before saving.
  function validateLines(snap, lines) {
    if (!Array.isArray(lines) || lines.length < 2)
      throw new Error("A journal needs at least two lines.");
    const chart = new Map(accounts(snap).map((row) => [row.data.code, row.data]));
    let debit = 0,
      credit = 0;
    lines.forEach((line, index) => {
      const account = chart.get(line.accountCode);
      if (!account)
        throw new Error(
          `Journal line ${index + 1} uses an unknown or inactive account (${line.accountCode || "blank"}).`,
        );
      if (!account.allowPosting)
        throw new Error(`${account.code} ${account.name} does not allow direct posting.`);
      const dr = round(line.debit),
        cr = round(line.credit);
      if (dr < 0 || cr < 0 || (dr && cr) || (!dr && !cr))
        throw new Error(`Journal line ${index + 1} must contain one positive debit or credit.`);
      debit += dr;
      credit += cr;
    });
    if (Math.abs(debit - credit) > 0.005)
      throw new Error(`Journal is out of balance by ${round(debit - credit)}.`);
    return { debit: round(debit), credit: round(credit) };
  }

  async function nextJournalNumber(companyId) {
    return IA.Records.suggestCode(companyId, "journals");
  }

  // Validate and save a journal with its audit details.
  async function createJournal(companyId, data, options = {}) {
    let snap = await IA.Records.snapshot(companyId);
    assertOpenPeriod(snap, data.date);
    const lines = (data.lines || []).map((line) => ({
      accountCode: String(line.accountCode || "").trim(),
      debit: round(line.debit),
      credit: round(line.credit),
      description: String(line.description || data.description || "").trim(),
      costCentreCode: line.costCentreCode || "",
      productCode: line.productCode || "",
      projectCode: line.projectCode || "",
      customerCode: line.customerCode || "",
      supplierCode: line.supplierCode || "",
    }));
    validateLines(snap, lines);
    let existing = options.existing || null;
    if (!existing && data.sourceType && data.sourceId) {
      existing =
        (snap.data.journals || []).find(
          (row) =>
            row.data.sourceType === data.sourceType &&
            row.data.sourceId === data.sourceId &&
            row.data.status !== "Reversed",
        ) || null;
    }
    if (existing && existing.data.status === "Reversed")
      throw new Error("A reversed journal cannot be edited.");
    if (existing) assertOpenPeriod(snap, existing.data.date);
    const status = options.post === false ? "Draft" : "Posted";
    const row = await IA.Records.save(
      companyId,
      "journals",
      {
        journalNumber: existing
          ? existing.data.journalNumber
          : data.journalNumber || (await nextJournalNumber(companyId)),
        date: data.date,
        period: U.month(data.date),
        reference: data.reference || data.sourceType || "Journal",
        description: data.description || data.reference || "Journal entry",
        sourceType: data.sourceType || "Manual journal",
        sourceId: data.sourceId || "",
        lines,
        status,
        postedAt: status === "Posted" ? new Date().toISOString() : "",
        reversalOf: data.reversalOf || "",
      },
      existing,
      data.sourceType ? `automatic posting: ${data.sourceType}` : "manual journal",
    );
    return row;
  }

  // Reverse a posted entry with an opposite journal instead of mutating history.
  async function reverseJournal(
    companyId,
    journalId,
    reversalDate = U.today(),
    reason = "Journal reversal",
  ) {
    const original = await IA.Records.get(journalId);
    if (!original || original.type !== "journals") throw new Error("Journal not found.");
    if (original.data.status !== "Posted")
      throw new Error("Only a posted journal can be reversed.");
    const reversed = await createJournal(companyId, {
      date: reversalDate,
      reference: `REV-${original.data.journalNumber}`,
      description: `${reason}: ${original.data.description}`,
      sourceType: "Journal reversal",
      sourceId: original.id,
      lines: original.data.lines.map((line) =>
        Object.assign({}, line, { debit: line.credit, credit: line.debit }),
      ),
      reversalOf: original.data.journalNumber,
    });
    await IA.Records.internalSave(
      companyId,
      "journals",
      Object.assign({}, original.data, { status: "Reversed" }),
      original,
      "system: reversed",
    );
    await IA.Audit.log(companyId, "Reversed", "journals", original.id, reason);
    return reversed;
  }

  function sourceShouldPost(record) {
    const status = rowData(record).status;
    if (record.type === "bank_accounts")
      return status === "Active" && Math.abs(U.number(rowData(record).openingBalance)) > 0.005;
    if (record.type === "bank_transactions") return ["Ready to post", "Posted"].includes(status);
    if (["customer_invoices", "supplier_bills"].includes(record.type))
      return ["Approved", "Posted"].includes(status);
    return status === "Posted";
  }

  // Map supported invoices, bills and other source records into account movements.
  function sourceEntry(snap, record) {
    const x = record.data,
      dim = dimensions(x),
      type = record.type;
    let lines = [],
      description = "",
      reference = "",
      date = x.date || U.today();
    if (type === "bank_accounts") {
      const amount = U.number(x.openingBalance),
        ledger = x.ledgerAccount;
      if (!x.openingDate)
        throw new Error(
          "Enter the opening balance date before saving a non-zero bank opening balance.",
        );
      lines =
        amount >= 0
          ? [D(ledger, amount, dim), C("6999", amount, dim)]
          : [D("6999", Math.abs(amount), dim), C(ledger, Math.abs(amount), dim)];
      description = `Opening balance — ${x.name}`;
      reference = `${x.code}-OPENING`;
      date = x.openingDate;
    } else if (type === "customer_invoices") {
      const net = round(
        U.number(x.quantity) * U.number(x.unitPrice) * (1 - U.number(x.discountPercent) / 100),
      );
      const taxCode = tax(snap, x.taxCode),
        taxAmount = round((net * U.number(taxCode.rate)) / 100),
        gross = round(net + taxAmount);
      lines = [D("1100", gross, dim), C(x.revenueAccount || "4000", net, dim)];
      if (taxAmount) lines.push(C(taxCode.outputAccount || "2100", taxAmount, dim));
      description = `Customer invoice ${x.invoiceNumber}`;
      reference = x.invoiceNumber;
    } else if (type === "supplier_bills") {
      const net = round(x.amountExclTax),
        taxCode = tax(snap, x.taxCode),
        taxAmount = round((net * U.number(taxCode.rate)) / 100),
        gross = round(net + taxAmount);
      lines = [D(x.debitAccount, net, dim)];
      if (taxAmount) lines.push(D(taxCode.inputAccount || "1300", taxAmount, dim));
      lines.push(C("2000", gross, dim));
      description = `Supplier bill ${x.billNumber}`;
      reference = x.billNumber;
    } else if (type === "receipts") {
      lines = [D(bankLedger(snap, x.bankAccountCode), x.amount, dim), C("1100", x.amount, dim)];
      description = `Receipt ${x.receiptNumber}`;
      reference = x.reference || x.receiptNumber;
    } else if (type === "payments") {
      lines = [
        D(x.debitAccount || "2000", x.amount, dim),
        C(bankLedger(snap, x.bankAccountCode), x.amount, dim),
      ];
      description = `Payment ${x.paymentNumber}`;
      reference = x.reference || x.paymentNumber;
    } else if (type === "bank_transactions") {
      if (!x.counterAccount)
        throw new Error(
          "Choose the other general ledger account before posting this bank transaction.",
        );
      const ledger = bankLedger(snap, x.bankAccountCode),
        out = U.number(x.debit),
        incoming = U.number(x.credit);
      if ((out > 0 && incoming > 0) || (out <= 0 && incoming <= 0))
        throw new Error("A bank transaction must contain either money in or money out.");
      lines =
        out > 0
          ? [D(x.counterAccount, out, dim), C(ledger, out, dim)]
          : [D(ledger, incoming, dim), C(x.counterAccount, incoming, dim)];
      description = x.description;
      reference = x.reference || x.transactionId;
    } else if (type === "inventory_movements") {
      const material = byCode(snap.data.materials, x.materialCode),
        m = material ? material.data : {};
      const amount = round(
        U.number(x.quantity) * (U.number(x.unitCost) || U.number(m.standardCost)),
      );
      const inventory = m.inventoryAccount || "1200",
        usage = m.usageAccount || "5100";
      const increase = ["Opening", "Receipt", "Return", "Adjustment increase"].includes(x.type);
      lines = increase
        ? [D(inventory, amount, dim), C(x.type === "Receipt" ? "2000" : "6999", amount, dim)]
        : [D(usage, amount, dim), C(inventory, amount, dim)];
      description = `${x.type} ${x.movementNumber}`;
      reference = x.reference || x.movementNumber;
    } else if (type === "loan_payments") {
      const loan = byCode(snap.data.loans, x.loanCode);
      if (!loan) throw new Error(`Loan ${x.loanCode} was not found.`);
      const total = round(U.number(x.principal) + U.number(x.interest) + U.number(x.fees));
      lines = [D(loan.data.loanAccount || "2400", x.principal, dim)];
      if (U.number(x.interest)) lines.push(D(loan.data.interestAccount || "6400", x.interest, dim));
      if (U.number(x.fees)) lines.push(D("6500", x.fees, dim));
      lines.push(C(bankLedger(snap, x.bankAccountCode), total, dim));
      description = `Loan payment ${x.paymentNumber}`;
      reference = x.paymentNumber;
    } else if (type === "owner_transactions") {
      const amount = U.number(x.amount),
        ledger = bankLedger(snap, x.bankAccountCode),
        equity = x.equityOrLoanAccount;
      const inflow = ["Capital introduced", "Shareholder loan received"].includes(x.type);
      lines = inflow
        ? [D(ledger, amount, dim), C(equity, amount, dim)]
        : [D(equity, amount, dim), C(ledger, amount, dim)];
      description = `${x.type} — ${x.owner || "owner"}`;
      reference = x.transactionNumber;
    } else return null;
    return { date, reference, description, sourceType: type, sourceId: record.id, lines };
  }

  // Refresh generated journals when approved source records change.
  async function autoPost(companyId, record) {
    if (!record || !IA.Schemas.get(record.type).autoPost || !sourceShouldPost(record)) return null;
    const snap = await IA.Records.snapshot(companyId);
    const existingJournal = (snap.data.journals || []).find(
      (journal) => journal.data.sourceId === record.id && journal.data.status === "Posted",
    );
    if (existingJournal) return existingJournal;
    const entry = sourceEntry(snap, record);
    if (!entry) return null;
    const journal = await createJournal(companyId, entry);
    if (
      record.data.status !== "Posted" &&
      record.type !== "customer_invoices" &&
      record.type !== "supplier_bills"
    )
      return journal;
    return journal;
  }

  function allLines(snap, options = {}) {
    const from = options.from || "0000-01-01",
      to = options.to || "9999-12-31";
    const result = [];
    journals(snap, true).forEach((journal) => {
      if (journal.data.date < from || journal.data.date > to) return;
      (journal.data.lines || []).forEach((line, index) =>
        result.push(
          Object.assign({}, line, {
            journalId: journal.id,
            journalNumber: journal.data.journalNumber,
            date: journal.data.date,
            reference: journal.data.reference,
            journalDescription: journal.data.description,
            lineNumber: index + 1,
          }),
        ),
      );
    });
    return result;
  }

  function balanceFor(account, debit, credit) {
    return U.naturalSide(account.type) === "Debit" ? round(debit - credit) : round(credit - debit);
  }
  // Calculate posted debit and credit balances for the selected period.
  function trialBalance(snap, options = {}) {
    const map = new Map(
      accounts(snap).map((row) => [
        row.data.code,
        {
          code: row.data.code,
          name: row.data.name,
          type: row.data.type,
          debitMovement: 0,
          creditMovement: 0,
          debit: 0,
          credit: 0,
          balance: 0,
        },
      ]),
    );
    allLines(snap, options).forEach((line) => {
      const item = map.get(line.accountCode);
      if (!item) return;
      item.debitMovement += U.number(line.debit);
      item.creditMovement += U.number(line.credit);
    });
    map.forEach((item) => {
      item.balance = round(item.debitMovement - item.creditMovement);
      item.debit = item.balance > 0 ? item.balance : 0;
      item.credit = item.balance < 0 ? -item.balance : 0;
      item.debitMovement = round(item.debitMovement);
      item.creditMovement = round(item.creditMovement);
    });
    return Array.from(map.values())
      .filter((item) => options.includeZero || item.debit || item.credit)
      .sort((a, b) => a.code.localeCompare(b.code));
  }
  function generalLedger(snap, accountCode, options = {}) {
    const accountRow = byCode(snap.data.accounts, accountCode);
    if (!accountRow) return { account: null, rows: [], totalDebit: 0, totalCredit: 0, balance: 0 };
    const openingTo = options.from ? new Date(`${options.from}T00:00:00Z`) : null;
    let opening = 0;
    if (openingTo) {
      const end = new Date(openingTo.valueOf() - 864e5).toISOString().slice(0, 10);
      const openingLines = allLines(snap, { to: end }).filter(
        (line) => line.accountCode === accountCode,
      );
      opening = balanceFor(
        accountRow.data,
        U.sum(openingLines, (x) => x.debit),
        U.sum(openingLines, (x) => x.credit),
      );
    }
    let running = opening;
    const rows = allLines(snap, options)
      .filter((line) => line.accountCode === accountCode)
      .sort(
        (a, b) => a.date.localeCompare(b.date) || a.journalNumber.localeCompare(b.journalNumber),
      )
      .map((line) => {
        running +=
          U.naturalSide(accountRow.data.type) === "Debit"
            ? U.number(line.debit) - U.number(line.credit)
            : U.number(line.credit) - U.number(line.debit);
        return Object.assign({}, line, { runningBalance: round(running) });
      });
    return {
      account: accountRow.data,
      opening: round(opening),
      rows,
      totalDebit: round(U.sum(rows, (x) => x.debit)),
      totalCredit: round(U.sum(rows, (x) => x.credit)),
      balance: round(running),
    };
  }

  function accountTotals(snap, options = {}) {
    const chart = new Map(
      accounts(snap).map((row) => [
        row.data.code,
        Object.assign({}, row.data, { debit: 0, credit: 0, balance: 0 }),
      ]),
    );
    allLines(snap, options).forEach((line) => {
      const item = chart.get(line.accountCode);
      if (!item) return;
      item.debit += U.number(line.debit);
      item.credit += U.number(line.credit);
    });
    chart.forEach((item) => (item.balance = balanceFor(item, item.debit, item.credit)));
    return Array.from(chart.values());
  }
  function incomeStatement(snap, options = {}) {
    const rows = accountTotals(snap, options).filter((x) =>
      ["Revenue", "Cost of Sales", "Expense"].includes(x.type),
    );
    const revenue = round(
      U.sum(
        rows.filter((x) => x.type === "Revenue"),
        (x) => x.balance,
      ),
    );
    const costOfSales = round(
      U.sum(
        rows.filter((x) => x.type === "Cost of Sales"),
        (x) => x.balance,
      ),
    );
    const expenses = round(
      U.sum(
        rows.filter((x) => x.type === "Expense"),
        (x) => x.balance,
      ),
    );
    return {
      rows,
      revenue,
      costOfSales,
      grossProfit: round(revenue - costOfSales),
      expenses,
      netProfit: round(revenue - costOfSales - expenses),
    };
  }
  function financialPosition(snap, asOf = U.today()) {
    const totals = accountTotals(snap, { to: asOf });
    const assets = totals.filter((x) => x.type === "Asset"),
      liabilities = totals.filter((x) => x.type === "Liability"),
      equity = totals.filter((x) => x.type === "Equity");
    const profit = incomeStatement(snap, { to: asOf }).netProfit;
    const totalAssets = round(U.sum(assets, (x) => x.balance)),
      totalLiabilities = round(U.sum(liabilities, (x) => x.balance)),
      reportedEquity = round(U.sum(equity, (x) => x.balance));
    return {
      assets,
      liabilities,
      equity,
      currentProfit: profit,
      totalAssets,
      totalLiabilities,
      reportedEquity,
      totalEquity: round(reportedEquity + profit),
      difference: round(totalAssets - totalLiabilities - reportedEquity - profit),
    };
  }
  function cashFlow(snap, options = {}) {
    const chart = new Map(accounts(snap).map((row) => [row.data.code, row.data]));
    const cashCodes = new Set(
      accounts(snap)
        .filter((row) => row.data.cashFlowClass === "Cash")
        .map((row) => row.data.code),
    );
    const groups = { Operating: 0, Investing: 0, Financing: 0, Unclassified: 0 };
    journals(snap, true).forEach((journal) => {
      if (
        (options.from && journal.data.date < options.from) ||
        (options.to && journal.data.date > options.to)
      )
        return;
      const lines = journal.data.lines || [],
        cashLines = lines.filter((line) => cashCodes.has(line.accountCode));
      cashLines.forEach((cashLine) => {
        const cashMovement = U.number(cashLine.debit) - U.number(cashLine.credit);
        const counterpart = lines.find(
          (line) => line !== cashLine && !cashCodes.has(line.accountCode),
        );
        const account = counterpart && chart.get(counterpart.accountCode);
        const group =
          account && ["Operating", "Investing", "Financing"].includes(account.cashFlowClass)
            ? account.cashFlowClass
            : "Unclassified";
        groups[group] += cashMovement;
      });
    });
    Object.keys(groups).forEach((key) => (groups[key] = round(groups[key])));
    const before = options.from ? new Date(`${options.from}T00:00:00Z`) : null;
    const openingTo = before
      ? new Date(before.valueOf() - 864e5).toISOString().slice(0, 10)
      : "0000-01-01";
    const cashBalance = (to) =>
      round(
        U.sum(
          allLines(snap, { to }).filter((line) => cashCodes.has(line.accountCode)),
          (line) => U.number(line.debit) - U.number(line.credit),
        ),
      );
    const openingCash = before ? cashBalance(openingTo) : 0,
      netChange = round(
        groups.Operating + groups.Investing + groups.Financing + groups.Unclassified,
      );
    return { groups, openingCash, netChange, closingCash: round(openingCash + netChange) };
  }

  function invoiceAmount(snap, invoice) {
    const x = rowData(invoice),
      code = tax(snap, x.taxCode);
    const net =
      U.number(x.quantity) * U.number(x.unitPrice) * (1 - U.number(x.discountPercent) / 100);
    return round(net * (1 + U.number(code.rate) / 100));
  }
  function billAmount(snap, bill) {
    const x = rowData(bill),
      code = tax(snap, x.taxCode);
    return round(U.number(x.amountExclTax) * (1 + U.number(code.rate) / 100));
  }
  function aging(snap, kind, asOf = U.today()) {
    const isAR = kind === "receivables",
      documents = snap.data[isAR ? "customer_invoices" : "supplier_bills"] || [];
    const cash = snap.data[isAR ? "receipts" : "payments"] || [],
      partyKey = isAR ? "customerCode" : "supplierCode",
      linkKey = isAR ? "invoiceNumber" : "billNumber",
      numberKey = isAR ? "invoiceNumber" : "billNumber";
    const buckets = {
      Current: 0,
      "1–30 days": 0,
      "31–60 days": 0,
      "61–90 days": 0,
      "Over 90 days": 0,
    };
    const rows = documents
      .filter((row) => ["Approved", "Posted"].includes(row.data.status) && row.data.date <= asOf)
      .map((row) => {
        const x = row.data,
          gross = isAR ? invoiceAmount(snap, row) : billAmount(snap, row);
        const allocated = U.sum(
          cash.filter(
            (p) =>
              p.data.status === "Posted" && p.data[linkKey] === x[numberKey] && p.data.date <= asOf,
          ),
          (p) => p.data.amount,
        );
        const outstanding = round(gross - allocated),
          days = Math.max(0, U.daysBetween(x.dueDate || x.date, asOf));
        const bucket =
          days <= 0
            ? "Current"
            : days <= 30
              ? "1–30 days"
              : days <= 60
                ? "31–60 days"
                : days <= 90
                  ? "61–90 days"
                  : "Over 90 days";
        buckets[bucket] += Math.max(0, outstanding);
        return {
          number: x[numberKey],
          partyCode: x[partyKey],
          date: x.date,
          dueDate: x.dueDate,
          gross,
          allocated: round(allocated),
          outstanding,
          days,
          bucket,
        };
      })
      .filter((row) => row.outstanding > 0.005);
    Object.keys(buckets).forEach((key) => (buckets[key] = round(buckets[key])));
    return { rows, buckets, total: round(U.sum(rows, (row) => row.outstanding)) };
  }

  function bankSummary(snap, asOf = U.today()) {
    return (snap.data.bank_accounts || []).filter(active).map((row) => {
      const x = row.data,
        ledger = generalLedger(snap, x.ledgerAccount, { to: asOf });
      const unreconciled = (snap.data.bank_transactions || []).filter(
        (bt) => bt.data.bankAccountCode === x.code && !bt.data.reconciled && bt.data.date <= asOf,
      );
      return {
        code: x.code,
        name: x.name,
        ledgerAccount: x.ledgerAccount,
        balance: round(ledger.balance),
        unreconciledCount: unreconciled.length,
        unreconciledAmount: round(
          U.sum(unreconciled, (bt) => U.number(bt.data.credit) - U.number(bt.data.debit)),
        ),
      };
    });
  }
  function taxReport(snap, options = {}) {
    const lines = allLines(snap, options),
      inputCodes = new Set(
        (snap.data.tax_codes || []).map((r) => r.data.inputAccount).filter(Boolean),
      ),
      outputCodes = new Set(
        (snap.data.tax_codes || []).map((r) => r.data.outputAccount).filter(Boolean),
      );
    const inputTax = round(
      U.sum(
        lines.filter((line) => inputCodes.has(line.accountCode)),
        (line) => U.number(line.debit) - U.number(line.credit),
      ),
    );
    const outputTax = round(
      U.sum(
        lines.filter((line) => outputCodes.has(line.accountCode)),
        (line) => U.number(line.credit) - U.number(line.debit),
      ),
    );
    return {
      inputTax,
      outputTax,
      payable: round(outputTax - inputTax),
      lines: lines.filter(
        (line) => inputCodes.has(line.accountCode) || outputCodes.has(line.accountCode),
      ),
    };
  }
  function fixedAssetRegister(snap, asOf = U.today()) {
    const rows = (snap.data.fixed_assets || []).map((row) => {
      const x = row.data,
        months = Math.max(
          0,
          Math.min(
            U.number(x.usefulLifeYears) * 12,
            Math.floor(U.daysBetween(x.purchaseDate, asOf) / 30.4375),
          ),
        );
      const depreciable = Math.max(0, U.number(x.purchaseCost) - U.number(x.residualValue));
      let accumulated =
        x.method === "Reducing balance"
          ? U.number(x.purchaseCost) *
            (1 - Math.pow(1 - U.number(x.reducingRate) / 100, months / 12))
          : (depreciable * months) / (U.number(x.usefulLifeYears) * 12);
      accumulated = round(Math.min(depreciable, Math.max(0, accumulated)));
      return {
        code: x.assetCode,
        description: x.description,
        purchaseDate: x.purchaseDate,
        cost: U.number(x.purchaseCost),
        accumulatedDepreciation: accumulated,
        carryingAmount: round(U.number(x.purchaseCost) - accumulated),
        monthlyDepreciation: round(depreciable / (U.number(x.usefulLifeYears) * 12 || 1)),
        status: x.status,
      };
    });
    return {
      rows,
      cost: round(U.sum(rows, (x) => x.cost)),
      accumulatedDepreciation: round(U.sum(rows, (x) => x.accumulatedDepreciation)),
      carryingAmount: round(U.sum(rows, (x) => x.carryingAmount)),
    };
  }
  function loanRegister(snap) {
    const rows = (snap.data.loans || []).filter(active).map((row) => {
      const x = row.data,
        paid = U.sum(
          (snap.data.loan_payments || []).filter(
            (p) => p.data.loanCode === x.code && p.data.status === "Posted",
          ),
          (p) => p.data.principal,
        );
      const balance = round(U.number(x.openingBalance) - paid),
        monthlyRate = U.number(x.annualInterestRate) / 1200;
      const months = U.number(x.remainingMonths) || U.number(x.termMonths),
        calculatedPayment = monthlyRate
          ? (balance * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months))
          : balance / (months || 1);
      return {
        code: x.code,
        name: x.name,
        lender: x.lender,
        openingBalance: U.number(x.openingBalance),
        principalPaid: round(paid),
        balance,
        contractualInstalment: U.number(x.instalmentAmount),
        calculatedInstalment: round(calculatedPayment),
        monthsRemaining: months,
      };
    });
    return {
      rows,
      totalBalance: round(U.sum(rows, (x) => x.balance)),
      nextMonthlyInstalments: round(
        U.sum(rows, (x) => x.contractualInstalment || x.calculatedInstalment),
      ),
    };
  }

  // Surface integrity findings before users trust the generated statements.
  function diagnostics(snap) {
    const findings = [];
    journals(snap, false).forEach((journal) => {
      if (journal.data.status !== "Posted") return;
      const debit = round(U.sum(journal.data.lines, (line) => line.debit)),
        credit = round(U.sum(journal.data.lines, (line) => line.credit));
      if (Math.abs(debit - credit) > 0.005)
        findings.push({
          severity: "Critical",
          area: "Journal",
          message: `${journal.data.journalNumber} is out of balance by ${round(debit - credit)}.`,
        });
      const period = periodRecord(snap, journal.data.date);
      if (
        period &&
        period.data.status === "Closed" &&
        journal.updatedAt > (period.data.closedAt || "")
      )
        findings.push({
          severity: "Warning",
          area: "Period",
          message: `${journal.data.journalNumber} appears to have been changed after ${period.data.period} was closed.`,
        });
    });
    const tb = trialBalance(snap),
      difference = round(U.sum(tb, (x) => x.debit) - U.sum(tb, (x) => x.credit));
    if (Math.abs(difference) > 0.005)
      findings.push({
        severity: "Critical",
        area: "Trial balance",
        message: `Trial balance differs by ${difference}.`,
      });
    (snap.data.bank_transactions || [])
      .filter((row) => row.data.status === "Unclassified")
      .forEach((row) =>
        findings.push({
          severity: "Action",
          area: "Bank",
          message: `${row.data.transactionId || "Bank transaction"} still needs classification.`,
        }),
      );
    const ar = aging(snap, "receivables");
    if (ar.buckets["Over 90 days"] > 0)
      findings.push({
        severity: "Warning",
        area: "Receivables",
        message: `${ar.buckets["Over 90 days"]} is more than 90 days overdue.`,
      });
    return {
      findings,
      trialBalanceDifference: difference,
      balanced: Math.abs(difference) <= 0.005,
    };
  }

  IA.Accounting = {
    DEFAULT_ACCOUNTS,
    provisionCompany,
    periodRecord,
    assertOpenPeriod,
    validateLines,
    nextJournalNumber,
    createJournal,
    reverseJournal,
    autoPost,
    sourceEntry,
    allLines,
    trialBalance,
    generalLedger,
    incomeStatement,
    financialPosition,
    cashFlow,
    aging,
    bankSummary,
    taxReport,
    fixedAssetRegister,
    loanRegister,
    invoiceAmount,
    billAmount,
    diagnostics,
  };
})();
