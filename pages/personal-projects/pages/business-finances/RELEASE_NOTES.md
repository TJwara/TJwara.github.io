# Integrated Accounting Platform v0.1.4

Date: 9 August 2026

## Outcome

This is the first working release of the completely new platform. It is separate from the earlier Executive Finance Command Centre.

Version 0.1.4 fixes the real-browser company-creation defect caused by the hidden `id` input overriding the HTML form's JavaScript `id` property. Form routing now uses the immutable `id` attribute, and the exact Coursemaccon workflow has been verified repeatedly in Chromium from an extracted `file://` folder. All internal business-record IDs are now generated automatically, read-only in manual forms and prefilled/locked in the Excel template. Code-free workbooks are numbered in row order and linked records can be resolved by name. Supplier bills keep a separate automatic Bill ID and the supplier's external invoice number. Redundant Company Code and system-maintained accounting sheets were removed from the template. Administration now includes working Clear data and Delete company controls with typed confirmation, while register rows expose visible Edit and Delete actions. It retains relative deployment paths, cache-safe assets and the requested `#5e0a0a` and white theme.

The platform has one shared company foundation and two purpose-built views:

- Cost & Managerial Accounting;
- Financial Accounting.

## Included

- multi-company administration and isolated company records;
- company deletion and company-data clearing with typed confirmation;
- visible edit/delete actions for every user-added or imported register record;
- guided non-accountant data setup;
- product/service cost build-up with multiple materials, labour roles, equipment resources and operating steps;
- salary/wage normalisation and recurring-expense monthly equivalents;
- automatic overhead detection and allocation;
- price checking, target-margin floor and price/demand/capacity recommendation;
- break-even and margin of safety;
- budgets, ledger actuals and variances;
- production material/labour variances;
- project budgets, tasks, actual cost, physical progress, CPI, SPI, EAC, ETC, VAC and finish forecast;
- profitability, inventory, working capital and 12-month cash forecast;
- scenarios, management decisions, investment appraisal and tender pricing;
- standard chart of accounts and accounting calendar provisioning;
- balanced double-entry journal engine;
- automatic source journals for customer invoices, supplier bills, receipts, payments, bank transactions, inventory, bank openings, loan payments and owner/equity transactions;
- posted-source and closed-period controls;
- trial balance, general ledger, profit or loss, financial position and cash-flow statements;
- receivables/payables aging, bank control, tax, asset and loan reports;
- automated accounting-integrity review;
- 29 formatted reports with Excel, PDF, Word and Print output;
- protected 40-sheet Excel import template with one Read Me sheet, the Company sheet and 38 importable registers;
- automatic missing-company creation, company assignment by name and code-free row numbering;
- JSON backup and restore;
- modal windows that close only from the top-right close button;
- complete user guide in Markdown, Word and PDF;
- import-ready sample company workbook;
- automated test coverage for accounting and interaction controls.

## Verification result

The release test suite passed:

- source-document posting and journal balance;
- trial-balance equality;
- formal statements and aging;
- product costing, automatic overhead, price and break-even;
- Excel/PDF/Word report execution;
- closed-period and posted-source protection;
- live dashboard rendering;
- modal close rules;
- record editing, cascading deletion, company-data clearing and company deletion;
- full structured sample-workbook import, missing-company creation and post-import ledger balance;
- production build and workbook ZIP integrity.

## Deployment status

The `dist/` build is deployable as a static single-browser application for controlled evaluation or local operation.

It is not yet an approved multi-user cloud production environment. Authentication, role permissions, server-side concurrency, managed backups, immutable server logs, monitoring, jurisdiction-specific review and operational sign-off remain deployment responsibilities. See the User Guide section “Production readiness.”
