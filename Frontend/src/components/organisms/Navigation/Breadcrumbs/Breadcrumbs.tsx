/**
 * Breadcrumbs Component
 * Navigation breadcrumbs with home link and current page
 */

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "../../../../lib/utils";
import { Home, ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  /** Display label */
  label: string;
  /** Optional href (if not provided, item is current page) */
  href?: string;
}

export interface BreadcrumbsProps {
  /** Breadcrumb items */
  items?: BreadcrumbItem[];
  /** Additional CSS classes */
  className?: string;
  /** Whether to show home icon as first item */
  showHome?: boolean;
  /** Custom home link */
  homeHref?: string;
}

// Auto-generate breadcrumbs from route
const routeLabels: Record<string, string> = {
  "/": "Dashboard",
  "/inward": "Purchase Invoices",
  "/sticker": "Sticker Generation",
  "/receiving": "Receiving & Scanning",
  "/putaway": "Put Away",
  "/outward": "Sales Orders",
  "/packing": "Picking & Packing",
  "/dispatch": "Dispatch",
  "/mcd": "Customers",
  "/mpd": "Products",
  "/stock-check": "Stock Check",
  "/stock-movement": "Stock Movement",
};

export function Breadcrumbs({
  items,
  className,
  showHome = true,
  homeHref = "/",
}: BreadcrumbsProps) {
  const location = useLocation();

  // Auto-generate items from current path if not provided
  const breadcrumbItems: BreadcrumbItem[] =
    items ||
    (() => {
      const path = location.pathname;
      if (path === "/") {
        return [{ label: "Dashboard" }];
      }
      return [
        { label: routeLabels[path] || path.slice(1).replace(/-/g, " "), href: path },
      ];
    })();

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center text-sm", className)}
    >
      <ol className="badge badge-neutral flex flex-wrap items-center gap-1.5 text-sm">
        {showHome && (
          <li>
            <Link
              to={homeHref}
              className="flex items-center text-neutral-300 transition-colors hover:text-brand-200"
              aria-label="Home"
            >
              <Home className="w-4 h-4" />
            </Link>
          </li>
        )}

        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          const isFirst = index === 0;

          return (
            <React.Fragment key={index}>
              {(showHome || !isFirst) && (
                <li aria-hidden="true">
                  <ChevronRight className="mx-0.5 w-4 h-4 text-neutral-400/70" />
                </li>
              )}
              <li>
                {isLast || !item.href ? (
                  <span
                    className="font-medium text-white"
                    aria-current="page"
                  >
                    {item.label}
                  </span>
                ) : (
                  <Link
                    to={item.href}
                    className="text-neutral-300 transition-colors hover:text-brand-200"
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

Breadcrumbs.displayName = "Breadcrumbs";
