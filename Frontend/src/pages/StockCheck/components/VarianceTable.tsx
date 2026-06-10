import React from "react";
import { X } from "lucide-react";
import {
  ActionIcon,
  Badge as MBadge,
  Group,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import type { ScannedItem } from "../types";

export function VarianceTable({
  items,
  isMobile,
  onRemove,
}: {
  items: ScannedItem[];
  isMobile: boolean;
  onRemove?: (sku: string) => void;
}) {
  if (items.length === 0) {
    return (
      <Paper
        radius="lg"
        p="md"
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <Text size="xs" c="dimmed" ta="center">
          No items scanned yet. Start scanning to see variance.
        </Text>
      </Paper>
    );
  }

  const totalSystem = items.reduce((s, i) => s + i.systemQty, 0);
  const totalScanned = items.reduce((s, i) => s + i.scannedQty, 0);
  const totalVariance = totalScanned - totalSystem;

  return (
    <Stack gap="xs">
      <SimpleGrid cols={3} spacing="xs">
        <Paper radius="lg" p="xs" withBorder bg="transparent">
          <Text size="9px" fw={800} c="dimmed">SYSTEM QTY</Text>
          <Text size="lg" fw={800} ff="monospace" c="cyan.3">{totalSystem}</Text>
        </Paper>
        <Paper radius="lg" p="xs" withBorder bg="transparent">
          <Text size="9px" fw={800} c="dimmed">SCANNED QTY</Text>
          <Text size="lg" fw={800} ff="monospace" c="white">{totalScanned}</Text>
        </Paper>
        <Paper radius="lg" p="xs" withBorder bg="transparent">
          <Text size="9px" fw={800} c="dimmed">VARIANCE</Text>
          <Text
            size="lg"
            fw={800}
            ff="monospace"
            c={totalVariance === 0 ? "green.4" : totalVariance > 0 ? "yellow.4" : "red.4"}
          >
            {totalVariance > 0 ? "+" : ""}{totalVariance}
          </Text>
        </Paper>
      </SimpleGrid>

      <ScrollArea type="auto">
        <Table striped highlightOnHover withTableBorder withColumnBorders miw={isMobile ? 500 : undefined}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>SKU</Table.Th>
              <Table.Th style={{ textAlign: "right" }}>System</Table.Th>
              <Table.Th style={{ textAlign: "right" }}>Scanned</Table.Th>
              <Table.Th style={{ textAlign: "right" }}>Variance</Table.Th>
              {onRemove && <Table.Th style={{ width: 40 }}></Table.Th>}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {items.map((item) => {
              const variance = item.scannedQty - item.systemQty;
              return (
                <Table.Tr
                  key={item.sku}
                  style={item.isUnexpected ? { background: "rgba(245,158,11,0.06)" } : undefined}
                >
                  <Table.Td>
                    <Group gap={4} wrap="nowrap">
                      <Text size="12px" fw={700} ff="monospace">{item.sku}</Text>
                      {item.isUnexpected && (
                        <MBadge size="xs" color="orange" variant="light">NEW</MBadge>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td style={{ textAlign: "right" }}>
                    <Text size="12px" fw={700} ff="monospace">{item.systemQty}</Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: "right" }}>
                    <Text size="12px" fw={800} ff="monospace" c="white">{item.scannedQty}</Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: "right" }}>
                    <Text
                      size="12px"
                      fw={900}
                      ff="monospace"
                      c={variance === 0 ? "green.4" : variance > 0 ? "yellow.4" : "red.4"}
                    >
                      {variance > 0 ? "+" : ""}{variance}
                    </Text>
                  </Table.Td>
                  {onRemove && (
                    <Table.Td>
                      <ActionIcon
                        variant="subtle"
                        size="xs"
                        color="red"
                        onClick={() => onRemove(item.sku)}
                      >
                        <X size={12} />
                      </ActionIcon>
                    </Table.Td>
                  )}
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Stack>
  );
}
