import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Anchor,
  Breadcrumbs as MantineBreadcrumbs,
  Group,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { Home } from "lucide-react";
import { cn } from "../../../../lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
  showHome?: boolean;
  homeHref?: string;
}

const routeLabels: Record<string, string> = {
  "/": "Dashboard",
  "/importers": "Importers",
  "/manufacturers": "Manufacturers",
  "/commodities": "Commodities",
  "/bins": "Bin Master",
  "/locations": "Location Master",
  "/inward": "Purchase Invoices",
  "/putaway": "Put Away",
  "/outward": "Sales Orders",
  "/picking": "Picking",
  "/packing": "Packing",
  "/dispatch": "Dispatch",
  "/mpd": "Products",
  "/mcd": "Customers",
  "/stock-check": "Stock Check",
  "/stock-movement": "Stock Movement",
  "/warehouse-map": "Warehouse Map",
  "/profile": "My Profile",
};

export function Breadcrumbs({
  items,
  className,
  showHome = true,
  homeHref = "/",
}: BreadcrumbsProps) {
  const location = useLocation();

  const breadcrumbItems: BreadcrumbItem[] =
    items ||
    (() => {
      const path = location.pathname;
      if (path === "/") {
        return [{ label: "Dashboard" }];
      }

      return [
        {
          label: routeLabels[path] || path.slice(1).replace(/-/g, " "),
          href: path,
        },
      ];
    })();

  const crumbs = [
    showHome ? (
      <Anchor key="home" component={Link} to={homeHref} c="dimmed">
        <Group gap={6}>
          <ThemeIcon variant="light" color="cyan" radius="xl" size={24}>
            <Home size={14} />
          </ThemeIcon>
          <Text size="sm">Home</Text>
        </Group>
      </Anchor>
    ) : null,
    ...breadcrumbItems.map((item, index) => {
      const isLast = index === breadcrumbItems.length - 1;

      return isLast || !item.href ? (
        <Text key={`${item.label}-${index}`} fw={600} c="white" size="sm">
          {item.label}
        </Text>
      ) : (
        <Anchor
          key={`${item.label}-${index}`}
          component={Link}
          to={item.href}
          size="sm"
          c="dimmed"
        >
          {item.label}
        </Anchor>
      );
    }),
  ].filter(Boolean) as React.ReactNode[];

  return (
    <MantineBreadcrumbs className={cn(className)} separatorMargin="sm">
      {crumbs}
    </MantineBreadcrumbs>
  );
}

Breadcrumbs.displayName = "Breadcrumbs";
