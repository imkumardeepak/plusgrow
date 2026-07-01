import React from "react";
import {
  ClipboardCheck,
  Eye,
  FileText,
  MapPin,
  Factory,
  Package,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  Navigation,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Badge as MBadge,
  Box,
  Button,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";

import { OperationsPage } from "../../../components/organisms/Operations/OperationsShell";
import type { ActiveMode } from "../types";

const cards: {
  mode?: ActiveMode;
  href?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  color: string;
  gradient: string;
  small?: boolean;
  badge?: string;
}[] = [
  {
    mode: "verify",
    icon: Eye,
    title: "Stock Verify",
    description: "Quick single-SKU lookup. View master data, invoices, locations, and stock details.",
    color: "rgba(99, 102, 241, 0.8)",
    gradient: "linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(15,23,42,0.6) 100%)",
    small: true,
    badge: "Quick Lookup",
  },
  {
    href: "/product-mrp-wise-quantity",
    icon: FileText,
    title: "Product MRP Wise Quantity",
    description: "View current remaining quantity grouped by product and MRP.",
    color: "rgba(34, 211, 238, 0.8)",
    gradient: "linear-gradient(135deg, rgba(34,211,238,0.16) 0%, rgba(15,23,42,0.6) 100%)",
    small: true,
    badge: "Report",
  },
  {
    href: "/audit-logs",
    icon: ShieldCheck,
    title: "Audit Log",
    description: "Open the full system activity log with filters for users, actions, entities, and dates.",
    color: "rgba(168, 85, 247, 0.8)",
    gradient: "linear-gradient(135deg, rgba(168,85,247,0.18) 0%, rgba(15,23,42,0.6) 100%)",
    small: true,
    badge: "Activity Trail",
  },
  {
    mode: "quick-sale",
    icon: TrendingUp,
    title: "Quick Sale",
    description: "View most frequently sold products without leaving Stock Check.",
    color: "rgba(244, 114, 182, 0.8)",
    gradient: "linear-gradient(135deg, rgba(244,114,182,0.16) 0%, rgba(15,23,42,0.6) 100%)",
    small: true,
    badge: "Frequent Sale",
  },
  {
    mode: "location",
    icon: MapPin,
    title: "Check by Location",
    description: "Scan a location code, then scan all products at that location to verify stock counts.",
    color: "rgba(14, 165, 233, 0.8)",
    gradient: "linear-gradient(135deg, rgba(14,165,233,0.18) 0%, rgba(15,23,42,0.6) 100%)",
  },
  {
    mode: "manufacturer",
    icon: Factory,
    title: "Check by Manufacturer",
    description: "Select a manufacturer and scan all their products to verify inventory counts.",
    color: "rgba(245, 158, 11, 0.8)",
    gradient: "linear-gradient(135deg, rgba(245,158,11,0.18) 0%, rgba(15,23,42,0.6) 100%)",
  },
  {
    mode: "product",
    icon: Package,
    title: "Check by Product",
    description: "Select a product and scan all matching items. Unexpected products will be flagged for verification.",
    color: "rgba(16, 185, 129, 0.8)",
    gradient: "linear-gradient(135deg, rgba(16,185,129,0.18) 0%, rgba(15,23,42,0.6) 100%)",
  },
  {
    mode: "reseller-tally",
    icon: Navigation,
    title: "Reseller Tally Sync",
    description: "Fetch pending Sales Orders from Reseller API and manually push to Tally.",
    color: "rgba(59, 130, 246, 0.8)",
    gradient: "linear-gradient(135deg, rgba(59,130,246,0.18) 0%, rgba(15,23,42,0.6) 100%)",
  },
];

export function StockCheckHub({
  onSelectMode,
  isMobile,
}: {
  onSelectMode: (mode: ActiveMode) => void;
  isMobile: boolean;
}) {
  const navigate = useNavigate();

  return (
    <OperationsPage
      title="Stock Check"
      description="Physical inventory verification hub. Select a mode to begin scanning and verifying stock."
      icon={ClipboardCheck}
      hideHeader={isMobile}
    >
      {isMobile && (
        <Paper
          radius="lg"
          p="sm"
          mb="xs"
          style={{
            background: "linear-gradient(135deg, rgba(14,165,233,0.12) 0%, rgba(15,23,42,0.8) 100%)",
            border: "1px solid rgba(14,165,233,0.18)",
          }}
        >
          <Group gap={8} wrap="nowrap">
            <ThemeIcon size={32} radius="xl" variant="gradient" gradient={{ from: "cyan.4", to: "blue.7", deg: 145 }}>
              <ClipboardCheck size={16} />
            </ThemeIcon>
            <Box>
              <Text fw={800} size="sm" c="white">Stock Check</Text>
              <Text size="10px" c="dimmed">Select a mode below</Text>
            </Box>
          </Group>
        </Paper>
      )}

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        {cards.map((card) => (
          <Paper
            key={card.mode ?? card.href}
            radius="xl"
            p={isMobile ? "md" : "lg"}
            withBorder
            onClick={() => card.href ? navigate(card.href) : onSelectMode(card.mode!)}
            style={{
              cursor: "pointer",
              background: card.gradient,
              borderColor: card.color.replace("0.8", "0.25"),
              transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
              boxShadow: `0 4px 24px ${card.color.replace("0.8", "0.12")}`,
              minHeight: isMobile ? 150 : 170,
            }}
            className="hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
          >
            <Stack gap="md">
              <Group justify="space-between" align="flex-start">
                <ThemeIcon
                  size={isMobile ? 44 : 52}
                  radius="xl"
                  style={{
                    background: card.color.replace("0.8", "0.2"),
                    border: `1px solid ${card.color.replace("0.8", "0.35")}`,
                    color: card.color.replace("0.8", "1"),
                  }}
                >
                  <card.icon size={isMobile ? 22 : 26} />
                </ThemeIcon>
                <ChevronRight size={18} color="rgba(255,255,255,0.3)" />
              </Group>
              <Box>
                <Text fw={800} size={isMobile ? "md" : "lg"} c="white" mb={6}>
                  {card.title}
                </Text>
                <Text size={isMobile ? "xs" : "sm"} c="dimmed" style={{ lineHeight: 1.55 }}>
                  {card.description}
                </Text>
              </Box>
              {card.small && (
                <Group justify="space-between" align="center">
                  <MBadge size="xs" variant="light" color={card.href === "/audit-logs" ? "grape" : "indigo"} radius="md">
                    {card.badge}
                  </MBadge>
                  {card.href === "/audit-logs" && (
                    <Button size="compact-xs" variant="subtle" color="grape" rightSection={<ChevronRight size={12} />}>
                      Open
                    </Button>
                  )}
                </Group>
              )}
            </Stack>
          </Paper>
        ))}
      </SimpleGrid>
    </OperationsPage>
  );
}
