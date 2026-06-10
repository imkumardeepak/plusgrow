import React, { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Eye, History, RefreshCw, Search } from "lucide-react";
import { format } from "date-fns";
import { ActionIcon, Badge as MBadge, Box, Group, ScrollArea, Select, Stack, Table, Text, TextInput, Tooltip } from "@mantine/core";

import { Button } from "../../../components/atoms/Button";
import { toast } from "../../../lib/toast";
import { OperationsPage, OperationsPanel, OperationsEmptyState } from "../../../components/organisms/Operations/OperationsShell";
import { stockCheckReportsApi, StockCheckReport } from "../../../services/masterApi";
import { ModeHeader } from "./ModeHeader";
import { StockCheckReportItemsModal } from "./StockCheckReportItemsModal";

export function StockCheckHistoryMode({ onBack, isMobile }: { onBack: () => void; isMobile: boolean }) {
  const [reports, setReports] = useState<StockCheckReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [checkType, setCheckType] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedReport, setSelectedReport] = useState<StockCheckReport | null>(null);

  const loadReports = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await stockCheckReportsApi.getAll({
        checkType: checkType || undefined,
        search: search.trim() || undefined,
        page: 1,
        pageSize: 100,
      });
      setReports(result.data);
    } catch (error: any) {
      toast.error(error.message || "Failed to load stock check reports");
    } finally {
      setIsLoading(false);
    }
  }, [checkType, search]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  return (
    <OperationsPage
      title="Report History"
      description="View past stock check reports. Filter by type, date, and search."
      icon={History}
      actions={
        <Button variant="outline" leftIcon={<ArrowLeft size={16} />} onClick={onBack}>
          Back to Hub
        </Button>
      }
    >
      <ModeHeader title="Report History" icon={History} onBack={onBack} isMobile={isMobile} />

      <OperationsPanel title="History" icon={History} description="Saved stock check snapshots.">
        <Stack gap="sm">
          <Group gap="xs" align="end">
            <Box style={{ flex: 1, minWidth: 180 }}>
              <Text size="10px" fw={800} c="dimmed" mb={4}>SEARCH</Text>
              <TextInput
                size={isMobile ? "md" : "sm"}
                placeholder="Reference, user, notes..."
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
                leftSection={<Search size={14} />}
              />
            </Box>
            <Box style={{ width: isMobile ? "100%" : 180 }}>
              <Text size="10px" fw={800} c="dimmed" mb={4}>CHECK TYPE</Text>
              <Select
                size={isMobile ? "md" : "sm"}
                clearable
                placeholder="All types"
                value={checkType}
                onChange={setCheckType}
                data={[
                  { value: "LOCATION", label: "Location" },
                  { value: "MANUFACTURER", label: "Manufacturer" },
                  { value: "PRODUCT", label: "Product" },
                ]}
              />
            </Box>
            <Button
              size={isMobile ? "md" : "sm"}
              variant="outline"
              loading={isLoading}
              onClick={() => void loadReports()}
              leftIcon={<RefreshCw size={15} />}
            >
              Refresh
            </Button>
          </Group>

          {reports.length === 0 ? (
            <OperationsEmptyState
              icon={History}
              title="No Reports Found"
              description="Paused and completed stock checks will appear here."
            />
          ) : (
            <ScrollArea type="auto">
              <Table striped highlightOnHover withTableBorder withColumnBorders miw={860}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Date</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Reference</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th style={{ textAlign: "right" }}>System</Table.Th>
                    <Table.Th style={{ textAlign: "right" }}>Scanned</Table.Th>
                    <Table.Th style={{ textAlign: "right" }}>Variance</Table.Th>
                    <Table.Th style={{ textAlign: "right" }}>Items</Table.Th>
                    <Table.Th>By</Table.Th>
                    <Table.Th style={{ width: 52 }}></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {reports.map((report) => (
                    <Table.Tr key={report.id}>
                      <Table.Td>{format(new Date(report.createdAt), "dd MMM yyyy HH:mm")}</Table.Td>
                      <Table.Td>
                        <MBadge size="xs" variant="light" color="cyan">{report.checkType}</MBadge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="12px" fw={700}>{report.referenceName}</Text>
                      </Table.Td>
                      <Table.Td>
                        <MBadge
                          size="xs"
                          variant="light"
                          color={report.status === "COMPLETED" ? "green" : report.status === "PAUSED" ? "yellow" : "blue"}
                        >
                          {report.status}
                        </MBadge>
                      </Table.Td>
                      <Table.Td style={{ textAlign: "right" }}>{report.totalSystemQty}</Table.Td>
                      <Table.Td style={{ textAlign: "right" }}>{report.totalScannedQty}</Table.Td>
                      <Table.Td style={{ textAlign: "right" }}>
                        <Text
                          size="12px"
                          fw={800}
                          ff="monospace"
                          c={report.totalVariance === 0 ? "green.4" : report.totalVariance > 0 ? "yellow.4" : "red.4"}
                        >
                          {report.totalVariance > 0 ? "+" : ""}{report.totalVariance}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: "right" }}>{report.itemsChecked}</Table.Td>
                      <Table.Td>{report.performedByName || "-"}</Table.Td>
                      <Table.Td>
                        <Tooltip label="View items">
                          <ActionIcon
                            variant="subtle"
                            color="cyan"
                            onClick={() => setSelectedReport(report)}
                          >
                            <Eye size={15} />
                          </ActionIcon>
                        </Tooltip>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          )}
        </Stack>
      </OperationsPanel>
      <StockCheckReportItemsModal
        report={selectedReport}
        onClose={() => setSelectedReport(null)}
      />
    </OperationsPage>
  );
}
