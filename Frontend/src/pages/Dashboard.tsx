import React, { memo, useMemo } from "react";
import {
  Badge,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconBox,
  IconBuildingWarehouse,
  IconChartBar,
  IconClipboardCheck,
  IconMapPin,
  IconPackage,
  IconSearch,
  IconArrowDownLeft,
  IconArrowUpRight,
  IconArrowsLeftRight,
  IconFileText,
  IconUsers,
  IconTruck,
  IconBuilding,
  IconBuildingFactory2,
  IconUsersGroup,
  IconCategory,
  IconBoxMultiple,
  IconMapPins,
  IconPrinter,
  IconCurrencyDollar,
  IconUserCircle,
  IconShieldCheck,
  IconQrcode,
  IconMap2,
  IconReportAnalytics,
} from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { PartyDashboard } from "./PartyDashboard";

export const Dashboard = memo(function Dashboard() {
  const { user, hasPermission } = useAuth();
  const roleName = (user?.roleName ?? user?.role?.name ?? "").trim().toLowerCase();
  const isPartyRole = roleName === "party";
  const isMobile = useMediaQuery("(max-width: 48em)");
  const isPickingRole = roleName === "picking";

  const launcherCards = useMemo(
    () =>
      [
        {
          key: "product-query",
          title: "Product Query",
          description: "Lookup product details & stock.",
          icon: IconSearch,
          color: "blue",
          href: "/product-query",
          visible: true,
        },
        {
          key: "today-operations",
          title: "Today's Operations",
          description: "Inward & outward activity report.",
          icon: IconReportAnalytics,
          color: "cyan",
          href: "/today-operations",
          visible: true,
        },
        {
          key: "stock-check",
          title: "Stock Check",
          description: "Scan locations, verify counts.",
          icon: IconClipboardCheck,
          color: "violet",
          href: "/stock-check",
          visible: true,
        },
        {
          key: "tally-so-process",
          title: "TALLY TO SO",
          description: "Process imported Sales Orders from Tally.",
          icon: IconFileText,
          color: "green",
          href: "/tally-so-process",
          visible: true,
        },
        {
          key: "reseller-tally-sync",
          title: "PORTAL TO TALLY",
          description: "Push Reseller SOs to Tally.",
          icon: IconArrowsLeftRight,
          color: "blue",
          href: "/reseller-tally-sync",
          visible: true,
        },
        {
          key: "inward",
          title: "Inward",
          description: "Purchase invoices & inbound.",
          icon: IconArrowDownLeft,
          color: "blue",
          href: "/inward",
          visible: hasPermission("inward", "view"),
        },
        {
          key: "inward-verify",
          title: "Inward Verify",
          description: "Scan stickers, match invoice qty.",
          icon: IconQrcode,
          color: "cyan",
          href: "/inward-verify",
          visible: hasPermission("inward", "view") || isPickingRole,
        },
        {
          key: "outward",
          title: "Outward",
          description: "Sales orders & outbound.",
          icon: IconArrowUpRight,
          color: "teal",
          href: "/outward",
          visible: hasPermission("outward", "view"),
        },
        {
          key: "picking",
          title: "Picking",
          description: "Pick items from locations.",
          icon: IconPackage,
          color: "teal",
          href: "/picking",
          visible: hasPermission("picking", "view") || isPickingRole,
        },
        {
          key: "packing",
          title: "Packing",
          description: "Pack picked items into cartons.",
          icon: IconPackage,
          color: "blue",
          href: "/packing",
          visible: hasPermission("packing", "view"),
        },
        {
          key: "dispatch",
          title: "Dispatch",
          description: "Manage dispatch & delivery.",
          icon: IconTruck,
          color: "green",
          href: "/dispatch",
          visible: hasPermission("dispatch", "view"),
        },
        {
          key: "putaway",
          title: "Put Away",
          description: "Confirm inward stock placement.",
          icon: IconBuildingWarehouse,
          color: "orange",
          href: "/putaway",
          visible: hasPermission("putaway", "view"),
        },
        {
          key: "bin-movement",
          title: "Bin Movement",
          description: "Scan & relocate bins.",
          icon: IconMapPin,
          color: "indigo",
          href: "/bin-movement",
          visible:
            hasPermission("locations", "view") ||
            hasPermission("bins", "view"),
        },
        {
          key: "stock-movement",
          title: "Stock Adjustment",
          description: "Qty increases & decreases.",
          icon: IconChartBar,
          color: "cyan",
          href: "/stock-movement",
          visible: hasPermission("stock-movement", "view"),
        },
        {
          key: "product-movement",
          title: "Product Movement",
          description: "Move stock between locations.",
          icon: IconArrowsLeftRight,
          color: "teal",
          href: "/product-movement",
          visible: hasPermission("stock-movement", "view"),
        },
        {
          key: "warehouse-map",
          title: "Warehouse Map",
          description: "View locations & bins.",
          icon: IconMap2,
          color: "indigo",
          href: "/warehouse-map",
          visible: hasPermission("locations", "view"),
        },
        {
          key: "mpd",
          title: "Products",
          description: "Products, manufacturers, commodities.",
          icon: IconBox,
          color: "grape",
          href: "/mpd",
          visible: hasPermission("products", "view"),
        },
        {
          key: "mrp-tracking",
          title: "MRP Tracking",
          description: "MRP wise product quantities.",
          icon: IconCurrencyDollar,
          color: "yellow",
          href: "/mrp-tracking",
          visible: hasPermission("stock-check", "view"),
        },
        {
          key: "importers",
          title: "Legal Meta",
          description: "Importer entities & legal info.",
          icon: IconBuilding,
          color: "blue",
          href: "/importers",
          visible: hasPermission("importers", "view"),
        },
        {
          key: "manufacturers",
          title: "Manufacturers",
          description: "Manufacturer profiles.",
          icon: IconBuildingFactory2,
          color: "orange",
          href: "/manufacturers",
          visible: hasPermission("manufacturers", "view"),
        },
        {
          key: "parties",
          title: "Ownership",
          description: "Party ownership & partners.",
          icon: IconUsersGroup,
          color: "pink",
          href: "/parties",
          visible: hasPermission("parties", "view"),
        },
        {
          key: "commodities",
          title: "Commodities",
          description: "Categories & classifications.",
          icon: IconCategory,
          color: "grape",
          href: "/commodities",
          visible: hasPermission("commodities", "view"),
        },
        {
          key: "bins",
          title: "Bin Master",
          description: "Warehouse bin configs.",
          icon: IconBoxMultiple,
          color: "indigo",
          href: "/bins",
          visible: hasPermission("bins", "view"),
        },
        {
          key: "locations",
          title: "Location Master",
          description: "Storage locations.",
          icon: IconMapPins,
          color: "teal",
          href: "/locations",
          visible: hasPermission("locations", "view"),
        },
        {
          key: "sticker-printer-config",
          title: "Printer Config",
          description: "Sticker printers & labels.",
          icon: IconPrinter,
          color: "gray",
          href: "/sticker-printer-config",
          visible: hasPermission("sticker-printer-config", "view"),
        },
        {
          key: "user-master",
          title: "User Master",
          description: "Manage user accounts.",
          icon: IconUsers,
          color: "red",
          href: "/user-master",
          visible: hasPermission("user-master", "view"),
        },
        {
          key: "role-master",
          title: "Role Master",
          description: "Roles & permissions.",
          icon: IconShieldCheck,
          color: "orange",
          href: "/role-master",
          visible: hasPermission("role-master", "view"),
        },
        {
          key: "profile",
          title: "My Profile",
          description: "Account settings.",
          icon: IconUserCircle,
          color: "cyan",
          href: "/profile",
          visible: true,
        },
        {
          key: "audit-logs",
          title: "Audit Log",
          description: "System activity & changes.",
          icon: IconFileText,
          color: "gray",
          href: "/audit-logs",
          visible: true,
        },
      ].filter((item) => item.visible),
    [hasPermission, isPickingRole],
  );

  if (isPartyRole) {
    return <PartyDashboard />;
  }

  return (
    <SimpleGrid cols={{ base: 2, sm: 3, lg: 4, xl: 5 }} spacing="sm">
      {launcherCards.map((card, index) => (
        <motion.div
          key={card.key}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.02, duration: 0.15 }}
        >
          <Link to={card.href} className="no-underline">
            <Card
              withBorder
              radius="md"
              p="sm"
              style={{
                background:
                  "linear-gradient(180deg, rgba(19,27,45,0.96) 0%, rgba(10,18,32,0.98) 100%)",
                borderColor: "rgba(148, 163, 184, 0.12)",
                height: "100%",
                transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
              }}
              className="hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
            >
              <Group gap={8} align="center" mb={6} wrap="nowrap">
                <ThemeIcon
                  color={card.color}
                  variant="light"
                  size={24}
                  radius="md"
                >
                  <card.icon size={13} />
                </ThemeIcon>
                <Text size="sm" fw={700} c="white" style={{ flex: 1 }} lineClamp={isMobile ? 2 : 1}>
                  {card.title}
                </Text>
              </Group>
              {!isMobile && (
                <Text size="xs" c="dimmed" lineClamp={1}>
                  {card.description}
                </Text>
              )}
            </Card>
          </Link>
        </motion.div>
      ))}
    </SimpleGrid>
  );
});

export default Dashboard;
