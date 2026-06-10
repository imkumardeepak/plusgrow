import { useMemo } from "react";
import { Badge as MBadge, Box, Group, Modal, ScrollArea, Stack, Table, Text } from "@mantine/core";
import { format } from "date-fns";
import { ClipboardCheck } from "lucide-react";

import { OperationsEmptyState } from "../../../components/organisms/Operations/OperationsShell";
import type { StockCheckReport, StockCheckReportItem } from "../../../services/masterApi";

type StockCheckReportItemsModalProps = {
  report: StockCheckReport | null;
  onClose: () => void;
};

export function StockCheckReportItemsModal({
  report,
  onClose,
}: StockCheckReportItemsModalProps) {
  const reportItems = useMemo(() => {
    if (!report) return [];
    try {
      return JSON.parse(report.itemsJson || "[]") as StockCheckReportItem[];
    } catch {
      return [];
    }
  }, [report]);

  return (
    <Modal opened={!!report} onClose={onClose} title="Stock Check Items" centered size="90vw">
      {report && (
        <Stack gap="sm">
          <Group justify="space-between" gap="xs">
            <Box>
              <Text size="xs" fw={800} c="white">
                {report.referenceName}
              </Text>
              <Text size="10px" c="dimmed">
                {report.checkType} - {format(new Date(report.createdAt), "dd MMM yyyy HH:mm")}
              </Text>
            </Box>
            <MBadge
              size="sm"
              variant="light"
              color={report.status === "COMPLETED" ? "green" : report.status === "PAUSED" ? "yellow" : "blue"}
            >
              {report.status}
            </MBadge>
          </Group>

          {reportItems.length === 0 ? (
            <OperationsEmptyState
              icon={ClipboardCheck}
              title="No Items Found"
              description="This report does not contain item details."
            />
          ) : (
            <ScrollArea type="auto" h="70vh">
              <Table striped highlightOnHover withTableBorder withColumnBorders miw={860}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>SKU</Table.Th>
                    <Table.Th style={{ textAlign: "right" }}>System</Table.Th>
                    <Table.Th style={{ textAlign: "right" }}>Scanned</Table.Th>
                    <Table.Th style={{ textAlign: "right" }}>Variance</Table.Th>
                    <Table.Th>Flag</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {reportItems.map((item) => (
                    <Table.Tr key={item.sku}>
                      <Table.Td>
                        <Text size="13px" fw={800} ff="monospace">
                          {item.sku}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: "right" }}>
                        <Text size="13px" fw={700} ff="monospace">
                          {item.systemQty}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: "right" }}>
                        <Text size="13px" fw={800} ff="monospace">
                          {item.scannedQty}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: "right" }}>
                        <Text
                          size="13px"
                          fw={900}
                          ff="monospace"
                          c={item.variance === 0 ? "green.4" : item.variance > 0 ? "yellow.4" : "red.4"}
                        >
                          {item.variance > 0 ? "+" : ""}
                          {item.variance}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        {item.isUnexpected ? (
                          <MBadge size="xs" color="orange" variant="light">
                            UNEXPECTED
                          </MBadge>
                        ) : (
                          <Text size="12px" c="dimmed">
                            -
                          </Text>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          )}
        </Stack>
      )}
    </Modal>
  );
}
