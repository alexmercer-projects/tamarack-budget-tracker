# Tamarack Build Co.: project budget and payment tracker

A budget and payment tracker for a made-up home builder, delivered two ways: a live dashboard and an Excel workbook. It shows budget vs paid by category, a filterable payments log, change orders, and flags for payments with no receipt.

This is a concept demo. Tamarack Build Co. is not a real company. Every name, invoice, and dollar amount is example data.

## View it

Live demo: https://alexmercer-projects.github.io/tamarack-budget-tracker/

Or open `docs/index.html` in a browser. There is no build step.

The matching workbook is `docs/Tamarack-budget-tracker-DEMO.xlsx` (also linked from the dashboard). Yellow cells in the workbook are inputs. The rest are formulas.

## What's in it

- Remaining balance, revised budget, paid to date, pending change orders, and missing receipts
- Category rollups (budget, approved change orders, paid, remaining, percent spent, status)
- A payments log with search and filters
- A change-order log. Only approved rows hit the revised budget.
- An Excel file with five tabs: Read Me, Budget vs Paid, Payments, Change Orders, and Lists

## Tech

The dashboard is HTML, CSS, and vanilla JavaScript (`docs/js/`). The workbook is a regular `.xlsx` with SUMIFS rollups and dropdowns.

## Contact

[alexmercer.projects@gmail.com](mailto:alexmercer.projects@gmail.com)
