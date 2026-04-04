import { Product, Customer, PurchaseInvoice, SalesInvoice, Stock, Activity } from '../types';

export const initialProducts: Product[] = [
  { id: '1', sku: 'SKU-001', title: 'Wireless Mouse', vendor: 'TechCorp', mrpManual: 1500, mrpTally: 1450, netQty: 1, country: 'India', bestBefore: '2028-12-31', warranty: '1 Year' },
  { id: '2', sku: 'SKU-002', title: 'Mechanical Keyboard', vendor: 'TechCorp', mrpManual: 4500, mrpTally: 4500, netQty: 1, country: 'India', bestBefore: '2030-12-31', warranty: '2 Years' },
  { id: '3', sku: 'SKU-003', title: 'USB-C Cable', vendor: 'CableCo', mrpManual: 500, mrpTally: 600, netQty: 1, country: 'China', bestBefore: '2025-12-31', warranty: '6 Months' },
];

export const initialCustomers: Customer[] = [
  { id: '1', name: 'Acme Corp', address: '123 Business Rd, Mumbai', phone: '9876543210', email: 'contact@acme.com', ownership: 'Self' },
  { id: '2', name: 'Global Retail', address: '456 Market St, Delhi', phone: '9876543211', email: 'info@globalretail.com', ownership: '3rd Party' },
];

export const initialPurchaseInvoices: PurchaseInvoice[] = [
  { id: 'PI-1001', supplierName: 'TechCorp', piNumber: 'PI-1001', piDate: '2026-03-20', sku: 'SKU-001', quantity: 50, manufacturer: 'TechCorp', gst: 18, country: 'India', status: 'Open' },
  { id: 'PI-1002', supplierName: 'CableCo', piNumber: 'PI-1002', piDate: '2026-03-21', sku: 'SKU-003', quantity: 200, manufacturer: 'CableCo', gst: 18, country: 'China', status: 'Completed' },
];

export const initialSalesInvoices: SalesInvoice[] = [
  { id: 'SI-2001', customerName: 'Acme Corp', siNumber: 'SI-2001', siDate: '2026-03-22', sku: 'SKU-001', quantity: 10, status: 'Open' },
  { id: 'SI-2002', customerName: 'Global Retail', siNumber: 'SI-2002', siDate: '2026-03-23', sku: 'SKU-002', quantity: 5, status: 'Dispatched' },
];

export const initialStock: Stock[] = [
  // Assigned stock in bins
  { sku: 'SKU-001', quantity: 40, rack: 'A', shelf: 'S1', bin: 'B1' },
  { sku: 'SKU-002', quantity: 30, rack: 'A', shelf: 'S2', bin: 'B2' },
  { sku: 'SKU-003', quantity: 200, rack: 'B', shelf: 'S1', bin: 'B1' },
  // Unassigned stock (received but not put away)
  { sku: 'SKU-001', quantity: 60, rack: 'Unassigned', shelf: 'Unassigned', bin: 'Unassigned' },
  { sku: 'SKU-002', quantity: 20, rack: 'Unassigned', shelf: 'Unassigned', bin: 'Unassigned' },
  { sku: 'SKU-003', quantity: 300, rack: 'Unassigned', shelf: 'Unassigned', bin: 'Unassigned' },
];

export const initialActivities: Activity[] = [
  { id: 'A1', type: 'Inward', description: 'Received 200 units of SKU-003', date: '2026-03-21T10:00:00Z' },
  { id: 'A2', type: 'Outward', description: 'Dispatched 5 units of SKU-002', date: '2026-03-23T14:30:00Z' },
];
