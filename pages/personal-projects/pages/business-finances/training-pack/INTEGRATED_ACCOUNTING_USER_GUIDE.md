# Integrated Accounting Platform — Complete User Training

## 1. What this platform does

The platform keeps two kinds of accounting separate enough to remain clear, but connected enough to use one set of facts.

**Cost & Managerial Accounting** answers internal questions: What does a product or service really cost? How should overhead be allocated? What price could cover every cost and reach the target margin? How much must be sold to break even? Is a project on time and budget? What happens if price, volume or cost changes?

**Financial Accounting** records formal transactions: who owes the company, who the company owes, what is in the bank, what assets and loans exist, and which debits and credits make up the financial statements.

Use the switch at the bottom of the navigation to move between the two views. Changing the view does not change or duplicate company data.

## 2. First-time setup

### Step 1 — Create the company

Open **Administration → Companies → Add company**. Enter:

- the legal and trading names;
- currency;
- financial year-end month;
- VAT or sales-tax registration and rate;
- registration/tax numbers and address if available.

The Company Code is generated automatically from the legal name. After saving, the platform creates a standard chart of accounts, tax codes, twelve accounting periods for the current calendar year and a starter bank register. A finance manager can later tailor those registers.

### Managing, editing and deleting information

Every register shows **Edit** and **Delete** beside the records you add manually or import from Excel. Editing an approved source document replaces its generated journal and posts the corrected amount once, so the ledger is not duplicated. Deleting a record also removes records and generated journals that depend on it after you confirm the warning. Posted manual journals remain protected; reverse them instead of deleting them.

Open **Administration → Companies** for company-level controls:

- **Edit** changes the company profile.
- **Clear data** keeps the company but removes all of its records. Type `CLEAR` to confirm. The platform then prepares a clean chart of accounts, tax codes, accounting periods and starter bank register so the company remains usable.
- **Delete company** removes the company, all of its records and its audit history. Type `DELETE` to confirm.

Export a backup before clearing or permanently deleting important information.

### Step 2 — Add what the company sells

Open **Cost & Managerial Accounting → Products & services**. For every product or service enter the unit sold, current selling price, normal monthly sales quantity and target margin.

The product/service code is generated automatically and cannot be changed accidentally. The same rule applies to customers, suppliers, projects, materials, labour, equipment, documents and operational records.

### Step 3 — Add materials

Open **Materials**. Enter every physical input, consumable or purchased component, its unit of measure and standard cost. Standard cost is the expected normal cost per material unit.

### Step 4 — Add labour

Use both labour registers for different purposes:

- **Labour resources** define the hourly cost of a role or trade used in a product/service cost card.
- **Salaries & wages** define actual people/contractors, pay basis, base pay, overtime, allowances and employer contributions.

The platform converts hourly, daily, weekly, fortnightly, monthly and annual pay into a monthly employment cost. People not assigned directly to a product or project become indirect cost and are automatically included in overhead.

### Step 5 — Add equipment

Enter each equipment resource and choose Owned, Rented or Leased. For owned equipment, enter operating and depreciation cost per hour. For rented or leased equipment, enter the hire/lease and operating rate. Product costing uses the appropriate hourly total.

### Step 6 — Add every recurring expense

Open **Rent, utilities & expenses**. Add rent, electricity, water, insurance, software, security, transport, internet, professional fees and every other recurring payment. Choose its frequency. The platform converts weekly, quarterly, six-monthly and annual payments to a monthly equivalent.

Avoid leaving out a cost just because it is “not production.” Indirect costs must still be recovered through sales.

### Step 7 — Build each product/service cost

Open **Cost build-up**. Each product has four Add buttons:

1. **Material** — add multiple materials, quantities per output unit and expected wastage.
2. **Labour** — add multiple roles, hours per unit and overtime mix.
3. **Equipment** — add multiple resources and hours per unit.
4. **Work step** — add process sequence, setup time, run time, waiting time and normal batch size.

The resulting cost card shows material, labour, equipment, automatically allocated overhead, full cost, selling price, unit profit and margin.

## 3. Automatic overhead allocation

Indirect salaries, recurring operating expenses and depreciation are detected automatically when they are not assigned directly to a product or project. Entered overhead pools may use:

- expected sales value;
- expected units;
- direct labour hours;
- equipment hours;
- direct cost;
- equal share.

The allocation appears in the **Automatic Overhead Allocation** report. Review it whenever products, expected volumes, staffing or operating expenses change.

## 4. Pricing and break-even

Open **Pricing centre**. For every product the platform compares:

- direct cost;
- full cost after overhead;
- entered selling price;
- target-margin price;
- an estimated profit-maximising price;
- recommended selling price.

For a stronger model, add Pricing Assumptions: reference price, baseline demand, estimated price sensitivity, price range, increment and capacity.

The recommendation tests prices inside that range, estimates quantity using the entered price sensitivity, finds the largest expected monthly contribution, and ensures the recommendation is not below the full-cost target-margin floor. It is decision support, not a guarantee of market behaviour. Consider competitors, customer value, capacity, legal restrictions and commercial strategy.

The **Break-even & Margin of Safety** report calculates how many weighted units and how much revenue are needed to cover direct costs plus all monthly overhead. If expected units are below break-even, the dashboard explains that expected sales will not cover everything.

## 5. Project cost and schedule control

1. Add a Project with planned dates, contract value and approved cost budget.
2. Add Project Tasks/WBS with dates, task budgets and progress weights.
3. Add Project Costs as spending or committed amounts.
4. Add Progress Updates using physical completion evidence.

The project page calculates:

