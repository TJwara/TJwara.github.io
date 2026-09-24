/* Browser UI and routing for the integrated accounting platform.
   Script order in business-finances.html supplies IAP core, schemas, calculations and reports first.
   Register pages are generated from schemas; delegated data-action clicks are handled by action(). */
(() => {
  "use strict";
  const IA = window.IAP,
    U = IA.Util;
  const state = {
    companyId: "",
    view: "managerial",
    route: "dashboard",
    reportKey: "management-summary",
    snap: null,
    companies: [],
    navOpen: false,
  };
  const app = document.getElementById("app"),
    modalRoot = document.getElementById("modal-root"),
    toastRoot = document.getElementById("toast-root");
  const E = U.escape;
  const managerialSchemas = IA.Schemas.list().filter(
    (x) => x.group === "Cost & Managerial Accounting",
  );
  const financialSchemas = IA.Schemas.list().filter((x) => x.group === "Financial Accounting");
  const sharedSchemas = IA.Schemas.list().filter((x) => x.group === "Shared Foundation");

  // Route IDs also appear in data-route attributes; keep menu and routeView() in sync.
  const MENU = {
    managerial: [
      {
        section: "Understand",
        items: [
          ["dashboard", "gauge", "Management dashboard"],
          ["setup", "list-checks", "Guided data setup"],
          ["reports", "file-chart-column", "Management reports"],
        ],
      },
      {
        section: "Products & operations",
        items: [
          ["register:products", "package-open", "Products & services"],
          ["register:materials", "package", "Materials"],
          ["register:labour_resources", "hard-hat", "Labour resources"],
          ["register:equipment", "wrench", "Equipment"],
          ["product-builder", "blocks", "Cost build-up"],
        ],
      },
      {
        section: "People & operating costs",
        items: [
          ["register:employees", "users-round", "Salaries & wages"],
          ["register:recurring_expenses", "calendar-clock", "Rent, utilities & expenses"],
          ["register:overhead_pools", "split", "Overhead pools"],
        ],
      },
      {
        section: "Plan & control",
        items: [
          ["register:budget_lines", "chart-no-axes-combined", "Budgets"],
          ["register:production_actuals", "factory", "Production actuals"],
          ["projects", "briefcase-business", "Project control"],
          ["register:project_costs", "receipt", "Project costs"],
          ["register:project_progress", "activity", "Progress updates"],
        ],
      },
      {
        section: "Decide",
        items: [
          ["pricing", "badge-dollar-sign", "Pricing centre"],
          ["register:scenarios", "git-branch", "Scenarios"],
          ["register:decision_models", "git-compare-arrows", "Management decisions"],
          ["register:capital_investments", "landmark", "Capital investments"],
          ["register:tender_items", "clipboard-check", "Tenders & quotations"],
        ],
      },
    ],
    financial: [
      {
        section: "Understand",
        items: [
          ["dashboard", "landmark", "Financial dashboard"],
          ["reports", "files", "Financial reports"],
          ["register:journals", "notebook-pen", "Journal register"],
        ],
      },
      {
        section: "General ledger",
        items: [
          ["register:accounts", "book-open", "Chart of accounts"],
          ["register:accounting_periods", "calendar-range", "Accounting periods"],
          ["register:tax_codes", "badge-percent", "Tax codes"],
          ["integrity", "shield-check", "Accounting integrity"],
        ],
      },
      {
        section: "Sales & customers",
        items: [
          ["register:customers", "users", "Customers"],
          ["register:customer_invoices", "file-plus-2", "Customer invoices"],
          ["register:receipts", "circle-arrow-down", "Customer receipts"],
        ],
      },
      {
        section: "Purchases & suppliers",
        items: [
          ["register:suppliers", "truck", "Suppliers"],
          ["register:supplier_bills", "receipt-text", "Supplier bills"],
          ["register:payments", "circle-arrow-up", "Payments"],
        ],
      },
      {
        section: "Cash, assets & finance",
        items: [
          ["register:bank_accounts", "landmark", "Bank & cash accounts"],
          ["register:bank_transactions", "arrow-left-right", "Bank transactions"],
          ["register:fixed_assets", "building-2", "Fixed assets"],
          ["register:inventory_movements", "boxes", "Inventory movements"],
          ["register:loans", "hand-coins", "Loans"],
          ["register:loan_payments", "receipt", "Loan payments"],
          ["register:owner_transactions", "user-round-cog", "Owner & equity"],
        ],
      },
    ],
  };

  function icon(name, size = 18) {
    return `<i data-lucide="${name}" style="width:${size}px;height:${size}px"></i>`;
  }
  function toast(message, tone = "success") {
    const node = document.createElement("div");
    node.className = `toast ${tone}`;
    node.innerHTML = `${icon(tone === "error" ? "circle-alert" : "circle-check", 20)}<span>${E(message)}</span>`;
    toastRoot.appendChild(node);
    refreshIcons();
    setTimeout(() => node.remove(), 4500);
  }
  function refreshIcons() {
    if (window.lucide) window.lucide.createIcons({ attrs: { "stroke-width": 1.8 } });
  }
  function company() {
    return state.companies.find((x) => x.id === state.companyId) || null;
  }
  function currency(value) {
    return U.money(value, (company() || {}).currency || "ZAR");
  }
  function button(label, action, options = {}) {
    return `<button type="button" class="btn ${options.kind || ""}" data-action="${E(action)}"${options.disabled ? " disabled" : ""}>${options.icon ? icon(options.icon, 17) : ""}<span>${E(label)}</span></button>`;
  }
  function statusPill(value) {
    const text = String(value || "—"),
      tone = /healthy|active|posted|approved|open|completed|favourable|passed/i.test(text)
        ? "good"
        : /risk|loss|over|cancel|closed|unfavourable|below|critical/i.test(text)
          ? "bad"
          : "warn";
    return `<span class="status ${tone}">${E(text)}</span>`;
  }
  function empty(title, text, action = "", label = "Add information") {
    return `<div class="empty-state">${icon("inbox", 34)}<h3>${E(title)}</h3><p>${E(text)}</p>${action ? button(label, action, { icon: "plus" }) : ""}</div>`;
  }
  function pageHead(eyebrow, title, text, actions = "") {
    return `<header class="page-head"><div><span class="eyebrow">${E(eyebrow)}</span><h1>${E(title)}</h1><p>${E(text)}</p></div><div class="page-actions">${actions}</div></header>`;
  }
  function card(label, value, hint = "", tone = "") {
    return `<article class="metric ${tone}"><span>${E(label)}</span><strong>${E(value)}</strong>${hint ? `<small>${E(hint)}</small>` : ""}</article>`;
  }
  function section(title, text, body, action = "") {
    return `<section class="panel"><div class="panel-head"><div><h2>${E(title)}</h2>${text ? `<p>${E(text)}</p>` : ""}</div>${action}</div>${body}</section>`;
  }
  function simpleTable(cols, rows, options = {}) {
    if (!rows.length)
      return empty(
        options.emptyTitle || "Nothing here yet",
        options.emptyText || "Add your first record to begin.",
        options.action || "",
        options.actionLabel || "Add record",
      );
    return `<div class="table-wrap"><table><thead><tr>${cols.map((c) => `<th>${E(c.label)}</th>`).join("")}${options.rowAction ? "<th></th>" : ""}</tr></thead><tbody>${rows.map((row) => `<tr${options.rowRoute ? ` data-route="${E(options.rowRoute(row))}" class="click-row"` : ""}>${cols.map((c) => `<td>${c.html ? c.html(row) : E(c.value ? c.value(row) : row[c.key] == null ? "—" : row[c.key])}</td>`).join("")}${options.rowAction ? `<td class="row-actions">${options.rowAction(row)}</td>` : ""}</tr>`).join("")}</tbody></table></div>`;
  }

  // Render the persistent app frame once; route content is refreshed inside it.
  function shell() {
    app.innerHTML = `<div class="shell"><aside class="sidebar" id="sidebar"><div class="brand"><a href="../../personal-projects.html"><img src="../../../../images/footer-logo.png" alt="" class="brand-logo" /></a><button class="icon-btn mobile-close" data-action="toggle-nav" aria-label="Close menu">${icon("x")}</button></div><div class="company-control"><label>Working company</label><select id="company-switch"><option value="">Choose a company</option>${state.companies.map((x) => `<option value="${E(x.id)}"${x.id === state.companyId ? " selected" : ""}>${E(x.tradingName || x.legalName)}</option>`).join("")}</select></div><nav class="primary-nav"><div class="nav-top"><button data-route="companies" class="nav-link">${icon("building-2")}<span>Administration</span></button><button data-route="import" class="nav-link">${icon("file-up")}<span>Import & backup</span></button><button data-route="shared" class="nav-link">${icon("database")}<span>Shared data</span></button></div><div class="nav-view-label">${state.view === "managerial" ? "Cost & Managerial Accounting" : "Financial Accounting"}</div><div id="view-menu"></div></nav><div class="sidebar-foot"><button data-action="switch-view" class="view-switch">${icon(state.view === "managerial" ? "landmark" : "chart-pie")}<span><small>Switch to</small><strong>${state.view === "managerial" ? "Financial Accounting" : "Cost & Managerial Accounting"}</strong></span>${icon("arrow-right", 16)}</button>
        <div class="legal">
          <a href="../../legal.html" target="_blank"><i class="fa-solid fa-file-contract"></i> Terms and Conditions</a>
        </div>
      </div></aside><div class="nav-scrim" data-action="toggle-nav"></div><div class="workspace"><header class="topbar"><button class="icon-btn mobile-menu" data-action="toggle-nav" aria-label="Open menu">${icon("menu")}</button><div class="view-title"><span>${state.view === "managerial" ? "Cost & Managerial Accounting" : "Financial Accounting"}</span><strong>${company() ? E(company().tradingName || company().legalName) : "No company selected"}</strong></div><div class="top-actions">${button("Add data", "quick-add", { icon: "plus", kind: "primary" })}<button class="icon-btn" data-route="help" aria-label="Training and help">${icon("circle-help")}</button></div></header><main id="main"></main></div></div>`;
    renderMenu();
    refreshIcons();
  }
  function renderMenu() {
    const root = document.getElementById("view-menu");
    if (!root) return;
    root.innerHTML = MENU[state.view]
      .map(
        (group) =>
          `<div class="nav-group"><span>${E(group.section)}</span>${group.items.map(([route, ico, label]) => `<button data-route="${E(route)}" class="nav-link${route === state.route ? " active" : ""}">${icon(ico)}<span>${E(label)}</span></button>`).join("")}</div>`,
      )
      .join("");
  }
  function setActiveRoute() {
    document
      .querySelectorAll("[data-route]")
      .forEach((node) => node.classList.toggle("active", node.dataset.route === state.route));
  }

  async function refresh() {
    state.companies = await IA.Companies.list();
    if (state.companyId && !state.companies.some((x) => x.id === state.companyId))
      state.companyId = "";
    if (!state.companyId && state.companies.length) {
      const saved = await IA.Settings.get("activeCompany", state.companies[0].id);
      state.companyId = state.companies.some((x) => x.id === saved) ? saved : state.companies[0].id;
    }
    state.snap = state.companyId ? await IA.Records.snapshot(state.companyId) : null;
  }
  // Store the selected route in browser history and render against the current snapshot.
  async function navigate(route, replace = false) {
    state.route = route || "dashboard";
    if (!replace) history.pushState({ route: state.route }, "", `#${state.route}`);
    if (state.navOpen) toggleNav();
    renderMenu();
    setActiveRoute();
    const main = document.getElementById("main");
    main.innerHTML = `<div class="loading"><span></span>Preparing your information…</div>`;
    try {
      await refresh();
      main.innerHTML = await routeView(state.route);
    } catch (error) {
      main.innerHTML = empty("This page could not be prepared", error.message);
      console.error(error);
    }
    refreshIcons();
    main.scrollTop = 0;
  }
  function toggleNav() {
    state.navOpen = !state.navOpen;
    document.querySelector(".shell")?.classList.toggle("nav-open", state.navOpen);
  }

  // Dispatch a route to its page renderer; register: and report: prefixes are data driven.
  async function routeView(route) {
    if (route === "companies") return companiesPage();
    if (route === "help") return helpPage();
    if (!company()) return welcomePage();
    if (route === "dashboard")
      return state.view === "managerial" ? managerialDashboard() : financialDashboard();
    if (route === "setup") return setupPage();
    if (route === "shared") return sharedPage();
    if (route === "import") return importPage();
    if (route === "reports") return reportsPage();
    if (route.startsWith("report:")) return reportPage(route.split(":")[1]);
    if (route.startsWith("register:")) return registerPage(route.split(":")[1]);
    if (route === "product-builder") return productBuilderPage();
    if (route === "pricing") return pricingPage();
    if (route === "projects") return projectsPage();
    if (route === "integrity") return integrityPage();
    return welcomePage();
  }

  function welcomePage() {
    return `<div class="welcome"><div class="welcome-copy"><span class="eyebrow">A completely new accounting platform</span><h1>One business. Two complete accounting views.</h1><p>Cost & Managerial Accounting explains what things cost, what should happen next and which decision creates value. Financial Accounting records every debit and credit and produces the formal accounts. Both use the same company data.</p><div class="welcome-actions">${button("Create your first company", "add-company", { icon: "building-2", kind: "primary" })}${button("Restore a backup", "restore-backup", { icon: "upload" })}</div></div><div class="dual-card"><article><span>01</span>${icon("chart-pie", 30)}<h2>Cost & Managerial Accounting</h2><p>Product costs, overhead allocation, salaries, expenses, prices, break-even, budgets, projects, decisions and forecasts.</p></article><article><span>02</span>${icon("landmark", 30)}<h2>Financial Accounting</h2><p>Double-entry journals, receivables, payables, bank, tax, assets, loans, ledgers and complete financial statements.</p></article></div></div>`;
  }

  function managerialDashboard() {
    const x = IA.Managerial.dashboard(state.snap),
      be = x.breakEven,
      actions = [];
    x.productAlerts
      .slice(0, 4)
      .forEach((p) =>
        actions.push({
          priority: "Pricing",
          item: p.name,
          message: p.priceHealth,
          route: "pricing",
        }),
      );
    x.projects.rows
      .filter((p) => p.health !== "Healthy")
      .slice(0, 3)
      .forEach((p) =>
        actions.push({
          priority: "Project",
          item: p.name,
          message: `${p.physicalProgress}% done vs ${p.plannedProgress}% planned; forecast ${currency(p.EAC)}`,
          route: "projects",
        }),
      );
    x.diagnostics
      .slice(0, 3)
      .forEach((f) =>
        actions.push({
          priority: f.severity,
          item: f.area,
          message: f.message,
          route: "integrity",
        }),
      );
    return `<div class="page">${pageHead("Cost & Managerial Accounting", "What your business needs to know", "Plain-language answers from your operational data and the same posted actuals used in Financial Accounting.", button("Open reports", "route:reports", { icon: "file-chart-column" }))}<div class="metrics six">${card("Sales recorded this month", currency(x.revenue), "Posted customer invoices")}${card("Profit recorded this month", currency(x.netProfit), x.netProfit >= 0 ? "Income is above recorded costs" : "Recorded costs are above income", x.netProfit >= 0 ? "positive" : "negative")}${card("Expected monthly sales", currency(x.expectedMonthlyRevenue), "At entered prices and volumes")}${card("Expected monthly profit", currency(x.expectedMonthlyProfit), "After direct and allocated costs", x.expectedMonthlyProfit >= 0 ? "positive" : "negative")}${card("Cash available", currency(x.workingCapital.cash), `Working capital ${currency(x.workingCapital.netWorkingCapital)}`, x.workingCapital.cash >= 0 ? "" : "negative")}${card("Break-even sales", be.breakEvenSales == null ? "Not possible" : currency(be.breakEvenSales), be.status, be.marginOfSafetyUnits >= 0 ? "positive" : "negative")}</div><div class="dashboard-grid"><div>${section(
      "What needs your attention",
      "Start here. The platform translates accounting issues into actions.",
      actions.length
        ? simpleTable(
            [
              { label: "Priority", html: (r) => statusPill(r.priority) },
              { label: "Item", key: "item" },
              { label: "What it means", key: "message" },
            ],
            actions,
            { rowRoute: (r) => r.route },
          )
        : `<div class="success-state">${icon("badge-check", 28)}<div><strong>No urgent exceptions</strong><p>The available records passed the current automated checks.</p></div></div>`,
      button("Guided setup", "route:setup", { icon: "list-checks" }),
    )}${section(
      "Projects",
      "Cost, progress and finish forecasts in one view.",
      x.projects.rows.length
        ? simpleTable(
            [
              { label: "Project", key: "name" },
              { label: "Done", value: (r) => `${r.physicalProgress}%` },
              { label: "Spent", value: (r) => currency(r.AC) },
              { label: "Forecast", value: (r) => currency(r.EAC) },
              { label: "Health", html: (r) => statusPill(r.health) },
            ],
            x.projects.rows.slice(0, 6),
            { rowRoute: () => "projects" },
          )
        : empty(
            "No active projects",
            "Add a project and its tasks to begin cost and schedule control.",
            "add:projects",
            "Add project",
          ),
    )}</div><div>${section("Can expected sales cover everything?", "All salaries, rent, utilities, other overheads and direct costs are included.", `<div class="break-even"><div class="be-number"><span>Expected units</span><strong>${E(be.expectedUnits)}</strong></div><div class="be-line"><span style="width:${Math.min(100, Math.max(0, be.breakEvenUnits ? (be.expectedUnits / be.breakEvenUnits) * 100 : 0))}%"></span></div><div class="be-labels"><span>0</span><span>Break-even ${E(be.breakEvenUnits == null ? "not possible" : be.breakEvenUnits)}</span></div>${statusPill(be.status)}</div>`, button("Full analysis", "report:break-even", { icon: "arrow-up-right" }))}${section("Liquidity", "What is available after short-term obligations.", `<dl class="plain-list"><div><dt>Cash</dt><dd>${currency(x.workingCapital.cash)}</dd></div><div><dt>Customers owe you</dt><dd>${currency(x.workingCapital.receivables)}</dd></div><div><dt>Inventory held</dt><dd>${currency(x.workingCapital.inventory)}</dd></div><div><dt>You owe suppliers</dt><dd>${currency(x.workingCapital.payables)}</dd></div><div class="total"><dt>Net working capital</dt><dd>${currency(x.workingCapital.netWorkingCapital)}</dd></div></dl>`, button("Cash forecast", "report:cash-forecast", { icon: "arrow-up-right" }))}</div></div></div>`;
  }

  function financialDashboard() {
    const range = { from: `${U.month(U.today())}-01`, to: `${U.month(U.today())}-31` },
      pnl = IA.Accounting.incomeStatement(state.snap, range),
      pos = IA.Accounting.financialPosition(state.snap),
      ar = IA.Accounting.aging(state.snap, "receivables"),
      ap = IA.Accounting.aging(state.snap, "payables"),
      banks = IA.Accounting.bankSummary(state.snap),
      diag = IA.Accounting.diagnostics(state.snap),
      recent = (state.snap.data.journals || [])
        .slice()
        .sort((a, b) => b.data.date.localeCompare(a.data.date))
        .slice(0, 7);
    return `<div class="page">${pageHead("Financial Accounting", "Financial control centre", "Posted double-entry records, statutory reports and ledger controls for the selected company.", button("New journal", "add:journals", { icon: "plus", kind: "primary" }) + button("Financial reports", "route:reports", { icon: "files" }))}<div class="metrics six">${card("Revenue this month", currency(pnl.revenue), "Statement of profit or loss")}${card("Gross profit", currency(pnl.grossProfit), pnl.revenue ? `${round((pnl.grossProfit / pnl.revenue) * 100)}% gross margin` : "No posted revenue", pnl.grossProfit >= 0 ? "positive" : "negative")}${card("Net profit", currency(pnl.netProfit), "After recorded operating expenses", pnl.netProfit >= 0 ? "positive" : "negative")}${card("Total assets", currency(pos.totalAssets), "Statement of financial position")}${card("Customers owe", currency(ar.total), `${currency(ar.buckets["Over 90 days"])} over 90 days`, ar.buckets["Over 90 days"] ? "negative" : "")}${card("You owe suppliers", currency(ap.total), "Approved and posted supplier bills")}</div><div class="dashboard-grid"><div>${section(
      "Recent journals",
      "Every posted transaction has equal debits and credits.",
      recent.length
        ? simpleTable(
            [
              { label: "Date", value: (r) => U.date(r.data.date) },
              { label: "Journal", value: (r) => r.data.journalNumber },
              { label: "Description", value: (r) => r.data.description },
              { label: "Status", html: (r) => statusPill(r.data.status) },
              { label: "Amount", value: (r) => currency(U.sum(r.data.lines, (l) => l.debit)) },
            ],
            recent,
            {
              rowAction: (r) =>
                `<button class="link-btn" data-action="edit:journals:${E(r.id)}">View</button>`,
            },
          )
        : empty(
            "No journal entries",
            "Approve an invoice, post a payment or add a manual journal.",
            "add:journals",
            "Add journal",
          ),
      button("View all", "route:register:journals", { icon: "arrow-right" }),
    )}${section("Accounting equation", "Assets must always equal liabilities plus equity.", `<div class="equation"><div><span>Assets</span><strong>${currency(pos.totalAssets)}</strong></div><b>=</b><div><span>Liabilities</span><strong>${currency(pos.totalLiabilities)}</strong></div><b>+</b><div><span>Equity and profit</span><strong>${currency(pos.totalEquity)}</strong></div></div><p class="equation-check">${Math.abs(pos.difference) < 0.01 ? `${icon("circle-check", 16)} Balanced` : `${icon("triangle-alert", 16)} Difference ${currency(pos.difference)}`}</p>`, button("Statement", "report:financial-position", { icon: "arrow-up-right" }))}</div><div>${section("Bank & cash", "Ledger positions and reconciliation work remaining.", banks.length ? `<dl class="plain-list">${banks.map((b) => `<div><dt>${E(b.name)}</dt><dd>${currency(b.balance)}<small>${b.unreconciledCount} unreconciled</small></dd></div>`).join("")}<div class="total"><dt>Total</dt><dd>${currency(U.sum(banks, (b) => b.balance))}</dd></div></dl>` : empty("No bank account", "Add the company bank and link it to a ledger account.", "add:bank_accounts", "Add bank"), button("Bank control", "report:bank-control", { icon: "arrow-up-right" }))}${section(
      "Control checks",
      "Automated checks do not replace professional review, but expose common errors early.",
      diag.findings.length
        ? `<div class="finding-list">${diag.findings
            .slice(0, 6)
            .map(
              (f) =>
                `<div>${statusPill(f.severity)}<p><strong>${E(f.area)}</strong>${E(f.message)}</p></div>`,
            )
            .join("")}</div>`
        : `<div class="success-state">${icon("shield-check", 28)}<div><strong>All automated checks passed</strong><p>The ledger is balanced and no current exceptions were detected.</p></div></div>`,
      button("Full review", "route:integrity", { icon: "arrow-up-right" }),
    )}</div></div></div>`;
  }

  function round(x) {
    return Math.round((U.number(x) + Number.EPSILON) * 100) / 100;
  }

  async function companiesPage() {
    const rows = await Promise.all(
      state.companies.map(async (c) => {
        const snap =
            c.id === state.companyId && state.snap ? state.snap : await IA.Records.snapshot(c.id),
          pnl = IA.Accounting.incomeStatement(snap, {
            from: `${U.month(U.today())}-01`,
            to: `${U.month(U.today())}-31`,
          }),
          businessRecords = snap.rows.filter(
            (row) => !String(row.source || "").startsWith("system"),
          ).length;
        return { c, businessRecords, pnl };
      }),
    );
    return `<div class="page">${pageHead("Administration", "Companies", "Open, edit, clear or delete a company here. Clearing keeps the company but removes its records.", button("Add company", "add-company", { icon: "plus", kind: "primary" }))}${rows.length ? `<div class="company-grid">${rows.map(({ c, businessRecords, pnl }) => `<article class="company-card${c.id === state.companyId ? " selected" : ""}"><div class="company-initial">${E((c.tradingName || c.legalName).slice(0, 2).toUpperCase())}</div><div><span class="eyebrow">${E(c.companyCode)}</span><h2>${E(c.tradingName || c.legalName)}</h2><p>${E(c.legalName)} · ${E(c.currency)} · ${c.vatRegistered ? `${E(c.vatRate)}% tax registered` : "Not tax registered"}</p></div><div class="company-numbers"><div><span>Business records</span><strong>${E(businessRecords)}</strong></div><div><span>This month profit</span><strong>${E(U.money(pnl.netProfit, c.currency))}</strong></div></div><footer><button class="btn primary" data-action="select-company:${E(c.id)}">${c.id === state.companyId ? "Currently selected" : "Open company"}</button><button class="btn" data-action="edit-company:${E(c.id)}">Edit</button><button class="btn" data-action="clear-company:${E(c.id)}">Clear data</button><button class="btn danger" data-action="delete-company:${E(c.id)}">Delete company</button></footer></article>`).join("")}</div>` : empty("No companies yet", "Create a company once. The platform then builds its accounting foundation automatically.", "add-company", "Create company")}</div>`;
  }

  function setupPage() {
    const steps = [
      [
        "Company",
        "Tell us who is using the platform and its tax/currency settings.",
        "companies",
        company() ? 1 : 0,
      ],
      [
        "Products or services",
        "What you sell, expected monthly quantity and current price.",
        "register:products",
        state.snap.data.products.length,
      ],
      [
        "Materials",
        "What each product consumes and what each material costs.",
        "register:materials",
        state.snap.data.materials.length,
      ],
      [
        "Labour",
        "People, salaries, employer costs and direct production time.",
        "register:employees",
        state.snap.data.employees.length + state.snap.data.labour_resources.length,
      ],
      [
        "Equipment",
        "Owned, rented or leased equipment and its hourly cost.",
        "register:equipment",
        state.snap.data.equipment.length,
      ],
      [
        "Operating expenses",
        "Rent, electricity, insurance, software and everything else paid.",
        "register:recurring_expenses",
        state.snap.data.recurring_expenses.length,
      ],
      [
        "Cost build-up",
        "Link materials, labour, equipment and work steps to each item sold.",
        "product-builder",
        state.snap.data.product_materials.length +
          state.snap.data.product_labour.length +
          state.snap.data.product_equipment.length,
      ],
      [
        "Opening finance data",
        "Bank, loans, customers, suppliers, invoices and bills.",
        "shared",
        state.snap.data.bank_accounts.length + state.snap.data.loans.length,
      ],
    ];
    return `<div class="page narrow">${pageHead("Guided setup", "Add business information without accounting jargon", "Work down the list. Codes are suggested automatically and every screen explains what the number is used for.", button("Download Excel template", "download-template", { icon: "file-spreadsheet" }))}<div class="setup-list">${steps.map(([title, text, route, count], i) => `<button data-route="${route}" class="setup-step"><span class="step-number">${String(i + 1).padStart(2, "0")}</span><div><h2>${E(title)}</h2><p>${E(text)}</p></div><span class="step-count">${count ? `${E(count)} saved` : "Not started"}</span>${icon("arrow-right")}</button>`).join("")}</div></div>`;
  }

  function sharedPage() {
    const items = sharedSchemas.map((s) => ({
      schema: s,
      count: (state.snap.data[s.key] || []).length,
    }));
    return `<div class="page">${pageHead("Shared data foundation", "Information used by both accounting views", "Enter a customer, product, employee or project once. Both accounting systems use the same record.", button("Guided setup", "route:setup", { icon: "list-checks" }))}<div class="tile-grid">${items.map(({ schema, count }) => `<button class="data-tile" data-route="register:${E(schema.key)}">${icon(schema.icon, 24)}<div><h2>${E(schema.plural)}</h2><p>${count} record${count === 1 ? "" : "s"}</p></div>${icon("arrow-right", 17)}</button>`).join("")}</div></div>`;
  }

  // Build a register from Schemas, including filters, summaries and row actions.
  function registerPage(type) {
    const schema = IA.Schemas.get(type);
    if (!schema) return empty("Register not found", "The requested data register does not exist.");
    const rows = state.snap.data[type] || [],
      fields = schema.fields.filter((f) => f.type !== "json").slice(0, 6),
      actions = button(`Add ${schema.label.toLowerCase()}`, `add:${type}`, {
        icon: "plus",
        kind: "primary",
      });
    const totals = registerSummary(type, rows),
      filter = rows.length
        ? `<div class="register-filter"><label><span>Find a record</span><input type="search" data-register-search placeholder="Filter by code, number, name, date, description or amount"></label></div>`
        : "";
    return `<div class="page">${pageHead(schema.group, schema.plural, registerExplanation(type, schema), actions)}${totals ? `<div class="metrics four">${totals}</div>` : ""}${section(
      `${rows.length} ${rows.length === 1 ? schema.label.toLowerCase() : schema.plural.toLowerCase()}`,
      "Every record you add or import can be opened, edited or deleted here.",
      `${filter}<div data-register-rows>${simpleTable(
        fields.map((f) => ({ label: f.label, html: (row) => fieldDisplay(f, row.data[f.key]) })),
        rows,
        {
          action: `add:${type}`,
          actionLabel: `Add ${schema.label.toLowerCase()}`,
          rowAction: (row) => {
            const postedJournal = type === "journals" && row.data.status === "Posted";
            return `<div class="row-action-buttons"><button class="link-btn" data-action="edit:${type}:${E(row.id)}">${postedJournal ? "View" : "Edit"}</button>${postedJournal ? "" : `<button class="link-btn danger-link" data-action="delete:${type}:${E(row.id)}">Delete</button>`}</div>`;
          },
        },
      )}</div>`,
      button("Export this register", `export-register:${type}`, { icon: "download" }),
    )}</div>`;
  }
  function registerExplanation(type, schema) {
    const special = {
      products:
        "Everything you sell. Open a product to add its materials, labour, equipment and production time.",
      employees:
        "Enter total pay and employer costs. The platform converts every pay basis to a comparable monthly cost.",
      recurring_expenses:
        "Capture rent, electricity, insurance, software, transport and every other recurring business cost.",
      customer_invoices:
        "Approved invoices automatically post revenue, tax and the amount the customer owes.",
      supplier_bills:
        "Approved bills automatically post the expense or asset, input tax and the supplier balance.",
      bank_transactions: "Classify money in or out; ready transactions become balanced journals.",
      journals: "The formal record of every debit and credit. Posted journals cannot be deleted.",
      accounting_periods: "Close completed months to prevent later changes to official figures.",
    };
    return (
      special[type] ||
      `Maintain the ${schema.plural.toLowerCase()} register for ${schema.group.toLowerCase()}.`
    );
  }
  function fieldDisplay(field, value) {
    if (field.type === "currency") return E(currency(value));
    if (field.type === "percent") return E(`${U.number(value)}%`);
    if (field.type === "date") return E(U.date(value));
    if (field.type === "boolean") return value ? statusPill("Yes") : statusPill("No");
    if (field.key === "status") return statusPill(value);
    return E(value || "—");
  }
  function registerSummary(type, rows) {
    if (type === "products") {
      const x = IA.Managerial.productCosts(state.snap);
      return (
        card("Items sold", rows.length) +
        card("Expected monthly sales", currency(x.totalMonthlyRevenue)) +
        card(
          "Expected monthly profit",
          currency(x.totalMonthlyProfit),
          "After all costs",
          x.totalMonthlyProfit >= 0 ? "positive" : "negative",
        ) +
        card("Price alerts", x.rows.filter((p) => p.priceHealth !== "Healthy").length)
      );
    }
    if (type === "employees")
      return (
        card("Team members", rows.length) +
        card(
          "Total monthly employment cost",
          currency(
            U.sum(
              rows.filter((r) => activeRecord(r)),
              IA.Managerial.employeeMonthlyCost,
            ),
          ),
        ) +
        card(
          "Directly assigned",
          rows.filter((r) => r.data.productCode || r.data.projectCode).length,
        ) +
        card(
          "Indirect / overhead",
          rows.filter((r) => !r.data.productCode && !r.data.projectCode).length,
        )
      );
    if (type === "recurring_expenses")
      return (
        card("Recurring expenses", rows.length) +
        card(
          "Monthly equivalent",
          currency(U.sum(rows.filter(activeRecord), IA.Managerial.recurringMonthlyCost)),
        ) +
        card("Fixed items", rows.filter((r) => r.data.costBehaviour === "Fixed").length) +
        card(
          "Capital items",
          rows.filter((r) => r.data.cashClassification === "Capital expenditure").length,
        )
      );
    if (type === "customer_invoices") {
      const approved = rows.filter((r) => ["Approved", "Posted"].includes(r.data.status));
      return (
        card("Invoices", rows.length) +
        card(
          "Approved value",
          currency(U.sum(approved, (r) => IA.Accounting.invoiceAmount(state.snap, r))),
        ) +
        card("Outstanding", currency(IA.Accounting.aging(state.snap, "receivables").total)) +
        card("Drafts", rows.filter((r) => r.data.status === "Draft").length)
      );
    }
    if (type === "supplier_bills") {
      const approved = rows.filter((r) => ["Approved", "Posted"].includes(r.data.status));
      return (
        card("Bills", rows.length) +
        card(
          "Approved value",
          currency(U.sum(approved, (r) => IA.Accounting.billAmount(state.snap, r))),
        ) +
        card("Outstanding", currency(IA.Accounting.aging(state.snap, "payables").total)) +
        card("Drafts", rows.filter((r) => r.data.status === "Draft").length)
      );
    }
    if (type === "journals")
      return (
        card("Journals", rows.length) +
        card("Posted", rows.filter((r) => r.data.status === "Posted").length) +
        card("Draft", rows.filter((r) => r.data.status === "Draft").length) +
        card(
          "Ledger debits",
          currency(
            U.sum(
              rows.filter((r) => r.data.status === "Posted"),
              (r) => U.sum(r.data.lines, (l) => l.debit),
            ),
          ),
        )
      );
    return "";
  }
  function activeRecord(row) {
    return row.data.status !== "Inactive";
  }

  function productBuilderPage() {
    const costs = IA.Managerial.productCosts(state.snap);
    return `<div class="page">${pageHead("Cost build-up", "What does each product or service really cost?", "Choose an item and add as many materials, labour roles, equipment resources and work steps as it needs.", button("Add product", "add:products", { icon: "plus" }))}${costs.rows.length ? `<div class="builder-grid">${costs.rows.map((p) => `<article class="builder-card"><header><div><span class="eyebrow">${E(p.code)} · ${E(p.type)}</span><h2>${E(p.name)}</h2><p>${E(p.unit)} · ${p.productionMinutes} minutes per unit</p></div>${statusPill(p.priceHealth)}</header><div class="cost-stack"><div><span>Materials</span><strong>${currency(p.materialCost)}</strong></div><div><span>Labour</span><strong>${currency(p.labourCost)}</strong></div><div><span>Equipment</span><strong>${currency(p.equipmentCost)}</strong></div><div><span>Overhead</span><strong>${currency(p.overheadPerUnit)}</strong></div><div class="total"><span>Full cost</span><strong>${currency(p.fullCost)}</strong></div><div><span>Selling price</span><strong>${currency(p.sellingPrice)}</strong></div><div class="${p.unitProfit >= 0 ? "positive-text" : "negative-text"}"><span>Profit per unit</span><strong>${currency(p.unitProfit)}</strong></div></div><footer>${button("Material", `add-linked:product_materials:${p.code}`, { icon: "plus" })}${button("Labour", `add-linked:product_labour:${p.code}`, { icon: "plus" })}${button("Equipment", `add-linked:product_equipment:${p.code}`, { icon: "plus" })}${button("Work step", `add-linked:product_operations:${p.code}`, { icon: "plus" })}</footer></article>`).join("")}</div>` : empty("Add something you sell", "Once a product or service exists, this page lets you build its complete cost in simple steps.", "add:products", "Add product or service")}</div>`;
  }
  function pricingPage() {
    const x = IA.Managerial.pricing(state.snap);
    return `<div class="page">${pageHead("Pricing centre", "Check and improve every selling price", "The platform compares the entered price with direct cost, full cost, target margin, estimated demand and available capacity.", button("Pricing report", "report:pricing", { icon: "file-chart-column" }))}${x.rows.length ? `<div class="pricing-grid">${x.rows.map((p) => `<article class="price-card"><header><div><span class="eyebrow">${E(p.code)}</span><h2>${E(p.name)}</h2></div>${statusPill(p.priceHealth)}</header><div class="price-primary"><span>Recommended selling price</span><strong>${currency(p.recommendedPrice)}</strong><small>${E(p.recommendation)}</small></div><dl><div><dt>Entered price</dt><dd>${currency(p.sellingPrice)}</dd></div><div><dt>Full cost</dt><dd>${currency(p.fullCost)}</dd></div><div><dt>Target-margin price</dt><dd>${currency(p.targetMarginPrice)}</dd></div><div><dt>Model optimum</dt><dd>${currency(p.profitMaximisingPrice)}</dd></div><div><dt>Expected monthly profit</dt><dd>${currency(p.expectedMonthlyProfit)}</dd></div></dl><footer>${button("Change product price", `edit-by-code:products:${p.code}`, { icon: "pencil" })}${button("Edit demand assumptions", `pricing-assumption:${p.code}`, { icon: "sliders-horizontal" })}</footer></article>`).join("")}</div><p class="method-note">${E(x.note)}</p>` : empty("No products to price", "Add products or services and their costs first.", "add:products", "Add product or service")}</div>`;
  }
  function projectsPage() {
    const x = IA.Managerial.projectPortfolio(state.snap);
    return `<div class="page">${pageHead("Project control", "Know whether every project will finish on time and budget", "Planned time and cost are compared with actual spending and physical progress using earned-value calculations.", button("Add project", "add:projects", { icon: "plus", kind: "primary" }) + button("Project report", "report:project-portfolio", { icon: "file-chart-column" }))}<div class="metrics five">${card("Projects", x.rows.length)}${card("Approved budgets", currency(x.approvedBudget))}${card("Spent", currency(x.actualCost))}${card("Forecast final cost", currency(x.forecastCost), x.forecastCost <= x.approvedBudget ? "Within total budget" : "Above total budget", x.forecastCost <= x.approvedBudget ? "positive" : "negative")}${card("At risk", x.atRisk, "Cost or schedule index below 0.90", x.atRisk ? "negative" : "positive")}</div>${x.rows.length ? `<div class="project-grid">${x.rows.map((p) => `<article class="project-card"><header><div><span class="eyebrow">${E(p.code)}</span><h2>${E(p.name)}</h2></div>${statusPill(p.health)}</header><div class="progress-pair"><div><span>Physical work done</span><strong>${p.physicalProgress}%</strong><i><b style="width:${Math.min(100, p.physicalProgress)}%"></b></i></div><div><span>Should be done</span><strong>${p.plannedProgress}%</strong><i><b style="width:${Math.min(100, p.plannedProgress)}%"></b></i></div></div><dl><div><dt>Budget</dt><dd>${currency(p.BAC)}</dd></div><div><dt>Spent</dt><dd>${currency(p.AC)}</dd></div><div><dt>Forecast final cost</dt><dd>${currency(p.EAC)}</dd></div><div><dt>Forecast under/(over)</dt><dd class="${p.VAC >= 0 ? "positive-text" : "negative-text"}">${currency(p.VAC)}</dd></div><div><dt>Planned days remaining</dt><dd>${p.remainingDays}</dd></div><div><dt>Forecast finish</dt><dd>${U.date(p.forecastFinish)}</dd></div></dl><footer>${button("Add cost", `add-linked:project_costs:${p.code}`, { icon: "plus" })}${button("Add task", `add-linked:project_tasks:${p.code}`, { icon: "plus" })}${button("Update progress", `project-progress:${p.code}`, { icon: "activity" })}</footer></article>`).join("")}</div>` : empty("No projects to control", "Add the planned dates and approved budget, then add tasks, costs and progress updates.", "add:projects", "Add project")}</div>`;
  }

  function integrityPage() {
    const x = IA.Accounting.diagnostics(state.snap);
    return `<div class="page narrow">${pageHead("Financial control", "Accounting integrity", "Automated checks look for unbalanced journals, closed-period changes, unclassified bank items and overdue receivables.", button("Download review", "report:accounting-integrity", { icon: "download" }))}<div class="integrity-hero ${x.findings.length ? "has-findings" : "passed"}">${icon(x.findings.length ? "shield-alert" : "shield-check", 40)}<div><span>${x.findings.length ? `${x.findings.length} item${x.findings.length === 1 ? "" : "s"} need attention` : "All automated checks passed"}</span><strong>Trial balance difference: ${currency(x.trialBalanceDifference)}</strong></div></div>${section("Findings", "Resolve critical items before relying on or publishing the accounts.", x.findings.length ? `<div class="finding-list large">${x.findings.map((f) => `<div>${statusPill(f.severity)}<p><strong>${E(f.area)}</strong>${E(f.message)}</p></div>`).join("")}</div>` : `<div class="success-state">${icon("badge-check", 30)}<div><strong>No exceptions detected</strong><p>Debits equal credits and the current automated control tests passed.</p></div></div>`)}</div>`;
  }

  function reportsPage() {
    const definitions = IA.Reports.definitions().filter(
      (r) =>
        r.view ===
        (state.view === "managerial" ? "Cost & Managerial Accounting" : "Financial Accounting"),
    );
    return `<div class="page">${pageHead("Reports", `${state.view === "managerial" ? "Management" : "Financial"} report centre`, "Every report can be printed or downloaded as a formatted Excel workbook, PDF or Word document.")}<div class="report-grid">${definitions.map((r) => `<button class="report-tile" data-route="report:${E(r.key)}">${icon(state.view === "managerial" ? "file-chart-column" : "file-text", 25)}<div><h2>${E(r.title)}</h2><p>${E(r.description)}</p></div><span>${icon("arrow-right", 18)}</span></button>`).join("")}</div></div>`;
  }
  async function reportPage(key) {
    state.reportKey = key;
    const report = await IA.Reports.prepare(key, company(), state.snap, {});
    return `<div class="page report-page">${pageHead(report.view, report.title, report.description, button("Excel", `export-report:excel:${key}`, { icon: "file-spreadsheet" }) + button("PDF", `export-report:pdf:${key}`, { icon: "file-type" }) + button("Word", `export-report:word:${key}`, { icon: "file-text" }) + button("Print", `export-report:print:${key}`, { icon: "printer", kind: "primary" }))}<div id="report-content">${IA.Reports.render(report)}</div></div>`;
  }

  function importPage() {
    return `<div class="page narrow">${pageHead("Administration", "Import, template & backup", "The workbook identifies the company and every data sheet automatically. Users enter rows; protected headings and instructions stay unchanged.")}<div class="import-grid"><article>${icon("file-spreadsheet", 30)}<h2>1. Download the structured template</h2><p>It contains only the Company sheet and importable business registers. Automatic IDs are prefilled and locked.</p>${button("Download Excel template", "download-template", { icon: "download", kind: "primary" })}</article><article>${icon("file-up", 30)}<h2>2. Upload the completed workbook</h2><p>The importer creates missing companies, generates omitted codes in row order, resolves links by name or code and reports exactly what happened.</p><label class="file-button">${icon("upload", 18)}<span>Choose Excel workbook</span><input id="import-file" type="file" accept=".xlsx,.xls"></label></article><article>${icon("database-backup", 30)}<h2>3. Protect your records</h2><p>Download a full backup before major imports or month-end changes. A backup preserves all companies, ledgers and audit entries.</p><div class="button-row">${button("Download backup", "backup", { icon: "download" })}<label class="btn">${icon("upload", 17)}<span>Restore backup</span><input id="restore-file" type="file" accept=".json" hidden></label></div></article></div><div id="import-results"></div></div>`;
  }

  function helpPage() {
    const chapters = [
      [
        "Start in five minutes",
        "Create a company. Add what you sell. Add materials, labour, equipment, salaries and recurring expenses. Open Cost build-up to link them. The dashboard then explains cost, price and break-even.",
      ],
      [
        "When to use Cost & Managerial Accounting",
        "Use it for budgets, product or service cost, price decisions, project forecasts, overhead allocation, cash planning, performance and internal decisions.",
      ],
      [
        "When to use Financial Accounting",
        "Use it to issue invoices, record bills and payments, reconcile bank activity, maintain assets and loans, close periods and produce formal statements.",
      ],
      [
        "How automatic posting works",
        "Approved customer invoices debit receivables and credit revenue/tax. Approved supplier bills debit the chosen expense or asset and credit payables. Posted cash movements clear those balances. You can inspect every generated journal.",
      ],
      [
        "What to enter first",
        "The easiest order is company → products/services → materials → labour → equipment → salaries → recurring expenses → product cost build-up → bank and opening financial records.",
      ],
      [
        "Reports and downloads",
        "Open either report centre. Select a report and use Excel, PDF, Word or Print. Excel exports are formatted workbooks, not raw screen dumps.",
      ],
      [
        "Important control",
        "A posted journal cannot be deleted in normal use. Reverse it with an explanatory entry. Close completed accounting periods to prevent changes.",
      ],
      [
        "Data protection",
        "This edition stores data in the current browser. Download regular backups and keep them in a secure company-controlled location. A server deployment with authentication and managed backups is required for multi-user production use.",
      ],
    ];
    return `<div class="page narrow">${pageHead("Training & guidance", "How to use the platform", "Plain-language guidance for business owners, operational managers and finance professionals.")}<div class="help-list">${chapters.map(([title, text], i) => `<article><span>${String(i + 1).padStart(2, "0")}</span><div><h2>${E(title)}</h2><p>${E(text)}</p></div></article>`).join("")}</div></div>`;
  }

  // Share one modal host for company, register, journal and import forms.
  function openModal(title, body, footer = "", options = {}) {
    modalRoot.innerHTML = `<div class="modal-layer"><section class="modal ${options.wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header><div><span class="eyebrow">${E(options.eyebrow || "Integrated Accounting")}</span><h2 id="modal-title">${E(title)}</h2></div><button type="button" class="icon-btn" data-close-modal aria-label="Close">${icon("x")}</button></header><div class="modal-body"><div id="modal-feedback" class="modal-feedback" role="alert" hidden></div>${body}</div>${footer ? `<footer>${footer}</footer>` : ""}</section></div>`;
    document.body.classList.add("modal-open");
    refreshIcons();
    setTimeout(
      () => modalRoot.querySelector("input:not([type=hidden]),select,textarea")?.focus(),
      30,
    );
  }
  function closeModal() {
    modalRoot.innerHTML = "";
    document.body.classList.remove("modal-open");
  }
  function showModalError(message) {
    const feedback = document.getElementById("modal-feedback");
    if (!feedback) return toast(message, "error");
    feedback.hidden = false;
    feedback.innerHTML = `${icon("circle-alert", 18)}<span>${E(message)}</span>`;
    refreshIcons();
    if (feedback.scrollIntoView) feedback.scrollIntoView({ block: "nearest" });
  }
  function clearModalError() {
    const feedback = document.getElementById("modal-feedback");
    if (feedback) {
      feedback.hidden = true;
      feedback.innerHTML = "";
    }
  }
  function setFormBusy(form, busy) {
    const formId = form.getAttribute("id");
    const submit =
      formId === "company-form"
        ? document.querySelector("[data-company-submit]")
        : document.querySelector(`[data-action="submit-form:${formId}"]`);
    if (!submit) return;
    if (busy) {
      submit.dataset.originalLabel = submit.textContent.trim();
      submit.disabled = true;
      submit.innerHTML = `${icon("loader-circle", 17)}<span>${E(submit.dataset.busyLabel || "Saving…")}</span>`;
    } else {
      submit.disabled = false;
      submit.textContent = submit.dataset.originalLabel || "Save";
    }
    refreshIcons();
  }
  async function submitModalForm(formId) {
    const form = document.getElementById(formId);
    if (!form)
      return showModalError("The form could not be found. Close this window and open it again.");
    clearModalError();
    if (!form.checkValidity()) {
      form.reportValidity();
      return showModalError(
        "Please complete the required fields marked with an asterisk before continuing.",
      );
    }
    setFormBusy(form, true);
    try {
      const actualFormId = form.getAttribute("id");
      if (actualFormId === "company-form") await saveCompanyForm(form);
      else if (actualFormId === "record-form") await saveRecordForm(form);
      else if (actualFormId === "journal-form") await saveJournalForm(form);
      else throw new Error("This form does not have a recognised save action.");
    } catch (error) {
      console.error(error);
      showModalError(error.message || "The information could not be saved.");
      toast(error.message || "The information could not be saved.", "error");
    } finally {
      if (document.body.contains(form)) setFormBusy(form, false);
    }
  }

  function companyModal(existing = null) {
    const x = existing || {};
    openModal(
      existing ? "Edit company" : "Create a company",
      `<form id="company-form" class="form-grid"><input type="hidden" name="id" value="${E(x.id || "")}"><label class="span-2"><span>Legal company name *</span><input name="legalName" required value="${E(x.legalName || "")}" placeholder="Example Manufacturing (Pty) Ltd"></label><label><span>Trading name</span><input name="tradingName" value="${E(x.tradingName || "")}" placeholder="Example Manufacturing"></label><label><span>Company code</span><input name="companyCode" readonly value="${E(x.companyCode || "")}" placeholder="Generated automatically"><small>Generated automatically from the legal company name.</small></label><label><span>Registration number</span><input name="registrationNumber" value="${E(x.registrationNumber || "")}"></label><label><span>Tax number</span><input name="taxNumber" value="${E(x.taxNumber || "")}"></label><label><span>Currency</span><select name="currency">${["ZAR", "USD", "GBP", "EUR", "BWP", "NAD", "KES", "NGN", "GHS", "AED"].map((c) => `<option${(x.currency || "ZAR") === c ? " selected" : ""}>${c}</option>`).join("")}</select></label><label><span>Financial year-end month</span><select name="financialYearEndMonth">${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}"${U.number(x.financialYearEndMonth, 2) === i + 1 ? " selected" : ""}>${new Date(2020, i, 1).toLocaleString("en", { month: "long" })}</option>`).join("")}</select></label><label class="checkbox"><input type="checkbox" name="vatRegistered"${x.vatRegistered ? " checked" : ""}><span>Registered for VAT / sales tax</span></label><label><span>Standard tax rate %</span><input type="number" step="0.01" min="0" name="vatRate" value="${E(x.vatRate == null ? 15 : x.vatRate)}"></label><label class="span-2"><span>Address</span><textarea name="address">${E(x.address || "")}</textarea></label></form>`,
      button("Cancel", "close-modal") +
        `<button type="button" data-company-submit data-busy-label="Creating and preparing company…" class="btn primary">${existing ? "Save Changes" : "Create and Prepare Company"}</button>`,
      { eyebrow: "Administration" },
    );
    modalRoot.querySelector("[data-company-submit]").addEventListener("click", (event) => {
      event.preventDefault();
      submitModalForm("company-form");
    });
    if (!existing) {
      const form = document.getElementById("company-form"),
        legalName = form.elements.legalName,
        companyCode = form.elements.companyCode;
      let suggestedCode = "";
      const suggestCode = () => {
        if (companyCode.value && companyCode.value !== suggestedCode) return;
        suggestedCode = legalName.value
          .replace(/[^A-Za-z0-9]/g, "")
          .slice(0, 10)
          .toUpperCase();
        companyCode.value = suggestedCode;
      };
      legalName.addEventListener("input", suggestCode);
      suggestCode();
    }
  }

  async function companyDangerModal(id, mode) {
    const target = await IA.Companies.get(id);
    if (!target) throw new Error("The company could not be found.");
    const records = await IA.Records.list(id),
      clearing = mode === "clear",
      phrase = clearing ? "CLEAR" : "DELETE";
    const title = clearing ? "Clear all company data" : "Delete company permanently";
    const explanation = clearing
      ? `This removes all ${records.length} records belonging to ${target.tradingName || target.legalName}. The company profile will remain, and a clean chart of accounts, tax codes, accounting periods and starter bank register will be prepared automatically.`
      : `This permanently removes ${target.tradingName || target.legalName}, all ${records.length} of its records, and its audit history.`;
    openModal(
      title,
      `<div class="danger-confirm"><div class="danger-confirm-icon">${icon("triangle-alert", 28)}</div><p>${E(explanation)}</p><label><span>Type <strong>${phrase}</strong> to continue</span><input data-confirm-phrase="${phrase}" autocomplete="off" spellcheck="false"></label></div>`,
      button("Cancel", "close-modal") +
        `<button type="button" class="btn danger" data-confirm-submit data-action="execute-${mode}-company:${E(id)}" disabled>${clearing ? "Clear company data" : "Delete company permanently"}</button>`,
      { eyebrow: "Administration" },
    );
  }

  async function executeCompanyClear(id) {
    const submit = modalRoot.querySelector("[data-confirm-submit]"),
      input = modalRoot.querySelector("[data-confirm-phrase]");
    if (!input || input.value.trim().toUpperCase() !== "CLEAR")
      return showModalError("Type CLEAR exactly before continuing.");
    submit.disabled = true;
    submit.textContent = "Clearing and preparing…";
    const result = await IA.Companies.clearData(id);
    await IA.Accounting.provisionCompany(id);
    state.companyId = id;
    await IA.Settings.set("activeCompany", id);
    closeModal();
    await refresh();
    shell();
    await navigate("companies", true);
    toast(
      `${result.recordsRemoved} records removed. The company is ready with a clean accounting foundation.`,
    );
  }

  async function executeCompanyDelete(id) {
    const submit = modalRoot.querySelector("[data-confirm-submit]"),
      input = modalRoot.querySelector("[data-confirm-phrase]");
    if (!input || input.value.trim().toUpperCase() !== "DELETE")
      return showModalError("Type DELETE exactly before continuing.");
    submit.disabled = true;
    submit.textContent = "Deleting company…";
    const target = await IA.Companies.remove(id);
    if (!target) throw new Error("The company could not be found.");
    if (state.companyId === id) {
      state.companyId = "";
      await IA.Settings.set("activeCompany", "");
    }
    closeModal();
    await refresh();
    shell();
    await navigate("companies", true);
    toast(`${target.tradingName || target.legalName} was deleted.`);
  }

  function inputFor(field, value, snap, linked = {}) {
    const val = value == null ? (field.default == null ? "" : field.default) : value,
      req = field.required ? " required" : "",
      min = field.min != null ? ` min="${field.min}"` : "",
      max = field.max != null ? ` max="${field.max}"` : "";
    if (field.type === "textarea")
      return `<textarea name="${E(field.key)}"${req}>${E(val)}</textarea>`;
    if (field.type === "select")
      return `<select name="${E(field.key)}"${req}>${!field.required ? '<option value="">Choose if applicable</option>' : ""}${(field.options || []).map((o) => `<option value="${E(o)}"${String(val) === String(o) ? " selected" : ""}>${E(o)}</option>`).join("")}</select>`;
    if (field.type === "ref") {
      const schema = IA.Schemas.get(field.ref),
        rows = snap.data[field.ref] || [];
      return `<select name="${E(field.key)}"${req}><option value="">${field.required ? "Choose one" : "Not assigned"}</option>${rows
        .map((r) => {
          const v = r.data[field.refValue || (schema && schema.identity)] || "",
            label = r.data[field.refLabel] || v;
          return `<option value="${E(v)}"${String(val || linked[field.key] || "") === String(v) ? " selected" : ""}>${E(v)} · ${E(label)}</option>`;
        })
        .join("")}</select>`;
    }
    if (field.type === "boolean")
      return `<input type="checkbox" name="${E(field.key)}"${U.bool(val) ? " checked" : ""}>`;
    if (field.type === "json")
      return `<textarea name="${E(field.key)}" class="json-input">${E(JSON.stringify(val || [], null, 2))}</textarea>`;
    const type =
        field.type === "email"
          ? "email"
          : field.type === "date"
            ? "date"
            : field.type === "month"
              ? "month"
              : ["currency", "number", "percent"].includes(field.type)
                ? "number"
                : "text",
      step = ["currency", "percent"].includes(field.type)
        ? ' step="0.01"'
        : field.type === "number"
          ? ' step="any"'
          : "",
      placeholder = field.generated ? ' placeholder="Generated automatically" readonly' : "";
    return `<input type="${type}" name="${E(field.key)}" value="${E(val)}"${step}${min}${max}${req}${placeholder}>`;
  }
  // The schema defines fields and reference choices for both create and edit.
  async function recordModal(type, existing = null, linked = {}) {
    const schema = IA.Schemas.get(type);
    if (!schema) return;
    if (type === "journals") return journalModal(existing);
    const values = existing ? existing.data : {},
      identity = schema.identity;
    if (!existing && identity && !values[identity])
      values[identity] = await IA.Records.suggestCode(state.companyId, type);
    Object.assign(values, linked);
    const fields = schema.fields
      .map(
        (field) =>
          `<label class="${field.type === "textarea" || field.type === "json" ? "span-2" : ""}${field.type === "boolean" ? " checkbox" : ""}"><span>${E(field.label)}${field.required ? " *" : ""}</span>${inputFor(field, values[field.key], state.snap, linked)}${field.help ? `<small>${E(field.help)}</small>` : ""}</label>`,
      )
      .join("");
    const deleteAction =
      existing && !["journals"].includes(type)
        ? `<button type="button" class="btn danger" data-action="delete:${type}:${E(existing.id)}">Delete</button>`
        : "";
    openModal(
      existing ? `Edit ${schema.label.toLowerCase()}` : `Add ${schema.label.toLowerCase()}`,
      `<form id="record-form" data-type="${E(type)}" data-id="${E(existing ? existing.id : "")}" class="form-grid">${fields}</form>`,
      deleteAction +
        button("Cancel", "close-modal") +
        `<button type="button" data-action="submit-form:record-form" data-busy-label="Saving record…" class="btn primary">Save</button>`,
      { eyebrow: schema.group, wide: schema.fields.length > 8 },
    );
  }

  async function journalModal(existing = null) {
    const x = existing
        ? existing.data
        : {
            journalNumber: await IA.Accounting.nextJournalNumber(state.companyId),
            date: U.today(),
            reference: "",
            description: "",
            status: "Draft",
            lines: [
              { accountCode: "", debit: 0, credit: 0 },
              { accountCode: "", debit: 0, credit: 0 },
            ],
          },
      locked = existing && existing.data.status === "Posted";
    const accountOptions = (state.snap.data.accounts || [])
      .filter(activeRecord)
      .map(
        (r) => `<option value="${E(r.data.code)}">${E(r.data.code)} · ${E(r.data.name)}</option>`,
      )
      .join("");
    const lines = (x.lines || [])
      .map(
        (l) =>
          `<tr><td><select name="accountCode">${accountOptions.replace(`value="${E(l.accountCode)}"`, `value="${E(l.accountCode)}" selected`)}</select></td><td><input name="lineDescription" value="${E(l.description || "")}"></td><td><input type="number" step="0.01" min="0" name="debit" value="${E(l.debit || "")}"></td><td><input type="number" step="0.01" min="0" name="credit" value="${E(l.credit || "")}"></td><td><button type="button" class="icon-btn" data-action="remove-journal-line">${icon("trash-2", 16)}</button></td></tr>`,
      )
      .join("");
    openModal(
      `${locked ? "View" : existing ? "Edit" : "Add"} journal entry`,
      `<form id="journal-form" data-id="${E(existing ? existing.id : "")}" class="journal-form"><div class="form-grid"><label><span>Journal number</span><input name="journalNumber" readonly value="${E(x.journalNumber)}"></label><label><span>Date *</span><input type="date" name="date" required value="${E(x.date)}"${locked ? " disabled" : ""}></label><label><span>Reference *</span><input name="reference" required value="${E(x.reference)}"${locked ? " disabled" : ""}></label><label><span>Status</span><select name="status"${locked ? " disabled" : ""}><option${x.status === "Draft" ? " selected" : ""}>Draft</option><option${x.status === "Posted" ? " selected" : ""}>Posted</option></select></label><label class="span-2"><span>Description *</span><textarea name="description" required${locked ? " disabled" : ""}>${E(x.description)}</textarea></label></div><div class="journal-lines"><div class="panel-head"><div><h3>Debit and credit lines</h3><p>Total debits must equal total credits.</p></div>${locked ? "" : button("Add line", "add-journal-line", { icon: "plus" })}</div><div class="table-wrap"><table><thead><tr><th>Account</th><th>Description</th><th>Debit</th><th>Credit</th><th></th></tr></thead><tbody id="journal-lines">${lines}</tbody><tfoot><tr><td colspan="2">Totals</td><td id="journal-debit">${currency(U.sum(x.lines, (l) => l.debit))}</td><td id="journal-credit">${currency(U.sum(x.lines, (l) => l.credit))}</td><td id="journal-difference"></td></tr></tfoot></table></div></div></form>`,
      locked
        ? button("Close", "close-modal") +
            (x.status === "Posted"
              ? button("Reverse journal", `reverse-journal:${existing.id}`, {
                  icon: "undo-2",
                  kind: "danger",
                })
              : "")
        : button("Cancel", "close-modal") +
            `<button type="button" data-action="submit-form:journal-form" data-busy-label="Saving journal…" class="btn primary">${existing ? "Save Journal" : "Create Journal"}</button>`,
      { eyebrow: "Financial Accounting", wide: true },
    );
    if (locked)
      modalRoot
        .querySelectorAll("#journal-lines input,#journal-lines select,#journal-lines button")
        .forEach((el) => (el.disabled = true));
    updateJournalTotals();
  }
  function journalLineHtml() {
    const options = (state.snap.data.accounts || [])
      .filter(activeRecord)
      .map(
        (r) => `<option value="${E(r.data.code)}">${E(r.data.code)} · ${E(r.data.name)}</option>`,
      )
      .join("");
    return `<tr><td><select name="accountCode"><option value="">Choose account</option>${options}</select></td><td><input name="lineDescription"></td><td><input type="number" step="0.01" min="0" name="debit"></td><td><input type="number" step="0.01" min="0" name="credit"></td><td><button type="button" class="icon-btn" data-action="remove-journal-line">${icon("trash-2", 16)}</button></td></tr>`;
  }
  function updateJournalTotals() {
    const form = document.getElementById("journal-form");
    if (!form) return;
    const debit = U.sum(Array.from(form.querySelectorAll('[name="debit"]')), (el) => el.value),
      credit = U.sum(Array.from(form.querySelectorAll('[name="credit"]')), (el) => el.value),
      difference = round(debit - credit);
    document.getElementById("journal-debit").textContent = currency(debit);
    document.getElementById("journal-credit").textContent = currency(credit);
    document.getElementById("journal-difference").textContent =
      Math.abs(difference) < 0.005 ? "Balanced" : `Difference ${currency(difference)}`;
    document.getElementById("journal-difference").className =
      Math.abs(difference) < 0.005 ? "positive-text" : "negative-text";
  }

  async function saveCompanyForm(form) {
    const data = Object.fromEntries(new FormData(form).entries());
    data.vatRegistered = form.elements.vatRegistered.checked;
    const existing = data.id ? await IA.Companies.get(data.id) : null;
    delete data.id;
    const row = await IA.Companies.save(data, existing);
    if (!existing) await IA.Accounting.provisionCompany(row.id);
    state.companyId = row.id;
    await IA.Settings.set("activeCompany", row.id);
    closeModal();
    await refresh();
    shell();
    await navigate("dashboard", true);
    toast(
      existing
        ? "Company details saved."
        : "Company created. Its chart of accounts, tax codes, periods and bank register are ready.",
    );
  }
  function formDataObject(form) {
    const data = {};
    new FormData(form).forEach((value, key) => {
      data[key] = value;
    });
    form.querySelectorAll('input[type="checkbox"]').forEach((el) => (data[el.name] = el.checked));
    return data;
  }
  async function saveRecordForm(form) {
    const type = form.dataset.type,
      id = form.dataset.id,
      existing = id ? await IA.Records.get(id) : null,
      data = formDataObject(form);
    const row = await IA.Records.save(
      state.companyId,
      type,
      data,
      existing,
      existing ? existing.source : "manual",
      { replacePosted: true },
    );
    if (IA.Schemas.get(type).autoPost) await IA.Accounting.autoPost(state.companyId, row);
    closeModal();
    await refresh();
    await navigate(state.route, true);
    toast(
      `${IA.Schemas.get(type).label} saved${IA.Schemas.get(type).autoPost && ["Approved", "Posted", "Ready to post"].includes(row.data.status) ? " and posted to the ledger" : ""}.`,
    );
  }
  // Journals go through Accounting validation before the UI refreshes.
  async function saveJournalForm(form) {
    const existing = form.dataset.id ? await IA.Records.get(form.dataset.id) : null,
      lineRows = Array.from(form.querySelectorAll("#journal-lines tr"));
    const lines = lineRows.map((tr) => ({
      accountCode: tr.querySelector('[name="accountCode"]').value,
      description: tr.querySelector('[name="lineDescription"]').value,
      debit: tr.querySelector('[name="debit"]').value,
      credit: tr.querySelector('[name="credit"]').value,
    }));
    const data = formDataObject(form);
    data.lines = lines;
    const row = await IA.Accounting.createJournal(state.companyId, data, {
      existing,
      post: data.status === "Posted",
    });
    closeModal();
    await refresh();
    await navigate(state.route, true);
    toast(`Journal ${row.data.journalNumber} saved ${row.data.status.toLowerCase()}.`);
  }

  async function deleteRecord(type, id) {
    const row = await IA.Records.get(id);
    if (!row) return;
    if (type === "journals" && row.data.status === "Posted")
      throw new Error("Posted journals cannot be deleted. Reverse the journal instead.");
    if (
      !confirm(
        `Delete this ${IA.Schemas.get(type).label.toLowerCase()}? Any records linked to it will also be deleted. This cannot be undone.`,
      )
    )
      return;
    const result = await IA.Records.remove(id, { cascade: true });
    closeModal();
    await refresh();
    await navigate(state.route, true);
    toast(
      result.deletedCount > 1
        ? `${result.deletedCount} linked records deleted.`
        : "Record deleted.",
    );
  }

  // Generate the workbook layout expected by the import path below.
  async function downloadTemplate() {
    if (!window.ExcelJS) throw new Error("Excel template library is unavailable.");
    const wb = new ExcelJS.Workbook();
    wb.creator = "Integrated Accounting Platform";
    wb.title = "Structured Data Import Template";
    const instructions = wb.addWorksheet("Read Me", {
      properties: { tabColor: { argb: "FF5E0A0A" } },
    });
    instructions.columns = [{ width: 24 }, { width: 100 }];
    [
      [
        "INTEGRATED ACCOUNTING DATA TEMPLATE",
        "Do not rename worksheets or column headings. Enter data only in the white rows below the examples.",
      ],
      [
        "Automatic codes",
        "Internal code and number columns are completed automatically and locked. If a different structured workbook omits those columns, the importer generates the codes in row order.",
      ],
      [
        "How company assignment works",
        "Enter every company on the Company sheet. Other sheets may use Company Code or Company Name. If both are blank and the workbook contains one company, the importer assigns every row to that company automatically.",
      ],
      [
        "Required fields",
        "Column headings ending in * are required. Use the exact allowed values shown in comments/drop-downs.",
      ],
      ["Dates", "Use YYYY-MM-DD. Months use YYYY-MM."],
      [
        "Import order",
        "The platform imports companies and dependencies automatically. Sheet order does not matter.",
      ],
      [
        "Protection",
        "Headings, instructions and automatic codes are locked. User input cells are unlocked.",
      ],
      [
        "Safety",
        "Download a platform backup before a large import. The importer reports errors by sheet and row.",
      ],
    ].forEach((row) => instructions.addRow(row));
    instructions.getRow(1).font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
    instructions.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF5E0A0A" },
    };
    instructions.getColumn(2).alignment = { wrapText: true, vertical: "top" };
    instructions.eachRow((row) => (row.height = 42));
    await instructions.protect("", { selectLockedCells: true, selectUnlockedCells: true });
    const companyFields = [
      "legalName",
      "tradingName",
      "registrationNumber",
      "taxNumber",
      "currency",
      "vatRegistered",
      "vatRate",
      "financialYearEndMonth",
      "address",
    ];
    createTemplateSheet(
      wb,
      "Company",
      companyFields.map((key) => ({
        key,
        label: key,
        required: key === "legalName",
        type:
          key === "vatRegistered"
            ? "boolean"
            : ["vatRate", "financialYearEndMonth"].includes(key)
              ? "number"
              : "text",
      })),
      {
        legalName: "Demo Manufacturing (Pty) Ltd",
        tradingName: "Demo Manufacturing",
        registrationNumber: "2026/123456/07",
        taxNumber: "4123456789",
        currency: "ZAR",
        vatRegistered: "Yes",
        vatRate: 15,
        financialYearEndMonth: 2,
        address: "1 Example Road",
      },
      false,
    );
    IA.Schemas.list()
      .filter((s) => !["journals", "accounts", "tax_codes", "accounting_periods"].includes(s.key))
      .forEach((schema) => {
        const example = {};
        schema.fields.forEach(
          (f) =>
            (example[f.key] = f.generated
              ? ""
              : f.default != null
                ? f.default
                : f.type === "date"
                  ? U.today()
                  : f.type === "month"
                    ? U.month(U.today())
                    : f.type === "boolean"
                      ? "No"
                      : f.type === "select"
                        ? (f.options || [""])[0]
                        : ""),
        );
        const identityField =
          schema.identity && schema.fields.find((field) => field.key === schema.identity);
        if (schema.identity && !(identityField && identityField.generated))
          example[schema.identity] = `${schema.codePrefix || "CODE"}-EXAMPLE`;
        createTemplateSheet(
          wb,
          schema.key.slice(0, 31),
          [{ key: "companyName", label: "Company Name", type: "text" }, ...schema.fields],
          Object.assign({ companyName: "Demo Manufacturing (Pty) Ltd" }, example),
          true,
        );
      });
    const buffer = await wb.xlsx.writeBuffer();
    U.download(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `Integrated-Accounting-Import-Template-${U.stamp()}.xlsx`,
    );
    toast("Structured Excel template downloaded.");
  }
  function createTemplateSheet(wb, name, fields, example, includeCompany) {
    const ws = wb.addWorksheet(name, {
      properties: { tabColor: { argb: name === "Company" ? "FF5E0A0A" : "FF7A1A1A" } },
    });
    const headers = fields.map((f) => `${f.key}${f.required ? "*" : ""}`);
    ws.addRow([`${name} DATA — protected headings; enter data below row 4`]);
    ws.mergeCells(1, 1, 1, headers.length);
    ws.addRow(headers);
    ws.addRow(fields.map((f) => `${f.label || f.key}${f.type ? ` (${f.type})` : ""}`));
    ws.addRow(fields.map((f) => (example[f.key] == null ? "" : example[f.key])));
    ws.getRow(1).font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF5E0A0A" } };
    ws.getRow(2).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getRow(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF7A1A1A" } };
    ws.getRow(3).font = { italic: true, color: { argb: "FF6F5B5B" }, size: 9 };
    ws.getRow(4).font = { italic: true, color: { argb: "FF7A5D22" } };
    ws.views = [{ state: "frozen", ySplit: 3 }];
    ws.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: headers.length } };
    fields.forEach((field, index) => {
      const col = ws.getColumn(index + 1);
      col.width = Math.min(38, Math.max(16, (field.label || field.key).length + 5));
      for (let row = 5; row <= 1004; row += 1) {
        const cell = ws.getCell(row, index + 1);
        if (field.generated) {
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
    ws.protect("", {
      selectLockedCells: true,
      selectUnlockedCells: true,
      formatCells: false,
      formatColumns: false,
      formatRows: false,
      insertRows: true,
      deleteRows: false,
    });
  }

  // Resolve company/record references in a staged workbook before persisting rows.
  async function importWorkbook(file) {
    if (!window.XLSX) throw new Error("Excel import library is unavailable.");
    const buffer = await file.arrayBuffer(),
      wb = XLSX.read(buffer, { type: "array", cellDates: false });
    const logs = [],
      companyByCode = new Map(),
      companyByName = new Map(),
      importedCompanies = [],
      aliases = new Map();
    const findSheet = (name) =>
      wb.SheetNames.find((sheetName) => normalize(sheetName) === normalize(name));
    const companySheetName = findSheet("Company");
    if (!companySheetName)
      throw new Error(
        "The workbook needs a Company sheet. Download the structured template and keep the sheet name unchanged.",
      );
    const companyRows = sheetRows(wb.Sheets[companySheetName]);
    if (!companyRows.length) throw new Error("The Company sheet has no data rows.");

    const rememberCompany = (record, suppliedCode = "") => {
      [record.companyCode, suppliedCode]
        .filter(Boolean)
        .forEach((value) => companyByCode.set(normalize(value), record));
      [record.legalName, record.tradingName]
        .filter(Boolean)
        .forEach((value) => companyByName.set(normalize(value), record));
      if (!importedCompanies.some((companyRecord) => companyRecord.id === record.id))
        importedCompanies.push(record);
    };
    for (const raw of companyRows) {
      try {
        const data = stripStars(raw),
          suppliedCode = String(data.companyCode || "").trim(),
          legalName = String(data.legalName || "").trim();
        if (!legalName) throw new Error("Legal Company Name is required");
        const companies = await IA.Companies.list();
        let record = companies.find(
          (candidate) =>
            (suppliedCode && normalize(candidate.companyCode) === normalize(suppliedCode)) ||
            normalize(candidate.legalName) === normalize(legalName),
        );
        record = await IA.Companies.save(data, record || null);
        if (!(await IA.Records.list(record.id, "accounts")).length)
          await IA.Accounting.provisionCompany(record.id);
        rememberCompany(record, suppliedCode);
        logs.push({
          sheet: "Company",
          row: raw.__row,
          result: record.createdAt === record.updatedAt ? "Created" : "Updated",
          detail: `${record.companyCode} · ${record.legalName}`,
        });
      } catch (error) {
        logs.push({ sheet: "Company", row: raw.__row, result: "Error", detail: error.message });
      }
    }

    const aliasMap = (companyId, type) => {
      const key = `${companyId}\u0000${type}`;
      if (!aliases.has(key)) aliases.set(key, new Map());
      return aliases.get(key);
    };
    const labelKeys = ["name", "fullName", "role", "description", "accountNumber"];
    const rememberRecord = (companyId, schema, record, suppliedIdentity = "") => {
      const map = aliasMap(companyId, schema.key),
        identity = record.data[schema.identity];
      [suppliedIdentity, identity, ...labelKeys.map((key) => record.data[key])]
        .filter((value) => String(value || "").trim())
        .forEach((value) => map.set(normalize(value), identity));
    };
    const resolveCompany = async (data) => {
      const suppliedCode = String(data.companyCode || "").trim(),
        suppliedName = String(data.companyName || "").trim();
      let target = suppliedCode ? companyByCode.get(normalize(suppliedCode)) : null;
      if (!target && suppliedName) target = companyByName.get(normalize(suppliedName));
      if (!target) {
        const companies = await IA.Companies.list();
        target =
          companies.find(
            (candidate) =>
              (suppliedCode && normalize(candidate.companyCode) === normalize(suppliedCode)) ||
              (suppliedName &&
                [candidate.legalName, candidate.tradingName].some(
                  (name) => normalize(name) === normalize(suppliedName),
                )),
          ) || null;
      }
      if (!target && importedCompanies.length === 1) target = importedCompanies[0];
      if (!target)
        throw new Error(
          "Enter Company Name when the workbook contains more than one company. Company codes are not required.",
        );
      delete data.companyCode;
      delete data.companyName;
      return target;
    };
    const comparableValue = (field, value) => {
      if (["currency", "number", "percent"].includes(field.type)) return String(U.number(value));
      if (field.type === "boolean") return String(U.bool(value));
      if (field.type === "date") return U.isoDate(value);
      return String(value == null ? "" : value)
        .trim()
        .toLowerCase();
    };
    const sameImportedRecord = (schema, existing, data) => {
      const fields = schema.fields.filter(
        (field) =>
          field.key !== schema.identity && data[field.key] !== "" && data[field.key] != null,
      );
      return (
        Boolean(fields.length) &&
        fields.every(
          (field) =>
            comparableValue(field, existing.data[field.key]) ===
            comparableValue(field, data[field.key]),
        )
      );
    };
    const nameMatchedTypes = new Set([
      "departments",
      "cost_centres",
      "customers",
      "suppliers",
      "projects",
      "products",
      "employees",
      "recurring_expenses",
      "bank_accounts",
      "loans",
      "materials",
      "labour_resources",
      "equipment",
      "overhead_pools",
      "decision_models",
      "capital_investments",
    ]);
    const findByBusinessName = (schema, rows, data) => {
      if (!nameMatchedTypes.has(schema.key)) return null;
      const key = labelKeys.find((candidate) => String(data[candidate] || "").trim());
      return key
        ? rows.find((row) => normalize(row.data[key]) === normalize(data[key])) || null
        : null;
    };
    const resolveReferences = async (target, schema, data) => {
      for (const field of schema.fields.filter((candidate) => candidate.ref)) {
        const rawValue = String(data[field.key] == null ? "" : data[field.key]).trim(),
          refSchema = IA.Schemas.get(field.ref),
          rows = await IA.Records.list(target.id, field.ref);
        if (!rawValue) {
          if (field.required && rows.length === 1)
            data[field.key] = rows[0].data[field.refValue || refSchema.identity];
          continue;
        }
        const mapped = aliasMap(target.id, field.ref).get(normalize(rawValue));
        const match = rows.find(
          (row) =>
            normalize(row.data[field.refValue || refSchema.identity]) ===
              normalize(mapped || rawValue) ||
            (field.refLabel && normalize(row.data[field.refLabel]) === normalize(rawValue)) ||
            labelKeys.some((key) => normalize(row.data[key]) === normalize(rawValue)),
        );
        if (!match)
          throw new Error(
            `${field.label} “${rawValue}” was not found. Use the record's name or automatic code.`,
          );
        data[field.key] = match.data[field.refValue || refSchema.identity];
      }
    };

    const ordered = [
      ...sharedSchemas,
      ...managerialSchemas,
      ...financialSchemas.filter(
        (schema) =>
          !["journals", "accounts", "tax_codes", "accounting_periods"].includes(schema.key),
      ),
    ];
    for (const schema of ordered) {
      const sheetName = findSheet(schema.key) || findSheet(schema.plural);
      if (!sheetName) continue;
      const rows = sheetRows(wb.Sheets[sheetName], schema);
      for (const raw of rows) {
        try {
          const data = stripStars(raw),
            target = await resolveCompany(data),
            suppliedIdentity = String(data[schema.identity] || "").trim();
          await resolveReferences(target, schema, data);
          const existingRows = await IA.Records.list(target.id, schema.key);
          let existing = suppliedIdentity
            ? existingRows.find(
                (row) => normalize(row.data[schema.identity]) === normalize(suppliedIdentity),
              ) || null
            : null;
          if (!existing && schema.key === "supplier_bills" && data.billNumber)
            existing =
              existingRows.find(
                (row) =>
                  normalize(row.data.supplierCode) === normalize(data.supplierCode) &&
                  normalize(row.data.billNumber) === normalize(data.billNumber),
              ) || null;
          if (!existing && !suppliedIdentity)
            existing = findByBusinessName(schema, existingRows, data);
          if (
            existing &&
            suppliedIdentity &&
            schema.generatedIdentity &&
            !sameImportedRecord(schema, existing, data)
          ) {
            data[schema.identity] = "";
            existing = null;
          }
          const record = await IA.Records.save(
            target.id,
            schema.key,
            data,
            existing || null,
            `Excel import: ${file.name}`,
          );
          rememberRecord(target.id, schema, record, suppliedIdentity);
          if (schema.autoPost) await IA.Accounting.autoPost(target.id, record);
          logs.push({
            sheet: sheetName,
            row: raw.__row,
            result: existing ? "Updated" : "Created",
            detail: record.data[schema.identity] || schema.label,
          });
        } catch (error) {
          logs.push({ sheet: sheetName, row: raw.__row, result: "Error", detail: error.message });
        }
      }
    }
    await refresh();
    shell();
    await navigate("import", true);
    const errors = logs.filter((x) => x.result === "Error").length,
      created = logs.filter((x) => x.result === "Created").length,
      updated = logs.filter((x) => x.result === "Updated").length;
    document.getElementById("import-results").innerHTML = section(
      "Import result",
      `${created} created, ${updated} updated, ${errors} errors.`,
      simpleTable(
        [
          { label: "Sheet", key: "sheet" },
          { label: "Excel row", key: "row" },
          { label: "Result", html: (r) => statusPill(r.result) },
          { label: "Detail", key: "detail" },
        ],
        logs,
      ),
    );
    refreshIcons();
    toast(
      errors
        ? `Import completed with ${errors} row error${errors === 1 ? "" : "s"}.`
        : "Workbook imported successfully.",
      errors ? "error" : "success",
    );
  }
  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  }
  function sheetRows(sheet, schema = null) {
    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });
    let headerIndex = matrix.findIndex((row) =>
      row.some((cell) => /\*$/.test(String(cell)) || normalize(cell) === "companycode"),
    );
    if (headerIndex < 0) headerIndex = 0;
    const headers = matrix[headerIndex].map((h) => String(h).replace(/\*$/, "").trim()),
      generated = new Set(
        (schema ? schema.fields : []).filter((field) => field.generated).map((field) => field.key),
      ),
      isPlatformTemplate =
        headerIndex > 0 && /protected headings/i.test(String((matrix[0] && matrix[0][0]) || "")),
      startIndex = headerIndex + (isPlatformTemplate ? 3 : 1);
    return matrix
      .slice(startIndex)
      .map((row, i) =>
        Object.assign(
          { __row: startIndex + i + 1 },
          Object.fromEntries(headers.map((h, c) => [h, row[c]])),
        ),
      )
      .filter((row) => headers.some((h) => !generated.has(h) && String(row[h] || "").trim()));
  }
  function stripStars(raw) {
    const data = {};
    Object.entries(raw).forEach(([k, v]) => {
      if (k !== "__row") data[String(k).replace(/\*$/, "").trim()] = v;
    });
    return data;
  }

  async function exportRegister(type) {
    const schema = IA.Schemas.get(type),
      report = {
        title: schema.plural,
        view: schema.group,
        description: `Complete ${schema.plural.toLowerCase()} register.`,
        company: company(),
        generatedAt: new Date().toISOString(),
        kpis: [],
        notes: [],
        tables: [
          {
            title: schema.plural,
            columns: schema.fields.map((f) => ({ key: f.key, label: f.label })),
            rows: (state.snap.data[type] || []).map((r) => r.data),
          },
        ],
      };
    await IA.Reports.exportExcel(report);
  }
  async function exportReport(format, key) {
    const report = await IA.Reports.prepare(key, company(), state.snap, {});
    if (format === "excel") await IA.Reports.exportExcel(report);
    else if (format === "pdf") IA.Reports.exportPdf(report);
    else if (format === "word") await IA.Reports.exportWord(report);
    else IA.Reports.print(report);
    toast(
      `${report.title} ${format === "print" ? "opened for printing" : `exported to ${format.toUpperCase()}`}.`,
    );
  }

  // Central handler for delegated UI actions, including generated buttons.
  async function action(value, source) {
    if (!value) return;
    if (value === "toggle-nav") return toggleNav();
    if (value === "switch-view") {
      state.view = state.view === "managerial" ? "financial" : "managerial";
      await IA.Settings.set("activeView", state.view);
      state.route = "dashboard";
      shell();
      return navigate("dashboard", true);
    }
    if (value === "close-modal") return closeModal();
    if (value.startsWith("submit-form:"))
      return submitModalForm(value.slice("submit-form:".length));
    if (value === "add-company") return companyModal();
    if (value.startsWith("edit-company:"))
      return companyModal(await IA.Companies.get(value.split(":")[1]));
    if (value.startsWith("clear-company:")) return companyDangerModal(value.split(":")[1], "clear");
    if (value.startsWith("delete-company:"))
      return companyDangerModal(value.split(":")[1], "delete");
    if (value.startsWith("execute-clear-company:")) return executeCompanyClear(value.split(":")[1]);
    if (value.startsWith("execute-delete-company:"))
      return executeCompanyDelete(value.split(":")[1]);
    if (value.startsWith("select-company:")) {
      state.companyId = value.split(":")[1];
      await IA.Settings.set("activeCompany", state.companyId);
      await refresh();
      shell();
      return navigate("dashboard", true);
    }
    if (value === "quick-add") return quickAddModal();
    if (value.startsWith("route:")) return navigate(value.slice(6));
    if (value.startsWith("report:")) return navigate(value);
    if (value.startsWith("add:")) return recordModal(value.slice(4));
    if (value.startsWith("edit:")) {
      const [, type, id] = value.split(":");
      return recordModal(type, await IA.Records.get(id));
    }
    if (value.startsWith("edit-by-code:")) {
      const [, type, code] = value.split(":"),
        schema = IA.Schemas.get(type),
        row = (state.snap.data[type] || []).find((r) => r.data[schema.identity] === code);
      return recordModal(type, row);
    }
    if (value.startsWith("add-linked:")) {
      const [, type, code] = value.split(":"),
        key = type.startsWith("product_") ? "productCode" : "projectCode";
      return recordModal(type, null, { [key]: code });
    }
    if (value.startsWith("pricing-assumption:")) {
      const code = value.split(":")[1],
        row = (state.snap.data.pricing_assumptions || []).find((r) => r.data.productCode === code);
      return recordModal("pricing_assumptions", row, { productCode: code });
    }
    if (value.startsWith("project-progress:")) {
      const code = value.split(":")[1],
        tasks = (state.snap.data.project_tasks || []).filter((r) => r.data.projectCode === code);
      if (!tasks.length) {
        toast("Add at least one project task before recording progress.", "error");
        return recordModal("project_tasks", null, { projectCode: code });
      }
      return recordModal("project_progress", null, {
        projectCode: code,
        taskCode: tasks[0].data.code,
      });
    }
    if (value.startsWith("delete:")) {
      const [, type, id] = value.split(":");
      return deleteRecord(type, id);
    }
    if (value === "add-journal-line") {
      document.getElementById("journal-lines").insertAdjacentHTML("beforeend", journalLineHtml());
      refreshIcons();
      return updateJournalTotals();
    }
    if (value === "remove-journal-line") {
      source.closest("tr")?.remove();
      return updateJournalTotals();
    }
    if (value.startsWith("reverse-journal:")) {
      const id = value.split(":")[1],
        date = prompt("Reversal date (YYYY-MM-DD)", U.today());
      if (!date) return;
      await IA.Accounting.reverseJournal(state.companyId, id, date);
      closeModal();
      await refresh();
      await navigate(state.route, true);
      return toast("Journal reversed with a new equal-and-opposite entry.");
    }
    if (value === "download-template") return downloadTemplate();
    if (value === "backup") return IA.Backup.create();
    if (value.startsWith("export-register:")) return exportRegister(value.split(":")[1]);
    if (value.startsWith("export-report:")) {
      const [, format, key] = value.split(":");
      return exportReport(format, key);
    }
  }

  function quickAddModal() {
    if (!company()) return companyModal();
    const choices =
      state.view === "managerial"
        ? [
            ["products", "Product or service"],
            ["materials", "Material"],
            ["employees", "Employee / salary"],
            ["recurring_expenses", "Rent, electricity or expense"],
            ["equipment", "Equipment"],
            ["projects", "Project"],
            ["budget_lines", "Budget line"],
          ]
        : [
            ["customer_invoices", "Customer invoice"],
            ["supplier_bills", "Supplier bill"],
            ["receipts", "Customer receipt"],
            ["payments", "Payment"],
            ["bank_transactions", "Bank transaction"],
            ["journals", "Manual journal"],
            ["fixed_assets", "Fixed asset"],
          ];
    openModal(
      "What would you like to add?",
      `<div class="quick-grid">${choices.map(([type, label]) => `<button data-action="quick-choice:${E(type)}">${icon(IA.Schemas.get(type).icon, 22)}<span>${E(label)}</span>${icon("arrow-right", 16)}</button>`).join("")}</div>`,
      button("Cancel", "close-modal"),
    );
  }

  document.addEventListener("click", async (event) => {
    const close = event.target.closest("[data-close-modal]");
    if (close) return closeModal();
    const route = event.target.closest("[data-route]");
    if (route) {
      event.preventDefault();
      return navigate(route.dataset.route);
    }
    const node = event.target.closest("[data-action]");
    if (!node) return;
    event.preventDefault();
    try {
      const value = node.dataset.action;
      if (value.startsWith("quick-choice:")) {
        closeModal();
        return recordModal(value.split(":")[1]);
      }
      await action(value, node);
    } catch (error) {
      console.error(error);
      toast(error.message || "The action could not be completed.", "error");
    }
  });
  document.addEventListener("submit", async (event) => {
    event.preventDefault();
    return submitModalForm(event.target.getAttribute("id"));
  });
  document.addEventListener("input", (event) => {
    if (event.target.closest("#journal-form")) updateJournalTotals();
    if (event.target.matches("[data-confirm-phrase]")) {
      const submit = modalRoot.querySelector("[data-confirm-submit]");
      if (submit)
        submit.disabled =
          event.target.value.trim().toUpperCase() !== event.target.dataset.confirmPhrase;
    }
    if (event.target.matches("[data-register-search]")) {
      const query = event.target.value.trim().toLowerCase();
      document
        .querySelectorAll("[data-register-rows] tbody tr")
        .forEach(
          (row) => (row.hidden = Boolean(query) && !row.textContent.toLowerCase().includes(query)),
        );
    }
  });
  document.addEventListener("change", async (event) => {
    try {
      if (event.target.id === "company-switch") {
        state.companyId = event.target.value;
        await IA.Settings.set("activeCompany", state.companyId);
        await refresh();
        return navigate("dashboard", true);
      }
      if (event.target.id === "import-file" && event.target.files[0])
        return importWorkbook(event.target.files[0]);
      if (event.target.id === "restore-file" && event.target.files[0]) {
        const payload = await IA.Backup.read(event.target.files[0]);
        await IA.Backup.restore(payload, false);
        await refresh();
        shell();
        await navigate("companies", true);
        toast("Backup restored as additional company data.");
      }
    } catch (error) {
      console.error(error);
      toast(error.message, "error");
    }
  });
  window.addEventListener("popstate", () => navigate(location.hash.slice(1) || "dashboard", true));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modalRoot.children.length) {
      event.preventDefault();
      toast("Use the close button in the top-right corner to close this window.", "error");
    }
  });

  // Initialise storage, render the shell and attach browser event handlers.
  async function boot() {
    try {
      await IA.DB.init();
      await refresh();
      state.view = await IA.Settings.get("activeView", "managerial");
      state.route = location.hash.slice(1) || "dashboard";
      shell();
      app.hidden = false;
      document.getElementById("boot").remove();
      await navigate(state.route, true);
    } catch (error) {
      document.getElementById("boot").innerHTML =
        `<span>!</span><div><strong>The platform could not start</strong><small>${E(error.message)}</small></div>`;
      console.error(error);
    }
  }
  boot();
})();
