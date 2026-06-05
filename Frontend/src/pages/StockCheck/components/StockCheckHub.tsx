import React from "react";
import {
  ClipboardCheck,
  Eye,
  MapPin,
  Factory,
  Package,
  ChevronRight,
} from "lucide-react";
import {
  Badge as MBadge,
  Box,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";

import {
  OperationsPage,
} from "../../../components/organisms/Operations/OperationsShell";
import type { ActiveMode } from "../types";

const cards: {
  mode: ActiveMode;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  color: string;
  gradient: string;
  small?: boolean;
}[] = [
  {
    mode: "verify",
    icon: Eye,
    title: "Stock Verify",
    description: "Quick single-SKU lookup. View master data, invoices, locations, and stock details.",
    color: "rgba(99, 102, 241, 0.8)",
    gradient: "linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(15,23,42,0.6) 100%)",
    small: true,
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
];

export function StockCheckHub({
  onSelectMode,
  isMobile,
}: {
  onSelectMode: (mode: ActiveMode) => void;
  isMobile: boolean;
}) {
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

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        {cards.map((card) => (
          <Paper
            key={card.mode}
            radius="xl"
            p={isMobile ? "md" : "lg"}
            withBorder
            onClick={() => onSelectMode(card.mode)}
            style={{
              cursor: "pointer",
              background: card.gradient,
              borderColor: card.color.replace("0.8", "0.25"),
              transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
              boxShadow: `0 4px 24px ${card.color.replace("0.8", "0.12")}`,
            }}
            className="hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
          >
            <Stack gap="sm">
              <Group justify="space-between" align="flex-start">
                <ThemeIcon
                  size={isMobile ? 40 : 48}
                  radius="xl"
                  style={{
                    background: card.color.replace("0.8", "0.2"),
                    border: `1px solid ${card.color.replace("0.8", "0.35")}`,
                    color: card.color.replace("0.8", "1"),
                  }}
                >
                  <card.icon size={isMobile ? 20 : 24} />
                </ThemeIcon>
                <ChevronRight size={18} color="rgba(255,255,255,0.3)" />
              </Group>
              <Box>
                <Text fw={800} size={isMobile ? "sm" : "md"} c="white" mb={4}>
                  {card.title}
                </Text>
                <Text size="xs" c="dimmed" style={{ lineHeight: 1.55 }}>
                  {card.description}
                </Text>
              </Box>
              {card.small && (
                <MBadge size="xs" variant="light" color="indigo" radius="md">
                  Quick Lookup
                </MBadge>
              )}
            </Stack>
          </Paper>
        ))}
      </SimpleGrid>
    </OperationsPage>
  );
}