- Planned Value (PV): budgeted work that should have been completed;
- Earned Value (EV): budgeted value of work actually completed;
- Actual Cost (AC): approved costs recorded;
- CPI: cost efficiency (`EV ÷ AC`);
- SPI: schedule efficiency (`EV ÷ PV`);
- EAC: forecast final cost;
- ETC: forecast remaining cost;
- VAC: forecast budget surplus or overrun;
- forecast finish date and forecast profit.

Below 1.00 means behind the ideal. Below 0.90 marks a project At risk.

## 6. Budgets, actuals and variances

Add Budget Lines by month, general-ledger account and optional cost centre, product or project. Approve or revise them. The **Budget vs Actual** report obtains actual results from posted journals, so the management report and financial ledger agree.

Add Production Actuals to compare actual material quantity/cost and labour hours/cost with the standard product requirements. Positive variances are favourable; negative variances are unfavourable.

## 7. Financial Accounting workflow

### Customers and sales

1. Add the Customer.
2. Add a Customer Invoice.
3. Set it to Approved when checked.
4. The platform debits Trade Receivables and credits Revenue and Output Tax.
5. Add a Customer Receipt and set it to Posted.
6. The platform debits Bank and credits Trade Receivables.

Use **Receivables Aging** to follow up unpaid and overdue invoices.

### Suppliers and purchases

1. Add the Supplier.
2. Add a Supplier Bill and choose the expense or asset account.
3. Set it to Approved.
4. The platform debits the expense/asset and Input Tax, then credits Trade Payables.
5. Add a Payment and set it to Posted.
6. The platform debits Trade Payables (or the chosen debit account) and credits Bank.

Use **Payables Aging** to plan supplier payments.

### Bank transactions

Import or add statement transactions. Transaction ID is created automatically as `TRAN-001`, `TRAN-002`, `TRAN-003` and so on. The Transaction ID cells are already completed and locked in the Excel template. Money Out is a bank credit; Money In is a bank debit. The bank reference, other general-ledger account, posting status and reconciliation status are optional during initial import. A blank posting status becomes Unclassified. Choose the other general-ledger account and change the status to Ready to post when the transaction has been reviewed. The generated journal is balanced automatically. Mark the item Reconciled after matching it to the statement.

### Fixed assets

Add purchase cost, residual value, useful life, depreciation method and ledger accounts. The asset report estimates accumulated depreciation and carrying amount as of the report date.

### Loans

Add the opening principal, interest rate, term, instalment, liability account, interest account and bank. Posted Loan Payments split principal, interest and fees into their correct accounts.

### Manual journals

Use a manual journal only when a source workflow does not represent the transaction. Select at least two posting accounts and enter positive amounts on one side of each line. Total debit must equal total credit. Draft journals do not affect reports. Posted journals do.

## 8. Accounting periods and corrections

Close a completed month in **Accounting Periods**. Closed periods reject new or changed postings.

Do not delete or silently edit a posted journal. Open it and use **Reverse journal**. The platform creates an equal-and-opposite entry with its own number, date and audit trail.

Before distributing financial reports, open **Accounting Integrity** and resolve critical findings.

## 9. Financial statements and reports

Financial Accounting produces:

- Trial Balance;
- General Ledger;
- Journal Register;
- Statement of Profit or Loss;
- Statement of Financial Position;
- Statement of Cash Flows;
- Receivables and Payables Aging;
- Bank Control & Reconciliation;
- VAT / Sales Tax Control;
- Fixed Asset Register;
- Loans & Borrowings;
- Accounting Integrity Review.

Cost & Managerial Accounting produces management summary, product costing, pricing, overhead, break-even, budget, variance, project, profitability, inventory, working-capital, cash-forecast, scenario, decision, investment and tender reports.

Each report has Excel, PDF, Word and Print buttons.

## 10. Excel import training

1. Open **Administration → Import & backup**.
2. Download the template.
3. Keep worksheet names and row-2 column keys unchanged.
4. Enter companies on the Company sheet from row 5 downward.
5. If the workbook contains more than one company, enter the matching Company Name on each data row. For a one-company workbook, it may be left blank.
6. Automatic ID and code columns are prefilled and locked. Do not type codes.
7. If another structured workbook has no code columns, the platform generates the first code for the first item, the second code for the second item, and so on.
8. Linked fields may use either the automatic code or the record's name.
9. Use the drop-down values where supplied.
10. Do not type over locked examples or instructions.
11. Upload the completed workbook.
12. Review the row-by-row Import Result.

The importer checks all sheets, creates missing companies, generates missing internal IDs in row order, resolves linked records by code or name, prepares each accounting foundation, imports dependencies in the correct order and automatically posts eligible approved/posted source documents.

## 11. Sample-data exercise

Use `Integrated_Accounting_Sample_Data.xlsx` from this folder:

1. Import the workbook.
2. Open the newly created DEMO company.
3. In Cost & Managerial Accounting, inspect Management Dashboard, Cost build-up, Pricing Centre and Project Control.
4. Open the Product Costing, Pricing, Break-even and Project reports.
5. Switch to Financial Accounting.
6. Inspect the generated journals, Trial Balance, Profit or Loss, Financial Position, Receivables/Payables Aging and Bank Control.
7. Add a new receipt against an invoice and confirm receivables decrease while bank increases.
8. Download the same report as Excel, PDF and Word.
9. Download a backup.

## 12. Production readiness

The accounting logic and browser application are tested, but this package is not yet a complete multi-user cloud production environment. Before public or regulated production use, add:

- authenticated users and role-based permissions;
- server-side database and concurrency control;
- organisation-managed encrypted backups and tested disaster recovery;
- approval workflow and segregation of duties;
- immutable server audit logging;
- jurisdiction-specific tax, payroll and reporting configuration;
- security testing, monitoring, privacy documentation and operational support;
- migration/reconciliation controls and professional sign-off on opening balances.

For evaluation, use sample data in a separate company and keep regular backups.
