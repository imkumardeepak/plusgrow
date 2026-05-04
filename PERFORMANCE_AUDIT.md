# PlusGrow Long-Term Performance Audit

Date: 2026-05-04

## Goal

Keep the WMS responsive as PostgreSQL grows over many years. The main rule is simple: operational pages should not load full transaction tables into the browser. Large tables need server-side paging, filtering, summary endpoints, and indexes that match the actual workflows.

## Immediate Fix Applied

- Added `GET /api/dashboard/summary`.
- Updated `Frontend/src/pages/Dashboard.tsx` to use the summary endpoint instead of calling many `getAll()` APIs.
- Added server-side pagination support to the shared `MantineDataTable`.
- Added server-side `page` / `pageSize` support to `GET /api/poinvoices`.
- Added server-side `page` / `pageSize` support to `GET /api/outwardorders`.
- Added shared `ListQueryDto` pattern with `page`, `pageSize`, `search`, `sortBy`, and `sortDirection`.
- Added paged/search/sort support to `GET /api/products`, `GET /api/manufacturers`, `GET /api/importers`, and `GET /api/commodities`.
- Added frontend `getPaged()` API client methods for products, manufacturers, importers, and commodities.
- Updated `Inward.tsx` to use paged PO invoice rows.
- Updated `Sticker.tsx` to use paged PO invoice rows.
- Updated `Outward.tsx` to use paged outward-order rows and avoid reloading product metadata on every filter/page change.
- Updated high-volume dropdowns in `Inward.tsx`, `Outward.tsx`, and `Sticker.tsx` to use server-side lookup search for products/manufacturers/importers.
- Added EF model indexes and migration `AddLongTermPerformanceIndexes` for hot dashboard and operation paths:
  - `po_invoices.printed`
  - `po_invoices.location_allotted`
  - `po_invoices.remaining_allocation`
  - `po_invoices(product_id, remaining_allocation, invoice_date)`
  - `outward_orders(status, order_date)`
  - `product_quantities.current_quantity`
  - `product_allotted_locations.updated_at`

## Highest-Risk Pages

- `Dashboard.tsx`: fixed now. It uses a compact summary endpoint and bounded top/latest lists.
- `Inward.tsx`: PO invoice rows are paged now. Product dropdown uses server search now.
- `Sticker.tsx`: PO invoice rows are paged now. Manufacturer/importer dropdowns use server search now. Selected product master detail loads by id only when a row is opened.
- `PutAway.tsx`: loads product quantities, allotted locations, and PO invoices together. Needs a paged/filtered put-away task endpoint.
- `Outward.tsx`: outward-order rows are paged now. Product dropdown uses server search now.
- `Packing.tsx`, `Dispatch.tsx`: load outward orders, then filter in browser. Need server-side status filters with page/pageSize.
- `StockMovement.tsx`: currently limits movements to 200 on the API, which is good, but the page also loads all products and quantities. Needs paged movement search and product lookup.
- `WarehouseMap.tsx`: loads all locations and all allotted-location JSON, then builds the map in browser. Acceptable for small warehouses, but large warehouses need aisle/rack filters and location-summary endpoints.
- Master pages (`MPD.tsx`, `Manufacturers.tsx`, `Commodities.tsx`, `Importers.tsx`, `Bins.tsx`, `Locations.tsx`, `StickerPrinterConfigMaster.tsx`): all currently load full lists and filter in browser. These should move to server-side paging before production data becomes large.

## Backend Patterns To Change Next

- Add a shared paged response shape for list endpoints: `page`, `pageSize`, `total`, `items`.
- Default page size should be 25 or 50. Hard cap should be 200.
- Use `AsNoTracking()` on read-only list and dashboard queries.
- Avoid `ToLower().Contains(...)` on large tables. Prefer normalized searchable columns or PostgreSQL trigram/full-text indexes for product/customer/invoice search.
- Never return full transaction history for dashboards. Use summary endpoints with aggregate SQL.
- Keep Excel upload batch saves outside per-row loops where possible.

## Database Notes

- Existing indexes already cover many FK and unique paths.
- New indexes cover current pending-work and dashboard paths.
- For very large search workloads, add PostgreSQL `pg_trgm` indexes for product name/SKU, party name, customer name, invoice number, and order number.
- Consider monthly/yearly archival tables for completed `po_invoices`, dispatched `outward_orders`, and old `product_stock_movements` when history becomes very large.
