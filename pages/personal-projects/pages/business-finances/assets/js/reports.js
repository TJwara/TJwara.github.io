/* Report catalogue and exports. prepare() builds report data from accounting/managerial snapshots;
   render() shows it, while the export functions create Excel, PDF and Word documents. */
(() => {
  "use strict";
  const IA = window.IAP,
    U = IA.Util;
  const round = (x) => Math.round((U.number(x) + Number.EPSILON) * 100) / 100;
  const currentMonth = () => U.month(U.today());
  const moneyColumns =
    /amount|balance|debit|credit|revenue|cost|profit|budget|actual|variance|sales|cash|payable|receivable|investment|npv|instalment|price|value/i;
  const pctColumns = /percent|margin|cpi|spi|irr|ratio/i;
  const display = (value, key, company) => {
    if (value == null || value === "") return "—";
    if (typeof value === "number" && pctColumns.test(key))
      return `${value.toLocaleString("en-ZA", { maximumFractionDigits: 2 })}${/ratio|cpi|spi/i.test(key) ? "" : "%"}`;
    if (typeof value === "number" && moneyColumns.test(key))
      return U.money(value, company.currency);
    if (typeof value === "number")
      return value.toLocaleString("en-ZA", { maximumFractionDigits: 2 });
    return String(value);
  };
  const columns = (pairs) => pairs.map(([key, label]) => ({ key, label }));
  const table = (title, cols, rows, note = "") => ({
    title,
    columns: columns(cols),
    rows: rows || [],
    note,
  });
  const kpi = (label, value, tone = "neutral") => ({ label, value, tone });

  // Public report keys, names and view groups used by navigation and export actions.
  const DEFINITIONS = [
    [
      "management-summary",
      "Management Summary",
      "Cost & Managerial Accounting",
      "The essential financial and operating signals in plain language.",
    ],
    [
      "product-costing",
      "Product & Service Costing",
      "Cost & Managerial Accounting",
      "Materials, labour, equipment, overhead, full cost and unit profit.",
    ],
    [
      "pricing",
      "Selling Price Recommendation",
      "Cost & Managerial Accounting",
      "Cost recovery, target-margin and profit-maximising price guidance.",
    ],
    [
      "overheads",
      "Automatic Overhead Allocation",
      "Cost & Managerial Accounting",
      "All indirect costs and the basis used to allocate them.",
    ],
    [
      "break-even",
      "Break-even & Margin of Safety",
      "Cost & Managerial Accounting",
      "Sales needed to cover salaries, rent, utilities and all other monthly costs.",
    ],
    [
      "budget-actual",
      "Budget vs Actual",
      "Cost & Managerial Accounting",
      "Approved budget compared with actual ledger results.",
    ],
    [
      "production-variance",
      "Production Cost Variances",
      "Cost & Managerial Accounting",
      "Material price/usage and labour rate/efficiency variances.",
    ],
    [
      "project-portfolio",
      "Project Cost & Schedule Control",
      "Cost & Managerial Accounting",
      "Planned value, earned value, actual cost and forecasts.",
    ],
    [
      "profitability",
      "Product Profitability",
      "Cost & Managerial Accounting",
      "Revenue, full cost, profit and margin by product or service.",
    ],
    [
      "inventory",
      "Inventory Valuation & Reorder",
      "Cost & Managerial Accounting",
      "Weighted-average stock value and replenishment signals.",
    ],
    [
      "working-capital",
      "Working Capital",
      "Cost & Managerial Accounting",
      "Cash, receivables, inventory, payables and liquidity.",
    ],
    [
      "cash-forecast",
      "12-Month Cash Forecast",
      "Cost & Managerial Accounting",
      "Expected cash inflows, outflows and funding gaps.",
    ],
    [
      "scenarios",
      "Scenario Analysis",
      "Cost & Managerial Accounting",
      "Effect of price, volume, material, labour and overhead changes.",
    ],
    [
      "decisions",
      "Management Decisions",
      "Cost & Managerial Accounting",
      "Relevant-cost comparisons for make/buy, outsource and other choices.",
    ],
    [
      "investments",
      "Capital Investment Appraisal",
      "Cost & Managerial Accounting",
      "NPV, IRR and payback for investment proposals.",
    ],
    [
      "tenders",
      "Tender & Quotation Pricing",
      "Cost & Managerial Accounting",
      "Built-up rates, tender value and estimated profit.",
    ],
    [
      "trial-balance",
      "Trial Balance",
      "Financial Accounting",
      "The control report proving total debits equal total credits.",
    ],
    [
      "general-ledger",
      "General Ledger",
      "Financial Accounting",
      "Chronological account transactions and running balance.",
    ],
    [
      "journal-register",
      "Journal Register",
      "Financial Accounting",
      "Every posted, draft and reversed journal with control totals.",
    ],
    [
      "income-statement",
      "Statement of Profit or Loss",
      "Financial Accounting",
      "Revenue, cost of sales, expenses and profit for the period.",
    ],
    [
      "financial-position",
      "Statement of Financial Position",
      "Financial Accounting",
      "Assets, liabilities and equity at the reporting date.",
    ],
    [
      "cash-flow",
      "Statement of Cash Flows",
      "Financial Accounting",
      "Operating, investing and financing cash movements.",
    ],
    [
      "receivables-aging",
      "Receivables Aging",
      "Financial Accounting",
      "Outstanding customer balances by overdue age.",
    ],
    [
      "payables-aging",
      "Payables Aging",
      "Financial Accounting",
      "Outstanding supplier balances by overdue age.",
    ],
    [
      "bank-control",
      "Bank Control & Reconciliation",
      "Financial Accounting",
      "Ledger balances and unreconciled bank transactions.",
    ],
    [
      "tax-report",
      "VAT / Sales Tax Control",
      "Financial Accounting",
      "Output tax, input tax and amount payable or refundable.",
    ],
    [
      "fixed-assets",
      "Fixed Asset Register",
      "Financial Accounting",
      "Asset cost, depreciation and carrying amount.",
    ],
    [
      "loans",
      "Loans & Borrowings",
      "Financial Accounting",
      "Principal balances, instalments and remaining terms.",
    ],
    [
      "accounting-integrity",
      "Accounting Integrity Review",
      "Financial Accounting",
      "Automated checks for ledger, period, bank and aging issues.",
    ],
  ].map(([key, title, view, description]) => ({ key, title, view, description }));

  function dateRange(options) {
    const month = options.month || currentMonth();
    return { from: options.from || `${month}-01`, to: options.to || `${month}-31`, month };
  }
  function reportBase(definition, company, options) {
    const range = dateRange(options);
    return {
      key: definition.key,
      title: definition.title,
      view: definition.view,
      description: definition.description,
      company,
      from: range.from,
      to: range.to,
      asOf: options.asOf || range.to,
      generatedAt: new Date().toISOString(),
      kpis: [],
      tables: [],
      notes: [],
    };
  }
  function statementRows(rows) {
    return rows
      .filter((x) => Math.abs(U.number(x.balance)) > 0.005)
      .map((x) => ({
        code: x.code,
        account: x.name,
        section: x.subtype || x.statementSection || x.type,
        amount: round(x.balance),
      }));
  }

  // Return a common report shape regardless of the underlying calculation.
  async function prepare(key, company, snap, options = {}) {
    const definition = DEFINITIONS.find((x) => x.key === key);
    if (!definition) throw new Error("Unknown report.");
    const r = reportBase(definition, company, options),
      range = dateRange(options),
      currency = company.currency;
    const M = (v) => U.money(v, currency);
    if (key === "management-summary") {
      const x = IA.Managerial.dashboard(snap, { month: range.month });
      r.kpis = [
        kpi("Actual revenue", M(x.revenue)),
        kpi("Actual net profit", M(x.netProfit), x.netProfit >= 0 ? "good" : "bad"),
        kpi(
          "Expected monthly profit",
          M(x.expectedMonthlyProfit),
          x.expectedMonthlyProfit >= 0 ? "good" : "bad",
        ),
        kpi(
          "Cash available",
          M(x.workingCapital.cash),
          x.workingCapital.cash >= 0 ? "good" : "bad",
        ),
        kpi(
          "Break-even status",
          x.breakEven.status,
          x.breakEven.marginOfSafetyUnits >= 0 ? "good" : "bad",
        ),
        kpi("Projects at risk", x.projects.atRisk, x.projects.atRisk ? "bad" : "good"),
      ];
      r.tables.push(
        table(
          "Action centre",
          [
            ["area", "Area"],
            ["message", "What needs attention"],
            ["severity", "Priority"],
          ],
          x.productAlerts
            .map((p) => ({ area: p.name, message: p.priceHealth, severity: "Pricing" }))
            .concat(x.diagnostics),
        ),
      );
      r.notes.push(
        "Actual results come from posted double-entry journals. Expected results come from product volumes, entered prices and the complete cost model.",
      );
    } else if (key === "product-costing") {
      const x = IA.Managerial.productCosts(snap);
      r.kpis = [
        kpi("Expected monthly revenue", M(x.totalMonthlyRevenue)),
        kpi(
          "Expected monthly profit",
          M(x.totalMonthlyProfit),
          x.totalMonthlyProfit >= 0 ? "good" : "bad",
        ),
        kpi("Monthly overhead", M(x.totalMonthlyOverhead)),
      ];
      r.tables.push(
        table(
          "Unit cost cards",
          [
            ["code", "Code"],
            ["name", "Product / Service"],
            ["materialCost", "Materials"],
            ["labourCost", "Labour"],
            ["equipmentCost", "Equipment"],
            ["overheadPerUnit", "Allocated overhead"],
            ["fullCost", "Full cost"],
            ["sellingPrice", "Selling price"],
            ["unitProfit", "Unit profit"],
            ["marginPercent", "Margin %"],
            ["priceHealth", "Price check"],
          ],
          x.rows,
        ),
      );
    } else if (key === "pricing") {
      const x = IA.Managerial.pricing(snap);
      r.tables.push(
        table(
          "Price recommendations",
          [
            ["code", "Code"],
            ["name", "Product / Service"],
            ["fullCost", "Full cost"],
            ["sellingPrice", "Entered price"],
            ["targetMarginPrice", "Target-margin price"],
            ["profitMaximisingPrice", "Model optimum"],
            ["recommendedPrice", "Recommended price"],
            ["expectedVolumeAtRecommendedPrice", "Expected quantity"],
            ["expectedMonthlyProfit", "Expected profit"],
            ["recommendation", "Plain-language check"],
          ],
          x.rows,
        ),
      );
      r.notes.push(x.note);
    } else if (key === "overheads") {
      const x = IA.Managerial.overheadPools(snap),
        costs = IA.Managerial.productCosts(snap);
      r.kpis = [
        kpi("Total monthly overhead", M(x.totalMonthly)),
        kpi("Entered pools", M(x.explicitMonthly)),
        kpi("Automatically identified", M(x.calculatedMonthly)),
      ];
      r.tables.push(
        table(
          "Cost pools",
          [
            ["code", "Pool"],
            ["name", "Description"],
            ["monthlyAmount", "Monthly amount"],
            ["allocationBasis", "Allocation basis"],
            ["costBehaviour", "Behaviour"],
            ["source", "Source"],
          ],
          x.rows,
        ),
      );
      r.tables.push(
        table(
          "Allocated to products",
          [
            ["code", "Code"],
            ["name", "Product / Service"],
            ["overheadPerUnit", "Overhead per unit"],
            ["volume", "Expected quantity"],
            ["fullCost", "Full cost"],
          ],
          costs.rows,
        ),
      );
    } else if (key === "break-even") {
      const x = IA.Managerial.breakEven(snap);
      r.kpis = [
        kpi(
          "Break-even sales",
          x.breakEvenSales == null ? "Not possible" : M(x.breakEvenSales),
          x.marginOfSafetyUnits >= 0 ? "good" : "bad",
        ),
        kpi("Break-even units", x.breakEvenUnits == null ? "Not possible" : x.breakEvenUnits),
        kpi("Expected units", x.expectedUnits),
        kpi(
          "Margin of safety",
          x.marginOfSafetyPercent == null ? "—" : `${x.marginOfSafetyPercent}%`,
          x.marginOfSafetyPercent >= 0 ? "good" : "bad",
        ),
      ];
      r.tables.push(
        table(
          "How the answer was calculated",
          [
            ["metric", "Metric"],
            ["value", "Value"],
          ],
          [
            { metric: "Weighted selling price", value: M(x.weightedSellingPrice) },
            { metric: "Weighted variable cost", value: M(x.weightedVariableCost) },
            { metric: "Contribution per unit", value: M(x.weightedContribution) },
            { metric: "Monthly fixed costs", value: M(x.monthlyFixedCosts) },
            { metric: "Conclusion", value: x.status },
          ],
        ),
      );
    } else if (key === "budget-actual") {
      const x = IA.Managerial.budgetActual(
        snap,
        Object.assign({}, options, { period: options.period || range.month }),
      );
      r.kpis = [
        kpi("Budget", M(x.budget)),
        kpi("Actual", M(x.actual)),
        kpi("Favourable", M(x.favourable), "good"),
        kpi("Unfavourable", M(x.unfavourable), x.unfavourable ? "bad" : "good"),
      ];
      r.tables.push(
        table(
          "Budget lines",
          [
            ["period", "Period"],
            ["accountCode", "Account"],
            ["accountName", "Description"],
            ["budget", "Budget"],
            ["actual", "Actual"],
            ["variance", "Favourable variance"],
            ["variancePercent", "Variance %"],
            ["result", "Result"],
          ],
          x.rows,
        ),
      );
    } else if (key === "production-variance") {
      const x = IA.Managerial.productionVariances(snap);
      r.kpis = [
        kpi("Material variance", M(x.materialVariance), x.materialVariance >= 0 ? "good" : "bad"),
        kpi("Labour variance", M(x.labourVariance), x.labourVariance >= 0 ? "good" : "bad"),
      ];
      r.tables.push(
        table(
          "Production variances",
          [
            ["date", "Date"],
            ["productCode", "Product"],
            ["units", "Units"],
            ["materialUsageVariance", "Material usage"],
            ["materialPriceVariance", "Material price"],
            ["totalMaterialVariance", "Total material"],
            ["labourEfficiencyVariance", "Labour efficiency"],
            ["labourRateVariance", "Labour rate"],
            ["totalLabourVariance", "Total labour"],
          ],
          x.rows,
          "Positive is favourable; negative is unfavourable.",
        ),
      );
    } else if (key === "project-portfolio") {
      const x = IA.Managerial.projectPortfolio(snap, options.asOf || U.today());
      r.kpis = [
        kpi("Approved budget", M(x.approvedBudget)),
        kpi("Actual cost", M(x.actualCost)),
        kpi(
          "Forecast final cost",
          M(x.forecastCost),
          x.forecastCost <= x.approvedBudget ? "good" : "bad",
        ),
        kpi("Forecast profit", M(x.forecastProfit), x.forecastProfit >= 0 ? "good" : "bad"),
        kpi("Projects at risk", x.atRisk, x.atRisk ? "bad" : "good"),
      ];
      r.tables.push(
        table(
          "Project control",
          [
            ["code", "Project"],
            ["name", "Name"],
            ["physicalProgress", "Done %"],
            ["plannedProgress", "Should be %"],
            ["AC", "Spent"],
            ["BAC", "Budget"],
            ["EAC", "Forecast final cost"],
            ["VAC", "Forecast under/(over)"],
            ["remainingDays", "Planned days left"],
            ["forecastFinish", "Forecast finish"],
            ["health", "Health"],
          ],
          x.rows,
        ),
      );
    } else if (key === "profitability") {
      const x = IA.Managerial.profitability(snap, Object.assign({ by: "product" }, range));
      r.kpis = [
        kpi("Revenue", M(x.revenue)),
        kpi("Full cost", M(x.cost)),
        kpi("Profit", M(x.profit), x.profit >= 0 ? "good" : "bad"),
      ];
      r.tables.push(
        table(
          "Profitability",
          [
            ["code", "Product / Service"],
            ["quantity", "Quantity"],
            ["revenue", "Revenue"],
            ["cost", "Full cost"],
            ["profit", "Profit"],
            ["marginPercent", "Margin %"],
          ],
          x.rows,
        ),
      );
    } else if (key === "inventory") {
      const x = IA.Managerial.inventory(snap);
      r.kpis = [
        kpi("Inventory value", M(x.totalValue)),
        kpi("Items needing attention", x.reorderCount, x.reorderCount ? "bad" : "good"),
      ];
      r.tables.push(
        table(
          "Inventory",
          [
            ["code", "Material"],
            ["name", "Description"],
            ["quantity", "Quantity"],
            ["unit", "Unit"],
            ["averageCost", "Average cost"],
            ["value", "Stock value"],
            ["reorderLevel", "Reorder level"],
            ["shortage", "Suggested order qty"],
            ["status", "Status"],
          ],
          x.rows,
        ),
      );
    } else if (key === "working-capital") {
      const x = IA.Managerial.workingCapital(snap, options.asOf || U.today());
      r.kpis = [
        kpi(
          "Net working capital",
          M(x.netWorkingCapital),
          x.netWorkingCapital >= 0 ? "good" : "bad",
        ),
        kpi(
          "Current ratio",
          x.currentRatio == null ? "No current liabilities" : x.currentRatio,
          x.currentRatio == null || x.currentRatio >= 1 ? "good" : "bad",
        ),
        kpi(
          "Quick ratio",
          x.quickRatio == null ? "No current liabilities" : x.quickRatio,
          x.quickRatio == null || x.quickRatio >= 1 ? "good" : "bad",
        ),
      ];
      r.tables.push(
        table(
          "Working capital components",
          [
            ["component", "Component"],
            ["amount", "Amount"],
          ],
          [
            { component: "Cash", amount: x.cash },
            { component: "Trade receivables", amount: x.receivables },
            { component: "Inventory", amount: x.inventory },
            { component: "Trade payables", amount: x.payables },
            { component: "Current assets per ledger", amount: x.currentAssets },
            { component: "Current liabilities per ledger", amount: x.currentLiabilities },
          ],
        ),
      );
    } else if (key === "cash-forecast") {
      const x = IA.Managerial.cashForecast(snap);
      r.kpis = [
        kpi("Lowest forecast cash", M(x.lowestCash), x.lowestCash >= 0 ? "good" : "bad"),
        kpi("Potential funding gap", M(x.fundingGap), x.fundingGap ? "bad" : "good"),
      ];
      r.tables.push(
        table(
          "Monthly forecast",
          [
            ["period", "Month"],
            ["opening", "Opening cash"],
            ["inflows", "Cash in"],
            ["outflows", "Cash out"],
            ["closing", "Closing cash"],
          ],
          x.rows,
        ),
      );
      r.notes.push(x.assumptions);
    } else if (key === "scenarios") {
      r.tables.push(
        table(
          "Scenario results",
          [
            ["code", "Code"],
            ["name", "Scenario"],
            ["revenue", "Revenue"],
            ["variableCost", "Variable cost"],
            ["overhead", "Overhead"],
            ["profit", "Profit"],
            ["changeFromBaseline", "Change from base"],
          ],
          IA.Managerial.scenarios(snap),
        ),
      );
    } else if (key === "decisions") {
      r.tables.push(
        table(
          "Relevant-cost comparison",
          [
            ["code", "Code"],
            ["name", "Decision"],
            ["type", "Type"],
            ["optionA", "Option A"],
            ["optionANetBenefit", "A net benefit"],
            ["optionB", "Option B"],
            ["optionBNetBenefit", "B net benefit"],
            ["difference", "Difference"],
            ["recommendation", "Financial recommendation"],
            ["qualitativeFactors", "Other factors"],
          ],
          IA.Managerial.decisions(snap),
        ),
      );
    } else if (key === "investments") {
      r.tables.push(
        table(
          "Investment appraisal",
          [
            ["code", "Code"],
            ["name", "Proposal"],
            ["initialInvestment", "Investment"],
            ["NPV", "NPV"],
            ["IRR", "IRR %"],
            ["paybackYears", "Payback years"],
            ["decision", "Financial result"],
            ["status", "Status"],
          ],
          IA.Managerial.investments(snap),
        ),
      );
    } else if (key === "tenders") {
      const x = IA.Managerial.tenders(snap);
      r.kpis = [
        kpi("Tender value", M(x.tenderValue)),
        kpi("Estimated profit", M(x.estimatedProfit), x.estimatedProfit >= 0 ? "good" : "bad"),
      ];
      r.tables.push(
        table(
          "Built-up rates",
          [
            ["tenderNumber", "Tender"],
            ["itemNumber", "Item"],
            ["description", "Description"],
            ["quantity", "Quantity"],
            ["unit", "Unit"],
            ["costRate", "Cost rate"],
            ["sellingRate", "Selling rate"],
            ["total", "Total"],
            ["profit", "Profit"],
          ],
          x.rows,
        ),
      );
    } else if (key === "trial-balance") {
      const x = IA.Accounting.trialBalance(snap, range);
      r.kpis = [
        kpi("Total debits", M(U.sum(x, (a) => a.debit))),
        kpi("Total credits", M(U.sum(x, (a) => a.credit))),
        kpi("Difference", M(round(U.sum(x, (a) => a.debit) - U.sum(x, (a) => a.credit))), "good"),
      ];
      r.tables.push(
        table(
          "Trial balance",
          [
            ["code", "Account"],
            ["name", "Description"],
            ["type", "Type"],
            ["debit", "Debit balance"],
            ["credit", "Credit balance"],
          ],
          x,
        ),
      );
    } else if (key === "general-ledger") {
      const accountCode =
          options.accountCode || ((snap.data.accounts || [])[0] || { data: {} }).data.code,
        x = IA.Accounting.generalLedger(snap, accountCode, range);
      r.title += x.account ? ` — ${x.account.code} ${x.account.name}` : "";
      r.kpis = [
        kpi("Opening balance", M(x.opening)),
        kpi("Debits", M(x.totalDebit)),
        kpi("Credits", M(x.totalCredit)),
        kpi("Closing balance", M(x.balance)),
      ];
      r.tables.push(
        table(
          "Account transactions",
          [
            ["date", "Date"],
            ["journalNumber", "Journal"],
            ["reference", "Reference"],
            ["journalDescription", "Description"],
            ["debit", "Debit"],
            ["credit", "Credit"],
            ["runningBalance", "Balance"],
          ],
          x.rows,
        ),
      );
    } else if (key === "journal-register") {
      const rows = (snap.data.journals || [])
        .filter((j) => j.data.date >= range.from && j.data.date <= range.to)
        .map((j) => ({
          journalNumber: j.data.journalNumber,
          date: j.data.date,
          reference: j.data.reference,
          description: j.data.description,
          sourceType: j.data.sourceType,
          status: j.data.status,
          debit: U.sum(j.data.lines, (x) => x.debit),
          credit: U.sum(j.data.lines, (x) => x.credit),
        }));
      r.tables.push(
        table(
          "Journals",
          [
            ["journalNumber", "Journal"],
            ["date", "Date"],
            ["reference", "Reference"],
            ["description", "Description"],
            ["sourceType", "Source"],
            ["status", "Status"],
            ["debit", "Debit"],
            ["credit", "Credit"],
          ],
          rows,
        ),
      );
    } else if (key === "income-statement") {
      const x = IA.Accounting.incomeStatement(snap, range);
      r.kpis = [
        kpi("Revenue", M(x.revenue)),
        kpi("Gross profit", M(x.grossProfit), x.grossProfit >= 0 ? "good" : "bad"),
        kpi("Net profit", M(x.netProfit), x.netProfit >= 0 ? "good" : "bad"),
      ];
      r.tables.push(
        table(
          "Revenue",
          [
            ["code", "Account"],
            ["account", "Description"],
            ["amount", "Amount"],
          ],
          statementRows(x.rows.filter((a) => a.type === "Revenue")),
        ),
      );
      r.tables.push(
        table(
          "Cost of sales",
          [
            ["code", "Account"],
            ["account", "Description"],
            ["amount", "Amount"],
          ],
          statementRows(x.rows.filter((a) => a.type === "Cost of Sales")),
        ),
      );
      r.tables.push(
        table(
          "Operating expenses",
          [
            ["code", "Account"],
            ["account", "Description"],
            ["amount", "Amount"],
          ],
          statementRows(x.rows.filter((a) => a.type === "Expense")),
        ),
      );
    } else if (key === "financial-position") {
      const x = IA.Accounting.financialPosition(snap, options.asOf || range.to);
      r.kpis = [
        kpi("Total assets", M(x.totalAssets)),
        kpi("Total liabilities", M(x.totalLiabilities)),
        kpi("Total equity", M(x.totalEquity)),
        kpi(
          "Accounting equation difference",
          M(x.difference),
          Math.abs(x.difference) < 0.01 ? "good" : "bad",
        ),
      ];
      r.tables.push(
        table(
          "Assets",
          [
            ["code", "Account"],
            ["account", "Description"],
            ["section", "Section"],
            ["amount", "Amount"],
          ],
          statementRows(x.assets),
        ),
      );
      r.tables.push(
        table(
          "Liabilities",
          [
            ["code", "Account"],
            ["account", "Description"],
            ["section", "Section"],
            ["amount", "Amount"],
          ],
          statementRows(x.liabilities),
        ),
      );
      r.tables.push(
        table(
          "Equity",
          [
            ["code", "Account"],
            ["account", "Description"],
            ["section", "Section"],
            ["amount", "Amount"],
          ],
          statementRows(x.equity).concat([
            {
              code: "",
              account: "Current period profit/(loss)",
              section: "Retained earnings",
              amount: x.currentProfit,
            },
          ]),
        ),
      );
    } else if (key === "cash-flow") {
      const x = IA.Accounting.cashFlow(snap, range);
      r.kpis = [
        kpi("Operating cash flow", M(x.groups.Operating), x.groups.Operating >= 0 ? "good" : "bad"),
        kpi("Net cash movement", M(x.netChange), x.netChange >= 0 ? "good" : "bad"),
        kpi("Closing cash", M(x.closingCash), x.closingCash >= 0 ? "good" : "bad"),
      ];
      r.tables.push(
        table(
          "Cash flow classification",
          [
            ["activity", "Activity"],
            ["amount", "Net cash movement"],
          ],
          Object.keys(x.groups)
            .map((activity) => ({ activity, amount: x.groups[activity] }))
            .concat([
              { activity: "Opening cash", amount: x.openingCash },
              { activity: "Closing cash", amount: x.closingCash },
            ]),
        ),
      );
    } else if (key === "receivables-aging" || key === "payables-aging") {
      const x = IA.Accounting.aging(
        snap,
        key.startsWith("receivables") ? "receivables" : "payables",
        options.asOf || U.today(),
      );
      r.kpis = [
        kpi("Total outstanding", M(x.total)),
        ...Object.entries(x.buckets).map(([label, value]) =>
          kpi(label, M(value), label === "Over 90 days" && value ? "bad" : "neutral"),
        ),
      ];
      r.tables.push(
        table(
          "Outstanding documents",
          [
            ["number", "Document"],
            ["partyCode", "Customer / Supplier"],
            ["date", "Date"],
            ["dueDate", "Due date"],
            ["gross", "Original amount"],
            ["allocated", "Paid"],
            ["outstanding", "Outstanding"],
            ["days", "Days overdue"],
            ["bucket", "Age"],
          ],
          x.rows,
        ),
      );
    } else if (key === "bank-control") {
      const x = IA.Accounting.bankSummary(snap, options.asOf || U.today());
      r.kpis = [
        kpi("Total bank balance", M(U.sum(x, (b) => b.balance))),
        kpi(
          "Unreconciled items",
          U.sum(x, (b) => b.unreconciledCount),
          U.sum(x, (b) => b.unreconciledCount) ? "bad" : "good",
        ),
      ];
      r.tables.push(
        table(
          "Bank accounts",
          [
            ["code", "Bank code"],
            ["name", "Account"],
            ["ledgerAccount", "Ledger"],
            ["balance", "Ledger balance"],
            ["unreconciledCount", "Unreconciled count"],
            ["unreconciledAmount", "Unreconciled net amount"],
          ],
          x,
        ),
      );
    } else if (key === "tax-report") {
      const x = IA.Accounting.taxReport(snap, range);
      r.kpis = [
        kpi("Output tax", M(x.outputTax)),
        kpi("Input tax", M(x.inputTax)),
        kpi("Tax payable / (refund)", M(x.payable), x.payable <= 0 ? "good" : "neutral"),
      ];
      r.tables.push(
        table(
          "Tax ledger entries",
          [
            ["date", "Date"],
            ["journalNumber", "Journal"],
            ["accountCode", "Tax account"],
            ["reference", "Reference"],
            ["debit", "Debit"],
            ["credit", "Credit"],
          ],
          x.lines,
        ),
      );
    } else if (key === "fixed-assets") {
      const x = IA.Accounting.fixedAssetRegister(snap, options.asOf || U.today());
      r.kpis = [
        kpi("Asset cost", M(x.cost)),
        kpi("Accumulated depreciation", M(x.accumulatedDepreciation)),
        kpi("Carrying amount", M(x.carryingAmount)),
      ];
      r.tables.push(
        table(
          "Asset register",
          [
            ["code", "Asset"],
            ["description", "Description"],
            ["purchaseDate", "Purchased"],
            ["cost", "Cost"],
            ["accumulatedDepreciation", "Accumulated depreciation"],
            ["carryingAmount", "Carrying amount"],
            ["monthlyDepreciation", "Monthly depreciation"],
            ["status", "Status"],
          ],
          x.rows,
        ),
      );
    } else if (key === "loans") {
      const x = IA.Accounting.loanRegister(snap);
      r.kpis = [
        kpi("Loan balance", M(x.totalBalance)),
        kpi("Monthly instalments", M(x.nextMonthlyInstalments)),
      ];
      r.tables.push(
        table(
          "Loan register",
          [
            ["code", "Loan"],
            ["name", "Description"],
            ["lender", "Lender"],
            ["openingBalance", "Opening principal"],
            ["principalPaid", "Principal paid"],
            ["balance", "Balance"],
            ["contractualInstalment", "Instalment"],
            ["monthsRemaining", "Months left"],
          ],
          x.rows,
        ),
      );
    } else if (key === "accounting-integrity") {
      const x = IA.Accounting.diagnostics(snap);
      r.kpis = [
        kpi("Trial balance difference", M(x.trialBalanceDifference), x.balanced ? "good" : "bad"),
        kpi("Issues found", x.findings.length, x.findings.length ? "bad" : "good"),
      ];
      r.tables.push(
        table(
          "Integrity findings",
          [
            ["severity", "Priority"],
            ["area", "Area"],
            ["message", "Finding"],
          ],
          x.findings.length
            ? x.findings
            : [
                {
                  severity: "Passed",
                  area: "All automated checks",
                  message: "No integrity exceptions were detected.",
                },
              ],
        ),
      );
    }
    return r;
  }

  // Escape and lay out report values for the in-browser preview.
  function render(report) {
    const company = report.company;
    const kpis = report.kpis
      .map(
        (x) =>
          `<div class="report-kpi ${U.escape(x.tone)}"><span>${U.escape(x.label)}</span><strong>${U.escape(x.value)}</strong></div>`,
      )
      .join("");
    const tables = report.tables
      .map(
        (t) =>
          `<section class="report-section"><div class="section-heading"><h3>${U.escape(t.title)}</h3>${t.note ? `<p>${U.escape(t.note)}</p>` : ""}</div><div class="table-wrap"><table><thead><tr>${t.columns.map((c) => `<th>${U.escape(c.label)}</th>`).join("")}</tr></thead><tbody>${t.rows.length ? t.rows.map((row) => `<tr>${t.columns.map((c) => `<td>${U.escape(display(row[c.key], c.key, company))}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${t.columns.length}" class="empty-cell">No data is available for this report yet.</td></tr>`}</tbody></table></div></section>`,
      )
      .join("");
    return `<article class="report-paper"><header class="report-head"><div><span class="eyebrow">${U.escape(report.view)}</span><h2>${U.escape(report.title)}</h2><p>${U.escape(report.description)}</p></div><div class="report-company"><strong>${U.escape(company.tradingName || company.legalName)}</strong><span>${U.escape(company.companyCode)}</span><span>Generated ${U.escape(new Date(report.generatedAt).toLocaleString("en-ZA"))}</span></div></header>${kpis ? `<div class="report-kpis">${kpis}</div>` : ""}${tables}${report.notes.length ? `<section class="report-notes"><h3>Important notes</h3>${report.notes.map((x) => `<p>${U.escape(x)}</p>`).join("")}</section>` : ""}</article>`;
  }

  // ExcelJS is loaded before this module by business-finances.html.
  async function exportExcel(report) {
    if (!window.ExcelJS) throw new Error("Excel export library is unavailable.");
    const wb = new ExcelJS.Workbook();
    wb.creator = "Integrated Accounting Platform";
    wb.created = new Date();
    report.tables.forEach((t, index) => {
      const ws = wb.addWorksheet((t.title || `Report ${index + 1}`).slice(0, 31));
      ws.mergeCells(1, 1, 1, Math.max(1, t.columns.length));
      ws.getCell(1, 1).value = report.title;
      ws.getCell(1, 1).font = { bold: true, size: 18, color: { argb: "FFFFFFFF" } };
      ws.getCell(1, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF5E0A0A" } };
      ws.getRow(1).height = 30;
      ws.mergeCells(2, 1, 2, Math.max(1, t.columns.length));
      ws.getCell(2, 1).value =
        `${report.company.tradingName || report.company.legalName} • ${t.title}`;
      ws.getCell(2, 1).font = { italic: true, color: { argb: "FF526477" } };
      const header = ws.addRow(t.columns.map((c) => c.label));
      header.font = { bold: true, color: { argb: "FFFFFFFF" } };
      header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF7A1A1A" } };
      t.rows.forEach((row) =>
        ws.addRow(t.columns.map((c) => (row[c.key] == null ? "" : row[c.key]))),
      );
      ws.columns.forEach((column, colIndex) => {
        column.width = Math.min(
          42,
          Math.max(12, t.columns[colIndex] ? t.columns[colIndex].label.length + 3 : 12),
        );
        column.alignment = { vertical: "top", wrapText: true };
      });
      ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: t.columns.length } };
      ws.views = [{ state: "frozen", ySplit: 3 }];
      for (let row = 4; row <= ws.rowCount; row += 1)
        t.columns.forEach((c, col) => {
          if (moneyColumns.test(c.key) && typeof ws.getCell(row, col + 1).value === "number")
            ws.getCell(row, col + 1).numFmt = "#,##0.00;[Red]-#,##0.00";
        });
    });
    if (!report.tables.length) wb.addWorksheet("Report").addRow([report.title]);
    const buffer = await wb.xlsx.writeBuffer();
    U.download(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `${U.slug(report.company.companyCode)}-${U.slug(report.title)}-${U.stamp()}.xlsx`,
    );
  }
  // jsPDF and AutoTable are local vendor scripts loaded by the HTML entry point.
  function exportPdf(report) {
    if (!window.jspdf || !window.jspdf.jsPDF) throw new Error("PDF export library is unavailable.");
    const doc = new window.jspdf.jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    doc.setFillColor(94, 10, 10);
    doc.rect(0, 0, 842, 76, "F");
    doc.setTextColor(255);
    doc.setFontSize(20);
    doc.text(report.title, 38, 34);
    doc.setFontSize(10);
    doc.text(report.company.tradingName || report.company.legalName, 38, 55);
    doc.setTextColor(30);
    let y = 100;
    report.kpis.forEach((x, index) => {
      const xPos = 38 + (index % 4) * 195;
      if (index && index % 4 === 0) y += 48;
      doc.setFontSize(8);
      doc.setTextColor(82);
      doc.text(x.label, xPos, y);
      doc.setFontSize(12);
      doc.setTextColor(20);
      doc.text(String(x.value), xPos, y + 16);
    });
    y += report.kpis.length ? 55 : 0;
    report.tables.forEach((t) => {
      if (y > 500) {
        doc.addPage();
        y = 42;
      }
      doc.setFontSize(13);
      doc.setTextColor(94, 10, 10);
      doc.text(t.title, 38, y);
      y += 10;
      doc.autoTable({
        startY: y,
        head: [t.columns.map((c) => c.label)],
        body: t.rows.map((row) => t.columns.map((c) => display(row[c.key], c.key, report.company))),
        margin: { left: 38, right: 38 },
        styles: { fontSize: 7, cellPadding: 4 },
        headStyles: { fillColor: [94, 10, 10] },
        alternateRowStyles: { fillColor: [250, 246, 246] },
      });
      y = doc.lastAutoTable.finalY + 26;
    });
    doc.save(`${U.slug(report.company.companyCode)}-${U.slug(report.title)}-${U.stamp()}.pdf`);
  }
  // The docx vendor bundle produces the downloadable Word report.
  async function exportWord(report) {
    if (!window.docx) throw new Error("Word export library is unavailable.");
    const {
      Document,
      Packer,
      Paragraph,
      Table,
      TableRow,
      TableCell,
      HeadingLevel,
      WidthType,
      ShadingType,
      TextRun,
    } = window.docx;
    const children = [
      new Paragraph({ text: report.title, heading: HeadingLevel.TITLE }),
      new Paragraph({
        children: [
          new TextRun({ text: report.company.tradingName || report.company.legalName, bold: true }),
          new TextRun(` • Generated ${new Date(report.generatedAt).toLocaleString("en-ZA")}`),
        ],
      }),
      new Paragraph(report.description),
    ];
    if (report.kpis.length)
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: report.kpis.map(
                (x) =>
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: "F7EAEA" },
                    children: [
                      new Paragraph(x.label),
                      new Paragraph({
                        children: [new TextRun({ text: String(x.value), bold: true })],
                      }),
                    ],
                  }),
              ),
            }),
          ],
        }),
      );
    report.tables.forEach((t) => {
      children.push(new Paragraph({ text: t.title, heading: HeadingLevel.HEADING_2 }));
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              tableHeader: true,
              children: t.columns.map(
                (c) =>
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: "5E0A0A" },
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: c.label, bold: true, color: "FFFFFF" })],
                      }),
                    ],
                  }),
              ),
            }),
            ...t.rows.map(
              (row) =>
                new TableRow({
                  children: t.columns.map(
                    (c) =>
                      new TableCell({
                        children: [
                          new Paragraph(String(display(row[c.key], c.key, report.company))),
                        ],
                      }),
                  ),
                }),
            ),
          ],
        }),
      );
    });
    report.notes.forEach((note) =>
      children.push(new Paragraph({ text: note, style: "IntenseQuote" })),
    );
    const blob = await Packer.toBlob(new Document({ sections: [{ properties: {}, children }] }));
    U.download(
      blob,
      `${U.slug(report.company.companyCode)}-${U.slug(report.title)}-${U.stamp()}.docx`,
    );
  }
  function print(report) {
    const popup = window.open("", "_blank", "width=1200,height=850");
    if (!popup) throw new Error("Allow pop-ups to print this report.");
    popup.document.write(
      `<!doctype html><html><head><title>${U.escape(report.title)}</title><link rel="stylesheet" href="assets/css/app.css"><style>body{background:#fff;padding:20px}.report-paper{box-shadow:none}@media print{.no-print{display:none}}</style></head><body>${render(report)}<script>setTimeout(()=>window.print(),400)<\/script></body></html>`,
    );
    popup.document.close();
  }

  IA.Reports = {
    definitions: () => DEFINITIONS.slice(),
    prepare,
    render,
    exportExcel,
    exportPdf,
    exportWord,
    print,
    display,
  };
})();
