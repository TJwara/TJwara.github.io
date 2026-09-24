# Integrated Accounting Platform

Version 0.1.4 — real-browser company creation correction

This is a separate platform built around one shared company database and two complete accounting views:

1. Cost & Managerial Accounting — product/service costing, automatic overhead allocation, salaries and operating costs, pricing, break-even, budgets, variances, projects, inventory, working capital, cash forecasts, scenarios, decisions, investment appraisal and tender pricing.
2. Financial Accounting — a genuine double-entry general ledger with receivables, payables, banking, tax, fixed assets, inventory, loans, equity, accounting periods, journals and formal financial statements.

The same products, customers, suppliers, employees, projects, cost centres and ledger actuals are used by both views.

## Run the platform

For local use, open a terminal in this folder and run:

```bash
npm install
npm run dev
```

Open the local address shown by Vite with `/business-finances.html` appended. For a production build, first align Vite's expected `index.html` entry with the actual `business-finances.html` source file. The current `npm run build` fails because that `index.html` source file is absent. Once corrected:

```bash
npm test
npm run build
```

A successful build writes the deployable static application to `dist/`.

Serve the source `business-finances.html` (or the built `dist/index.html`) through a local or web server so downloads and browser storage behave consistently.

## Start in the right order

1. Create a company. The platform automatically provisions its standard chart of accounts, tax codes, current-year accounting periods and starter bank register.
2. In Cost & Managerial Accounting, open **Guided data setup**.
3. Add products/services, materials, labour resources, equipment, employees/salaries and recurring expenses.
4. Open **Cost build-up** and link as many materials, labour roles, equipment resources and work steps as each product needs.
5. Check the Pricing Centre and Break-even report.
6. In Financial Accounting, add customers, suppliers, invoices, bills, receipts, payments, bank transactions, assets and loans.
7. Approve or post source documents. The platform generates balanced journals automatically.
8. Review Accounting Integrity, close completed periods and download the financial reports.

## Editing, deleting and clearing data

Every user-added or Excel-imported register row has visible **Edit** and **Delete** actions. Confirmed deletion also removes dependent records and generated journals so incomplete links are not left behind. Approved source documents can be corrected; their generated journal is replaced and recalculated automatically. Posted manual journals remain controlled through reversal.

In **Administration → Companies**, use **Clear data** to remove all records while keeping the company and rebuilding its clean accounting foundation. Use **Delete company** to permanently remove the company and everything assigned to it. These actions require typing `CLEAR` or `DELETE`.

## Excel import

Use **Administration → Import & backup → Download Excel template**. The template includes:

- a `Company` sheet;
- one protected sheet for each supported register;
- fixed sheet names and column keys;
- required-field markers;
- locked headings, descriptions and automatic IDs;
- unlocked input rows with allowed-value lists.

Every data sheet may use Company Name; it is unnecessary in a workbook containing only one company. Company Code and all internal record codes are generated automatically. Code columns may be omitted from another structured workbook: records are numbered in row order, and linked fields can be resolved by either name or code. The template excludes system-maintained chart-of-account, tax-code, accounting-period and journal sheets.

## Report output

The platform includes 29 report definitions across both views. Every report page supports:

- formatted Excel workbooks;
- PDF;
- Word;
- print.

## Controls and limitations

- Posted journals must balance and can only use active posting accounts.
- A closed accounting period blocks new journals.
- Posted journals are reversed with a new equal-and-opposite journal; they are not deleted.
- The accounting-integrity page checks the trial balance, journals, closed periods, bank classification and old receivables.
- Modals do not close when the backdrop or Escape key is used. Use the top-right close button.
- This edition stores data in the current browser using IndexedDB. It is suitable for controlled single-browser evaluation and local operation. A multi-user production release still needs server-side authentication, a managed database, access roles, encrypted backups, monitoring and deployment-specific tax/legal review.

See `training-pack/INTEGRATED_ACCOUNTING_USER_GUIDE.md` for full training and `training-pack/Integrated_Accounting_Sample_Data.xlsx` for import-ready sample data.
