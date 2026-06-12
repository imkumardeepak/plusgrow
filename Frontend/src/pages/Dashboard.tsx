import React, { memo, useMemo } from "react";
import {
  Badge,
  Box,
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
          key: "stock-check",
          title: "Stock Check",
          description: "Scan locations and verify product stock counts.",
          icon: IconClipboardCheck,
          color: "violet",
          href: "/stock-check",
          visible: true,
        },
        {
          key: "inward",
          title: "Inward",
          description: "Manage purchase invoices and inbound stock.",
          icon: IconArrowDownLeft,
          color: "blue",
          href: "/inward",
          visible: hasPermission("inward", "view"),
        },
        {
          key: "outward",
          title: "Outward / Dispatch",
          description: "Manage sales orders and outbound dispatch.",
          icon: IconArrowUpRight,
          color: "teal",
          href: "/outward",
          visible: hasPermission("outward", "view"),
        },
        {
          key: "bin-movement",
          title: "Bin Movement",
          description: "Scan location and relocate bins.",
          icon: IconMapPin,
          color: "indigo",
          href: "/bin-movement",
          visible:
            hasPermission("locations", "view") ||
            hasPermission("bins", "view"),
        },
        {
          key: "putaway",
          title: "Put Away",
          description: "Scan and confirm inward stock placement.",
          icon: IconBuildingWarehouse,
          color: "orange",
          href: "/putaway",
          visible: hasPermission("putaway", "view"),
        },
        {
          key: "inward-verify",
          title: "Inward Verify",
          description: "Scan stickers and match invoice qty.",
          icon: IconClipboardCheck,
          color: "cyan",
          href: "/inward-verify",
          visible: hasPermission("inward", "view") || isPickingRole,
        },
        {
          key: "picking",
          title: "Picking",
          description: "Pick order items from warehouse locations.",
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
          key: "stock-movement",
          title: "Stock Adjustment",
          description: "Post quantity increases and decreases by location.",
          icon: IconChartBar,
          color: "cyan",
          href: "/stock-movement",
          visible: hasPermission("stock-movement", "view"),
        },
        {
          key: "product-movement",
          title: "Product Movement",
          description: "Move product stock from one location to another.",
          icon: IconArrowsLeftRight,
          color: "teal",
          href: "/product-movement",
          visible: hasPermission("stock-movement", "view"),
        },
        {
          key: "product-query",
          title: "Product Query",
          description: "Lookup product details, stock, and locations.",
          icon: IconSearch,
          color: "blue",
          href: "/product-query",
          visible: true,
        },
        {
          key: "warehouse-map",
          title: "Warehouse Map",
          description: "View and manage warehouse locations and bins.",
          icon: IconBuildingWarehouse,
          color: "indigo",
          href: "/warehouse-map",
          visible: hasPermission("locations", "view"),
        },
        {
          key: "mpd",
          title: "Master Product Data",
          description: "Manage products, manufacturers, and commodities.",
          icon: IconBox,
          color: "grape",
          href: "/mpd",
          visible: hasPermission("products", "view"),
        },
        {
          key: "audit-logs",
          title: "Audit Log",
          description: "View all system activity, changes, and user actions.",
          icon: IconFileText,
          color: "gray",
          href: "/audit-logs",
          visible: true,
        },
        {
          key: "users",
          title: "Users & Roles",
          description: "Manage users, roles, and permissions.",
          icon: IconUsers,
          color: "red",
          href: "/users",
          visible: hasPermission("users", "view"),
        },
      ].filter((item) => item.visible),
    [hasPermission, isPickingRole],
  );

  if (isPartyRole) {
    return <PartyDashboard />;
  }

  return (
    <Stack gap="md">
      <SimpleGrid cols={{ base: 2, sm: 3, lg: 4, xl: 5 }} gap="sm">
        {launcherCards.map((card, index) => (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, duration: 0.2 }}
          >
            <Link to={card.href} className="no-underline">
              <Card
                withBorder
                radius="md"
                p={isMobile ? "sm" : "md"}
                style={{
                  background:
                    "linear-gradient(180deg, rgba(19,27,45,0.96) 0%, rgba(10,18,32,0.98) 100%)",
                  borderColor: "rgba(148, 163, 184, 0.12)",
                  height: "100%",
                  transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
                }}
                className="hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
              >
                <Group justify="space-between" align="center" mb="xs">
                  <ThemeIcon
                    color={card.color}
                    variant="light"
                    size={isMobile ? 32 : 38}
                    radius="md"
                  >
                    <card.icon size={isMobile ? 16 : 20} />
                  </ThemeIcon>
                  <Badge variant="light" color={card.color} size="xs">
                    Open
                  </Badge>
                </Group>
                <Text size={isMobile ? "sm" : "md"} fw={800} c="white">
                  {card.title}
                </Text>
                <Text size={isMobile ? "10px" : "xs"} c="dimmed" mt={4} lineClamp={2}>
                  {card.description}
                </Text>
              </Card>
            </Link>
          </motion.div>
        ))}
      </SimpleGrid>
    </Stack>
  );
});

export default Dashboard;
