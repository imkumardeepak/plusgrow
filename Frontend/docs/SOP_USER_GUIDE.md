# PlusGrow WMS Frontend SOP and User Guide

> Application: PlusGrow Warehouse Management System (WMS) frontend  
> Frontend path: `Frontend/`  
> Local URL: `http://localhost:3000`  
> Backend API expected by frontend: `http://localhost:5179/api` or `VITE_API_URL` from `.env.local`

## 1. Purpose

This SOP explains how to start the PlusGrow WMS website and how an end user can use the main warehouse workflows: login, dashboard, master data, inward receiving, put-away, outward order creation, picking and packing, dispatch, stock check, stock movement, warehouse map, and profile management.

## 2. Project Analysis Summary

The frontend is a Vite + React + TypeScript application using Mantine UI, React Router, React Query, Axios, Recharts, SignalR, and custom WMS components.

### Main routes

| Module | URL | Purpose |
|---|---|---|
| Login | `/login` | Operator sign-in |
| Register | `/register` | Request/create operator credentials |
| Dashboard | `/` | WMS overview, KPIs, live activity |
| Importers | `/importers` | Importer master data |
| Manufacturers | `/manufacturers` | Manufacturer master data |
| Commodities | `/commodities` | Commodity master data |
| Bin Master | `/bins` | Bin definitions |
| Location Master | `/locations` | Warehouse location setup |
| Products | `/mpd` | Product master data, upload, pricing, SKU details |
| Printer Config | `/sticker-printer-config` | Sticker printer setup |
| Purchase Invoices | `/inward` | Inward PO invoice entries and sticker workflow |
| Put Away | `/putaway` | Allocate received stock to warehouse locations |
| Sales Invoice | `/outward` | Create outbound/customer orders |
| Picking & Packing | `/packing` | Pick and pack outbound orders |
| Dispatch | `/dispatch` | Dispatch packed orders |
| Stock Check | `/stock-check` | SKU scan/search and inventory lookup |
| Stock Movement | `/stock-movement` | Review stock movement history |
| Warehouse Map | `/warehouse-map` | Visual location/stock map |
| My Profile | `/profile` | User profile and password management |

## 3. How to Run the Project

### 3.1 Prerequisites

- Node.js installed.
- Backend API running if you want live data and login from database.
- Optional `.env.local` file in `Frontend/`.

### 3.2 Environment configuration

Create `Frontend/.env.local` if needed:

```env
VITE_API_URL=http://localhost:5179/api
VITE_SUPERADMIN_USER=superadmin
VITE_SUPERADMIN_PASS=Super@Admin@2024
```

If `.env.local` is missing, the frontend defaults to:

```text
http://localhost:5179/api
```

### 3.3 Install and start

From the repository root:

```bash
cd Frontend
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

### 3.4 Build and validate

```bash
cd Frontend
npm run lint
npm run build
```

Validation performed during this SOP creation:

```text
npm run lint -> passed
npm run dev  -> Vite started successfully on http://localhost:3000
```

## 4. Login and Access

1. Open `http://localhost:3000/login`.
2. Enter your operator username and password.
3. Click **Sign In**.
4. On successful login, the system opens the dashboard.

Demo credentials shown in the UI:

```text
Username: admin
Password: admin123
```

> Note: Login requires the backend API to be running. If the backend is stopped, authentication and live data calls will fail.

![Login screen](./screenshots/login.png)

## 5. User Registration / Credential Request

1. On the login screen, click **Request credentials**.
2. Fill the registration form.
3. Submit the request.
4. After successful registration, return to login and sign in.

![Register screen](./screenshots/register.png)

## 6. Dashboard Usage

The dashboard is the command center for warehouse operations.

Use it to:

- Review inventory units and SKU coverage.
- See inbound purchase invoice status.
- Monitor dispatch order status.
- Check warehouse utilization and stock positions.
- Navigate quickly to stock check, inward, outward, and warehouse map modules.

Steps:

1. Login to the application.
2. Open **Overview > Dashboard** from the sidebar.
3. Review cards, charts, dispatch queue, and recent movements.
4. Click any metric card to open the related workflow.

![Dashboard](./screenshots/dashboard.png)

## 7. Master Data SOP

Master data should be configured before daily warehouse operations.

### 7.1 Importers

Use **Master Data > Importers** to add or maintain importer details.

Typical use:

1. Open **Importers**.
2. Click **Add** or equivalent action.
3. Enter importer name and address/contact details.
4. Save.
5. Use search/filter to find existing importer records.

### 7.2 Manufacturers

Use **Master Data > Manufacturers** to maintain product manufacturers.

Typical use:

1. Open **Manufacturers**.
2. Add manufacturer details.
3. Save and verify the record appears in the table.

### 7.3 Commodities

Use **Master Data > Commodities** to define product commodity categories.

Typical use:

1. Open **Commodities**.
2. Add commodity/category name.
3. Save.

### 7.4 Bin and Location Master

Use these screens to prepare warehouse storage structure.

- **Bin Master**: define bins.
- **Location Master**: define warehouse location codes.

Typical use:

1. Create required bin codes.
2. Create location codes.
3. Use the locations later in Put Away and Warehouse Map.

### 7.5 Products / MPD

Use **Master Data > Products** to manage SKU/product master data.

Main actions:

- Add a product manually.
- Edit product information.
- Delete product records when allowed.
- Upload product sheet.
- Download product template.
- Search products by SKU/name.
- Filter mapped/unpriced products.

Recommended product setup order:

1. Add commodities.
2. Add manufacturers.
3. Open **Products**.
4. Add or upload products with SKU, name, commodity, manufacturer, country of origin, net quantity, unit type, USSP, MRP, and best-before months.
5. Verify the product appears in search/table.

