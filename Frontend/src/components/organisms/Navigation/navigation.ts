import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Box as BoxIcon,
  Building,
  ClipboardCheck,
  Factory,
  FileText,
  LayoutDashboard,
  Layers,
  LucideIcon,
  Map,
  MapPin,
  Move,
  Package,
  Printer,
  ScanLine,
  ShieldCheck,
  QrCode,
  Truck,
  User,
  UserCog,
  Warehouse,
  Handshake,
  Activity,
} from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  badge?: number | string;
}

export interface NavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}

export const navigationGroups: NavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        href: "/",
      },
    ],
  },
  {
    id: "master",
    label: "Master Data",
    icon: Layers,
    items: [
      {
        id: "importers",
        label: "Legal Meta",
        icon: Building,
        href: "/importers",
      },
      {
        id: "manufacturers",
        label: "Manufacturers",
        icon: Factory,
        href: "/manufacturers",
      },
      {
        id: "parties",
        label: "Ownership",
        icon: Handshake,
        href: "/parties",
      },
      {
        id: "commodities",
        label: "Commodities",
        icon: Layers,
        href: "/commodities",
      },
      {
        id: "bins",
        label: "Bin Master",
        icon: BoxIcon,
        href: "/bins",
      },
      {
        id: "locations",
        label: "Location Master",
        icon: MapPin,
        href: "/locations",
      },
      {
        id: "sticker-printer-config",
        label: "Printer Config",
        icon: Printer,
        href: "/sticker-printer-config",
      },
    ],
  },
  {
    id: "inward",
    label: "Inward Operations",
    icon: ArrowDownToLine,
    items: [
      {
        id: "inward",
        label: "Purchase Invoices",
        icon: ArrowDownToLine,
        href: "/inward",
      },
      {
        id: "inward-verify",
        label: "Inward Verify",
        icon: QrCode,
        href: "/inward-verify",
      },
      {
        id: "putaway",
        label: "Put Away",
        icon: Warehouse,
        href: "/putaway",
      },
    ],
  },
  {
    id: "outward",
    label: "Outward Operations",
    icon: ArrowUpFromLine,
    items: [
      {
        id: "outward",
        label: "Sales Invoice",
        icon: ArrowUpFromLine,
        href: "/outward",
      },
      {
        id: "picking",
        label: "Picking",
        icon: ScanLine,
        href: "/picking",
      },
      {
        id: "packing",
        label: "Packing",
        icon: Package,
        href: "/packing",
      },
      {
        id: "dispatch",
        label: "Dispatch",
        icon: Truck,
        href: "/dispatch",
      },
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    icon: ClipboardCheck,
    items: [
      {
        id: "mpd",
        label: "Products",
        icon: BoxIcon,
        href: "/mpd",
      },
      {
        id: "stock-check",
        label: "Stock Check",
        icon: ClipboardCheck,
        href: "/stock-check",
      },
      {
        id: "product-mrp-wise-quantity",
        label: "Product MRP Wise Quantity",
        icon: FileText,
        href: "/product-mrp-wise-quantity",
      },
      {
        id: "product-query",
        label: "Product Query",
        icon: ScanLine,
        href: "/product-query",
      },
      {
        id: "product-movement",
        label: "Product Movement",
        icon: Move,
        href: "/product-movement",
      },
      {
        id: "stock-movement",
        label: "Stock Adjustment",
        icon: Move,
        href: "/stock-movement",
      },
      {
        id: "warehouse-map",
        label: "Warehouse Map",
        icon: Map,
        href: "/warehouse-map",
      },
    ],
  },
  {
    id: "security",
    label: "Security",
    icon: ShieldCheck,
    items: [
      {
        id: "profile",
        label: "My Profile",
        icon: User,
        href: "/profile",
      },
      {
        id: "role-master",
        label: "Role Master",
        icon: ShieldCheck,
        href: "/role-master",
      },
      {
        id: "user-master",
        label: "User Master",
        icon: UserCog,
        href: "/user-master",
      },
      {
        id: "audit-logs",
        label: "Audit Logs",
        icon: Activity,
        href: "/audit-logs",
      },
    ],
  },
];
