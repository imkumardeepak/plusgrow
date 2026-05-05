import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Box as BoxIcon,
  Building,
  ClipboardCheck,
  Factory,
  LayoutDashboard,
  Layers,
  LucideIcon,
  Map,
  MapPin,
  Move,
  Package,
  Printer,
  Truck,
  User,
  Warehouse,
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
        label: "Importers",
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
        id: "mpd",
        label: "Products",
        icon: BoxIcon,
        href: "/mpd",
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
        label: "Sales Orders",
        icon: ArrowUpFromLine,
        href: "/outward",
      },
      {
        id: "packing",
        label: "Picking & Packing",
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
        id: "stock-check",
        label: "Stock Check",
        icon: ClipboardCheck,
        href: "/stock-check",
      },
      {
        id: "stock-movement",
        label: "Stock Movement",
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
    id: "account",
    label: "Account",
    icon: User,
    items: [
      {
        id: "profile",
        label: "My Profile",
        icon: User,
        href: "/profile",
      },
    ],
  },
];