![Products master data](./screenshots/masters-products.png)

### 7.6 Printer Config

Use **Master Data > Printer Config** to configure sticker/label printing settings before inward sticker printing.

## 8. Inward Operations SOP

Inward operations handle receiving goods, creating purchase invoice rows, and printing stickers.

### 8.1 Purchase Invoices

Use **Inward Operations > Purchase Invoices**.

Main actions:

- Add purchase invoice row.
- Select invoice date, party name, product, and billed quantity.
- Search/filter invoice rows.
- Filter by pending/printed status.
- Print stickers.
- Edit/delete invoice rows when allowed.

Steps:

1. Open **Purchase Invoices**.
2. Click **Add** or **New Invoice**.
3. Select product and enter billed quantity.
4. Save the invoice row.
5. Print stickers if labels are required.
6. Confirm printed rows before put-away.

![Purchase invoices / Inward](./screenshots/inward.png)

### 8.2 Put Away

Use **Inward Operations > Put Away** to move received stock into warehouse locations.

Steps:

1. Open **Put Away**.
2. Select or search SKU/invoice rows pending put-away.
3. Assign quantity to bin/location.
4. Save the allocation.
5. Verify that stock appears in Stock Check and Warehouse Map.

![Put Away](./screenshots/putaway.png)

## 9. Outward Operations SOP

Outward operations handle customer order creation, picking, packing, and dispatch.

### 9.1 Sales Invoice / Outward Order

Use **Outward Operations > Sales Invoice**.

Main actions:

- Create outbound order.
- Enter order date, customer name, product, quantity, and notes.
- Filter by status: Open, Picking, Packed, Dispatched.
- Search customer/order/product records.

Steps:

1. Open **Sales Invoice**.
2. Click **Add Order**.
3. Select product and enter quantity.
4. Save the order.
5. Order starts as **Open** and proceeds through picking, packing, and dispatch.

![Outward orders](./screenshots/outward.png)

### 9.2 Picking & Packing

Use **Outward Operations > Picking & Packing**.

Steps:

1. Open **Picking & Packing**.
2. Select an open/picking order.
3. Pick available stock from warehouse locations.
4. Confirm picked quantity.
5. Pack the order.
6. Verify the status changes to **Packed**.

![Picking and packing](./screenshots/packing.png)

### 9.3 Dispatch

Use **Outward Operations > Dispatch**.

Steps:

1. Open **Dispatch**.
2. Review packed orders pending dispatch.
3. Confirm dispatch details.
4. Mark order as dispatched.
5. Verify status is **Dispatched**.

![Dispatch](./screenshots/dispatch.png)

## 10. Inventory SOP

### 10.1 Stock Check

Use **Inventory > Stock Check** to scan or search a SKU and view inventory details.

Steps:

1. Open **Stock Check**.
2. Enter or scan SKU.
3. Review product details, PO quantity, location stock, pricing, and related records.
4. Use links to jump to product master, inward records, or warehouse location data.

![Stock check](./screenshots/stock-check.png)

### 10.2 Stock Movement

Use **Inventory > Stock Movement** to audit movement history.

Typical use:

1. Open **Stock Movement**.
2. Search/filter by SKU, movement type, or date if available.
3. Review inward, put-away, picking, packing, and dispatch movement records.

### 10.3 Warehouse Map

Use **Inventory > Warehouse Map** for a visual overview of warehouse locations and stock placement.

Steps:

1. Open **Warehouse Map**.
2. Review occupied and available locations.
3. Search or inspect SKU/location details.
4. Use it during put-away and stock audits.

![Warehouse map](./screenshots/warehouse-map.png)

## 11. Profile and Account SOP

Use **Account > My Profile**.

Main actions:

- View logged-in user details.
- Review role information.
- Change password where enabled.
- Logout from the header profile menu.

Steps:

1. Open **My Profile** from the sidebar or header avatar menu.
2. Review profile details.
3. Use password change form if required.
4. Click logout when finished.

![Profile](./screenshots/profile.png)

## 12. Recommended Daily Operating Sequence

Follow this sequence for normal warehouse execution:

1. Login.
2. Check dashboard alerts and KPIs.
3. Verify master data if new products/importers/manufacturers are needed.
4. Create inward purchase invoices.
5. Print stickers.
6. Put away received quantity into locations.
7. Use stock check to verify available inventory.
8. Create outward/customer order.
9. Pick and pack order.
10. Dispatch packed order.
11. Review stock movement and dashboard for final verification.

## 13. Troubleshooting

| Problem | Possible reason | Solution |
|---|---|---|
| Cannot login | Backend API is not running or credentials are wrong | Start backend API and verify username/password |
| Dashboard shows load errors | API unavailable or database has no data | Check `VITE_API_URL`, backend server, and database |
| Product dropdown is empty | Product master data not configured | Add products in **Products** master |
| Put-away has no rows | No inward pending rows or stickers/receiving not completed | Add inward invoice and complete required previous step |
| Dispatch has no rows | No packed order available | Complete outward order, picking, and packing first |
| Sticker printing fails | Printer config missing | Configure **Printer Config** |
| Page redirects to login | Token expired or user not authenticated | Login again |

## 14. Screenshots Captured

Screenshots are stored in:

```text
Frontend/docs/screenshots/
```

Captured screens:

- `login.png`
- `register.png`
- `dashboard.png`
- `inward.png`
- `putaway.png`
- `outward.png`
- `packing.png`
- `dispatch.png`
- `masters-products.png`
- `stock-check.png`
- `warehouse-map.png`
- `profile.png`
