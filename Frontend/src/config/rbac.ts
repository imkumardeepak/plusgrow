import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Box,
  Building,
  ClipboardCheck,
  Factory,
  Layers,
  Map,
  MapPin,
  Move,
  Package,
  Printer,
  ScanLine,
  ShieldCheck,
  Truck,
  UserCog,
  Warehouse,
  Handshake,
} from "lucide-react";

export type PermissionAction = "view" | "create" | "edit" | "delete";

export type PagePermission = {
  id?: number;
  roleId?: number;
  pageKey: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

export const SYSTEM_PAGES = [
  { key: "inward", label: "Purchase Invoices", path: "/inward", group: "Inward", icon: ArrowDownToLine },
  { key: "inward-verify", label: "Inward Verify", path: "/inward-verify", group: "Inward", icon: ClipboardCheck },
  { key: "mrp-tracking", label: "MRP Tracking", path: "/mrp-tracking", group: "Inward", icon: Package },
  { key: "putaway", label: "Put Away", path: "/putaway", group: "Inward", icon: Warehouse },
  { key: "outward", label: "Sales Invoice", path: "/outward", group: "Outward", icon: ArrowUpFromLine },
  { key: "picking", label: "Picking", path: "/picking", group: "Outward", icon: ScanLine },
  { key: "packing", label: "Packing", path: "/packing", group: "Outward", icon: Package },
  { key: "dispatch", label: "Dispatch", path: "/dispatch", group: "Outward", icon: Truck },
  { key: "importers", label: "Importers", path: "/importers", group: "Master Data", icon: Building },
  { key: "manufacturers", label: "Manufacturers", path: "/manufacturers", group: "Master Data", icon: Factory },
  { key: "parties", label: "Parties", path: "/parties", group: "Master Data", icon: Handshake },
  { key: "commodities", label: "Commodities", path: "/commodities", group: "Master Data", icon: Layers },
  { key: "bins", label: "Bin Master", path: "/bins", group: "Master Data", icon: Box },
  { key: "locations", label: "Location Master", path: "/locations", group: "Master Data", icon: MapPin },
  { key: "bin-movement", label: "Bin Movement", path: "/bin-movement", group: "Master Data", icon: Move },
  { key: "mpd", label: "Products", path: "/mpd", group: "Inventory", icon: Box },
  { key: "product-query", label: "Product Query", path: "/product-query", group: "Inventory", icon: Package },
  { key: "product-movement", label: "Product Movement", path: "/product-movement", group: "Inventory", icon: Move },
  { key: "product-mrp-wise-quantity", label: "MRP Wise Quantity", path: "/product-mrp-wise-quantity", group: "Inventory", icon: Package },
  { key: "sticker-printer-config", label: "Printer Config", path: "/sticker-printer-config", group: "Master Data", icon: Printer },
  { key: "stock-check", label: "Stock Check", path: "/stock-check", group: "Inventory", icon: ClipboardCheck },
  { key: "stock-movement", label: "Stock Adjustment", path: "/stock-movement", group: "Inventory", icon: Move },
  { key: "warehouse-map", label: "Warehouse Map", path: "/warehouse-map", group: "Inventory", icon: Map },
  { key: "role-master", label: "Role Master", path: "/role-master", group: "Security", icon: ShieldCheck },
  { key: "user-master", label: "User Master", path: "/user-master", group: "Security", icon: UserCog },
  { key: "audit-logs", label: "Audit Logs", path: "/audit-logs", group: "Security", icon: ShieldCheck },
  { key: "profile", label: "My Profile", path: "/profile", group: "Security", icon: UserCog },
] as const;

export const PAGE_KEY_BY_PATH = SYSTEM_PAGES.reduce<Record<string, string>>(
  (map, page) => {
    map[page.path] = page.key;
    return map;
  },
  {},
);

export const emptyPagePermission = (pageKey: string): PagePermission => ({
  pageKey,
  canView: false,
  canCreate: false,
  canEdit: false,
  canDelete: false,
});
